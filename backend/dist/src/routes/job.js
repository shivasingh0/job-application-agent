import { Router } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
export const jobRouter = Router();
jobRouter.get("/", async (_req, res) => {
    try {
        const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" } });
        res.json(jobs);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list jobs" });
    }
});
jobRouter.post("/analyze", async (req, res) => {
    try {
        const { sourceUrl, jobText, title, recruiterEmail } = req.body;
        if (!sourceUrl && !jobText) {
            res.status(400).json({ error: "Provide sourceUrl or jobText" });
            return;
        }
        let analyzed = {
            title: title ?? "Untitled role",
            recruiterEmail: recruiterEmail ?? "",
            jobText: jobText ?? "",
            sourceUrl: sourceUrl ?? "",
        };
        const aiUrl = process.env.AI_SERVICE_URL;
        if (aiUrl) {
            const { data } = await axios.post(`${aiUrl}/parse-jd`, {
                job_text: jobText ?? "",
            });
            analyzed = {
                title: data.title ?? analyzed.title,
                recruiterEmail: data.recruiter_email ?? analyzed.recruiterEmail,
                jobText: data.job_text ?? analyzed.jobText,
                sourceUrl: data.source_url ?? sourceUrl ?? analyzed.sourceUrl,
            };
        }
        else if (!jobText && sourceUrl) {
            analyzed.jobText = `Job posting from ${sourceUrl}`;
        }
        const job = await prisma.job.create({ data: analyzed });
        res.status(201).json(job);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to analyze job" });
    }
});
//# sourceMappingURL=job.js.map