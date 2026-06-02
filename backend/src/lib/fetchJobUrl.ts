import axios from "axios";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BLOCKED_MARKERS = [
  "authwall",
  "sign in",
  "sign up",
  "login",
  "join linkedin",
  "session_redirect",
];

export type FetchJobUrlResult =
  | { ok: true; text: string }
  | { ok: false; reason: "blocked" | "fetch_failed"; message: string };

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksBlocked(html: string, status: number): boolean {
  if (status === 401 || status === 403 || status === 999) return true;
  const lower = html.toLowerCase();
  if (lower.length < 200) return true;
  const hits = BLOCKED_MARKERS.filter((m) => lower.includes(m)).length;
  return hits >= 2;
}

export async function fetchJobPageText(url: string): Promise<FetchJobUrlResult> {
  try {
    const { data, status } = await axios.get<string>(url, {
      timeout: 15_000,
      maxContentLength: 2_000_000,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      validateStatus: () => true,
      responseType: "text",
    });

    const html = typeof data === "string" ? data : "";
    if (looksBlocked(html, status)) {
      return {
        ok: false,
        reason: "blocked",
        message:
          "Could not read this job page (login wall or blocked). Upload a screenshot of the posting instead.",
      };
    }

    const text = stripHtml(html);
    if (text.length < 100) {
      return {
        ok: false,
        reason: "blocked",
        message:
          "Page returned too little text to parse. Upload a screenshot of the job posting instead.",
      };
    }

    return { ok: true, text: text.slice(0, 50_000) };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch job URL";
    return { ok: false, reason: "fetch_failed", message };
  }
}
