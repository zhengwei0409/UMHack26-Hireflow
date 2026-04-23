import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { generateInterviewQuestions, type InterviewQuestionDraft } from './glm.service';
import { scoreSession } from './ranking.service';
import { STATES } from '../workflow/states';
import { transitionCandidateStatus } from './workflow-state.service';

function formatRequirements(requirements: unknown) {
  return Array.isArray(requirements) ? requirements.map((item) => String(item)) : [];
}

function sanitizeQuestion(question: {
  id: string;
  type: string;
  sequence: number;
  prompt: string;
  choices: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
}) {
  return {
    id: question.id,
    type: question.type,
    sequence: question.sequence,
    prompt: question.prompt,
    choices: question.choices,
    metadata: question.metadata,
  };
}

function isFinalInterviewStatus(status: string) {
  return status === 'COMPLETED' || status === 'SCORED';
}

async function buildQuestionDrafts(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  const drafts = await generateInterviewQuestions({
    jobTitle: candidate.job.title,
    jobDescription: candidate.job.description,
    requirements: formatRequirements(candidate.job.requirements),
    cvSummary:
      candidate.glmAnalysis && typeof candidate.glmAnalysis === 'object' && 'summary' in candidate.glmAnalysis
        ? String((candidate.glmAnalysis as { summary?: unknown }).summary ?? '')
        : undefined,
  });

  return {
    candidate,
    drafts,
  };
}

