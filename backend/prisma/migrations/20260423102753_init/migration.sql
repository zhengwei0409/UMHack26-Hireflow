-- CreateEnum
CREATE TYPE "VerticalType" AS ENUM ('GENERIC', 'HEALTHCARE', 'CONSTRUCTION');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "investigationResult" JSONB,
ADD COLUMN     "pendingQuestions" JSONB,
ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "vertical" "VerticalType" DEFAULT 'GENERIC';

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "chatId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'AWAITING_QUESTIONS',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "responses" JSONB NOT NULL DEFAULT '[]',
    "scoreAdjust" INTEGER NOT NULL DEFAULT 0,
    "initiatedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiasAuditSnapshot" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "decision" "ScreeningDecision" NOT NULL,
    "score" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "inferredGender" TEXT,
    "nameOrigin" TEXT,
    "universityTier" INTEGER,
    "triggerType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiasAuditSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_candidateId_key" ON "TelegramSession"("candidateId");

-- AddForeignKey
ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
