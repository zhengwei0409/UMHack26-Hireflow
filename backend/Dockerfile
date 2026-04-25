# GCP Cloud Run ready
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY prisma ./prisma
COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 8080

# Cloud Run sets PORT env var automatically
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
