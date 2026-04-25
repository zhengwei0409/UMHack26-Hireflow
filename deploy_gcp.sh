#!/bin/bash
# GCP Deployment Script for HireFlow AI Interviewer
# Run this on your local machine with gcloud CLI installed

set -e

PROJECT_ID="hr-interview-system-494109"
REGION="us-central1"
BACKEND_SERVICE="hireflow-backend"
DB_INSTANCE="hireflow-db"
DB_NAME="hireflow"

echo "=========================================="
echo "HireFlow GCP Deployment"
echo "=========================================="

# Step 1: Login and set project
echo "[1/8] Logging into GCP..."
gcloud auth login
gcloud config set project $PROJECT_ID

# Step 2: Enable APIs
echo "[2/8] Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloud-sql.googleapis.com \
  sqladmin.googleapis.com

# Step 3: Create Cloud SQL
echo "[3/8] Creating Cloud SQL..."
gcloud sql instances create $DB_INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --quiet || echo "Instance may already exist"

gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet || echo "Database may already exist"

# Step 4: Set postgres password
echo "[4/8] Setting database password..."
echo "Enter a strong password for postgres:"
read -s DB_PASSWORD
gcloud sql users set-password postgres --instance=$DB_INSTANCE --password="$DB_PASSWORD"

# Step 5: Get API keys from user
echo "[5/8] Getting API configuration..."
echo "DeepSeek API Key (ILMU_API_KEY):"
read GLM_API_KEY

echo "JWT Secret (generate or provide):"
read JWT_SECRET

echo "Gmail Email:"
read EMAIL

echo "Gmail App Password:"
read -s EMAIL_PASS

# Step 6: Deploy Backend
echo "[6/8] Deploying Backend to Cloud Run..."
cd backend

gcloud run deploy $BACKEND_SERVICE \
  --source . \
  --region=$REGION \
  --allow-unauthenticated \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:$DB_INSTANCE \
  --set-env-vars="DATABASE_URL=postgresql://postgres:$DB_PASSWORD@/hireflow?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE,JWT_SECRET=$JWT_SECRET,GLM_API_KEY=$GLM_API_KEY,FROM_EMAIL=$EMAIL,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=$EMAIL,SMTP_PASS=$EMAIL_PASS" \
  --quiet

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")
echo "Backend deployed to: $BACKEND_URL"

# Step 7: Deploy Frontend
echo "[7/8] Deploying Frontend to Firebase..."
cd ../frontend

echo "VITE_API_BASE=$BACKEND_URL/api/v1" > .env.production
npm install
npm run build

firebase init hosting --project=$PROJECT_ID --public=dist --single-page=y --quiet || echo "Firebase may need manual init"
firebase deploy --project=$PROJECT_ID

# Step 8: Summary
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Frontend: https://$PROJECT_ID.web.app"
echo "Backend API: $BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Register at frontend URL"
echo "2. Create a job"
echo "3. Share with candidates!"