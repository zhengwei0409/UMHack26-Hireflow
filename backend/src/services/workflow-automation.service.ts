// Owner: Workflow Engineer
// Side-effect orchestration layered on top of the candidate workflow spine.

import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { STATES } from '../workflow/states';
import * as autoScreenService from './auto-screen.service';
import * as emailService from './email.service';
import * as glmService from './glm.service';
import { createOrReuseInterviewSession } from './interview-orchestrator.service';
import { transitionCandidateStatus } from './workflow-state.service';

async function getCandidateWithRelations(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  return candidate;
}

function getFrontendBaseUrl() {
  return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function sendAiInterviewInvite(candidateId: string) {
  const candidate = await getCandidateWithRelations(candidateId);
  const session = await createOrReuseInterviewSession(candidateId);
  const interviewLink = `${getFrontendBaseUrl()}/interview/${session.inviteToken}`;

  const emailSent = await emailService.sendAiInterviewInvite(
    { fullName: candidate.fullName, email: candidate.email },
    { title: candidate.job.title },
    interviewLink,
  );

  if (!emailSent) {
    await transitionCandidateStatus({
      candidateId,
      fromStatus: STATES.AI_INTERVIEW_INVITED,
      toStatus: STATES.INTERVIEW_INVITE_FAILED,
      event: 'AI_INTERVIEW_INVITE_FAILED',
      triggeredBy: 'SYSTEM',
      metadata: {
        reason: 'Email send failed',
      } as Prisma.InputJsonValue,
    });

    throw new Error('INTERVIEW_INVITE_FAILED');
  }

  return {
    sessionId: session.id,
    interviewLink,
  };
}

export async function onCVUploaded(candidateId: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await transitionCandidateStatus({
    candidateId,
    fromStatus: candidate.status,
    toStatus: STATES.CV_PARSING,
    event: 'CV_PARSING_STARTED',
    triggeredBy: 'SYSTEM',
  });

  try {
    const { analysis, threshold, decision } = await autoScreenService.runAutoScreen(candidateId);

    if (decision === 'PASS') {
      await transitionCandidateStatus({
        candidateId,
        fromStatus: STATES.CV_UNDER_REVIEW,
        toStatus: STATES.AI_INTERVIEW_INVITED,
        event: 'AUTO_SCREEN_PASSED',
        triggeredBy: 'SYSTEM',
        metadata: {
          score: analysis.score,
          threshold,
        } as Prisma.InputJsonValue,
      });

      await sendAiInterviewInvite(candidateId);
      return;
    }

    if (decision === 'REJECT') {
      await emailService.sendRejectionEmail(
        { fullName: candidate.fullName, email: candidate.email },
        { title: candidate.job.title },
        'cv',
      );

      await transitionCandidateStatus({
        candidateId,
        fromStatus: STATES.CV_UNDER_REVIEW,
        toStatus: STATES.CV_REJECTED,
        event: 'AUTO_SCREEN_REJECTED',
        triggeredBy: 'SYSTEM',
        metadata: {
          score: analysis.score,
          threshold,
        } as Prisma.InputJsonValue,
      });
      return;
    }

    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.CV_UNDER_REVIEW,
        toStatus: STATES.CV_UNDER_REVIEW,
        event: 'AUTO_SCREEN_REQUIRES_HR_REVIEW',
        triggeredBy: 'SYSTEM',
        metadata: {
          score: analysis.score,
          threshold,
          decision,
        },
      },
    });
  } catch (error) {
    console.error('CV analysis failed:', error);

    await transitionCandidateStatus({
      candidateId,
      fromStatus: STATES.CV_PARSING,
      toStatus: STATES.CV_PARSE_FAILED,
      event: 'CV_ANALYSIS_FAILED',
      triggeredBy: 'SYSTEM',
      metadata: {
        error: String(error),
      } as Prisma.InputJsonValue,
    });
  }
}

export async function onAcceptCV(candidateId: string) {
  return sendAiInterviewInvite(candidateId);
}

export async function onRejectCV(candidateId: string) {
  const candidate = await getCandidateWithRelations(candidateId);

  await emailService.sendRejectionEmail(
    { fullName: candidate.fullName, email: candidate.email },
    { title: candidate.job.title },
    'cv',
  );
}

