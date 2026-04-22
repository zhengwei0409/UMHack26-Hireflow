import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { scoreBehavioralAnswer } from './glm.service';
import { STATES } from '../workflow/states';
import { transitionCandidateStatus } from './workflow-state.service';

function parseExpectedAnswer(expectedAnswer: unknown) {
  if (typeof expectedAnswer === 'string') {
    return expectedAnswer;
  }
  if (expectedAnswer && typeof expectedAnswer === 'object' && 'answer' in expectedAnswer) {
    return String((expectedAnswer as { answer: unknown }).answer);
  }
  return '';
}

function parsePassRate(executionResult: unknown) {
  if (executionResult && typeof executionResult === 'object' && 'passRate' in executionResult) {
    const value = Number((executionResult as { passRate: unknown }).passRate);
    if (!Number.isNaN(value)) {
      return Math.min(1, Math.max(0, value));
    }
  }
  return 0;
}

async function ensureBehavioralScores(sessionId: string) {
  const answers = await prisma.candidateAnswer.findMany({
    where: {
      sessionId,
      question: { type: 'BEHAVIORAL' },
    },
    include: {
      question: true,
      session: {
        include: {
          job: true,
        },
      },
    },
  });

  for (const answer of answers) {
    if (answer.aiScore !== null || !answer.rawAnswer?.trim()) {
      continue;
    }

    const behavioralScore = await scoreBehavioralAnswer({
      jobTitle: answer.session.job.title,
      question: answer.question.prompt,
      answer: answer.rawAnswer,
    });

    await prisma.candidateAnswer.update({
      where: { id: answer.id },
      data: {
        aiScore: behavioralScore.score,
        aiReasoning: behavioralScore.reasoning,
        metadata: {
          strengths: behavioralScore.strengths,
          risks: behavioralScore.risks,
        } as Prisma.InputJsonValue,
      },
    });
  }
}

export async function scoreSession(sessionId: string) {
  await ensureBehavioralScores(sessionId);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      candidate: true,
      job: true,
      questions: {
        orderBy: { sequence: 'asc' },
        include: {
          answers: true,
        },
      },
      proctorEvents: true,
    },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const dsaQuestions = session.questions.filter((question) => question.type === 'DSA');
  const mcqQuestions = session.questions.filter((question) => question.type === 'MCQ');
  const behavioralQuestions = session.questions.filter((question) => question.type === 'BEHAVIORAL');

  const dsaScore =
    dsaQuestions.length > 0
      ? dsaQuestions.reduce((sum, question) => sum + parsePassRate(question.answers[0]?.executionResult), 0) / dsaQuestions.length
      : 0;

  const mcqScore =
    mcqQuestions.length > 0
      ? mcqQuestions.reduce((sum, question) => {
          const answer = question.answers[0];
          return sum + (answer?.selectedOption === parseExpectedAnswer(question.expectedAnswer) ? 1 : 0);
        }, 0) / mcqQuestions.length
      : 0;

  const behavioralScore =
    behavioralQuestions.length > 0
      ? behavioralQuestions.reduce((sum, question) => sum + ((question.answers[0]?.aiScore ?? 0) / 100), 0) / behavioralQuestions.length
      : 0;

  const cvScore = (session.candidate.glmScore ?? 0) / 100;
  const penalty = Math.min(session.proctorEvents.reduce((sum, event) => sum + event.severity, 0) * 0.02, 0.2);
  const overallRaw = 0.45 * dsaScore + 0.2 * mcqScore + 0.15 * behavioralScore + 0.2 * cvScore - penalty;
  const overallScore = Math.max(0, Math.min(100, Number((overallRaw * 100).toFixed(2))));

  const scoreBreakdown = {
    dsaScore: Number((dsaScore * 100).toFixed(2)),
    mcqScore: Number((mcqScore * 100).toFixed(2)),
    behavioralScore: Number((behavioralScore * 100).toFixed(2)),
    cvScore: Number((cvScore * 100).toFixed(2)),
    proctorPenalty: Number((penalty * 100).toFixed(2)),
    formula: '0.45*DSA + 0.20*MCQ + 0.15*Behavioral + 0.20*CV - penalty',
  } satisfies Prisma.JsonObject;

  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'SCORED',
        overallScore,
        scoreBreakdown: scoreBreakdown as Prisma.InputJsonValue,
        scoredAt: new Date(),
      },
    });

    await tx.candidate.update({
      where: { id: session.candidateId },
      data: {
        aiInterviewScore: overallScore,
      },
    });

    await transitionCandidateStatus({
      candidateId: session.candidateId,
      fromStatus: STATES.AI_INTERVIEW_COMPLETED,
      toStatus: STATES.AI_INTERVIEW_SCORED,
      event: 'AI_INTERVIEW_SCORED',
      triggeredBy: 'SYSTEM',
      metadata: {
        overallScore,
        ...scoreBreakdown,
      } as Prisma.InputJsonValue,
      tx,
    });
  });

  await rerankJobSessions(session.jobId);

  return {
    overallScore,
    scoreBreakdown,
  };
}

export async function rerankJobSessions(jobId: string) {
  const [job, sessions] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.interviewSession.findMany({
      where: { jobId, status: 'SCORED' },
      orderBy: [{ overallScore: 'desc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (!job) {
    throw new Error('JOB_NOT_FOUND');
  }

  const shortlistSize = Math.max(1, job.shortlistSize);

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < sessions.length; index += 1) {
      const session = sessions[index];
      const rankPosition = index + 1;
      const isShortlisted = rankPosition <= shortlistSize;

      await tx.interviewSession.update({
        where: { id: session.id },
        data: {
          rankPosition,
          isShortlisted,
        },
      });

      await tx.candidate.update({
        where: { id: session.candidateId },
        data: {
          aiInterviewRank: rankPosition,
          isShortlisted,
        },
      });
    }
  });

  return prisma.interviewSession.findMany({
    where: { jobId, status: 'SCORED' },
    include: {
      candidate: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          aiInterviewScore: true,
          aiInterviewRank: true,
          isShortlisted: true,
        },
      },
    },
    orderBy: [{ rankPosition: 'asc' }],
  });
}

export async function getRankedShortlist(jobId?: string) {
  return prisma.interviewSession.findMany({
    where: {
      status: 'SCORED',
      ...(jobId ? { jobId } : {}),
    },
    include: {
      candidate: {
        include: {
          job: true,
        },
      },
    },
    orderBy: [{ isShortlisted: 'desc' }, { rankPosition: 'asc' }, { overallScore: 'desc' }],
  });
}

export async function setShortlistStatus(sessionId: string, shortlisted: boolean) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.interviewSession.update({
      where: { id: sessionId },
      data: {
        isShortlisted: shortlisted,
      },
    });

    await tx.candidate.update({
      where: { id: session.candidateId },
      data: {
        isShortlisted: shortlisted,
      },
    });
  });

  return prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      candidate: true,
    },
  });
}

export async function getCandidateAiReport(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      job: true,
      interviewSessions: {
        orderBy: { createdAt: 'desc' },
        include: {
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
      },
    },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  return candidate;
}
