import axios from "axios";

/** Extract a readable message from axios / unknown errors (e.g. FastAPI `detail`). */
export function formatServiceError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { detail?: string | Array<{ msg?: string }>; error?: string }
      | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d) => d.msg ?? "").filter(Boolean).join("; ");
    }
    if (typeof data?.error === "string") return data.error;
    if (err.code === "ECONNREFUSED") {
      return "AI service is not running (start it on port 8000).";
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
