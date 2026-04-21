import { prisma } from '../config/prisma';

export async function getDashboardData() {
  const [openRoles, totalApplicants, screenedResumes, nextInterviews] = await Promise.all([
    prisma.job.count({ where: { status: 'OPEN' } }),
    prisma.candidate.count(),
    prisma.candidate.count({ where: { NOT: { status: 'APPLIED' } } }),
    prisma.candidate.count({ where: { status: { in: ['INTERVIEW_PENDING', 'INTERVIEW_SCHEDULED'] } } }),
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
    },
    positions,
  };
}
