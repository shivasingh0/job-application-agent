"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRouter = void 0;
const express_1 = require("express");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const multer_1 = __importDefault(require("multer"));
const prisma_js_1 = require("../lib/prisma.js");
const uploadDir = node_path_1.default.resolve(process.cwd(), "../uploads/resumes");
node_fs_1.default.mkdirSync(uploadDir, { recursive: true });
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const safeName = file.originalname.replace(/[^\w.-]/g, "_");
            cb(null, `${Date.now()}-${safeName}`);
        },
    }),
});
exports.resumeRouter = (0, express_1.Router)();
exports.resumeRouter.post("/upload", upload.single("resume"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "Missing resume file (field: resume)" });
            return;
        }
        const name = typeof req.body.name === "string" && req.body.name.trim()
            ? req.body.name.trim()
            : req.file.originalname;
        const resume = await prisma_js_1.prisma.resume.create({
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