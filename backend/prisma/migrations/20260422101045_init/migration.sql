-- CreateEnum
CREATE TYPE "ScreeningDecision" AS ENUM ('PASS', 'REVIEW', 'REJECT');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('INVITED', 'IN_PROGRESS', 'COMPLETED', 'SCORED');

-- CreateEnum
CREATE TYPE "InterviewQuestionType" AS ENUM ('DSA', 'MCQ', 'BEHAVIORAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CandidateStatus" ADD VALUE 'AI_INTERVIEW_INVITED';
ALTER TYPE "CandidateStatus" ADD VALUE 'AI_INTERVIEW_IN_PROGRESS';
ALTER TYPE "CandidateStatus" ADD VALUE 'AI_INTERVIEW_COMPLETED';
ALTER TYPE "CandidateStatus" ADD VALUE 'AI_INTERVIEW_SCORED';

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "aiInterviewRank" INTEGER,
ADD COLUMN     "aiInterviewScore" DOUBLE PRECISION,
ADD COLUMN     "autoScreenDecision" "ScreeningDecision",
ADD COLUMN     "autoScreenNotes" JSONB,
ADD COLUMN     "isShortlisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "autoScreenThreshold" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "shortlistSize" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "InterviewSessionStatus" NOT NULL DEFAULT 'INVITED',
    "inviteToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "scoredAt" TIMESTAMP(3),
    "overallScore" DOUBLE PRECISION,
    "rankPosition" INTEGER,
    "isShortlisted" BOOLEAN NOT NULL DEFAULT false,
    "scoreBreakdown" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "InterviewQuestionType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB,
    "expectedAnswer" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "rawAnswer" TEXT,
    "selectedOption" TEXT,
    "codeSubmission" TEXT,
    "programmingLanguage" TEXT,
    "executionResult" JSONB,
    "aiScore" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctorEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProctorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_inviteToken_key" ON "InterviewSession"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewQuestion_sessionId_sequence_key" ON "InterviewQuestion"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAnswer_sessionId_questionId_key" ON "CandidateAnswer"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctorEvent" ADD CONSTRAINT "ProctorEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
