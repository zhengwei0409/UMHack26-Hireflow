# GCP Deployment Guide

This guide deploys the HireFlow AI Interviewer system to Google Cloud Platform.

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   Cloud SQL      │
│ Firebase Host  │     │   Cloud Run     │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Prerequisites

- GCP Project with billing enabled
- GitHub account access
- DeepSeek API key (get from https://platform.deepseek.com)

---

## Step 1: Clone the Branch

```bash
git clone -b ai-interviewer https://github.com/zhengwei0409/UMHack26-Hireflow.git
cd UMHack26-Hireflow
```

---

## Step 2: Setup GCP

```bash
# Login to GCP
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloud-sql.googleapis.com \
  sqladmin.googleapis.com
```

---

## Step 3: Create Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create hireflow-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create hireflow --instance=hireflow-db

# Set postgres password
gcloud sql users set-password postgres \
  --instance=hireflow-db \
  --password=YOUR_STRONG_PASSWORD
```

---

## Step 4: Deploy Backend to Cloud Run

```bash
cd backend

# Build and deploy
gcloud run deploy hireflow-backend \
  --source . \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:hireflow-db \
  --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@/hireflow?host=/cloudsql/YOUR_PROJECT_ID:us-central1:hireflow-db,JWT_SECRET=your-super-secret-jwt-key,GLM_API_KEY=your-deepseek-api-key,FROM_EMAIL=your-email@gmail.com,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=your-email@gmail.com,SMTP_PASS=your-gmail-app-password"
```

**Note:** Replace:
- `YOUR_PROJECT_ID` - your GCP project ID
- `YOUR_PASSWORD` - your database password
- `your-super-secret-jwt-key` - a secure random string
- `your-deepseek-api-key` - your DeepSeek API key
- `your-email@gmail.com` - your Gmail address
- `your-gmail-app-password` - your Gmail App Password

After deployment, you'll get a URL like:
```
https://hireflow-backend-xxxxx-uc.a.run.app
```

---

## Step 5: Deploy Frontend to Firebase Hosting

```bash
cd ../frontend

# Create production env file
echo "VITE_API_BASE=https://YOUR_BACKEND_URL/api/v1" > .env.production

# Install dependencies and build
npm install
npm run build

# Deploy to Firebase
npm install -g firebase-tools
firebase login
firebase init hosting
# Select: dist, Yes for single-page app

firebase deploy
```

After deployment, you'll get a URL like:
```
https://your-project.web.app
```

---

## Step 6: Verify Deployment

1. **Backend API:** Visit `https://hireflow-backend-xxxxx-uc.a.run.app/api/v1/dashboard`
2. **Frontend:** Visit your Firebase URL
3. **Register** a new HR account and create a job
4. **Test** the full flow

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|------------|----------|
| `DATABASE_URL` | Cloud SQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `GLM_API_KEY` | DeepSeek/ILMU API key | Yes |
| `FROM_EMAIL` | Email sender address | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP server port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password/App Password | Yes |

---

## Troubleshooting

### Database Connection Failed
- Verify Cloud SQL instance is running
- Check the connection string format
- Ensure service account has Cloud SQL Client role

### 502 Bad Gateway
- Backend may have crashed. Check logs:
  ```bash
  gcloud logs read --resource=cloud_run_revision
  ```

### Frontend API Errors
- Verify `VITE_API_BASE` is set to your backend URL
- Backend URL must end with `/api/v1`

### CORS Errors
- Backend already has CORS configured for all origins
- If issues, check backend logs

---

## Cost Estimates (Free Tier)

| Service | Free Tier |
|---------|-----------|
| Cloud Run | 180,000 vCPU-seconds + 360,000 GB-seconds |
| Cloud SQL | 1 instance f1-micro (30GB) |
| Firebase Hosting | 1 GB storage + 100 MB transfer |
| Cloud Storage | 5 GB |

Total: ~$0/month for light usage

---

## Security Notes

- Never commit secrets to GitHub
- Use Secret Manager for production:
  ```bash
  echo "YOUR_SECRET" | gcloud secrets create jwt-secret --replication-policy=automatic
  ```
- Rotate API keys periodically
- Enable Cloud Armor for production traffic