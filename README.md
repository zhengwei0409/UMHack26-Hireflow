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
- Git

---

### Step 1: Install PostgreSQL

**Windows** — Download and install from https://www.postgresql.org/download/windows/

During install, set a password for the `postgres` user (remember it).

After install, open pgAdmin or psql and create the database:
```sql
CREATE DATABASE umhack_hr;
```

---

### Step 2: Configure .env

```bash
cd backend
cp .env.example .env
```

Fill in these values in `backend/.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:<your-password>@localhost:5432/umhack_hr` |
| `JWT_SECRET` | Any random string |
| `GOOGLE_CLIENT_ID` | See Google OAuth setup below |
| `GOOGLE_CLIENT_SECRET` | See Google OAuth setup below |
| `GLM_API_KEY` | Get from PM |

`GOOGLE_REDIRECT_URI` is already set in `.env.example`, leave it as-is.

**Google OAuth Setup** (everyone does this once):
1. Go to https://console.cloud.google.com → create a new project
2. Left menu → **APIs & Services** → **OAuth consent screen** → **Get started**
   - User Type: **External**, fill in app name and your email
3. Left menu → **Clients** → **Create OAuth client**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/v1/auth/google/callback`
4. Copy the **Client ID** and **Client Secret** into `.env`

---

### Step 3: Install & Migrate

```bash
cd backend
npm install
npx prisma migrate dev
```

---

### Step 4: Start

```bash
# Backend
cd backend && npm run dev
# → http://localhost:3000

# Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

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

