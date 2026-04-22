import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export async function logProctorEvents(
  sessionId: string,
  events: Array<{ type: string; severity?: number; occurredAt?: string; metadata?: Record<string, unknown> }>
) {
  const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (events.length === 0) {
    return [];
  }

  const created = await prisma.$transaction(
    events.map((event) =>
      prisma.proctorEvent.create({
        data: {
          sessionId,
          type: event.type,
          severity: event.severity ?? 1,
          occurredAt: event.occurredAt ? new Date(event.occurredAt) : undefined,
          metadata: event.metadata as Prisma.InputJsonValue | undefined,
        },
      }),
    ),
  );

  return created;
}

export async function getProctorSummary(sessionId: string) {
  const events = await prisma.proctorEvent.findMany({
    where: { sessionId },
    orderBy: { occurredAt: 'asc' },
  });

  const totalSeverity = events.reduce((sum, event) => sum + event.severity, 0);

  return {
    count: events.length,
    totalSeverity,
    events,
  };
}
