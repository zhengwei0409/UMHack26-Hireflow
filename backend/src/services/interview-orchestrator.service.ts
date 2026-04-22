import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { generateInterviewQuestions, type InterviewQuestionDraft } from './glm.service';
import { executeCode } from './code-exec.service';
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

function extractTestCases(expectedAnswer: Prisma.JsonValue | null) {
  if (expectedAnswer && typeof expectedAnswer === 'object' && !Array.isArray(expectedAnswer) && 'testCases' in expectedAnswer) {
    const raw = (expectedAnswer as { testCases?: unknown }).testCases;
    if (Array.isArray(raw)) {
      return raw
        .filter(
          (testCase): testCase is { input: string; expectedOutput: string } =>
            !!testCase &&
            typeof testCase === 'object' &&
            'input' in testCase &&
            'expectedOutput' in testCase &&
            typeof (testCase as { input: unknown }).input === 'string' &&
            typeof (testCase as { expectedOutput: unknown }).expectedOutput === 'string',
        )
        .map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        }));
    }
  }

  return [];
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
          expectedAnswer: draft.expectedAnswer as Prisma.InputJsonValue | undefined,
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

  return {
    id: session.id,
    inviteToken: session.inviteToken,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    scoredAt: session.scoredAt,
    overallScore: session.overallScore,
    rankPosition: session.rankPosition,
    isShortlisted: session.isShortlisted,
    candidate: {
      fullName: session.candidate.fullName,
      email: session.candidate.email,
      status: session.candidate.status,
      jobTitle: session.candidate.job.title,
      jobId: session.candidate.job.id,
    },
    questions: session.questions.map((question) => ({
      ...sanitizeQuestion(question),
      answer: question.answers[0]
        ? {
            rawAnswer: question.answers[0].rawAnswer,
            selectedOption: question.answers[0].selectedOption,
            codeSubmission: question.answers[0].codeSubmission,
            programmingLanguage: question.answers[0].programmingLanguage,
            executionResult: question.answers[0].executionResult,
            aiScore: question.answers[0].aiScore,
            aiReasoning: question.answers[0].aiReasoning,
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

export async function executeInterviewCode(
  token: string,
  input: {
    questionId: string;
    language: string;
    sourceCode: string;
  },
) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
    include: { questions: true },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const question = session.questions.find((item) => item.id === input.questionId);
  if (!question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  if (question.type !== 'DSA') {
    throw new Error('QUESTION_NOT_CODE');
  }

  const executionResult = await executeCode({
    language: input.language,
    sourceCode: input.sourceCode,
    testCases: extractTestCases(question.expectedAnswer as Prisma.JsonValue | null),
  });

  await prisma.candidateAnswer.upsert({
    where: {
      sessionId_questionId: {
        sessionId: session.id,
        questionId: input.questionId,
      },
    },
    update: {
      codeSubmission: input.sourceCode,
      programmingLanguage: input.language,
      executionResult: executionResult as unknown as Prisma.InputJsonValue,
    },
    create: {
      sessionId: session.id,
      questionId: input.questionId,
      codeSubmission: input.sourceCode,
      programmingLanguage: input.language,
      executionResult: executionResult as unknown as Prisma.InputJsonValue,
    },
  });

  return executionResult;
}

export async function submitInterviewSession(token: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { inviteToken: token },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
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

  const result = await scoreSession(session.id);
  return {
    sessionId: session.id,
    ...result,
  };
}
