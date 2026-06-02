import { Router } from "express";
import axios from "axios";
import { fetchJobPageText } from "../lib/fetchJobUrl.js";
import { mergeRecruiterEmail } from "../lib/extractEmail.js";
import { prisma } from "../lib/prisma.js";

export const jobRouter = Router();

type JobParsedAi = {
  title?: string;
  company?: string;
  recruiter_email?: string;
  job_text?: string;
  source_url?: string;
  is_job_posting?: boolean;
  validation_message?: string;
};

jobRouter.get("/", async (_req, res) => {
  try {
    const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" } });
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list jobs" });
  }
});

jobRouter.patch("/:id", async (req, res) => {
  try {
    const { recruiterEmail, title } = req.body as {
      recruiterEmail?: string;
      title?: string;
    };

    const data: { recruiterEmail?: string; title?: string } = {};
    if (typeof recruiterEmail === "string") data.recruiterEmail = recruiterEmail.trim();
    if (typeof title === "string") data.title = title.trim();

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "Provide recruiterEmail or title to update" });
      return;
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data,
    });
    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Job not found" });
  }
});

jobRouter.post("/analyze", async (req, res) => {
  try {
    const { sourceUrl, jobText, title, recruiterEmail, company } = req.body as {
      sourceUrl?: string;
      jobText?: string;
      title?: string;
      recruiterEmail?: string;
      company?: string;
    };

    if (!sourceUrl?.trim() && !jobText?.trim()) {
      res.status(400).json({ error: "Provide sourceUrl or jobText" });
      return;
    }

    let analyzed = {
      title: title?.trim() || "Untitled role",
      recruiterEmail: recruiterEmail?.trim() || "",
      jobText: jobText?.trim() || "",
      sourceUrl: sourceUrl?.trim() || "",
      company: company?.trim() || "",
    };

    let aiWarning: string | undefined;
    const aiUrl = process.env.AI_SERVICE_URL;

    if (!analyzed.jobText && analyzed.sourceUrl) {
      const fetched = await fetchJobPageText(analyzed.sourceUrl);
      if (!fetched.ok) {
        res.status(409).json({
          blocked: fetched.reason === "blocked",
          error: fetched.message,
          message: fetched.message,
        });
        return;
      }
      analyzed.jobText = fetched.text;
    }

    const textForAi = analyzed.jobText;

    if (aiUrl && textForAi) {
      try {
        const { data } = await axios.post<JobParsedAi>(`${aiUrl}/parse-jd`, {
          job_text: textForAi,
        });

        if (data.is_job_posting === false) {
          res.status(422).json({
            error: data.validation_message || "This does not look like a job posting.",
            validation_message:
              data.validation_message || "This does not look like a job posting.",
          });
          return;
        }

        analyzed = {
          title: data.title ?? analyzed.title,
          recruiterEmail: mergeRecruiterEmail(
            data.recruiter_email ?? analyzed.recruiterEmail,
            data.job_text ?? analyzed.jobText,
            textForAi,
          ),
          jobText: data.job_text ?? analyzed.jobText,
          sourceUrl: data.source_url ?? analyzed.sourceUrl,
          company: data.company ?? analyzed.company,
        };
      } catch (aiErr) {
        console.error(aiErr);
        aiWarning =
          "AI could not parse the job description. Saved with your raw input.";
      }
    } else if (!textForAi && analyzed.sourceUrl) {
      res.status(409).json({
        blocked: true,
        error: "No job text to parse. Upload a screenshot of the posting.",
        message: "No job text to parse. Upload a screenshot of the posting.",
      });
      return;
    }

    analyzed.recruiterEmail = mergeRecruiterEmail(
      analyzed.recruiterEmail,
      analyzed.jobText,
      recruiterEmail ?? "",
      title ?? "",
      company ?? "",
    );

    const job = await prisma.job.create({
      data: {
        title: analyzed.title,
        recruiterEmail: analyzed.recruiterEmail,
        jobText: analyzed.jobText,
        sourceUrl: analyzed.sourceUrl,
        company: analyzed.company,
      },
    });

    res.status(201).json({ ...job, aiWarning });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to analyze job" });
  }
});
