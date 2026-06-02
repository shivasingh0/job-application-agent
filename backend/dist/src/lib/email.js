import nodemailer from "nodemailer";
/** Gmail via App Password: https://support.google.com/accounts/answer/185833 */
function smtpConfig() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    return {
        host,
        port,
        secure: process.env.SMTP_SECURE === "true",
        auth: user && pass ? { user, pass } : undefined,
    };
}
const transporter = nodemailer.createTransport(smtpConfig());
export async function sendEmail(to, subject, body) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER;
    if (!from) {
        throw new Error("Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD (or SMTP_FROM, SMTP_USER, SMTP_PASS).");
    }
    await transporter.sendMail({
        from,
        to,
        subject,
        text: body,
    });
}
//# sourceMappingURL=email.js.map