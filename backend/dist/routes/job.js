"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRouter = void 0;
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_js_1 = require("../lib/prisma.js");
exports.jobRouter = (0, express_1.Router)();
exports.jobRouter.post("/analyze", async (req, res) => {
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
            const { data } = await axios_1.default.post(`${aiUrl}/analyze`, {
                sourceUrl,
                jobText,
            });
            analyzed = {
                title: data.title ?? analyzed.title,
                recruiterEmail: data.recruiterEmail ?? analyzed.recruiterEmail,
                jobText: data.jobText ?? analyzed.jobText,
                sourceUrl: data.sourceUrl ?? analyzed.sourceUrl,
            };
        }
        else if (!jobText && sourceUrl) {
            analyzed.jobText = `Job posting from ${sourceUrl}`;
        }
        const job = await prisma_js_1.prisma.job.create({ data: analyzed });
        res.status(201).json(job);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to analyze job" });
    }
});
//# sourceMappingURL=job.js.map