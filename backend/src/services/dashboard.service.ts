import { CandidateStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { syncExpiredJobs } from './job.service';

export async function getDashboardData() {
  await syncExpiredJobs();

  const hrDecisionStatuses: CandidateStatus[] = [
    'AI_INTERVIEW_SCORED',
    'INTERVIEW_PENDING',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_CONFIRMED',
    'INTERVIEW_RESCHEDULE_REQUESTED',
    'INTERVIEW_DONE',
  ];

  const [openRoles, totalApplicants, screenedResumes, nextInterviews, aiScored, shortlisted] = await Promise.all([
    prisma.job.count({ where: { status: 'OPEN' } }),
    prisma.candidate.count({ where: { job: { status: 'OPEN' } } }),
    prisma.candidate.count({ where: { job: { status: 'OPEN' }, NOT: { status: 'APPLIED' } } }),
    prisma.candidate.count({ where: { job: { status: 'OPEN' }, status: { in: hrDecisionStatuses } } }),
    prisma.candidate.count({ where: { job: { status: 'OPEN' }, status: 'AI_INTERVIEW_SCORED' } }),
    prisma.candidate.count({ where: { job: { status: 'OPEN' }, isShortlisted: true } }),
  ]);

  const jobRows = await prisma.job.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    include: { candidates: { select: { status: true } } },
  });

  const positions = jobRows.map((job) => {
    const applicants = job.candidates.length;
    const screened = job.candidates.filter((candidate) => candidate.status !== 'APPLIED').length;
    const accepted = job.candidates.filter((candidate) => candidate.status === 'HIRED').length;

    return {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      createdAt: job.createdAt,
      applicants,
      screened,
      accepted,
      status: job.status,
    };
  });

  return {
    metrics: {
      openRoles,
      totalApplicants,
      screenedResumes,
      nextInterviews,
      aiScored,
      shortlisted,
    },
    positions,
  };
}
