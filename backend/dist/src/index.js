import "dotenv/config";
import cors from "cors";
import express from "express";
import { startScheduledEmailCron } from "./jobs/scheduledEmails.js";
import { applicationRouter } from "./routes/application.js";
import { jobRouter } from "./routes/job.js";
import { resumeRouter } from "./routes/resume.js";
const app = express();
const port = Number(process.env.PORT ?? 3001);
app.use(cors());
app.use(express.json());
app.use("/resume", resumeRouter);
app.use("/job", jobRouter);
app.use("/application", applicationRouter);
app.use("/applications", applicationRouter);
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    startScheduledEmailCron();
});
//# sourceMappingURL=index.js.map