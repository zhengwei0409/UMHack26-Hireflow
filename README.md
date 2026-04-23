# HireFlow — AI-Powered HR Hiring Pipeline

> Built for UMHack 2026 · Domain: AI Systems & Agentic Workflow Automation

HireFlow automates the end-to-end hiring process using an LLM (GLM) as the central reasoning engine. HR teams only make Accept / Reject decisions at key checkpoints — everything else is handled automatically, including an AI-conducted technical interview round.

---

## What It Does

```
Candidate uploads CV via public portal
        ↓
GLM analyzes CV against job requirements → scores, strengths, weaknesses, recommendation
        ↓
Auto-screen decision (PASS / REVIEW / REJECT) based on configurable threshold
        ↓
HR reviews GLM analysis → Accept / Reject / Override CV
        ↓
AI sends interview invite email (unique token link) → AI_INTERVIEW_INVITED
        ↓
Candidate opens link → consent screen → AI interview room
        ↓
AI-conducted interview: DSA coding, MCQ, Behavioral, all evaluated by the GLM agent
+ Proctoring: tab-switch / camera-loss / copy-paste integrity events logged
        ↓
Candidate submits → AI scores session → candidates ranked and shortlisted
Scoring: 45% DSA + 20% MCQ + 15% Behavioral + 20% CV − proctoring penalty
        ↓
HR reviews ranked shortlist → Advance to Human Interview / Reject after AI
        ↓
HR schedules human interview (date/time/location) → email sent to candidate
        ↓
Candidate receives email with Confirm / Request Reschedule links
        ↓
Candidate confirms → HR notified → HR marks interview done
        ↓
HR → Accept / Reject after interview
        ↓
GLM generates offer letter → email sent → Candidate onboarded
```

**Without GLM**: No CV screening, no AI interview generation, no behavioral scoring, no offer letter generation, no intelligent workflow coordination.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM (Docker) |
| AI | ILMU AI (`ilmu-glm-5.1`) |
| Auth | JWT + Google OAuth |
| Email | Gmail SMTP |
| File Storage | Local (`uploads/`) |

---

## Current Features

### Backend API
- **Auth**: Register, login, JWT tokens, Google OAuth, forgot-password
- **Jobs**: CRUD job postings with requirements, configurable `autoScreenThreshold` and `shortlistSize`
- **Candidates**: CV upload (PDF/DOCX), list, view details, full state history audit log
- **Auto-Screen**: GLM CV scoring with configurable threshold — auto PASS / REVIEW / REJECT
- **AI Interview Pipeline**: Session creation with unique invite token, AI-generated questions (DSA / MCQ / Behavioral), GLM agentic answer evaluation, proctoring event logging, screen + camera recording upload
- **Scoring & Ranking**: Weighted formula, proctor penalty, per-job ranked shortlist with HR shortlist toggle
- **AI Evidence Report**: Full per-candidate AI interview report for HR audit
- **Workflow Actions**: Accept/Reject CV, override auto-screen, schedule interview, mark done, accept/reject after interview
- **Interview Response**: Public endpoints for candidate confirm/reschedule
- **GLM Integration**: ILMU AI (`ilmu-glm-5.1`) for CV parsing, question generation, DSA/MCQ/behavioral answer evaluation, and offer letter generation
- **Email**: Gmail SMTP sending working

### Frontend
- HR Login / Register (email + Google OAuth)
- Dashboard with hiring funnel stats
- Job management (create, edit, delete, configure AI thresholds)
- Candidate pipeline with GLM scores and auto-screen decisions
- Candidate detail: GLM analysis, workflow actions, state history, full AI report
- Interview scheduling modal
- **AI Interview Room** (`/interview/:token`): consent screen, camera + screen recording, DSA code editor, MCQ, behavioral, integrity violation detection
- **Ranked Shortlist** view for HR: scores, rank, advance / reject actions
- CV upload portal for candidates (`/apply/:jobId`)
- Interview response pages (`/interview/confirm/:id`, `/interview/reschedule/:id`)
- Post-interview completion confirmation with score breakdown

### Workflow States

```
APPLIED → CV_PARSING → CV_UNDER_REVIEW → CV_REJECTED (terminal)
                                    ↓
                    [auto-screen: PASS / REVIEW / REJECT]
                                    ↓ (HR accept)
                         AI_INTERVIEW_INVITED
                                    ↓
                         AI_INTERVIEW_IN_PROGRESS
                                    ↓
                         AI_INTERVIEW_COMPLETED
                                    ↓
                         AI_INTERVIEW_SCORED  ← ranked shortlist computed
                                    ↓
              ┌─────────────────────┴─────────────────────┐
              ↓                                           ↓
    INTERVIEW_PENDING                           INTERVIEW_REJECTED (terminal)
              ↓
    INTERVIEW_SCHEDULED → INTERVIEW_CONFIRMED / RESCHEDULE_REQUESTED
              ↓
    INTERVIEW_DONE → INTERVIEW_REJECTED (terminal)
              ↓
    OFFER_GENERATING → OFFER_SENT → HIRED (terminal)

Error / Retry States:
  CV_PARSE_FAILED → retry → CV_PARSING
  INTERVIEW_INVITE_FAILED → retry → AI_INTERVIEW_INVITED
  FAILED (generic terminal)
```

