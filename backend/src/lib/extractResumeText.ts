import fs from "node:fs/promises";
import path from "node:path";

export type ExtractResult = {
  text: string;
  format: string;
  warning?: string;
};

export async function extractResumeText(
  filePath: string,
  originalName: string,
): Promise<ExtractResult> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".txt") {
    const text = (await fs.readFile(filePath, "utf8")).trim();
    return { text, format: "txt" };
  }

  if (ext === ".pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const buffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      const text = (parsed.text ?? "").trim();
      if (!text) {
        return {
          text: "",
          format: "pdf",
          warning:
            "PDF has no readable text (it may be scanned). Paste your resume text manually.",
        };
      }
      return { text, format: "pdf" };
    } catch (err) {
      console.error("PDF parse error:", err);
      return {
        text: "",
        format: "pdf",
        warning: "Could not parse PDF. Paste your resume text manually.",
      };
    }
  }

  if (ext === ".docx") {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      const text = (result.value ?? "").trim();
      if (!text) {
        return {
          text: "",
          format: "docx",
          warning: "Word file had no text. Paste your resume manually.",
        };
      }
      return { text, format: "docx" };
    } catch (err) {
      console.error("DOCX parse error:", err);
      return {
        text: "",
        format: "docx",
        warning: "Could not parse Word file. Paste your resume text manually.",
      };
    }
  }

  if (ext === ".doc") {
    return {
      text: "",
      format: "doc",
      warning: "Old .doc format is not supported. Save as PDF or DOCX, or paste text manually.",
    };
  }

  return {
    text: "",
    format: ext || "unknown",
    warning: "Unsupported file type. Use PDF, DOCX, or TXT, or paste text manually.",
  };
}
