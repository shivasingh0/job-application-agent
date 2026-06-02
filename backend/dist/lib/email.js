"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
});
async function sendEmail(to, subject, body) {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
    if (!from || !process.env.SMTP_HOST) {
        throw new Error("SMTP is not configured (SMTP_HOST, SMTP_FROM).");
    }
    await transporter.sendMail({ from, to, subject, text: body });
}
//# sourceMappingURL=email.js.map