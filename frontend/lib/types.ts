export type Resume = {
  id: string;
  name: string;
  filePath: string;
  extractedText?: string;
  createdAt: string;
  extractionWarning?: string;
};

export type Job = {
  id: string;
  title: string;
  company?: string;
  recruiterEmail: string;
  jobText: string;
  sourceUrl: string;
  createdAt: string;
  aiWarning?: string;
};

export type Application = {
  id: string;
  emailSubject: string;
  emailBody: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  resumeId: string;
  jobId: string;
  resume: Resume;
  job: Job;
};

export type JobParsed = {
  title: string;
  company: string;
  location: string;
  recruiter_email: string;
  job_text: string;
  requirements: string[];
  skills: string[];
  source_url: string;
  is_job_posting?: boolean;
  validation_message?: string;
};

export type EmailGenerated = {
  subject: string;
  body: string;
};

export type FitAnalysis = {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  experience_match: string;
  recruiter_email: string;
  recommendation: string;
  personalized_email: EmailGenerated;
};
