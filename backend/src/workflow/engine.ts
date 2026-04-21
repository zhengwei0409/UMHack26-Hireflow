import { prisma } from '../config/prisma';
import { STATES, TERMINAL_STATES, State } from './states';

// Maps each HR action to the required current state and resulting new state
const TRANSITIONS: Record<string, { from: State; to: State; event: string }> = {
  'accept-cv': {
    from: STATES.CV_UNDER_REVIEW,
    to: STATES.INTERVIEW_PENDING,
    event: 'HR_ACCEPT_CV',
  },
  'reject-cv': {
    from: STATES.CV_UNDER_REVIEW,
    to: STATES.CV_REJECTED,
    event: 'HR_REJECT_CV',
  },
  'schedule-interview': {
    from: STATES.INTERVIEW_PENDING,
    to: STATES.INTERVIEW_SCHEDULED,
    event: 'HR_SCHEDULE_INTERVIEW',
  },
  'mark-interview-done': {
    from: STATES.INTERVIEW_CONFIRMED,
    to: STATES.INTERVIEW_DONE,
    event: 'HR_MARK_INTERVIEW_DONE',
  },
  'accept-interview': {
    from: STATES.INTERVIEW_DONE,
    to: STATES.OFFER_GENERATING,
    event: 'HR_ACCEPT_INTERVIEW',
  },
  'reject-interview': {
    from: STATES.INTERVIEW_DONE,
    to: STATES.INTERVIEW_REJECTED,
    event: 'HR_REJECT_INTERVIEW',
  },
};

// States from which retry is allowed and what they reset to
const RETRY_MAP: Partial<Record<State, State>> = {
  [STATES.CV_PARSE_FAILED]: STATES.CV_PARSING,
  [STATES.INTERVIEW_INVITE_FAILED]: STATES.INTERVIEW_PENDING,
  [STATES.FAILED]: STATES.CV_PARSING,
};

export async function applyAction(
  candidateId: string,
  action: string,
  triggeredBy: string,
  note?: string,
) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

  const currentStatus = candidate.status as State;

  if (TERMINAL_STATES.includes(currentStatus) && action !== 'retry') {
    throw new Error('CANDIDATE_IN_TERMINAL_STATE');
  }

  let previousStatus: State;
  let newStatus: State;
  let event: string;

  if (action === 'retry') {
    const retryTarget = RETRY_MAP[currentStatus];
    if (!retryTarget) throw new Error('RETRY_NOT_ALLOWED');
    previousStatus = currentStatus;
    newStatus = retryTarget;
    event = 'HR_RETRY';
  } else {
    const transition = TRANSITIONS[action];
    if (!transition) throw new Error('INVALID_ACTION');
    if (currentStatus !== transition.from) throw new Error('INVALID_STATE_FOR_ACTION');
    previousStatus = currentStatus;
    newStatus = transition.to;
    event = transition.event;
  }

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: { status: newStatus },
    }),
    prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: previousStatus,
        toStatus: newStatus,
        event,
        triggeredBy,
        metadata: note ? { note } : undefined,
      },
    }),
  ]);

  return { previousStatus, newStatus };
}

export async function getHistory(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

  return prisma.statusHistory.findMany({
    where: { candidateId },
    orderBy: { createdAt: 'asc' },
  });
}
