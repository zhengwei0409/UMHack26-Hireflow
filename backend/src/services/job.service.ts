import { prisma } from '../config/prisma';

export async function createJob(data: {
  title: string;
  department: string;
  description: string;
  requirements: string[];
  location: string;
  autoScreenThreshold?: number;
  shortlistSize?: number;
}) {
  const job = await prisma.job.create({
    data: {
      title: data.title,
      department: data.department,
      description: data.description,
      requirements: data.requirements,
      location: data.location,
      autoScreenThreshold: data.autoScreenThreshold ?? 60,
      shortlistSize: data.shortlistSize ?? 10,
    },
    select: { id: true, title: true, createdAt: true },
  });
  return job;
}

export async function listJobs(filters: { status?: string; page: number; limit: number }) {
  const where = filters.status ? { status: filters.status as any } : {};
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.job.count({ where }),
  ]);

  return { items, pagination: { page: filters.page, limit: filters.limit, total } };
}

export async function getJobById(id: string) {
  const job = await prisma.job.findUnique({ where: { id } });
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
    autoScreenThreshold: number;
    shortlistSize: number;
  }>
) {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw new Error('JOB_NOT_FOUND');

  return prisma.job.update({ where: { id }, data });
}

export async function closeJob(id: string) {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw new Error('JOB_NOT_FOUND');

  return prisma.job.update({ where: { id }, data: { status: 'CLOSED' } });
}