---

## Planned Features (Roadmap)

### AI Candidate Outreach via WhatsApp / Telegram
- AI agent will proactively contact candidates through WhatsApp or Telegram to collect additional information, clarify resume gaps, or remind them about pending interview steps
- Removes friction of email-only communication; reaches candidates on channels they actually use

### GitHub Profile Crawler
- AI will automatically crawl a candidate's linked GitHub account to assess code quality, project diversity, commit consistency, and language breadth
- Extracted signals feed into the CV scoring step as supplemental evidence alongside the uploaded CV

### Bias Audit Module
- All AI decisions (CV scoring, behavioral scoring, ranking) will be logged with full prompt + response evidence
- A dedicated audit view will flag statistically anomalous score distributions across demographic proxies (name-derived ethnicity, gender signals in CV text)
- HR admins can run a bias report per job to verify the pipeline did not systematically favour or penalise any group

---

## Project Structure

```
UMHack26/
├── backend/                 ← Express API (TypeScript)
│   ├── src/
│   │   ├── routes/          ← API endpoints
│   │   ├── controllers/     ← Request/response handlers
│   │   ├── services/
│   │   │   ├── glm.service.ts                    ← ILMU AI GLM (ilmu-glm-5.1)
│   │   │   ├── email.service.ts                  ← Gmail SMTP
│   │   │   ├── auto-screen.service.ts            ← CV threshold scoring
│   │   │   ├── interview-orchestrator.service.ts ← AI interview sessions
│   │   │   ├── ranking.service.ts                ← Scoring + shortlist
│   │   │   ├── proctor.service.ts                ← Integrity event logging
│   │   │   └── workflow-automation.service.ts
│   │   ├── middleware/      ← Auth
│   │   └── workflow/        ← State machine (states.ts, engine.ts)
│   ├── prisma/
│   │   └── schema.prisma    ← Database schema
│   ├── server.ts
│   └── .env.example
├── frontend/                ← React + Vite
│   ├── src/
│   │   ├── pages/           ← All pages (including InterviewRoom, RankedShortlist)
│   │   ├── components/
│   │   └── services/api.js  ← API client
│   └── vite.config.js
└── docs/
    ├── backend.md           ← API docs
    ├── workflow-states.md   ← State machine reference
    ├── learning-log.md      ← Key concepts explained
    └── ai-prescreen-verification-checklist.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop running
- Gmail App Password (for email)
- ILMU AI API key (for AI features — model: `ilmu-glm-5.1`)

### 1. Clone & Setup

```bash
git clone https://github.com/zhengwei0409/UMHack26-Hireflow.git
cd UMHack26-Hireflow
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/umhack_hr"
JWT_SECRET="your-secret-key"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
FROM_EMAIL="your-email@gmail.com"
GLM_API_KEY="your-ilmu-ai-key"
GLM_API_BASE="https://api.ilmu.ai/v1"
```

### 3. Start Database

```bash
docker run -d --name hireflow-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=umhack_hr \
  -p 5432:5432 postgres:15
```

### 4. Run Migrations & Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
# → http://localhost:3000
```

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API Endpoints

### Auth
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/register` | POST | Public | Register HR |
| `/api/v1/auth/login` | POST | Public | Login |
| `/api/v1/auth/forgot-password` | POST | Public | Password reset |
| `/api/v1/auth/google` | GET | Public | Google OAuth redirect |
| `/api/v1/auth/me` | GET | JWT | Current user info |

### Jobs
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/jobs` | GET/POST | JWT | List / Create jobs |
| `/api/v1/jobs/:id` | GET/PATCH | JWT | Get / Update job |
| `/api/v1/jobs/:id/prescreen-config` | PATCH | JWT | Set auto-screen threshold & shortlist size |
| `/api/v1/jobs/:id` | DELETE | JWT | Delete job |

