const EMAIL_PATTERN =
  /[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/gi;

const IGNORED_DOMAINS = new Set([
  "example.com",
  "email.com",
  "domain.com",
  "yoursite.com",
  "test.com",
]);

const PREFERRED_LOCAL_HINTS = [
  "career",
  "careers",
  "hr",
  "jobs",
  "hiring",
  "recruit",
  "talent",
  "apply",
  "resume",
];

function scoreEmail(email: string): number {
  const local = email.split("@")[0] ?? "";
  let s = 0;
  for (const hint of PREFERRED_LOCAL_HINTS) {
    if (local.includes(hint)) s += 10;
  }
  if (local.includes("noreply") || local.includes("no-reply")) s -= 20;
  return s;
}

export function extractEmailFromText(text: string): string {
  if (!text?.trim()) return "";

  const matches = text.match(EMAIL_PATTERN) ?? [];
  const unique = [...new Set(matches.map((e) => e.toLowerCase()))].filter((email) => {
    const domain = email.split("@")[1];
    return domain && !IGNORED_DOMAINS.has(domain);
  });

  if (unique.length === 0) return "";

  unique.sort((a, b) => scoreEmail(b) - scoreEmail(a));
  return unique[0] ?? "";
}

export function mergeRecruiterEmail(
  aiEmail: string | undefined,
  ...textSources: string[]
): string {
  const cleaned = aiEmail?.trim() ?? "";
  if (cleaned && EMAIL_PATTERN.test(cleaned)) return cleaned;

  const combined = textSources.filter(Boolean).join("\n");
  return extractEmailFromText(combined) || cleaned;
}
