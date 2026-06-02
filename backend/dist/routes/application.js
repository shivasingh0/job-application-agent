"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const email_js_1 = require("../lib/email.js");
exports.applicationRouter = (0, express_1.Router)();
async function loadResumeAndJob(resumeId, jobId) {
    const [resume, job] = await Promise.all([
        prisma_js_1.prisma.resume.findUnique({ where: { id: resumeId } }),
        prisma_js_1.prisma.job.findUnique({ where: { id: jobId } }),
    ]);
    if (!resume || !job) {
        return null;
    }
    return { resume, job };
}
exports.applicationRouter.get("/", async (_req, res) => {
    try {
        const applications = await prisma_js_1.prisma.application.findMany({
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
exports.applicationRouter.post("/send", async (req, res) => {
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
        await (0, email_js_1.sendEmail)(job.recruiterEmail, subject, body);
        const application = await prisma_js_1.prisma.application.create({
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
exports.applicationRouter.post("/schedule", async (req, res) => {
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
        const application = await prisma_js_1.prisma.application.create({
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