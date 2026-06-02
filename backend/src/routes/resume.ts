import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { extractResumeText } from "../lib/extractResumeText.js";
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
  } catch (err) {
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

    const name =
      typeof req.body.name === "string" && req.body.name.trim()
        ? req.body.name.trim()
        : req.file.originalname;

    const { text, warning } = await extractResumeText(
      req.file.path,
      req.file.originalname,
    );

    const resume = await prisma.resume.create({
      data: {
        name,
        filePath: req.file.path,
        extractedText: text,
      },
    });

    res.status(201).json({
      ...resume,
      extractionWarning: warning,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload resume" });
  }
});

resumeRouter.patch("/:id", async (req, res) => {
  try {
    const { extractedText } = req.body as { extractedText?: string };
    if (typeof extractedText !== "string" || !extractedText.trim()) {
      res.status(400).json({ error: "extractedText is required" });
      return;
    }

    const resume = await prisma.resume.update({
      where: { id: req.params.id },
      data: { extractedText: extractedText.trim() },
    });
    res.json(resume);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: "Resume not found" });
  }
});

resumeRouter.post("/:id/reextract", async (req, res) => {
  try {
    const existing = await prisma.resume.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }

    const originalName = path.basename(existing.filePath);
    const { text, warning } = await extractResumeText(existing.filePath, originalName);

    const resume = await prisma.resume.update({
      where: { id: existing.id },
      data: { extractedText: text },
    });

    res.json({ ...resume, extractionWarning: warning });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to re-extract resume text" });
  }
});