### Candidates
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/candidates/apply` | POST | Public | Candidate uploads CV |
| `/api/v1/candidates` | GET | JWT | List candidates (filter by job/status) |
| `/api/v1/candidates/:id` | GET | JWT | Candidate detail |
| `/api/v1/candidates/:id/cv` | GET | JWT | Download CV file |
| `/api/v1/candidates/:id/history` | GET | JWT | State transition audit log |
| `/api/v1/candidates/:id/ai-report` | GET | JWT | Full AI interview evidence report |
| `/api/v1/candidates/:id/actions/accept-cv` | POST | JWT | Accept CV |
| `/api/v1/candidates/:id/actions/reject-cv` | POST | JWT | Reject CV |
| `/api/v1/candidates/:id/actions/override-auto-screen-pass` | POST | JWT | Override rejected CV to AI interview |
| `/api/v1/candidates/:id/actions/schedule-interview` | POST | JWT | Schedule human interview |
| `/api/v1/candidates/:id/actions/advance-to-human-interview` | POST | JWT | Move AI-scored candidate to human interview |
| `/api/v1/candidates/:id/actions/reject-after-ai` | POST | JWT | Reject after AI interview round |
| `/api/v1/candidates/:id/actions/mark-interview-done` | POST | JWT | Mark human interview complete |
| `/api/v1/candidates/:id/actions/accept-interview` | POST | JWT | Accept after human interview |
| `/api/v1/candidates/:id/actions/reject-interview` | POST | JWT | Reject after human interview |
| `/api/v1/candidates/:id/actions/retry` | POST | JWT | Retry from failed state |
| `/api/v1/candidates/respond/:id/confirm` | POST | Public | Candidate confirms interview |
| `/api/v1/candidates/respond/:id/reschedule` | POST | Public | Candidate requests reschedule |
| `/api/v1/candidates/:id` | DELETE | JWT | Delete candidate |

### AI Interview
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/interviews/session/:token` | GET | Public | Get session by invite token |
| `/api/v1/interviews/session/:token/start` | POST | Public | Candidate starts interview |
| `/api/v1/interviews/session/:token/answers` | POST | Public | Submit / update answer |
| `/api/v1/interviews/session/:token/proctor-events` | POST | Public | Log integrity event |
| `/api/v1/interviews/session/:token/recordings` | POST | Public | Upload screen + camera recording |
| `/api/v1/interviews/session/:token/submit` | POST | Public | Submit interview, trigger scoring |
| `/api/v1/interviews/ranked-shortlist` | GET | JWT | HR ranked shortlist view |
| `/api/v1/interviews/ranked-shortlist/:sessionId` | PATCH | JWT | Toggle shortlist status |

### Dashboard
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/dashboard` | GET | JWT | Hiring funnel stats + per-job breakdown |

---

## How It Works (Demo Flow)

1. **Create Job** → HR creates job posting with auto-screen threshold (default 60/100)
2. **Share Link** → HR copies public apply link (`/apply/:jobId`)
3. **Candidate Applies** → uploads CV, receives confirmation email
4. **GLM Analysis** → automatically parses CV, scores 0–100, PASS/REVIEW/REJECT decision
5. **HR Decision** → views score in dashboard, Accepts or Rejects (or overrides)
6. **AI Interview Invite** → system emails unique interview link to candidate
7. **Candidate Enters Interview Room** → consent screen, camera + screen recording starts
8. **AI Interview** → candidate answers AI-generated DSA, MCQ, and behavioral questions
9. **Proctoring** → tab switches, camera loss, copy-paste events auto-logged and penalised in score
10. **Submit & Score** → GLM evaluates each answer, computes weighted total, re-ranks all candidates for the job
11. **HR Reviews Shortlist** → ranked shortlist view, HR toggles shortlist, advances top candidates to human interview
12. **Schedule Human Interview** → HR sets date/time/location, email sent to candidate with Confirm/Reschedule links
13. **Candidate Confirms** → HR notified by email
14. **Interview Done** → HR marks interview done, Accept or Reject
15. **Offer Letter** → GLM auto-generates offer letter, email sent to candidate
16. **Hired** → candidate status → HIRED

---

## Team

| Role | Responsibility |
|---|---|
| Frontend Developer | React + Vite UI, Interview Room, Ranked Shortlist |
| Backend Developer | Express API, Prisma, Workflow Engine |
| AI/ML Engineer | ILMU AI GLM integration, scoring pipeline |
| Workflow Engineer | State machine, auto-screen, proctoring |
| Integrator / PM / QA | Testing, docs, end-to-end integration |

---

## Documentation

| Document | Purpose |
|---|---|
| [docs/backend.md](docs/backend.md) | Full API reference |
| [docs/workflow-states.md](docs/workflow-states.md) | State machine states & transitions |
| [docs/learning-log.md](docs/learning-log.md) | Key concepts explained |
| [docs/ai-prescreen-verification-checklist.md](docs/ai-prescreen-verification-checklist.md) | AI pipeline verification checklist |