async function createSession(candidateId: string, questionDrafts: InterviewQuestionDraft[]) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  return prisma.interviewSession.create({
    data: {
      candidateId,
      jobId: candidate.jobId,
      inviteToken: crypto.randomBytes(24).toString('hex'),
      status: 'INVITED',
      metadata: {
        generatedForStatus: candidate.status,
      } as Prisma.InputJsonValue,
      questions: {
        create: questionDrafts.map((draft, index) => ({
          type: draft.type,
          sequence: index + 1,
          prompt: draft.prompt,
          choices: draft.choices as Prisma.InputJsonValue | undefined,
          metadata: draft.metadata as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: {
      candidate: true,
      questions: {
        orderBy: { sequence: 'asc' },
      },
    },
  });
}

export async function createOrReuseInterviewSession(candidateId: string) {
  const existing = await prisma.interviewSession.findFirst({
    where: {
      candidateId,
      status: {
        in: ['INVITED', 'IN_PROGRESS', 'COMPLETED', 'SCORED'],
      },
    },
    include: {
      candidate: true,
      questions: {
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  const { drafts } = await buildQuestionDrafts(candidateId);
  return createSession(candidateId, drafts);
}

export async function getInterviewSessionByToken(token: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
    include: {
      candidate: {
        include: {
          job: true,
        },
      },
      questions: {
        orderBy: { sequence: 'asc' },
        include: {
          answers: true,
        },
      },
      proctorEvents: {
        orderBy: { occurredAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const attemptLocked = isFinalInterviewStatus(session.status);

  return {
    id: session.id,
    inviteToken: session.inviteToken,
    status: session.status,
    attemptLocked,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    scoredAt: session.scoredAt,
    overallScore: session.overallScore,
    rankPosition: session.rankPosition,
    isShortlisted: session.isShortlisted,
    scoreBreakdown: session.scoreBreakdown,
    candidate: {
      fullName: session.candidate.fullName,
      email: session.candidate.email,
      status: session.candidate.status,
      jobTitle: session.candidate.job.title,
      jobId: session.candidate.job.id,
    },
    questions: attemptLocked
      ? []
      : session.questions.map((question) => ({
          ...sanitizeQuestion(question),
          answer: question.answers[0]
            ? {
                rawAnswer: question.answers[0].rawAnswer,
                selectedOption: question.answers[0].selectedOption,
                codeSubmission: question.answers[0].codeSubmission,
                programmingLanguage: question.answers[0].programmingLanguage,
                aiScore: question.answers[0].aiScore,
                aiReasoning: question.answers[0].aiReasoning,
                metadata: question.answers[0].metadata,
              }
            : null,
        })),
    proctorFlags: session.proctorEvents.length,
  };
}

export async function startInterviewSession(token: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (isFinalInterviewStatus(session.status)) {
    throw new Error('SESSION_ALREADY_COMPLETED');
  }

  if (session.status === 'IN_PROGRESS') {
    return getInterviewSessionByToken(token);
  }

  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: session.startedAt ?? new Date(),
      },
    });

    await transitionCandidateStatus({
      candidateId: session.candidateId,
      fromStatus: STATES.AI_INTERVIEW_INVITED,
      toStatus: STATES.AI_INTERVIEW_IN_PROGRESS,
      event: 'AI_INTERVIEW_STARTED',
      triggeredBy: 'CANDIDATE',
      tx,
    });
  });

  return getInterviewSessionByToken(token);
}

export async function upsertInterviewAnswer(
  token: string,
  input: {
    questionId: string;
    rawAnswer?: string;
    selectedOption?: string;
    codeSubmission?: string;
    programmingLanguage?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
    include: {
      questions: true,
    },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error(isFinalInterviewStatus(session.status) ? 'SESSION_ALREADY_COMPLETED' : 'SESSION_NOT_STARTED');
  }

  const question = session.questions.find((item) => item.id === input.questionId);
  if (!question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const answer = await prisma.candidateAnswer.upsert({
    where: {
      sessionId_questionId: {
        sessionId: session.id,
        questionId: input.questionId,
      },
    },
    update: {
      rawAnswer: input.rawAnswer,
      selectedOption: input.selectedOption,
      codeSubmission: input.codeSubmission,
      programmingLanguage: input.programmingLanguage,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
    create: {
      sessionId: session.id,
      questionId: input.questionId,
      rawAnswer: input.rawAnswer,
      selectedOption: input.selectedOption,
      codeSubmission: input.codeSubmission,
      programmingLanguage: input.programmingLanguage,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  return {
    answer,
    question: sanitizeQuestion(question),
  };
}

export async function submitInterviewSession(token: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error(isFinalInterviewStatus(session.status) ? 'SESSION_ALREADY_COMPLETED' : 'SESSION_NOT_STARTED');
  }

  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await transitionCandidateStatus({
      candidateId: session.candidateId,
      fromStatus: STATES.AI_INTERVIEW_IN_PROGRESS,
      toStatus: STATES.AI_INTERVIEW_COMPLETED,
      event: 'AI_INTERVIEW_COMPLETED',
      triggeredBy: 'CANDIDATE',
      tx,
    });
  });

  scoreSession(session.id).catch((err) => {
    console.error('Failed to score AI interview session', {
      sessionId: session.id,
      error: err instanceof Error ? err.message : err,
    });
  });

  return {
    sessionId: session.id,
    status: 'COMPLETED',
    scoringPending: true,
  };
}

export async function attachInterviewRecordings(
  token: string,
  input: {
    screenRecording?: {
      path: string;
      filename: string;
      mimeType: string;
      size: number;
    };
    cameraRecording?: {
      path: string;
      filename: string;
      mimeType: string;
      size: number;
    };
    metadata?: Record<string, unknown>;
  },
) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (session.status !== 'IN_PROGRESS') {
    throw new Error(isFinalInterviewStatus(session.status) ? 'SESSION_ALREADY_COMPLETED' : 'SESSION_NOT_STARTED');
  }

  const existingMetadata =
    session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata)
      ? (session.metadata as Record<string, unknown>)
      : {};

  const recordings = {
    ...(existingMetadata.recordings && typeof existingMetadata.recordings === 'object' && !Array.isArray(existingMetadata.recordings)
      ? (existingMetadata.recordings as Record<string, unknown>)
      : {}),
    uploadedAt: new Date().toISOString(),
    ...(input.screenRecording ? { screenRecording: input.screenRecording } : {}),
    ...(input.cameraRecording ? { cameraRecording: input.cameraRecording } : {}),
  };

  const updated = await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      metadata: {
        ...existingMetadata,
        ...(input.metadata ? { recordingContext: input.metadata } : {}),
        recordings,
      } as Prisma.InputJsonValue,
    },
  });

  return updated.metadata;
}
