"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  listJobs,
  listResumes,
  scheduleApplication,
  sendApplication,
  updateJob,
} from "@/lib/api";
import { mergeRecruiterEmail } from "@/lib/extractEmail";
import {
  getFitAnalysis,
  getSelectedJobId,
  getSelectedResumeId,
} from "@/lib/session";
import type { Job, Resume } from "@/lib/types";

export default function EmailPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [jobId, setJobId] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null,
  );

  useEffect(() => {
    const fit = getFitAnalysis();
    const storedResume = getSelectedResumeId();
    const storedJob = getSelectedJobId();

    if (!fit || !storedResume || !storedJob) {
      router.replace("/fit");
      return;
    }

    setSubject(fit.personalized_email.subject);
    setBody(fit.personalized_email.body);

    Promise.all([listResumes(), listJobs()])
      .then(async ([r, j]) => {
        setResumes(r);
        const job = j.find((x) => x.id === storedJob);
        let email = mergeRecruiterEmail(
          job?.recruiterEmail,
          fit.recruiter_email,
          job?.jobText ?? "",
        );

        if (job && email && email !== job.recruiterEmail) {
          try {
            const updated = await updateJob(job.id, { recruiterEmail: email });
            setJobs(j.map((x) => (x.id === updated.id ? updated : x)));
          } catch {
            setJobs(j);
          }
        } else {
          setJobs(j);
        }

        setRecruiterEmail(email);
        if (r.some((x) => x.id === storedResume)) setResumeId(storedResume);
        if (j.some((x) => x.id === storedJob)) setJobId(storedJob);
      })
      .catch(() => {});
  }, [router]);

  const hasRecipient = Boolean(recruiterEmail.trim());

  async function onSend() {
    if (!resumeId || !jobId || !subject || !body) {
      setMessage({ type: "error", text: "Fill in resume, job, subject, and body." });
      return;
    }
    if (!recruiterEmail.trim()) {
      setMessage({
        type: "error",
        text: "Enter the recruiter or hiring manager email before sending.",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await sendApplication({
        resumeId,
        jobId,
        emailSubject: subject,
        emailBody: body,
        recruiterEmail: recruiterEmail.trim(),
      });
      setMessage({ type: "success", text: "Email sent." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Send failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSchedule() {
    if (!resumeId || !jobId || !subject || !body || !scheduledAt) {
      setMessage({ type: "error", text: "Set a schedule date and complete the email." });
      return;
    }
    if (!recruiterEmail.trim()) {
      setMessage({ type: "error", text: "Enter a recruiter email before scheduling." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await scheduleApplication({
        resumeId,
        jobId,
        emailSubject: subject,
        emailBody: body,
        scheduledAt: new Date(scheduledAt).toISOString(),
        recruiterEmail: recruiterEmail.trim(),
      });
      setMessage({ type: "success", text: "Email scheduled." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Schedule failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="Email Preview"
      description="Review your personalized email, then send now or schedule via Gmail."
    >
      <div className="space-y-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Resume</Label>
              <Select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                <option value="">Select…</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Job</Label>
              <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">Select…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Label>Recruiter email (required to send)</Label>
            <Input
              type="email"
              value={recruiterEmail}
              onChange={(e) => setRecruiterEmail(e.target.value)}
              placeholder="hiring@company.com"
            />
            <p className="mt-1 text-xs text-zinc-500">
              {hasRecipient
                ? "Your uploaded resume file is attached automatically when you send."
                : "LinkedIn posts often hide emails — paste the contact from the job post or company site."}
            </p>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div>
              <Label>Schedule for (optional)</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            {message ? <Alert type={message.type}>{message.text}</Alert> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onSend} disabled={loading || !hasRecipient}>
                Send now
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onSchedule}
                disabled={loading || !hasRecipient}
              >
                Schedule
              </Button>
              <Link href="/fit" className="self-center text-sm text-zinc-500 underline">
                Back to fit
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
