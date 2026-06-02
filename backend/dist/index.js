"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const application_js_1 = require("./routes/application.js");
const job_js_1 = require("./routes/job.js");
const resume_js_1 = require("./routes/resume.js");
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3001);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/resume", resume_js_1.resumeRouter);
app.use("/job", job_js_1.jobRouter);
app.use("/application", application_js_1.applicationRouter);
app.use("/applications", application_js_1.applicationRouter);
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map