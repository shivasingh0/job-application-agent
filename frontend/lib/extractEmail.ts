const EMAIL_PATTERN =
  /[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/gi;

export function extractEmailFromText(text: string): string {
  if (!text.trim()) return "";
  const matches = [...text.matchAll(EMAIL_PATTERN)].map((m) => m[0].toLowerCase());
  const unique = [...new Set(matches)].filter(
    (e) => !e.endsWith("@example.com") && !e.includes("noreply"),
  );
  const preferred = unique.find((e) =>
    /career|careers|hr|hiring|jobs|apply|resume|recruit/i.test(e),
  );
  return preferred ?? unique[0] ?? "";
}

export function mergeRecruiterEmail(
  primary: string | undefined,
  ...sources: string[]
): string {
  const cleaned = primary?.trim() ?? "";
  if (cleaned) return cleaned;
  for (const src of sources) {
    const found = extractEmailFromText(src);
    if (found) return found;
  }
  return "";
}
