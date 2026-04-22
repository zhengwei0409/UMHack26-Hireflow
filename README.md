# HireFlow — AI-Powered HR Hiring Pipeline

> Built for UMHack 2026 · Domain: AI Systems & Agentic Workflow Automation

HireFlow automates the end-to-end hiring process using GLM (DeepSeek) as the central reasoning engine. HR teams only make Accept / Reject decisions at key checkpoints — everything else is handled automatically.

---

## What It Does

```
Candidate uploads CV via public portal
        ↓
GLM analyzes CV against job requirements → scores, strengths, weaknesses, recommendation
        ↓
HR reviews GLM analysis → Accept / Reject CV
        ↓
HR schedules interview (date/time/location) → email sent to candidate
        ↓
Candidate receives email with Confirm / Request Reschedule links
        ↓
Candidate confirms → HR notified → HR marks interview done
        ↓
HR → Accept / Reject after interview
        ↓
GLM generates offer letter → email sent → Candidate onboarded
```

**Without GLM**: No CV screening, no offer letter generation, no intelligent workflow coordination.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM (Docker) |
| AI | DeepSeek API (GLM) |
| Auth | JWT + Google OAuth |
| Email | Gmail SMTP |
| File Storage | Local (`uploads/`) |

---

## Current Features

### Backend API
- **Auth**: Register, login, JWT tokens, Google OAuth
- **Jobs**: CRUD job postings with requirements
- **Candidates**: CV upload (PDF/DOCX), list, view details
- **Workflow Actions**: Accept/Reject CV, schedule interview, mark done, accept/reject interview
- **Interview Response**: Public endpoints for candidate confirm/reschedule
- **GLM Integration**: Real DeepSeek API for CV parsing and offer letter generation
- **Email**: Gmail SMTP sending working

### Frontend
- HR Login/Register
- Dashboard with stats
- Job management (create, edit, delete)
- Candidate pipeline with GLM scores
- Candidate detail with actions
- Interview scheduling modal
- CV upload portal for candidates (`/apply/:jobId`)
- Interview response pages (`/interview/confirm/:id`, `/interview/reschedule/:id`)

### Workflow States
```
APPLIED → CV_PARSING → CV_UNDER_REVIEW → CV_REJECTED (terminal)
                                    ↓
                              INTERVIEW_PENDING → INTERVIEW_SCHEDULED → (candidate confirms/requests reschedule)
                                                                 ↓
                                                      INTERVIEW_CONFIRMED / RESCHEDULE_REQUESTED
                                                                 ↓
                                                      INTERVIEW_DONE → INTERVIEW_REJECTED (terminal)
                                                                 ↓
                                                      OFFER_GENERATING → OFFER_SENT → HIRED (terminal)
```

---

## Project Structure

```
UMHack26-Hireflow/
├── backend/              ← Express API (TypeScript)
│   ├── src/
│   │   ├── routes/         ← API endpoints
│   │   ├── controllers/    ← Request/response
│   │   ├── services/       ← Business logic
│   │   │   ├── glm.service.ts       ← DeepSeek API
│   │   │   ├── email.service.ts     ← Gmail SMTP
│   │   │   └── workflow-automation.service.ts
│   │   ├── middleware/    ← Auth
│   │   └── workflow/       ← State machine
│   ├── prisma/
│   │   └── schema.prisma  ← Database
│   ├── server.ts
│   └── .env.example
├─�� frontend/             ← React + Vite
│   ├── src/
│   │   ├── pages/        ← All pages
│   │   └── services/     ← API client
│   └── vite.config.js
└── docs/
    ├── backend.md        ← API docs
    ├── workflow-states.md
    └── learning-log.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop running
- Gmail App Password (for email)

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
DEEPSEEK_API_KEY="your-deepseek-key"
```

### 3. Start Database

```bash
docker run -d --name hireflow-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=umhack_hr -p 5432:5432 postgres:15
```

### 4. Run migrations

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

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/register` | POST | Public | Register HR |
| `/api/v1/auth/login` | POST | Public | Login |
| `/api/v1/jobs` | GET/POST | JWT | List/Create jobs |
| `/api/v1/candidates` | GET | JWT | List candidates |
| `/api/v1/candidates/apply` | POST | Public | Candidate applies |
| `/api/v1/candidates/:id/actions/accept-cv` | POST | JWT | Accept CV |
| `/api/v1/candidates/:id/actions/schedule-interview` | POST | JWT | Schedule interview |
| `/api/v1/candidates/:id/actions/mark-interview-done` | POST | JWT | Mark interview done |
| `/api/v1/candidates/:id/actions/accept-interview` | POST | JWT | Accept after interview |
| `/api/v1/candidates/respond/:id/confirm` | POST | Public | Candidate confirms |
| `/api/v1/candidates/respond/:id/reschedule` | POST | Public | Candidate requests reschedule |
| `/api/v1/candidates/:id` | DELETE | JWT | Delete candidate |

---

## How It Works (Demo Flow)

1. **Create Job** → HR creates job posting in dashboard
2. **Share Link** → HR copies public apply link (`/apply/:jobId`)
3. **Candidate Applies** → Candidate uploads CV, receives confirmation email
4. **GLM Analysis** → Automatically parses CV, scores (0-100), returns recommendation
5. **HR Decision** → HR views score in dashboard, Accepts or Rejects
6. **Schedule Interview** → HR clicks "Schedule Interview", enters date/time/location
7. **Candidate Email** → Candidate receives email with Confirm/Reschedule links
8. **Candidate Confirms** → Candidate clicks link, enters email, confirms
9. **HR Notified** → Email sent to HR confirming interview
10. **Interview Done** → HR marks interview done
11. **HR Decision** → Accept or Reject candidate
12. **Offer Letter** → GLM auto-generates offer letter, email sent
13. **Hired** → Candidate status → HIRED

---

## Team

| Role | Responsibility |
|---|---|
| Frontend Developer | React + Vite UI |
| Backend Developer | Express API, Prisma |
| AI/ML Engineer | DeepSeek integration |
| Workflow Engineer | State machine, automation |
| Integrator/PM/QA | Testing, docs |

---

## Documentation

| Document | Purpose |
|---|---|
| [docs/backend.md](docs/backend.md) | Full API reference |
| [docs/workflow-states.md](docs/workflow-states.md) | State machine states & transitions |
| [docs/learning-log.md](docs/learning-log.md) | Key concepts explained |


## Note
We have not get the GLM API key yet.