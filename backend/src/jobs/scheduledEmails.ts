import cron from "node-cron";
import { sendEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { resumeFileAttachment } from "../lib/resumeAttachment.js";

export async function processScheduledEmails(): Promise<void> {
  const due = await prisma.application.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    include: { job: true, resume: true },
  });

  for (const app of due) {
    try {
      const to = app.job.recruiterEmail;
      if (!to) {
        console.error(`[cron] Application ${app.id}: job has no recruiter email`);
        continue;
      }

      const attachment = await resumeFileAttachment(
        app.resume.filePath,
        app.resume.name,
      );
      if (!attachment) {
        console.error(`[cron] Application ${app.id}: resume file missing`);
        continue;
      }

      await sendEmail(to, app.emailSubject, app.emailBody, [attachment]);

      await prisma.application.update({
        where: { id: app.id },
        data: { status: "sent", sentAt: new Date() },
      });

      console.log(`[cron] Sent scheduled application ${app.id}`);
    } catch (err) {
      console.error(`[cron] Failed to send application ${app.id}:`, err);
    }
  }
}

export function startScheduledEmailCron(): void {
  cron.schedule("* * * * *", () => {
    void processScheduledEmails();
  });
  console.log("Scheduled email cron running (every minute)");
}
