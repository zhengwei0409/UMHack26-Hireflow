import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  buttonBaseClassName,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../styles/buttonStyles';

const primaryButtonClassName = `${buttonPrimaryClassName} !text-white visited:!text-white`;
const secondaryButtonClassName = buttonSecondaryClassName;

const priorityConfig = {
  AI_INTERVIEW_SCORED: {
    title: 'Needs HR review',
    detail: 'AI interview is scored. Decide whether to move forward.',
    rank: 1,
  },
  INTERVIEW_RESCHEDULE_REQUESTED: {
    title: 'Reschedule request',
    detail: 'Candidate asked to change interview timing.',
    rank: 2,
  },
  INTERVIEW_PENDING: {
    title: 'Interview not scheduled',
    detail: 'Candidate is ready for human interview scheduling.',
    rank: 3,
  },
  INTERVIEW_DONE: {
    title: 'Interview outcome needed',
    detail: 'Interview is done. Record the final decision.',
    rank: 4,
  },
  CV_UNDER_REVIEW: {
    title: 'CV review pending',
    detail: 'Application is waiting for manual review.',
    rank: 5,
  },
};

const pipelineGroups = [
  {
    key: 'incoming',
    label: 'Incoming',
    helper: 'New CVs and early screening.',
    statuses: ['APPLIED', 'CV_PARSING', 'CV_UNDER_REVIEW'],
  },
  {
    key: 'ai',
    label: 'AI interview',
    helper: 'Invited, in progress, completed, or scored.',
    statuses: ['AI_INTERVIEW_INVITED', 'AI_INTERVIEW_IN_PROGRESS', 'AI_INTERVIEW_COMPLETED', 'AI_INTERVIEW_SCORED'],
  },
  {
    key: 'human',
    label: 'Human interview',
    helper: 'Scheduling and final interview steps.',
    statuses: ['INTERVIEW_PENDING', 'INTERVIEW_SCHEDULED', 'INTERVIEW_CONFIRMED', 'INTERVIEW_RESCHEDULE_REQUESTED', 'INTERVIEW_DONE'],
  },
  {
    key: 'offer',
    label: 'Offer / hired',
    helper: 'Offer creation, onboarding, and hired.',
    statuses: ['OFFER_GENERATING', 'OFFER_SENT', 'ONBOARDING', 'HIRED'],
  },
];

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

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

  const now = new Date();
  const diff = date.getTime() - now.getTime();
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

