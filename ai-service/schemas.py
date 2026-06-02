from pydantic import BaseModel, Field


class ParseJDRequest(BaseModel):
    job_text: str = Field(min_length=1)


class JobParsed(BaseModel):
    title: str
    company: str = ""
    location: str = ""
    recruiter_email: str = ""
    job_text: str = ""
    requirements: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    source_url: str = ""
    is_job_posting: bool = True
    validation_message: str = ""


class GenerateEmailRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_title: str = Field(min_length=1)
    company: str = ""
    job_text: str = ""
    recruiter_email: str = ""


class EmailGenerated(BaseModel):
    subject: str
    body: str


class AnalyzeFitRequest(BaseModel):
    resume_text: str = Field(min_length=1)
    job_title: str = Field(min_length=1)
    job_text: str = Field(min_length=1)
    company: str = ""
    recruiter_email: str = ""


class FitAnalysis(BaseModel):
    match_score: int = Field(ge=0, le=100)
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    experience_match: str = ""
    recruiter_email: str = ""
    recommendation: str = ""
    personalized_email: EmailGenerated
