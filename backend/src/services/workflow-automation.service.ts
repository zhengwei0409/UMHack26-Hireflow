// Owner: Workflow Engineer
// Orchestrates GLM analysis, email sending, and state transitions.
// This is the "brain" that connects all the pieces.

import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { STATES } from '../workflow/states';
import * as glmService from './glm.service';
import * as emailService from './email.service';

export interface WorkflowContext {
  candidateId: string;
}

async function getCandidateWithRelations(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
  return candidate;
}

export async function onCVUploaded(candidateId: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.CV_PARSING },
  });

  try {
    const requirements = Array.isArray(candidate.job.requirements) 
      ? (candidate.job.requirements as string[]).join(', ')
      : String(candidate.job.requirements ?? '');

    const jobDescription = `
      Title: ${candidate.job.title}
      Department: ${candidate.job.department}
      Description: ${candidate.job.description}
      Requirements: ${requirements}
      Location: ${candidate.job.location}
    `;

    const analysis = await glmService.parseCV(candidate.cvFilePath, jobDescription);

    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: STATES.CV_UNDER_REVIEW,
        glmAnalysis: analysis as unknown as Prisma.InputJsonValue,
        glmScore: analysis.score,
      },
    });

    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.CV_PARSING,
        toStatus: STATES.CV_UNDER_REVIEW,
        event: 'CV_ANALYZED',
        triggeredBy: 'GLM',
        metadata: { score: analysis.score, recommendation: analysis.recommendation },
      },
    });
  } catch (error) {
    console.error('CV analysis failed:', error);
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: STATES.CV_PARSE_FAILED },
    });
    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.CV_PARSING,
        toStatus: STATES.CV_PARSE_FAILED,
        event: 'CV_ANALYSIS_FAILED',
        triggeredBy: 'SYSTEM',
        metadata: { error: String(error) },
      },
    });
  }
}

export async function onAcceptCV(candidateId: string, note?: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  const emailSent = await emailService.sendInterviewInvite(
    { fullName: candidate.fullName, email: candidate.email, candidateId },
    { title: candidate.job.title, candidateId },
    {
      date: 'TBD',
      time: 'TBD',
      location: candidate.job.location,
      meetingLink: '',
    }
  );

  if (!emailSent) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: STATES.INTERVIEW_INVITE_FAILED },
    });
    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.INTERVIEW_PENDING,
        toStatus: STATES.INTERVIEW_INVITE_FAILED,
        event: 'INTERVIEW_INVITE_FAILED',
        triggeredBy: 'SYSTEM',
        metadata: { error: 'Email send failed' },
      },
    });
    throw new Error('INTERVIEW_INVITE_FAILED');
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.INTERVIEW_PENDING },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.CV_UNDER_REVIEW,
      toStatus: STATES.INTERVIEW_PENDING,
      event: 'INTERVIEW_INVITE_SENT',
      triggeredBy: 'HR',
      metadata: { note },
    },
  });
}

export async function scheduleInterview(
  candidateId: string,
  data: { date: string; time: string; location: string; meetingLink?: string },
  note?: string
): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  const emailSent = await emailService.sendInterviewSchedule(
    { fullName: candidate.fullName, email: candidate.email, candidateId },
    { title: candidate.job.title, candidateId },
    data
  );

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: STATES.INTERVIEW_SCHEDULED,
      interviewDate: data.date,
      interviewTime: data.time,
      interviewLocation: data.location,
      interviewMeetingLink: data.meetingLink || null,
    },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.INTERVIEW_PENDING,
      toStatus: STATES.INTERVIEW_SCHEDULED,
      event: 'INTERVIEW_SCHEDULED',
      triggeredBy: 'HR',
      metadata: { ...data, note },
    },
  });

  if (!emailSent) {
    console.error('Failed to send interview schedule email');
  }
}

