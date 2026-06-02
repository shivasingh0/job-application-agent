import fs from "node:fs/promises";
import path from "node:path";

export type EmailAttachment = {
  filename: string;
  path: string;
};

export async function resumeFileAttachment(
  filePath: string,
  displayName: string,
): Promise<EmailAttachment | null> {
  try {
    await fs.access(filePath);
  } catch {
    console.error(`[email] Resume file not found: ${filePath}`);
    return null;
  }

  const ext = path.extname(filePath) || path.extname(displayName) || ".pdf";
  const base = path.basename(displayName, path.extname(displayName)) || "Resume";
  const safeBase = base.replace(/[^\w.-]/g, "_").slice(0, 80);
  const filename = safeBase.includes(ext) ? safeBase : `${safeBase}${ext}`;

  return { filename, path: filePath };
}
