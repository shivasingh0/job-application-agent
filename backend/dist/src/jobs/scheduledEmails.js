import cron from "node-cron";
import { sendEmail } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
export async function processScheduledEmails() {
    const due = await prisma.application.findMany({
        where: {
            status: "scheduled",
            scheduledAt: { lte: new Date() },
        },
        include: { job: true },
    });
    for (const app of due) {
        try {
            const to = app.job.recruiterEmail;
            if (!to) {
                console.error(`[cron] Application ${app.id}: job has no recruiter email`);
                continue;
            }
            await sendEmail(to, app.emailSubject, app.emailBody);
            await prisma.application.update({
                where: { id: app.id },
                data: { status: "sent", sentAt: new Date() },
            });
            console.log(`[cron] Sent scheduled application ${app.id}`);
        }
        catch (err) {
            console.error(`[cron] Failed to send application ${app.id}:`, err);
        }
    }
}
export function startScheduledEmailCron() {
    cron.schedule("* * * * *", () => {
        void processScheduledEmails();
    });
    console.log("Scheduled email cron running (every minute)");
}
//# sourceMappingURL=scheduledEmails.js.map