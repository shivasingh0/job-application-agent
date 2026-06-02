"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Button, Card, Input, Label } from "@/components/ui";
import {
  analyzeJob,
  analyzeScreenshot,
  ApiError,
  assertValidJobPosting,
  listJobs,
} from "@/lib/api";
import { setSelectedJobId } from "@/lib/session";
import type { Job, JobParsed } from "@/lib/types";

type Tab = "url" | "screenshot";

export default function JobPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  async function load() {
    try {
      setJobs(await listJobs());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveJob(job: Job) {
    setSelectedJobId(job.id);
    setMessage({
      type: job.aiWarning ? "error" : "success",
      text: job.aiWarning ?? `Saved “${job.title}”.`,
    });
    await load();
    if (!job.aiWarning) {
      setShowFallback(false);
      router.push("/resume");
    }
  }

  async function saveFromParsed(parsed: JobParsed, url?: string) {
    assertValidJobPosting(parsed);
    const job = await analyzeJob({
      title: parsed.title,
      recruiterEmail: parsed.recruiter_email?.trim() || undefined,
      jobText: parsed.job_text,
      sourceUrl: parsed.source_url || url || "",
      company: parsed.company,
    });
    await saveJob(job);
  }

  async function onScreenshot(file: File, url?: string) {
    const parsed = await analyzeScreenshot(file);
    await saveFromParsed(parsed, url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (tab === "screenshot") {
        if (!screenshot) throw new Error("Choose a LinkedIn screenshot.");
        await onScreenshot(screenshot, sourceUrl || undefined);
        setScreenshot(null);
        return;
      }

      if (!sourceUrl.trim()) throw new Error("Enter a LinkedIn job URL.");

      const job = await analyzeJob({ sourceUrl });
      await saveJob(job);
      setSourceUrl("");
    } catch (err) {
      if (err instanceof ApiError && (err.blocked || err.status === 409)) {
        setShowFallback(true);
        setMessage({
          type: "error",
          text: err.message,
        });
      } else {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to add job",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function onFallbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fallbackFile) {
      setMessage({ type: "error", text: "Choose a screenshot of the job post." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await onScreenshot(fallbackFile, sourceUrl || undefined);
      setFallbackFile(null);
      setShowFallback(false);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Screenshot analysis failed",
      });
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "url", label: "LinkedIn URL" },
    { id: "screenshot", label: "Screenshot" },
  ];

  return (
    <PageShell
      title="Add Job"
      description="LinkedIn URL or screenshot → Gemini extracts and validates the job description."
    >
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-emerald-600/50 bg-emerald-600 text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600"
                : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <div className="space-y-4">
            {tab === "url" ? (
              <div key="job-url">
                <Label>LinkedIn job URL</Label>
                <Input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/jobs/…"
                />
              </div>
            ) : (
              <div key="job-screenshot">
                <Label>Screenshot of job post</Label>
                <Input
                  key="screenshot-picker"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {message ? <Alert type={message.type}>{message.text}</Alert> : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Analyzing…" : "Extract job"}
            </Button>
          </div>
        </Card>
      </form>

      {showFallback ? (
        <Card className="mt-6 border-amber-200 dark:border-amber-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            URL could not be read
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a screenshot of the LinkedIn job posting. AI will verify it is a real job
            description.
          </p>
          <form onSubmit={onFallbackSubmit} className="mt-4 space-y-4">
            <Input
              key="fallback-screenshot"
              type="file"
              accept="image/*"
              onChange={(e) => setFallbackFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Analyzing…" : "Upload screenshot"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFallback(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {jobs.length > 0 ? (
        <Card className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-500">Saved jobs</h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {jobs.map((j) => (
              <li key={j.id} className="py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{j.title}</p>
                    {j.recruiterEmail ? (
                      <p className="text-xs text-zinc-500">{j.recruiterEmail}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId(j.id);
                      router.push("/resume");
                    }}
                    className="shrink-0 text-xs text-zinc-500 underline"
                  >
                    Continue
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </PageShell>
  );
}
