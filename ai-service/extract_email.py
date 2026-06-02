import re

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)

IGNORED_EMAILS = {
    "example.com",
    "email.com",
    "domain.com",
    "yoursite.com",
    "test.com",
}

PREFERRED_LOCAL_PARTS = (
    "career",
    "careers",
    "hr",
    "jobs",
    "hiring",
    "recruit",
    "talent",
    "apply",
    "resume",
)


def extract_email_from_text(text: str) -> str:
    if not text or not text.strip():
        return ""

    found: list[str] = []
    for match in EMAIL_PATTERN.finditer(text):
        email = match.group(0).lower()
        domain = email.split("@")[-1]
        if domain in IGNORED_EMAILS:
            continue
        if email not in found:
            found.append(email)

    if not found:
        return ""

    def score(email: str) -> int:
        local = email.split("@")[0]
        s = 0
        for hint in PREFERRED_LOCAL_PARTS:
            if hint in local:
                s += 10
        if "noreply" in local or "no-reply" in local:
            s -= 20
        return s

    found.sort(key=score, reverse=True)
    return found[0]


def merge_recruiter_email(ai_email: str, *text_sources: str) -> str:
    cleaned = (ai_email or "").strip()
    if cleaned and EMAIL_PATTERN.search(cleaned):
        return cleaned

    combined = "\n".join(t for t in text_sources if t)
    return extract_email_from_text(combined) or cleaned
