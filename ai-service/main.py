import io
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from extract_email import merge_recruiter_email
from llm_client import generate_typed, provider_info
from schemas import (
    AnalyzeFitRequest,
    EmailGenerated,
    FitAnalysis,
    GenerateEmailRequest,
    JobParsed,
    ParseJDRequest,
)

load_dotenv()

app = FastAPI(title="Job Application AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

JD_VALIDATION_KEYS = """
- is_job_posting (boolean: true only if this is a real job description/posting)
- validation_message (string: empty when is_job_posting is true; otherwise explain why — e.g. login page, profile, feed, not a job)
"""

EMAIL_EXTRACTION_HINT = """
CRITICAL — recruiter_email: Find every application/contact email in the posting.
Look in "Interested?", "Apply", "Send resume to", "Contact", HR/hiring boxes, and footer text.
Copy the exact address (e.g. career@company.com). Never leave recruiter_email empty if any email is visible.
Include found emails inside job_text as well.
"""

PARSE_JD_PROMPT = f"""Extract job details from the job description text below.
Return JSON with exactly these keys:
- title (string)
- company (string, empty if unknown)
- location (string, empty if unknown)
- recruiter_email (string — application/hiring email; see rules below)
- job_text (string, cleaned summary of the role)
{EMAIL_EXTRACTION_HINT}
- requirements (array of strings)
- skills (array of strings)
- source_url (string, empty if unknown)
{JD_VALIDATION_KEYS}

Job description:
"""

SCREENSHOT_PROMPT = f"""This image is a screenshot of a job posting (e.g. LinkedIn, Indeed, Instagram, company hiring graphic).
Extract the job details and return JSON with exactly these keys:
- title (string)
- company (string, empty if unknown)
- location (string, empty if unknown)
- recruiter_email (string — application/hiring email; see rules below)
- job_text (string, cleaned summary of the role)
{EMAIL_EXTRACTION_HINT}
- requirements (array of strings)
- skills (array of strings)
- source_url (string, empty if visible in the image)
{JD_VALIDATION_KEYS}
"""

FIT_ANALYSIS_PROMPT = """Analyze how well this candidate fits the job.
Return JSON with exactly these keys:
- match_score (integer 0-100)
- matching_skills (array of strings)
- missing_skills (array of strings)
- experience_match (string: one of "Strong", "Partial", "Weak", with brief reason)
- recruiter_email (string — copy application email from posting exactly; required if visible anywhere in job description)
- recommendation (string, 2-4 sentences for the candidate: apply or not, what to emphasize)
- personalized_email (object with keys subject and body — professional application email, plain text body)

Candidate resume:
{resume_text}

Role: {job_title}
Company: {company}
Recruiter email from posting: {recruiter_email}

Job description:
{job_text}
"""

EMAIL_PROMPT_TEMPLATE = """Write a professional job application email.
Return JSON with exactly these keys:
- subject (string)
- body (string, plain text, ready to send)

Candidate resume:
{resume_text}

Role: {job_title}
Company: {company}
Recruiter email: {recruiter_email}

Job description:
{job_text}
"""


@app.get("/health")
def health():
    try:
        info = provider_info()
    except RuntimeError as exc:
        return {"ok": False, "error": str(exc)}
    return {"ok": True, **info}


def _enrich_job_parsed(parsed: JobParsed, *extra_text: str) -> JobParsed:
    email = merge_recruiter_email(parsed.recruiter_email, parsed.job_text, *extra_text)
    if email and email != parsed.recruiter_email:
        return parsed.model_copy(update={"recruiter_email": email})
    return parsed


@app.post("/parse-jd", response_model=JobParsed)
def parse_jd(body: ParseJDRequest):
    try:
        parsed = generate_typed(PARSE_JD_PROMPT + body.job_text, JobParsed)
        return _enrich_job_parsed(parsed, body.job_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze-screenshot", response_model=JobParsed)
async def analyze_screenshot(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file")

    try:
        raw = await file.read()
        image = Image.open(io.BytesIO(raw))
        parsed = generate_typed(SCREENSHOT_PROMPT, JobParsed, parts=[image])
        return _enrich_job_parsed(parsed)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/analyze-fit", response_model=FitAnalysis)
def analyze_fit(body: AnalyzeFitRequest):
    known_email = merge_recruiter_email(
        body.recruiter_email, body.job_text
    )
    prompt = FIT_ANALYSIS_PROMPT.format(
        resume_text=body.resume_text,
        job_title=body.job_title,
        company=body.company or "Unknown",
        recruiter_email=known_email or "Unknown",
        job_text=body.job_text,
    )
    try:
        result = generate_typed(prompt, FitAnalysis)
        email = merge_recruiter_email(
            result.recruiter_email,
            body.job_text,
            body.recruiter_email,
        )
        if email and email != result.recruiter_email:
            return result.model_copy(update={"recruiter_email": email})
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/generate-email", response_model=EmailGenerated)
def generate_email(body: GenerateEmailRequest):
    prompt = EMAIL_PROMPT_TEMPLATE.format(
        resume_text=body.resume_text,
        job_title=body.job_title,
        company=body.company or "Unknown",
        recruiter_email=body.recruiter_email or "Unknown",
        job_text=body.job_text or body.job_title,
    )
    try:
        return generate_typed(prompt, EmailGenerated)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
