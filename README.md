# HireFlow — AI-Powered HR Hiring Pipeline

> Built for UMHack 2026 · Domain: AI Systems & Agentic Workflow Automation

HireFlow automates the end-to-end hiring process using GLM (General Language Model) as the central reasoning engine. HR teams only make Accept / Reject decisions at key checkpoints — everything else is handled automatically.

---

## What It Does

```
Candidate uploads CV
        ↓
GLM reads and scores the CV
        ↓
HR reviews the recommendation → Accept / Reject
        ↓
System sends interview invitation automatically
        ↓
Post-interview: HR → Accept / Reject
        ↓
GLM generates offer letter → Candidate is onboarded
```

Without GLM, the system cannot screen CVs, generate offer letters, or coordinate across workflow stages.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Z.AI GLM API |
| Auth | JWT |
| File Storage | Local (`uploads/`) |

---

## Project Structure

```
UMHack26/
├── backend/          ← Express API (TypeScript)
│   ├── src/
│   │   ├── routes/       ← URL routing
│   │   ├── controllers/  ← Request/response handling
│   │   ├── services/     ← Business logic + GLM calls
│   │   ├── middleware/   ← Auth, validation
│   │   └── workflow/     ← State machine engine
│   ├── prisma/
│   │   └── schema.prisma ← Database schema
│   ├── server.ts
│   └── .env.example
├── frontend/         ← React + Vite app
└── docs/
    ├── backend.md          ← API documentation
    ├── workflow-states.md  ← State machine design
    └── learning-log.md     ← Concepts explained for the team
```

---

## Team Setup

### Prerequisites

- Node.js v18+
- PostgreSQL installed and running
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL in .env:
# DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/umhack_hr"

# Create the database
createdb umhack_hr

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Start dev server
npm run dev
# → Server running on http://localhost:3000
# → Test: curl http://localhost:3000/health
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → App running on http://localhost:5173
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Any random string (e.g. run `openssl rand -hex 32`) |
| `GLM_API_KEY` | Z.AI GLM API key (get from PM) |
| `RESEND_API_KEY` | Email API key (optional for now) |
| `PORT` | Backend port (default: 3000) |

---

## Docs

| Document | Purpose |
|---|---|
| [docs/backend.md](docs/backend.md) | All API endpoints, request/response format, build status |
| [docs/workflow-states.md](docs/workflow-states.md) | State machine diagram and transition rules |
| [docs/learning-log.md](docs/learning-log.md) | Concepts explained — read this if something is confusing |

---

## Team

| Role | Responsibility |
|---|---|
| Frontend | React + Vite UI, dashboard, candidate portal |
| Backend | Express API, auth, database, file upload |
| AI/ML Engineer | GLM integration, CV parsing, offer letter generation |
| Workflow Engineer | State machine engine (`src/workflow/engine.ts`) |
| Integrator / PM / QA | Integration, coordination, testing |

---