export async function scheduleInterview(
  candidateId: string,
  data: { date: string; time: string; location: string; meetingLink?: string },
) {
  const candidate = await getCandidateWithRelations(candidateId);

  const emailSent = await emailService.sendInterviewSchedule(
    { fullName: candidate.fullName, email: candidate.email, candidateId },
    { title: candidate.job.title, candidateId },
    data,
  );

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      interviewDate: data.date,
      interviewTime: data.time,
      interviewLocation: data.location,
      interviewMeetingLink: data.meetingLink || null,
    },
  });

  if (!emailSent) {
    console.error('Failed to send interview schedule email');
  }
}

export async function onAcceptInterview(candidateId: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  try {
    const offerLetter = await glmService.generateOfferLetter(
      { fullName: candidate.fullName, email: candidate.email },
      {
        title: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location,
      },
    );

    const emailSent = await emailService.sendOfferLetter(
      { fullName: candidate.fullName, email: candidate.email },
      { title: candidate.job.title },
      { subject: offerLetter.subject, body: offerLetter.body },
    );

    if (!emailSent) {
      console.error('Failed to send offer letter email');
    }

    await transitionCandidateStatus({
      candidateId,
      fromStatus: STATES.OFFER_GENERATING,
      toStatus: STATES.OFFER_SENT,
      event: 'OFFER_SENT',
      triggeredBy: 'SYSTEM',
      metadata: {
        offerSubject: offerLetter.subject,
      } as Prisma.InputJsonValue,
    });
  } catch (error) {
    console.error('Offer letter generation failed:', error);

    await transitionCandidateStatus({
      candidateId,
      fromStatus: STATES.OFFER_GENERATING,
      toStatus: STATES.FAILED,
      event: 'OFFER_GENERATION_FAILED',
      triggeredBy: 'SYSTEM',
      metadata: {
        error: String(error),
      } as Prisma.InputJsonValue,
    });

    throw new Error('OFFER_GENERATION_FAILED');
  }
}

export async function onRejectInterview(candidateId: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await emailService.sendRejectionEmail(
    { fullName: candidate.fullName, email: candidate.email },
    { title: candidate.job.title },
    'interview',
  );
}

export async function confirmInterview(candidateId: string, candidateEmail: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  if (candidate.email.toLowerCase() !== candidateEmail.trim().toLowerCase()) {
    throw new Error('UNAUTHORIZED');
  }

  if (candidate.status === STATES.INTERVIEW_CONFIRMED) {
    return;
  }

  if (candidate.status !== STATES.INTERVIEW_SCHEDULED) {
    throw new Error('INVALID_STATE_FOR_ACTION');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.candidate.updateMany({
      where: { id: candidateId, status: STATES.INTERVIEW_SCHEDULED as any },
      data: { status: STATES.INTERVIEW_CONFIRMED as any },
    });

    if (result.count === 0) return false;

    await tx.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.INTERVIEW_SCHEDULED,
        toStatus: STATES.INTERVIEW_CONFIRMED,
        event: 'INTERVIEW_CONFIRMED',
        triggeredBy: 'CANDIDATE',
      },
    });

    return true;
  });

  if (!updated) {
    return;
  }

  await emailService.notifyHRInterviewConfirmed(
    { fullName: candidate.fullName, email: candidate.email, job: { title: candidate.job.title } },
    {
      date: candidate.interviewDate || 'TBD',
      time: candidate.interviewTime || 'TBD',
      location: candidate.interviewLocation || candidate.job.location,
    },
  );
}

export async function requestReschedule(
  candidateId: string,
  candidateEmail: string,
  reason?: string,
): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  if (candidate.email.toLowerCase() !== candidateEmail.trim().toLowerCase()) {
    throw new Error('UNAUTHORIZED');
  }

  if (candidate.status === STATES.INTERVIEW_RESCHEDULE_REQUESTED) {
    return;
  }

  if (candidate.status !== STATES.INTERVIEW_SCHEDULED) {
    throw new Error('INVALID_STATE_FOR_ACTION');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.candidate.updateMany({
      where: { id: candidateId, status: STATES.INTERVIEW_SCHEDULED as any },
      data: { status: STATES.INTERVIEW_RESCHEDULE_REQUESTED as any },
    });

    if (result.count === 0) return false;

    await tx.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.INTERVIEW_SCHEDULED,
        toStatus: STATES.INTERVIEW_RESCHEDULE_REQUESTED,
        event: 'INTERVIEW_RESCHEDULE_REQUESTED',
        triggeredBy: 'CANDIDATE',
        metadata: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
      },
    });

    return true;
  });

  if (!updated) {
    return;
  }

  await emailService.notifyHRRescheduleRequest(
    { fullName: candidate.fullName, email: candidate.email, job: { title: candidate.job.title } },
    reason,
  );
}