const MetricTile = ({ label, value, hint, index = 0 }) => (
  <div
    className="candidate-metric-pop min-w-28 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
    style={{ animationDelay: `${120 + index * 70}ms` }}
  >
    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">{value}</p>
    <p className="mt-2 text-sm font-semibold leading-5 text-zinc-500">{hint}</p>
  </div>
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
        const threshold = Number(jobMeta.autoScreenThreshold ?? 60);
        const shortlistSize = Number(jobMeta.shortlistSize ?? 10);

        return {
          ...position,
          description: jobMeta.description || '',
          closingDate: jobMeta.closingDate,
          threshold,
          shortlistSize,
          progress: clamp(progress),
          closingSoon: isSoon(jobMeta.closingDate),
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
        .slice(0, 6),
    [candidates],
  );

  const recentApplicants = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6),
    [candidates],
  );

  const pipelineSnapshot = useMemo(
    () =>
      pipelineGroups.map((group) => ({
        ...group,
        total: candidates.filter((candidate) => group.statuses.includes(String(candidate.status || '').toUpperCase())).length,
      })),
    [candidates],
  );

  const hiringSignals = useMemo(
    () => [
      {
        label: 'Open roles',
        value: metrics.openRoles,
        hint: 'Roles still accepting applicants.',
      },
      {
        label: 'New today',
        value: todayApplicants,
        hint: 'Applicants submitted today.',
      },
      {
        label: 'Needs review',
        value: metrics.aiScored,
        hint: 'AI-scored candidates waiting for HR.',
      },
      {
        label: 'To schedule',
        value: metrics.nextInterviews,
        hint: 'Candidates ready for interview scheduling.',
      },
    ],
    [metrics, todayApplicants],
  );

  return (
    <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="candidate-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-[-0.05em] text-zinc-950 sm:text-4xl">Hiring overview</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/jobs" className={primaryButtonClassName}>
                Open jobs
              </Link>
              <Link to="/candidates" className={secondaryButtonClassName}>
                View candidates
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {hiringSignals.map((metric, index) => (
              <MetricTile key={metric.label} {...metric} index={index} />
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
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">Candidates needing attention</h2>
                    <p className="mt-1 text-sm font-semibold text-zinc-500">Candidates that likely need your next decision.</p>
                  </div>
                  <p className="text-sm font-black text-zinc-500">{priorityQueue.length} items</p>
                </div>

                {priorityQueue.length === 0 ? (
                  <div className="px-5 py-10 text-sm font-semibold text-zinc-500">No urgent items right now.</div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {priorityQueue.map((candidate, index) => (
                      <Link
                        key={candidate.id}
                        to={`/candidates/${candidate.id}`}
                        className="candidate-row block px-5 py-4 transition hover:bg-zinc-50"
                        style={{ animationDelay: `${120 + index * 60}ms` }}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-black text-zinc-950">{candidate.fullName}</h3>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700">
                                {candidate.priority.title}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-zinc-500">
                              {candidate.jobTitle || 'No linked role'} / {formatStatusLabel(candidate.status)}
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-600">{candidate.priority.detail}</p>
                          </div>

                          <div className="grid shrink-0 grid-cols-2 gap-x-8 text-sm font-semibold text-zinc-500 lg:min-w-[220px] lg:justify-items-end">
                            <div className="min-w-[72px] text-left lg:text-right">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Score</p>
                              <p className="mt-1 text-lg font-black text-zinc-950">
                                {candidate.score === null || Number.isNaN(candidate.score) ? '-' : Math.round(candidate.score)}
                              </p>
                            </div>
                            <div className="min-w-[92px] text-left lg:text-right">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Applied</p>
                              <p className="mt-1 font-black text-zinc-950">{formatCompactDate(candidate.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="candidate-page-enter rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-200 px-5 py-5">
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">Candidates by stage</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">A quick count of where candidates are in the hiring process.</p>
                </div>

                <div className="grid gap-4 px-5 py-5">
                  {pipelineSnapshot.map((group, index) => (
                    <div
                      key={group.key}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4"
                      style={{ animationDelay: `${120 + index * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-zinc-950">{group.label}</p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-zinc-500">{group.helper}</p>
                        </div>
                        <p className="text-2xl font-black tracking-tight text-zinc-950">{group.total}</p>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Extra signals</p>
                    <div className="mt-3 grid gap-3 text-sm font-semibold text-zinc-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Screened resumes</span>
                        <span className="font-black text-zinc-950">{metrics.screenedResumes}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Shortlisted candidates</span>
                        <span className="font-black text-zinc-950">{metrics.shortlisted}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Total applicants</span>
                        <span className="font-black text-zinc-950">{metrics.totalApplicants}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">Open jobs overview</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">See which jobs are active, closing soon, or still need more applicants.</p>
                </div>
                <p className="text-sm font-black text-zinc-500">{openRoleHealth.length} open roles</p>
              </div>

              {openRoleHealth.length === 0 ? (
                <div className="px-5 py-10 text-sm font-semibold text-zinc-500">No open roles yet.</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {openRoleHealth.map((role, index) => (
                    <article
                      key={role.id}
                      className="job-row grid gap-5 px-5 py-5 lg:grid-cols-[minmax(300px,1fr)_160px_220px_160px]"
                      style={{ animationDelay: `${120 + index * 45}ms` }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                            {role.department || 'General'}
                          </span>
                          {role.closingSoon && (
                            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                              Closing soon
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-lg font-black tracking-[-0.03em] text-zinc-950">{role.title}</h3>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">
                          {role.location || 'Location TBD'} / Deadline {formatDate(role.closingDate)}
                        </p>
                        <p className="mt-3 line-clamp-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-600">
                          {role.description || 'Review applicants, shortlist strong profiles, and keep interview scheduling moving.'}
                        </p>
                      </div>

                      <div className="grid content-start gap-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Applicants</p>
                        <p className="text-3xl font-black tracking-tight text-zinc-950">{role.applicants}</p>
                        <p className="text-sm font-semibold text-zinc-500">{role.screened} screened</p>
                      </div>

                      <div className="grid content-start gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Screening progress</p>
                          <p className="text-sm font-black text-zinc-950">{role.progress}%</p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div className="h-full rounded-full bg-zinc-950" style={{ width: `${role.progress}%` }} />
                        </div>
                        <div className="grid gap-1 text-sm font-semibold text-zinc-500">
                          <p>AI threshold {role.threshold}%</p>
                          <p>Shortlist target {role.shortlistSize}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 lg:items-end">
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold tracking-[-0.01em] text-zinc-700">
                          {formatRelativeDay(role.closingDate)}
                        </span>
                        <Link to={`/jobs/${role.id}`} className={`${secondaryButtonClassName} w-full lg:w-auto`}>
                          See details
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="candidate-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-zinc-950">Recent applicants</h2>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">The newest candidates entering your hiring flow.</p>
                </div>
                <p className="text-sm font-black text-zinc-500">{recentApplicants.length} shown</p>
              </div>

              {recentApplicants.length === 0 ? (
                <div className="px-5 py-10 text-sm font-semibold text-zinc-500">No applicants yet.</div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {recentApplicants.map((candidate, index) => {
                    const score = getCandidateScore(candidate);

                    return (
                      <Link
                        key={candidate.id}
                        to={`/candidates/${candidate.id}`}
                        className="candidate-row block px-5 py-4 transition hover:bg-zinc-50"
                        style={{ animationDelay: `${120 + index * 50}ms` }}
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_180px_120px] lg:items-center">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-zinc-950">{candidate.fullName}</h3>
                            <p className="mt-1 text-sm font-semibold text-zinc-500">{candidate.jobTitle || 'No linked role'}</p>
                          </div>

                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Stage</p>
                            <p className="mt-1 text-sm font-black text-zinc-950">{formatStatusLabel(candidate.status)}</p>
                          </div>

                          <div className="justify-self-start lg:justify-self-end">
                            <div className="flex min-h-[72px] min-w-[96px] flex-col items-center justify-between rounded-lg bg-zinc-50 px-3 py-3 text-center">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Score</p>
                              <div className="flex min-h-[28px] items-center justify-center">
                                <p className="text-xl font-black leading-none tabular-nums text-zinc-950">
                                  {score === null || Number.isNaN(score) ? '-' : Math.round(score)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
