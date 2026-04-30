# Railway Cloud Deployment Guide

## Deploy HireFlow + AI Interviewer to Railway

### Prerequisites

1. Railway account: https://railway.app
2. GitHub repository connected to Railway
3. DeepSeek API key for AI Interviewer

---

## Step 1: Connect Repository

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Select `zhengwei0409/UMHack26-Hireflow`
4. Select branch: `ai-interviewer`

---

## Step 2: Configure Services

Railway will auto-detect the `railway.json` and create 4 services:

### Service 1: `hireflow-backend`
- **Root Directory:** `backend`
- **Environment Variables:**
  - `JWT_SECRET` - generate a random string
  - `DATABASE_URL` - auto-provided by Railway Postgres
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - your Gmail SMTP settings
  - `FROM_EMAIL` - your email
  - `GLM_API_KEY` - your ILMU API key
  - `GLM_API_BASE` - `https://api.ilmu.ai/v1`

### Service 2: `hireflow-frontend`
- **Root Directory:** `frontend`
- **Environment Variables:**
  - `VITE_API_BASE` - set to `${{ RAILWAY_PRIVATE_DOMAIN }}/hireflow-backend/api/v1`
  - `PORT` - `4173`

### Service 3: `ai-interviewer`
- **Root Directory:** `.` (root)
- **Dockerfile Path:** `dashboard/Dockerfile`
- **Environment Variables:**
  - `ILMU_API_KEY` - your DeepSeek API key
  - `ILMU_BASE_URL` - `https://api.deepseek.com/v1`
  - `CLOUD_MODE` - `true`
  - `PORT` - `8001`

### Service 4: `postgres`
- Auto-provisioned by Railway
- No manual configuration needed

---

## Step 3: Set Environment Variables

### Backend Variables

```
NODE_ENV=production
JWT_SECRET=your-random-secret-here
GLM_API_KEY=your-ilmu-api-key
GLM_API_BASE=https://api.ilmu.ai/v1
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=your-email@gmail.com
```

### Frontend Variables

```
VITE_API_BASE=${{ RAILWAY_PRIVATE_DOMAIN }}/hireflow-backend/api/v1
PORT=4173
```

### AI Interviewer Variables

```
ILMU_API_KEY=sk-your-deepseek-api-key
ILMU_BASE_URL=https://api.deepseek.com/v1
CLOUD_MODE=true
PORT=8001
```

---

## Step 4: Deploy

1. Click "Deploy" in Railway dashboard
2. Railway will build and deploy all 4 services
3. Wait for all services to show "Active" status

---

## Step 5: Run Database Migration

1. Open the `hireflow-backend` service in Railway
2. Go to "Settings" → "Run"
3. Run command: `npx prisma migrate deploy`
4. This creates the database tables

---

## Step 6: Access Your App

- **Frontend:** `https://hireflow-frontend.up.railway.app`
- **Backend API:** `https://hireflow-backend.up.railway.app`
- **AI Interviewer:** `https://ai-interviewer.up.railway.app`

---

## Important Notes

### AI Interviewer Limitations in Cloud

⚠️ **The AI Interviewer bot requires Docker to run**, which Railway does NOT support (no Docker-in-Docker).

**Workaround Options:**

1. **Hybrid Approach:** Deploy HireFlow to Railway, but run AI Interviewer bots locally:
   - Set `CLOUD_MODE=false` for local deployment
   - Bots run on your local machine with Docker
   - Dashboard connects to local bots via webhook

2. **Use a VPS:** Deploy to a VPS (DigitalOcean, Linode) that supports Docker
   - Full functionality available
   - More setup required

3. **Mock Mode:** Show UI but bots don't actually join meetings
   - Good for demo purposes
   - No real meeting participation

---

## Troubleshooting

### Build Fails

Check build logs in Railway dashboard. Common issues:
- Missing environment variables
- Prisma migration not run
- Python dependencies not installing

### Can't Connect to Database

- Verify `DATABASE_URL` is set correctly
- Run `npx prisma migrate deploy` manually

### AI Interviewer Not Working

- Check if `ILMU_API_KEY` is set
- Verify `CLOUD_MODE=true`
- Check logs for Docker errors (expected in Railway)

---

## Cost

Railway free tier includes:
- $5 free credit monthly
- Auto-sleep after inactivity
- Limited to 500 hours/month

For production use, upgrade to paid plan (~$5-20/month depending on usage).

---

## Next Steps

After successful deployment:

1. **Integrate dashboards** - Add AI Interviewer link/tab to main HireFlow dashboard
2. **Test the flow** - Create a job, apply, conduct AI interview
3. **Monitor usage** - Check Railway metrics for API calls and database usage

For integration instructions, see `DASHBOARD_INTEGRATION.md` (to be created).