export async function onRejectCV(candidateId: string, note?: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await emailService.sendRejectionEmail(
    { fullName: candidate.fullName, email: candidate.email },
    { title: candidate.job.title },
    'cv'
  );

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.CV_REJECTED },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.CV_UNDER_REVIEW,
      toStatus: STATES.CV_REJECTED,
      event: 'CV_REJECTED',
      triggeredBy: 'HR',
      metadata: { note },
    },
  });
}

export async function onAcceptInterview(candidateId: string, note?: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.OFFER_GENERATING },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.INTERVIEW_DONE,
      toStatus: STATES.OFFER_GENERATING,
      event: 'OFFER_GENERATING',
      triggeredBy: 'HR',
      metadata: { note },
    },
  });

  try {
    const offerLetter = await glmService.generateOfferLetter(
      { fullName: candidate.fullName, email: candidate.email },
      {
        title: candidate.job.title,
        department: candidate.job.department,
        location: candidate.job.location,
      }
    );

    const emailSent = await emailService.sendOfferLetter(
      { fullName: candidate.fullName, email: candidate.email },
      { title: candidate.job.title },
      { subject: offerLetter.subject, body: offerLetter.body }
    );

    if (!emailSent) {
      console.error('Failed to send offer letter email');
    }

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: STATES.OFFER_SENT },
    });

    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.OFFER_GENERATING,
        toStatus: STATES.OFFER_SENT,
        event: 'OFFER_SENT',
        triggeredBy: 'SYSTEM',
        metadata: { offerSubject: offerLetter.subject },
      },
    });
  } catch (error) {
    console.error('Offer letter generation failed:', error);
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: STATES.FAILED },
    });
    await prisma.statusHistory.create({
      data: {
        candidateId,
        fromStatus: STATES.OFFER_GENERATING,
        toStatus: STATES.FAILED,
        event: 'OFFER_GENERATION_FAILED',
        triggeredBy: 'SYSTEM',
        metadata: { error: String(error) },
      },
    });
    throw new Error('OFFER_GENERATION_FAILED');
  }
}

export async function onRejectInterview(candidateId: string, note?: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  await emailService.sendRejectionEmail(
    { fullName: candidate.fullName, email: candidate.email },
    { title: candidate.job.title },
    'interview'
  );

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.INTERVIEW_REJECTED },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.INTERVIEW_DONE,
      toStatus: STATES.INTERVIEW_REJECTED,
      event: 'INTERVIEW_REJECTED',
      triggeredBy: 'HR',
      metadata: { note },
    },
  });
}

export async function onOfferAccepted(candidateId: string): Promise<void> {
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.HIRED },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.OFFER_SENT,
      toStatus: STATES.HIRED,
      event: 'OFFER_ACCEPTED',
      triggeredBy: 'CANDIDATE',
    },
  });
}

export async function confirmInterview(candidateId: string, candidateEmail: string): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  if (candidate.email !== candidateEmail) {
    throw new Error('UNAUTHORIZED');
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.INTERVIEW_CONFIRMED },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.INTERVIEW_SCHEDULED,
      toStatus: STATES.INTERVIEW_CONFIRMED,
      event: 'INTERVIEW_CONFIRMED',
      triggeredBy: 'CANDIDATE',
    },
  });
}

export async function requestReschedule(
  candidateId: string,
  candidateEmail: string,
  reason?: string
): Promise<void> {
  const candidate = await getCandidateWithRelations(candidateId);

  if (candidate.email !== candidateEmail) {
    throw new Error('UNAUTHORIZED');
  }

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: STATES.INTERVIEW_RESCHEDULE_REQUESTED },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId,
      fromStatus: STATES.INTERVIEW_SCHEDULED,
      toStatus: STATES.INTERVIEW_RESCHEDULE_REQUESTED,
      event: 'RESCHEDULE_REQUESTED',
      triggeredBy: 'CANDIDATE',
      metadata: { reason },
    },
  });

  await emailService.notifyHRRescheduleRequest(candidate, reason);
}