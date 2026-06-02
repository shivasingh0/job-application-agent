import type { FitAnalysis } from "./types";

const PREFIX = "jobAgent:";

export function getSelectedResumeId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PREFIX}resumeId`);
}

export function setSelectedResumeId(id: string) {
  localStorage.setItem(`${PREFIX}resumeId`, id);
}

export function getSelectedJobId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PREFIX}jobId`);
}

export function setSelectedJobId(id: string) {
  localStorage.setItem(`${PREFIX}jobId`, id);
}

export function getResumeText(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${PREFIX}resumeText`) ?? "";
}

export function setResumeText(text: string) {
  localStorage.setItem(`${PREFIX}resumeText`, text);
}

export function getFitAnalysis(): FitAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${PREFIX}fitAnalysis`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FitAnalysis;
  } catch {
    return null;
  }
}

export function setFitAnalysis(fit: FitAnalysis) {
  sessionStorage.setItem(`${PREFIX}fitAnalysis`, JSON.stringify(fit));
}

export function clearFitAnalysis() {
  sessionStorage.removeItem(`${PREFIX}fitAnalysis`);
}
