import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { formatSendError, sendEmail } from "../lib/email.js";
import { resumeFileAttachment } from "../lib/resumeAttachment.js";

export const applicationRouter = Router();

async function loadResumeAndJob(resumeId: string, jobId: string) {
  const [resume, job] = await Promise.all([
    prisma.resume.findUnique({ where: { id: resumeId } }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);

  if (!resume || !job) {
    return null;
  }

  return { resume, job };
}

applicationRouter.get("/", async (_req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: { resume: true, job: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list applications" });
  }
});

async function resolveRecipientEmail(
  jobId: string,
  jobEmail: string,
  override?: string,
): Promise<string | null> {
  const trimmed = override?.trim() || jobEmail.trim();
  if (!trimmed) return null;
  if (override?.trim() && override.trim() !== jobEmail.trim()) {
    await prisma.job.update({
      where: { id: jobId },
      data: { recruiterEmail: override.trim() },
    });
  }
  return trimmed;
}

applicationRouter.post("/send", async (req, res) => {
  try {
    const { resumeId, jobId, emailSubject, emailBody, recruiterEmail } = req.body as {
      resumeId?: string;
      jobId?: string;
      emailSubject?: string;
      emailBody?: string;
      recruiterEmail?: string;
    };

    if (!resumeId || !jobId) {
      res.status(400).json({ error: "resumeId and jobId are required" });
      return;
    }

    const pair = await loadResumeAndJob(resumeId, jobId);
    if (!pair) {
      res.status(404).json({ error: "Resume or job not found" });
      return;
    }

    const { resume, job } = pair;
    const subject = emailSubject ?? `Application: ${job.title}`;
    const body =
      emailBody ??
      `Hello,\n\nI would like to apply for the ${job.title} position.\n\nThank you.`;

    const to = await resolveRecipientEmail(job.id, job.recruiterEmail, recruiterEmail);
    if (!to) {
      res.status(400).json({
        error: "Recruiter email is required. Add it on the preview page before sending.",
      });
      return;
    }

    const attachment = await resumeFileAttachment(resume.filePath, resume.name);
    if (!attachment) {
      res.status(400).json({
        error:
          "Resume file is missing on the server. Re-upload your resume, then send again.",
      });
      return;
    }

    await sendEmail(to, subject, body, [attachment]);

    const application = await prisma.application.create({
      data: {
        resumeId,
        jobId,
        emailSubject: subject,
        emailBody: body,
        status: "sent",
        sentAt: new Date(),
      },
      include: { resume: true, job: true },
    });

    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: formatSendError(err) });
  }
});

applicationRouter.post("/schedule", async (req, res) => {
  try {
    const { resumeId, jobId, emailSubject, emailBody, scheduledAt, recruiterEmail } =
      req.body as {
        resumeId?: string;
        jobId?: string;
        emailSubject?: string;
        emailBody?: string;
        scheduledAt?: string;
        recruiterEmail?: string;
      };

    if (!resumeId || !jobId || !emailSubject || !emailBody || !scheduledAt) {
      res.status(400).json({
        error:
          "resumeId, jobId, emailSubject, emailBody, and scheduledAt are required",
      });
      return;
    }

    const pair = await loadResumeAndJob(resumeId, jobId);
    if (!pair) {
      res.status(404).json({ error: "Resume or job not found" });
      return;
    }

    const to = await resolveRecipientEmail(
      pair.job.id,
      pair.job.recruiterEmail,
      recruiterEmail,
    );
    if (!to) {
      res.status(400).json({
        error: "Recruiter email is required before scheduling.",
      });
      return;
    }

    const application = await prisma.application.create({
      data: {
        resumeId,
        jobId,
        emailSubject,
        emailBody,
        status: "scheduled",
        scheduledAt: new Date(scheduledAt),
      },
      include: { resume: true, job: true },
    });

    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to schedule application" });
  }
});
