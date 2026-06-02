import "dotenv/config";
import cors from "cors";
import express from "express";
import { formatSendError, getEmailConfigError, verifySmtp } from "./lib/email.js";
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
  const emailError = getEmailConfigError();
  res.json({ ok: true, emailConfigured: !emailError, emailHint: emailError });
});

app.get("/health/email", async (_req, res) => {
  const configError = getEmailConfigError();
  if (configError) {
    res.status(503).json({ ok: false, error: configError });
    return;
  }
  try {
    await verifySmtp();
    res.json({ ok: true, message: "SMTP login successful" });
  } catch (err) {
    res.status(502).json({ ok: false, error: formatSendError(err) });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  const emailError = getEmailConfigError();
  if (emailError) {
    console.warn(`[email] ${emailError}`);
  }
  startScheduledEmailCron();
});
