import { prisma } from '../config/prisma';
import path from 'path';
import fs from 'fs';
import { syncExpiredJobs } from './job.service';

export async function applyToJob(data: {
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  cvFilePath: string;
}) {
  const job = await prisma.job.findUnique({ where: { id: data.jobId } });
  if (!job) throw new Error('JOB_NOT_FOUND');
  if (job.status === 'CLOSED' || job.closingDate.getTime() < Date.now()) {
    if (job.status === 'OPEN' && job.closingDate.getTime() < Date.now()) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'CLOSED' },
      });
    }
    throw new Error('JOB_CLOSED');
  }

  const candidate = await prisma.candidate.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      cvFilePath: data.cvFilePath,
      jobId: data.jobId,
      status: 'APPLIED',
    },
    select: { id: true, status: true },
  });

  await prisma.statusHistory.create({
    data: {
      candidateId: candidate.id,
      fromStatus: null,
      toStatus: 'APPLIED',
      event: 'CV_UPLOADED',
      triggeredBy: 'SYSTEM',
    },
  });

  return candidate;
}

export async function listCandidates(filters: { jobId?: string; status?: string; page: number; limit: number }) {
  await syncExpiredJobs();

  const where: any = {};
  if (filters.jobId) where.jobId = filters.jobId;
  if (filters.status) where.status = filters.status;

  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        glmScore: true,
        autoScreenDecision: true,
        aiInterviewScore: true,
        aiInterviewRank: true,
        isShortlisted: true,
        createdAt: true,
        job: { select: { title: true, status: true, closingDate: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  const mapped = items.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    jobTitle: c.job.title,
    jobStatus: c.job.status,
    jobClosingDate: c.job.closingDate,
    status: c.status,
    glmScore: c.glmScore,
    autoScreenDecision: c.autoScreenDecision,
    aiInterviewScore: c.aiInterviewScore,
    aiInterviewRank: c.aiInterviewRank,
    isShortlisted: c.isShortlisted,
    createdAt: c.createdAt,
    appliedAt: c.createdAt,
  }));

  return { items: mapped, pagination: { page: filters.page, total } };
}

export async function getCandidateById(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      job: true,
      history: { orderBy: { createdAt: 'asc' } },
      interviewSessions: {
        include: {
          questions: {
            include: {
              answers: true,
            },
            orderBy: { sequence: 'asc' },
          },
          proctorEvents: {
            orderBy: { occurredAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return {
    ...candidate,
    cvDownloadUrl: `${baseUrl}/api/v1/candidates/${id}/cv`,
  };
}

export async function getCvFilePath(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { cvFilePath: true } });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

  const absPath = path.resolve(candidate.cvFilePath);
  if (!fs.existsSync(absPath)) throw new Error('CV_FILE_NOT_FOUND');

  return absPath;
}

export async function deleteCandidate(id: string) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');

  if (candidate.cvFilePath) {
    const absPath = path.resolve(candidate.cvFilePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { candidateId: id },
    select: { id: true },
  });

  for (const session of sessions) {
    await prisma.proctorEvent.deleteMany({ where: { sessionId: session.id } });
    await prisma.candidateAnswer.deleteMany({ where: { sessionId: session.id } });
    await prisma.interviewQuestion.deleteMany({ where: { sessionId: session.id } });
  }

  await prisma.interviewSession.deleteMany({ where: { candidateId: id } });
  await prisma.statusHistory.deleteMany({ where: { candidateId: id } });
  await prisma.candidate.delete({ where: { id } });
}
