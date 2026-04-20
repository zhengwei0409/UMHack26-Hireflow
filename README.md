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
| Database | PostgreSQL + Prisma ORM (Docker) |
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

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

---

### Step 1: Configure .env

```bash
cd backend
cp .env.example .env
```

Fill in these values in `backend/.env`:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Any random string |
| `GOOGLE_CLIENT_ID` | See Google OAuth setup below |
| `GOOGLE_CLIENT_SECRET` | See Google OAuth setup below |
| `GLM_API_KEY` | Get from PM |

> `DATABASE_URL` is already handled by Docker — leave it as-is.

**Google OAuth Setup** (everyone does this once):
1. Go to https://console.cloud.google.com → create a new project
2. Left menu → **APIs & Services** → **OAuth consent screen** → **Get started**
   - User Type: **External**, fill in app name and your email
3. Left menu → **Clients** → **Create OAuth client**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/v1/auth/google/callback`
4. Copy the **Client ID** and **Client Secret** into `.env`

---

### Step 2: Start Backend (one command)

```bash
docker compose up --build
```

- Backend → http://localhost:3000
- PostgreSQL → localhost:5432 (auto-created, no manual setup needed)

Database migrations run automatically on startup.

To stop: `docker compose down`
To wipe the database too: `docker compose down -v`

---

### Step 3: Start Frontend

```bash
cd frontend && npm install && npm run dev
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

