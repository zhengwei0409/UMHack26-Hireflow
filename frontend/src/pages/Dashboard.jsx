import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../styles/buttonStyles';

const primaryButtonClassName = `${buttonPrimaryClassName} !text-white visited:!text-white`;
const secondaryButtonClassName = buttonSecondaryClassName;
const sectionCountClassName = 'inline-flex min-h-7 items-center rounded-full bg-zinc-100 px-2.5 text-xs font-black tracking-[0.08em] text-zinc-600';

const priorityConfig = {
  INTERVIEW_RESCHEDULE_REQUESTED: {
    title: 'Reschedule requested',
    action: 'Pick a new interview time',
    rank: 1,
    tone: 'amber',
  },
  AI_INTERVIEW_SCORED: {
    title: 'AI interview scored',
    action: 'Accept for human interview or reject',
    rank: 2,
    tone: 'zinc',
  },
  INTERVIEW_DONE: {
    title: 'HR decision needed',
    action: 'Accept or reject candidate',
    rank: 3,
    tone: 'emerald',
  },
  INTERVIEW_PENDING: {
    title: 'Interview not scheduled',
    action: 'Schedule human interview',
    rank: 4,
    tone: 'zinc',
  },
  INTERVIEW_SCHEDULED: {
    title: 'Interview scheduled',
    action: 'Wait for confirmation or mark done',
    rank: 4,
    tone: 'zinc',
  },
  INTERVIEW_CONFIRMED: {
    title: 'Interview confirmed',
    action: 'Mark interview done after completion',
    rank: 4,
    tone: 'zinc',
  },
  CV_UNDER_REVIEW: {
    title: 'Auto-screen review',
    action: 'Check borderline CV result',
    rank: 5,
    tone: 'zinc',
  },
};

const interviewStatusSet = new Set([
  'INTERVIEW_PENDING',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_CONFIRMED',
  'INTERVIEW_RESCHEDULE_REQUESTED',
]);

const formatCompactDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatRelativeDay = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
};

const formatStatusLabel = (status) =>
  String(status || 'UNKNOWN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getCandidateScore = (candidate) => {
  if (candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined) {
    return Number(candidate.aiInterviewScore);
  }

  if (candidate.glmScore !== null && candidate.glmScore !== undefined) {
    return Number(candidate.glmScore);
  }

  return null;
};

const getPriorityMeta = (candidate) => priorityConfig[String(candidate.status || '').toUpperCase()] || null;

const isSoon = (closingDate, days = 7) => {
  if (!closingDate) return false;
  const date = new Date(closingDate);
  if (Number.isNaN(date.getTime())) return false;

  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-sm font-semibold text-zinc-500">
    {children}
  </div>
);

const Metric = ({ label, value, helper, index = 0 }) => (
  <div className="candidate-metric-pop border-l border-zinc-200 pl-4" style={{ animationDelay: `${120 + index * 60}ms` }}>
    <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">{value}</p>
    {helper && <p className="mt-1 text-xs font-semibold text-zinc-500">{helper}</p>}
  </div>
);

