import { prisma } from '../config/prisma';

function toDate(value: string | Date) {
  if (value instanceof Date) return value;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999`);
  }

  return new Date(value);
}

function assertValidDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_CLOSING_DATE');
  }
}

function isPastDeadline(date: Date) {
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now();
}

export async function syncExpiredJobs() {
  await prisma.job.updateMany({
    where: {
      status: 'OPEN',
      closingDate: {
        lt: new Date(),
      },
    },
    data: {
      status: 'CLOSED',
    },
  });
}

export async function syncExpiredJob(id: string) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return null;

  if (job.status === 'OPEN' && isPastDeadline(job.closingDate)) {
    return prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  return job;
}

export async function createJob(data: {
  title: string;
  department: string;
  description: string;
  requirements: string[];
  location: string;
  closingDate: string | Date;
  autoScreenThreshold?: number;
  shortlistSize?: number;
}) {
  const closingDate = toDate(data.closingDate);
  assertValidDate(closingDate);

  const job = await prisma.job.create({
    data: {
      title: data.title,
      department: data.department,
      description: data.description,
      requirements: data.requirements,
      location: data.location,
      closingDate,
      autoScreenThreshold: data.autoScreenThreshold ?? 60,
      shortlistSize: data.shortlistSize ?? 10,
    },
    select: { id: true, title: true, createdAt: true, closingDate: true },
  });
  return job;
}

export async function listJobs(filters: { status?: string; page: number; limit: number }) {
  await syncExpiredJobs();

  const where = filters.status ? { status: filters.status as any } : {};
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { candidates: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return { items, pagination: { page: filters.page, limit: filters.limit, total } };
}

export async function getJobById(id: string) {
  const job = await syncExpiredJob(id);
  if (!job) throw new Error('JOB_NOT_FOUND');
  return job;
}

export async function updateJob(
  id: string,
  data: Partial<{
    title: string;
    department: string;
    description: string;
    requirements: string[];
    location: string;
    closingDate: string | Date;
    autoScreenThreshold: number;
    shortlistSize: number;
  }>
) {
  const existing = await syncExpiredJob(id);
  if (!existing) throw new Error('JOB_NOT_FOUND');

  const nextData = {
    ...data,
    ...(data.closingDate
      ? (() => {
          const closingDate = toDate(data.closingDate);
          assertValidDate(closingDate);
          return { closingDate };
        })()
      : {}),
  };

  const updated = await prisma.job.update({ where: { id }, data: nextData });
  const { rerankJobSessions } = await import('./ranking.service');
  await rerankJobSessions(id).catch(() => null);
  return updated;
}

export async function closeJob(id: string) {
  const existing = await syncExpiredJob(id);
  if (!existing) throw new Error('JOB_NOT_FOUND');

  const updated = await prisma.job.update({ where: { id }, data: { status: 'CLOSED' } });
  const { rerankJobSessions } = await import('./ranking.service');
  await rerankJobSessions(id).catch(() => null);
  return updated;
}
