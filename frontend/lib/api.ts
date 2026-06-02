import type {
  Application,
  EmailGenerated,
  FitAnalysis,
  Job,
  JobParsed,
  Resume,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AI = process.env.NEXT_PUBLIC_AI_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  blocked?: boolean;
  status?: number;
  validation_message?: string;

  constructor(
    message: string,
    opts?: { blocked?: boolean; status?: number; validation_message?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.blocked = opts?.blocked;
    this.status = opts?.status;
    this.validation_message = opts?.validation_message;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Request failed (${res.status})`;
    throw new ApiError(message, {
      blocked: data.blocked === true,
      status: res.status,
      validation_message:
        typeof data.validation_message === "string"
          ? data.validation_message
          : undefined,
    });
  }
  return data as T;
}

export function listResumes() {
  return request<Resume[]>(`${API}/resume`);
}

export function uploadResume(file: File, name?: string) {
  const form = new FormData();
  form.append("resume", file);
  if (name) form.append("name", name);
  return request<Resume & { extractionWarning?: string }>(`${API}/resume/upload`, {
    method: "POST",
    body: form,
  });
}

export function updateResumeText(id: string, extractedText: string) {
  return request<Resume>(`${API}/resume/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extractedText }),
  });
}

export function reextractResume(id: string) {
  return request<Resume & { extractionWarning?: string }>(
    `${API}/resume/${id}/reextract`,
    { method: "POST" },
  );
}

export function listJobs() {
  return request<Job[]>(`${API}/job`);
}

export function analyzeJob(body: {
  sourceUrl?: string;
  jobText?: string;
  title?: string;
  recruiterEmail?: string;
  company?: string;
}) {
  return request<Job>(`${API}/job/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateJob(
  id: string,
  body: { recruiterEmail?: string; title?: string },
) {
  return request<Job>(`${API}/job/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function analyzeScreenshot(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<JobParsed>(`${AI}/analyze-screenshot`, {
    method: "POST",
    body: form,
  });
}

export function analyzeFit(body: {
  resume_text: string;
  job_title: string;
  job_text: string;
  company?: string;
  recruiter_email?: string;
}) {
  return request<FitAnalysis>(`${AI}/analyze-fit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function listApplications() {
  return request<Application[]>(`${API}/applications`);
}

export function sendApplication(body: {
  resumeId: string;
  jobId: string;
  emailSubject: string;
  emailBody: string;
  recruiterEmail?: string;
}) {
  return request<Application>(`${API}/application/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function scheduleApplication(body: {
  resumeId: string;
  jobId: string;
  emailSubject: string;
  emailBody: string;
  scheduledAt: string;
  recruiterEmail?: string;
}) {
  return request<Application>(`${API}/application/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function assertValidJobPosting(parsed: JobParsed) {
  if (parsed.is_job_posting === false) {
    throw new Error(
      parsed.validation_message ||
        "This does not look like a job posting. Upload a screenshot of the job post.",
    );
  }
}
