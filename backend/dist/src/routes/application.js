import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../lib/email.js";
export const applicationRouter = Router();
async function loadResumeAndJob(resumeId, jobId) {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list applications" });
    }
});
applicationRouter.post("/send", async (req, res) => {
    try {
        const { resumeId, jobId, emailSubject, emailBody } = req.body;
        if (!resumeId || !jobId) {
            res.status(400).json({ error: "resumeId and jobId are required" });
            return;
        }
        const pair = await loadResumeAndJob(resumeId, jobId);
        if (!pair) {
            res.status(404).json({ error: "Resume or job not found" });
            return;
        }
        const { job } = pair;
        const subject = emailSubject ?? `Application: ${job.title}`;
        const body = emailBody ??
            `Hello,\n\nI would like to apply for the ${job.title} position.\n\nThank you.`;
        if (!job.recruiterEmail) {
            res.status(400).json({ error: "Job has no recruiter email" });
            return;
        }
        await sendEmail(job.recruiterEmail, subject, body);
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send application" });
    }
});
applicationRouter.post("/schedule", async (req, res) => {
    try {
        const { resumeId, jobId, emailSubject, emailBody, scheduledAt } = req.body;
        if (!resumeId || !jobId || !emailSubject || !emailBody || !scheduledAt) {
            res.status(400).json({
                error: "resumeId, jobId, emailSubject, emailBody, and scheduledAt are required",
            });
            return;
        }
        const pair = await loadResumeAndJob(resumeId, jobId);
        if (!pair) {
            res.status(404).json({ error: "Resume or job not found" });
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to schedule application" });
    }
});
//# sourceMappingURL=application.js.map