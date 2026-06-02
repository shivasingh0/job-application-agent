import nodemailer from "nodemailer";

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

/** Gmail / Google Workspace App Password: https://support.google.com/accounts/answer/185833 */
export function getSmtpAuth() {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const pass = rawPass.replace(/\s+/g, "");
  return { user, pass };
}

function createTransporter(): MailTransporter {
  const { user, pass } = getSmtpAuth();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();

  if (!user || !pass) {
    throw new Error(getEmailConfigError() ?? "SMTP not configured");
  }

  if (host === "smtp.gmail.com" || host === "smtp.googlemail.com") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
}

export function getEmailConfigError(): string | null {
  const { user, pass } = getSmtpAuth();
  if (!user) return "GMAIL_USER (or SMTP_USER) is not set in backend/.env";
  if (!pass)
    return "GMAIL_APP_PASSWORD (or SMTP_PASS) is not set. Use a Google App Password, not your normal password.";
  return null;
}

function workspaceHint(user: string): string {
  if (user.includes("@gmail.com")) return "";
  return (
    ` Your address (${user}) is a custom domain — use an App Password created while signed in as that exact account. ` +
    "If your company email is not on Google Workspace, set SMTP_HOST/SMTP_PORT to your provider's SMTP server instead of Gmail."
  );
}

export function formatSendError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    if (code === "EAUTH") {
      const user = getSmtpAuth().user;
      return (
        "Gmail SMTP login failed. Regenerate an App Password at https://myaccount.google.com/apppasswords " +
        "(must be signed in as the same address as GMAIL_USER). Use the 16-character password, not your login password." +
        workspaceHint(user)
      );
    }
  }
  if (err instanceof Error) return err.message;
  return "Failed to send email";
}

export async function verifySmtp(): Promise<void> {
  const t = createTransporter();
  await t.verify();
}

export type SendEmailAttachment = {
  filename: string;
  path: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  attachments?: SendEmailAttachment[],
): Promise<void> {
  if (process.env.MAIL_DRY_RUN === "true") {
    console.log("[MAIL_DRY_RUN] Would send:", {
      to,
      subject,
      body: body.slice(0, 80),
      attachments: attachments?.map((a) => a.filename),
    });
    return;
  }

  const configError = getEmailConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const from =
    (process.env.SMTP_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();

  if (!from) {
    throw new Error(
      "Set GMAIL_USER and GMAIL_APP_PASSWORD (or SMTP_FROM, SMTP_USER, SMTP_PASS).",
    );
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
    })),
  });
}
