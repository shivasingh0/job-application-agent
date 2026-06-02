"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { listResumes, updateResumeText, uploadResume } from "@/lib/api";
import {
  getSelectedJobId,
  setResumeText,
  setSelectedResumeId,
} from "@/lib/session";
import type { Resume } from "@/lib/types";

export default function ResumePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );
  const [pasteResume, setPasteResume] = useState<Resume | null>(null);
  const [pasteText, setPasteText] = useState("");

  async function load() {
    try {
      setResumes(await listResumes());
    } catch {
      /* backend may be offline */
    }
  }

  useEffect(() => {
    if (!getSelectedJobId()) {
      router.replace("/job");
      return;
    }
    load();
  }, [router]);

  async function continueWithResume(resume: Resume, text: string) {
    setSelectedResumeId(resume.id);
    setResumeText(text);
    router.push("/fit");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: "Choose a resume file." });
      return;
    }
    setLoading(true);
    setMessage(null);
    setPasteResume(null);
    try {
      const resume = await uploadResume(file, name || undefined);
      setFile(null);
      setName("");
      await load();

      const text = resume.extractedText?.trim() ?? "";
      if (text) {
        setMessage({ type: "success", text: `Uploaded “${resume.name}”.` });
        await continueWithResume(resume, text);
        return;
      }

      setPasteResume(resume);
      setPasteText("");
      setMessage({
        type: "error",
        text:
          resume.extractionWarning ||
          "Could not read text from this file. Paste your resume below to continue.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onPasteContinue() {
    if (!pasteResume) return;
    const text = pasteText.trim();
    if (!text) {
      setMessage({ type: "error", text: "Paste your resume text first." });
      return;
    }
    setLoading(true);
    try {
      const updated = await updateResumeText(pasteResume.id, text);
      setMessage({ type: "success", text: "Resume text saved." });
      await continueWithResume(updated, text);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save text",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onUseExisting(resume: Resume) {
    const text = resume.extractedText?.trim() ?? "";
    if (text) {
      await continueWithResume(resume, text);
      return;
    }
    setPasteResume(resume);
    setPasteText("");
    setMessage({
      type: "error",
      text: "This upload has no extracted text. Paste your resume below.",
    });
  }

  return (
    <PageShell
      title="Upload Resume"
      description="PDF, DOCX, or TXT — text is extracted automatically for fit analysis."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <div>
              <Label>Display name (optional)</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Software Engineer resume"
              />
            </div>
            <div>
              <Label>Resume file</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Best results: PDF or DOCX with selectable text (not a scanned image).
              </p>
            </div>
            {message ? <Alert type={message.type}>{message.text}</Alert> : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading…" : "Upload resume"}
            </Button>
          </div>
        </Card>
      </form>

      {pasteResume ? (
        <Card className="mt-4 space-y-4">
          <Label>Paste resume text for “{pasteResume.name}”</Label>
          <Textarea
            rows={10}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste full resume content…"
          />
          <Button type="button" onClick={onPasteContinue} disabled={loading}>
            {loading ? "Saving…" : "Continue to fit analysis"}
          </Button>
        </Card>
      ) : null}

      {resumes.length > 0 ? (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500">Recent uploads</h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {resumes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {r.name}
                  </span>
                  {r.extractedText?.trim() ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Text extracted
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">No text — paste on next step</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUseExisting(r)}
                  className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Use for fit
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </PageShell>
  );
}
