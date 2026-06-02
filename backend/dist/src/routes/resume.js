import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
const uploadDir = path.resolve(process.cwd(), "../uploads/resumes");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const safeName = file.originalname.replace(/[^\w.-]/g, "_");
            cb(null, `${Date.now()}-${safeName}`);
        },
    }),
});
export const resumeRouter = Router();
resumeRouter.get("/", async (_req, res) => {
    try {
        const resumes = await prisma.resume.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json(resumes);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list resumes" });
    }
});
resumeRouter.post("/upload", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "Missing resume file (field: resume)" });
            return;
        }
        const name = typeof req.body.name === "string" && req.body.name.trim()
            ? req.body.name.trim()
            : req.file.originalname;
        const resume = await prisma.resume.create({
            data: {
                name,
                filePath: req.file.path,
            },
        });
        res.status(201).json(resume);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to upload resume" });
    }
});
//# sourceMappingURL=resume.js.map