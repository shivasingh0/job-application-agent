"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Button, Card, Label, Textarea } from "@/components/ui";
import {
  analyzeFit,
  listJobs,
  listResumes,
  reextractResume,
  updateJob,
  updateResumeText,
} from "@/lib/api";
import {
  getResumeText,
  getSelectedJobId,
  getSelectedResumeId,
  setFitAnalysis,
  setResumeText,
} from "@/lib/session";
import type { FitAnalysis, Job, Resume } from "@/lib/types";

export default function FitPage() {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [manualText, setManualText] = useState("");
  const [needsText, setNeedsText] = useState(false);
  const [fit, setFit] = useState<FitAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  const jobId = getSelectedJobId();
  const resumeId = getSelectedResumeId();

  useEffect(() => {
    if (!jobId || !resumeId) {
      router.replace(jobId ? "/resume" : "/job");
      return;
    }

    Promise.all([listJobs(), listResumes()])
      .then(([j, r]) => {
        const selectedJob = j.find((x) => x.id === jobId);
        const selectedResume = r.find((x) => x.id === resumeId);
        if (!selectedJob || !selectedResume) {
          setMessage({ type: "error", text: "Selected job or resume not found." });
          return;
        }
        setJob(selectedJob);
        setResume(selectedResume);
        const text =
          selectedResume.extractedText?.trim() || getResumeText().trim();
        if (text) {
          runAnalysis(selectedJob, selectedResume, text);
        } else {
          setNeedsText(true);
          setManualText(getResumeText());
          setMessage({
            type: "error",
            text: "No resume text was extracted from your file. Paste it below or retry extraction.",
          });
        }
      })
      .catch(() => {
        setMessage({ type: "error", text: "Failed to load job or resume." });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAnalysis(selectedJob: Job, selectedResume: Resume, resumeText: string) {
    setLoading(true);
    setMessage(null);
    setNeedsText(false);
    try {
      const result = await analyzeFit({
        resume_text: resumeText,
        job_title: selectedJob.title,
        job_text: selectedJob.jobText,
        company: selectedJob.company ?? "",
        recruiter_email: selectedJob.recruiterEmail,
      });
      setFit(result);
      setResumeText(resumeText);

      if (result.recruiter_email && !selectedJob.recruiterEmail) {
        try {
          const updated = await updateJob(selectedJob.id, {
            recruiterEmail: result.recruiter_email,
          });
          setJob(updated);
        } catch {
          /* non-fatal */
        }
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Fit analysis failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSaveAndAnalyze() {
    if (!job || !resume) return;
    const text = manualText.trim();
    if (!text) {
      setMessage({ type: "error", text: "Paste your resume text first." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const updated = await updateResumeText(resume.id, text);
      setResume(updated);
      setResumeText(text);
      await runAnalysis(job, updated, text);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save resume text",
      });
      setLoading(false);
    }
  }

  async function onReextract() {
    if (!job || !resume) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await reextractResume(resume.id);
      setResume(updated);
      if (updated.extractedText?.trim()) {
        setManualText(updated.extractedText);
        await runAnalysis(job, updated, updated.extractedText);
      } else {
        setNeedsText(true);
        setMessage({
          type: "error",
          text:
            updated.extractionWarning ||
            "Still no text from file. Paste your resume below.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Re-extraction failed",
      });
    } finally {
      setLoading(false);
    }
  }

  function onContinue() {
    if (!fit) return;
    setFitAnalysis(fit);
    router.push("/email");
  }

  return (
    <PageShell
      title="Fit Analysis"
      description="AI compares your resume to the job and drafts a personalized application email."
    >
      {loading && !fit && !needsText ? (
        <Card>
          <p className="text-sm text-zinc-500">Analyzing fit…</p>
        </Card>
      ) : null}

      {message ? <Alert type={message.type}>{message.text}</Alert> : null}

      {needsText && job && resume ? (
        <Card className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload could not read text from <strong>{resume.name}</strong>. Paste the
            content of your resume here (PDF/DOCX/TXT work best on upload).
          </p>
          <div>
            <Label>Resume text</Label>
            <Textarea
              rows={12}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste your full resume…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onSaveAndAnalyze} disabled={loading}>
              {loading ? "Analyzing…" : "Save & analyze fit"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onReextract}
              disabled={loading}
            >
              Retry file extraction
            </Button>
            <Link href="/resume" className="self-center text-sm text-zinc-500 underline">
              Re-upload resume
            </Link>
          </div>
        </Card>
      ) : null}

      {fit ? (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">Match score</p>
                <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
                  {fit.match_score}%
                </p>
              </div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${fit.match_score}%` }}
                />
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                Experience:
              </span>{" "}
              {fit.experience_match}
            </p>
            {fit.recruiter_email ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Recruiter email:
                </span>{" "}
                {fit.recruiter_email}
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-500">Matching skills</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {fit.matching_skills.length ? (
                fit.matching_skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-sm text-zinc-500">None listed</li>
              )}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-500">Missing skills</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {fit.missing_skills.length ? (
                fit.missing_skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  >
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-sm text-zinc-500">None listed</li>
              )}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-500">Recommendation</h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{fit.recommendation}</p>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-zinc-500">Personalized email (preview)</h2>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {fit.personalized_email.subject}
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
              {fit.personalized_email.body}
            </pre>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onContinue}>
              Continue to preview
            </Button>
            <Link href="/job" className="text-sm text-zinc-500 underline self-center">
              Start over
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && !fit && !needsText && !message ? (
        <Card>
          <p className="text-sm text-zinc-500">Preparing analysis…</p>
        </Card>
      ) : null}
    </PageShell>
  );
}
