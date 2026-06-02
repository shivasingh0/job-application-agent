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

### AI provider (`ai-service/.env`)

Set `AI_PROVIDER` to `gemini` or `groq` and the matching API key:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash

# or
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

`GET http://localhost:8000/health` returns the active provider and model.

Scheduled emails: `node-cron` runs every minute, sends due applications, marks them `sent`.