const ActionRow = ({ candidate, index }) => {
  const score = candidate.score;
  const scoreLabel = score === null || Number.isNaN(score) ? '-' : Math.round(score);

  return (
    <Link
      to={`/candidates/${candidate.id}`}
      className="candidate-row block px-5 py-4 transition hover:bg-zinc-50"
      style={{ animationDelay: `${120 + index * 50}ms` }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_190px_92px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-zinc-950">{candidate.fullName}</h3>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-500">{candidate.jobTitle || 'No linked role'}</p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Next action</p>
          <p className="mt-1 text-sm font-black text-zinc-950">{candidate.priority.action}</p>
        </div>

        <div className="justify-self-start lg:justify-self-end">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Score</p>
          <p className="mt-1 text-xl font-black tabular-nums text-zinc-950">{scoreLabel}</p>
        </div>
      </div>
    </Link>
  );
};

const RoleRiskRow = ({ role, index }) => (
  <Link
    to={`/jobs/${role.id}`}
    className="job-row block px-4 py-4 transition hover:bg-zinc-50"
    style={{ animationDelay: `${120 + index * 50}ms` }}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-950">{role.title}</p>
        <p className="mt-1 text-xs font-semibold text-zinc-500">
          {role.applicants} applicants / {role.screened} screened
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
        {formatRelativeDay(role.closingDate)}
      </span>
    </div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
      <div className="h-full rounded-full bg-zinc-950" style={{ width: `${role.progress}%` }} />
    </div>
  </Link>
);

const SmallCandidateRow = ({ candidate, index }) => (
  <Link
    to={`/candidates/${candidate.id}`}
    className="candidate-row block px-4 py-4 transition hover:bg-zinc-50"
    style={{ animationDelay: `${120 + index * 45}ms` }}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-zinc-950">{candidate.fullName}</p>
        <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{candidate.jobTitle || 'No linked role'}</p>
      </div>
      <span className="shrink-0 text-xs font-black text-zinc-500">{formatCompactDate(candidate.createdAt)}</span>
    </div>
    <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{formatStatusLabel(candidate.status)}</p>
  </Link>
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [dashboardRes, jobsRes, candidatesRes] = await Promise.all([
          api.dashboard.get(),
          api.jobs.list({ limit: 100 }),
          api.candidates.list({ limit: 200 }),
        ]);

        if (cancelled) return;

        setDashboardData(dashboardRes.data);
        setJobs(jobsRes.data.items || []);
        setCandidates(candidatesRes.data.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load dashboard.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = dashboardData?.metrics ?? {
    openRoles: 0,
    totalApplicants: 0,
    screenedResumes: 0,
    nextInterviews: 0,
    aiScored: 0,
    shortlisted: 0,
  };

  const openRoleHealth = useMemo(() => {
    const positions = dashboardData?.positions ?? [];

    return positions
      .map((position) => {
        const jobMeta = jobs.find((job) => job.id === position.id) || {};
        const progress = position.applicants > 0 ? Math.round((position.screened / position.applicants) * 100) : 0;
        const shortlistSize = Number(jobMeta.shortlistSize ?? 10);

        return {
          ...position,
          closingDate: jobMeta.closingDate,
          shortlistSize,
          progress: clamp(progress),
          closingSoon: isSoon(jobMeta.closingDate),
          needsShortlist: position.applicants > 0 && position.screened < Math.min(position.applicants, shortlistSize),
        };
      })
      .sort((a, b) => {
        const aSoon = a.closingSoon ? 1 : 0;
        const bSoon = b.closingSoon ? 1 : 0;
        return bSoon - aSoon || (b.applicants || 0) - (a.applicants || 0);
      });
  }, [dashboardData?.positions, jobs]);

  const todayApplicants = useMemo(() => candidates.filter((candidate) => isToday(candidate.createdAt)).length, [candidates]);

  const priorityQueue = useMemo(
    () =>
      candidates
        .map((candidate) => ({
          ...candidate,
          priority: getPriorityMeta(candidate),
          score: getCandidateScore(candidate),
        }))
        .filter((candidate) => candidate.priority)
        .sort((a, b) => {
          const rankDiff = a.priority.rank - b.priority.rank;
          if (rankDiff !== 0) return rankDiff;

          const scoreA = a.score ?? -1;
          const scoreB = b.score ?? -1;
          if (scoreA !== scoreB) return scoreB - scoreA;

          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        })
        .slice(0, 8),
    [candidates],
  );

  const interviewFollowUps = useMemo(
    () =>
      candidates
        .filter((candidate) => interviewStatusSet.has(String(candidate.status || '').toUpperCase()))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 4),
    [candidates],
  );

  const roleRisks = useMemo(
    () => openRoleHealth.filter((role) => role.closingSoon || role.needsShortlist).slice(0, 4),
    [openRoleHealth],
  );

  const recentApplicants = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5),
    [candidates],
  );

  const workMetrics = useMemo(
    () => [
      {
        label: 'Need action',
        value: priorityQueue.length,
        helper: 'Candidate tasks',
      },
      {
        label: 'HR decisions',
        value: interviewFollowUps.length || metrics.nextInterviews,
        helper: 'Accept or reject',
      },
      {
        label: 'Today applicants',
        value: todayApplicants,
        helper: 'New submissions',
      },
      {
        label: 'Role risks',
        value: roleRisks.length,
        helper: 'Closing or underscreened',
      },
    ],
    [interviewFollowUps.length, metrics.nextInterviews, priorityQueue.length, roleRisks.length, todayApplicants],
  );

  return (
    <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="candidate-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">Dashboard</p>
              <h1 className="app-page-title mt-2 text-3xl text-zinc-950 sm:text-4xl">Today's work</h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600">
                Start with candidate decisions, then clear role risks.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {workMetrics.map((metric, index) => (
              <Metric key={metric.label} {...metric} index={index} />
            ))}
          </div>
        </section>

        {loading && (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm font-bold text-zinc-500">
            Loading dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="flex min-w-0 flex-col gap-5">
              <section className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="app-section-title text-2xl text-zinc-950">Needs action now</h2>
                    <span className={sectionCountClassName}>{priorityQueue.length}</span>
                  </div>
                </div>

                {priorityQueue.length === 0 ? (
                  <div className="px-5 py-5">
                    <EmptyState>No candidate actions waiting right now.</EmptyState>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {priorityQueue.map((candidate, index) => (
                      <ActionRow key={candidate.id} candidate={candidate} index={index} />
                    ))}
                  </div>
                )}
              </section>

              <section className="candidate-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="app-section-title text-2xl text-zinc-950">Recent activity</h2>
                    <span className={sectionCountClassName}>{recentApplicants.length}</span>
                  </div>
                </div>

                {recentApplicants.length === 0 ? (
                  <div className="px-5 py-5">
                    <EmptyState>No applicants yet.</EmptyState>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {recentApplicants.map((candidate, index) => (
                      <SmallCandidateRow key={candidate.id} candidate={candidate} index={index} />
                    ))}
                  </div>
                )}
              </section>
            </main>

            <aside className="flex min-w-0 flex-col gap-5">
              <section className="job-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Quick actions</h2>
                </div>
                <div className="mt-4 grid gap-3">
                  <Link to="/candidates?status=AI_INTERVIEW_SCORED" className={secondaryButtonClassName}>
                    Review AI scored
                  </Link>
                  <Link to="/candidates?status=INTERVIEW_DONE" className={secondaryButtonClassName}>
                    Review HR decisions
                  </Link>
                  <Link to="/jobs?create=1" className={primaryButtonClassName}>
                    Create job
                  </Link>
                </div>
              </section>

              <section className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">HR decisions</h2>
                  <span className={sectionCountClassName}>{interviewFollowUps.length}</span>
                </div>

                {interviewFollowUps.length === 0 ? (
                  <div className="p-4">
                    <EmptyState>No HR decisions waiting.</EmptyState>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {interviewFollowUps.map((candidate, index) => (
                      <SmallCandidateRow key={candidate.id} candidate={candidate} index={index} />
                    ))}
                  </div>
                )}
              </section>

              <section className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Role risks</h2>
                  <span className={sectionCountClassName}>{roleRisks.length}</span>
                </div>

                {roleRisks.length === 0 ? (
                  <div className="p-4">
                    <EmptyState>No role risks detected.</EmptyState>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {roleRisks.map((role, index) => (
                      <RoleRiskRow key={role.id} role={role} index={index} />
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
