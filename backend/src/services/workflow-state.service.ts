import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

interface TransitionInput {
  candidateId: string;
  fromStatus?: string | null;
  toStatus: string;
  event: string;
  triggeredBy: string;
  metadata?: Prisma.InputJsonValue;
  tx?: PrismaLike;
}

export async function transitionCandidateStatus(input: TransitionInput) {
  const db = input.tx ?? prisma;

  await db.candidate.update({
    where: { id: input.candidateId },
    data: { status: input.toStatus as any },
  });

  await db.statusHistory.create({
    data: {
      candidateId: input.candidateId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      event: input.event,
      triggeredBy: input.triggeredBy,
      metadata: input.metadata,
    },
  });
}
