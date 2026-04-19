import { prisma } from '../config/prisma';
import path from 'path';
import fs from 'fs';

export async function applyToJob(data: {
  jobId: string;
  fullName: string;
  email: string;
  phone?: string;
  cvFilePath: string;
}) {
  const job = await prisma.job.findUnique({ where: { id: data.jobId } });
  if (!job) throw new Error('JOB_NOT_FOUND');
  if (job.status === 'CLOSED') throw new Error('JOB_CLOSED');

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
        createdAt: true,
        job: { select: { title: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  const mapped = items.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    jobTitle: c.job.title,
    status: c.status,
    glmScore: c.glmScore,
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
