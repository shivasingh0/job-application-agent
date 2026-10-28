# Job Application Agent

Personal AI pipeline for job applications.

```
LinkedIn URL / Screenshot
            ↓
AI extracts & validates JD
            ↓
Upload Resume
            ↓
Gemini fit analysis (/analyze-fit)
            ↓
Match score, skills, recommendation, personalized email
            ↓
Preview
            ↓
Send OR Schedule
            ↓
Gmail
```

If a LinkedIn URL cannot be fetched (login wall), the UI prompts for a screenshot of the posting.

## Services

| Service | Port | Role |
|---------|------|------|
| **frontend** | 3000 | Next.js UI |
| **backend** | 3001 | Express, Prisma, Gmail (nodemailer), node-cron, URL fetch |
| **ai-service** | 8000 | FastAPI + Gemini or Groq (`/parse-jd`, `/analyze-screenshot`, `/analyze-fit`) |

## Quick start

```bash
# Database
cd backend && npx prisma migrate dev && npx prisma generate

# Backend (set GMAIL_USER + GMAIL_APP_PASSWORD in .env)
npm run dev

# AI service (configure ai-service/.env — see below)
cd ../ai-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Frontend
cd ../frontend && cp .env.local.example .env.local && npm run dev
```

## Gmail setup

1. Enable 2-Step Verification on your Google account.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. In `backend/.env`:

```env
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM=you@gmail.com
AI_SERVICE_URL=http://localhost:8000
```

### AI provider and fallback models (`ai-service/.env`)

Configure primary provider, models, and fallback chains. If a model doesn't respond or exceeds rate/quota limits, the system automatically falls back to secondary models and providers:

```env
# Active provider: groq | gemini (with automatic provider fallback)
AI_PROVIDER=groq
AI_FALLBACK_PROVIDER=gemini

# Groq models + fallbacks
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODELS=openai/gpt-oss-20b,qwen/qwen3.8-27b,llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Gemini models + fallbacks
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODELS=gemini-3.7-flash,gemini-3.6-flash,gemini-flash-latest
```

`GET http://localhost:8000/health` returns the active provider chain, primary model, and all fallback models.

Scheduled emails: `node-cron` runs every minute, sends due applications, marks them `sent`.
