import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const selectClassName =
  'min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const buttonBaseClassName =
  'inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold tracking-[-0.01em] transition focus:outline-none focus:ring-2 focus:ring-offset-2';

const statusOptions = [
  ['APPLIED', 'Applied'],
  ['CV_PARSING', 'CV Parsing'],
  ['CV_PARSE_FAILED', 'CV Parse Failed'],
  ['CV_UNDER_REVIEW', 'Under Review'],
  ['CV_REJECTED', 'Rejected'],
  ['AI_INTERVIEW_INVITED', 'AI Interview Invited'],
  ['AI_INTERVIEW_IN_PROGRESS', 'AI Interview In Progress'],
  ['AI_INTERVIEW_COMPLETED', 'AI Interview Completed'],
  ['AI_INTERVIEW_SCORED', 'AI Interview Scored'],
  ['INTERVIEW_PENDING', 'Interview Pending'],
  ['INTERVIEW_SCHEDULED', 'Interview Scheduled'],
  ['INTERVIEW_CONFIRMED', 'Interview Confirmed'],
  ['INTERVIEW_RESCHEDULE_REQUESTED', 'Reschedule Requested'],
  ['INTERVIEW_DONE', 'Interview Done'],
  ['INTERVIEW_REJECTED', 'Interview Rejected'],
  ['OFFER_GENERATING', 'Offer Generating'],
  ['OFFER_SENT', 'Offer Sent'],
  ['ONBOARDING', 'Onboarding'],
  ['HIRED', 'Hired'],
  ['FAILED', 'Failed'],
];

const reviewLanes = [
  {
    key: 'ai-scored',
    title: 'Waiting for HR decision',
    description: 'AI interview completed. HR can advance or reject.',
    statuses: ['AI_INTERVIEW_SCORED'],
  },
  {
    key: 'human-interview',
    title: 'Waiting for human interview',
    description: 'Schedule, confirm, or record interview outcome.',
    statuses: ['INTERVIEW_PENDING', 'INTERVIEW_SCHEDULED', 'INTERVIEW_CONFIRMED', 'INTERVIEW_RESCHEDULE_REQUESTED', 'INTERVIEW_DONE'],
  },
  {
    key: 'active-screening',
    title: 'Waiting for screening',
    description: 'CV review or AI interview still in progress.',
    statuses: ['APPLIED', 'CV_PARSING', 'CV_UNDER_REVIEW', 'AI_INTERVIEW_INVITED', 'AI_INTERVIEW_IN_PROGRESS', 'AI_INTERVIEW_COMPLETED'],
  },
  {
    key: 'offer-hired',
    title: 'Offer or hired',
    description: 'Offer, onboarding, or hired candidates.',
    statuses: ['OFFER_GENERATING', 'OFFER_SENT', 'ONBOARDING', 'HIRED'],
  },
  {
    key: 'rejected-closed',
    title: 'Rejected or closed',
    description: 'Candidates no longer moving forward.',
    statuses: ['CV_REJECTED', 'INTERVIEW_REJECTED', 'CV_PARSE_FAILED', 'INTERVIEW_INVITE_FAILED', 'FAILED'],
  },
];

const formatStatusLabel = (status) =>
  String(status || 'UNKNOWN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const getNumericScore = (candidate) => {
  if (candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined) {
    return Number(candidate.aiInterviewScore);
  }

  if (candidate.glmScore !== null && candidate.glmScore !== undefined) {
    return Number(candidate.glmScore);
  }

  return null;
};

const getStatusWeight = (status) => {
  const normalized = String(status || '').toUpperCase();
  const weights = {
    APPLIED: 16,
    CV_PARSING: 24,
    CV_UNDER_REVIEW: 34,
    AI_INTERVIEW_INVITED: 46,
    AI_INTERVIEW_IN_PROGRESS: 56,
    AI_INTERVIEW_COMPLETED: 66,
    AI_INTERVIEW_SCORED: 76,
    INTERVIEW_PENDING: 82,
    INTERVIEW_SCHEDULED: 88,
    INTERVIEW_CONFIRMED: 90,
    INTERVIEW_RESCHEDULE_REQUESTED: 72,
    INTERVIEW_DONE: 92,
    OFFER_GENERATING: 94,
    OFFER_SENT: 96,
    ONBOARDING: 98,
    HIRED: 100,
    CV_REJECTED: 18,
    INTERVIEW_REJECTED: 24,
    FAILED: 14,
  };

  return weights[normalized] || 30;
};

const getCandidateRadar = (candidate) => {
  const score = getNumericScore(candidate);
  const rank = Number(candidate.aiInterviewRank);

  return [
    { label: 'CV', value: clamp(Number(candidate.glmScore ?? score ?? 0)) },
    { label: 'AI', value: clamp(Number(candidate.aiInterviewScore ?? score ?? 0)) },
    { label: 'Rank', value: rank > 0 ? clamp(105 - rank * 12) : candidate.isShortlisted ? 82 : 38 },
    { label: 'Stage', value: getStatusWeight(candidate.status) },
    { label: 'Pass', value: candidate.isShortlisted ? 92 : 38 },
  ];
};

const RadarPolygon = ({ points, size = 148 }) => {
  const center = size / 2;
  const radius = size * 0.39;
  const angleOffset = -Math.PI / 2;
  const values = points.map((point, index) => {
    const angle = angleOffset + (Math.PI * 2 * index) / points.length;
    const pointRadius = radius * (clamp(point.value) / 100);

    return {
      ...point,
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius,
      labelX: center + Math.cos(angle) * (radius + 17),
      labelY: center + Math.sin(angle) * (radius + 17),
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
    };
  });

  const polygon = values.map((point) => `${point.x},${point.y}`).join(' ');
  const outer = values.map((point) => `${point.axisX},${point.axisY}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full overflow-visible" role="img" aria-label="Candidate profile chart">
      <polygon points={outer} className="fill-zinc-100 stroke-zinc-200" strokeWidth="1" />
      {values.map((point) => (
        <line
          key={point.label}
          x1={center}
          y1={center}
          x2={point.axisX}
          y2={point.axisY}
          className="stroke-zinc-200"
          strokeWidth="1"
        />
      ))}
      <polygon points={polygon} className="fill-zinc-300/70 stroke-zinc-950" strokeWidth="2" />
      {values.map((point) => (
        <text
          key={`label-${point.label}`}
          x={point.labelX}
          y={point.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-zinc-500 text-[9px] font-bold uppercase tracking-[0.16em]"
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
};

const ScoreRing = ({ score }) => {
  const normalized = score === null || Number.isNaN(score) ? 0 : clamp(score);

  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(#18181b ${normalized * 3.6}deg, #e4e4e7 0deg)` }}
      aria-label={`Score ${normalized}%`}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-black text-zinc-950">
        {score === null || Number.isNaN(score) ? '-' : Math.round(normalized)}
      </div>
    </div>
  );
};

const CandidateRow = ({ candidate, index = 0 }) => {
  const score = getNumericScore(candidate);
  const radar = getCandidateRadar(candidate);
  const rank = candidate.aiInterviewRank ? `#${candidate.aiInterviewRank} for this job` : 'No rank yet';
  const appliedDate = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'No date';

  return (
    <article
      className="candidate-row grid items-center gap-5 px-5 py-5 lg:grid-cols-[minmax(320px,1fr)_170px_120px_112px]"
      style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="candidate-score-pop grid justify-items-center gap-1">
          <ScoreRing score={score} />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Overall</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-zinc-950">{candidate.fullName}</h3>
            {candidate.isShortlisted && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700">
                AI pass
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-500">{candidate.email}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-zinc-800">
            <span>{candidate.jobTitle || 'No linked role'}</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-500">Applied {appliedDate}</span>
          </div>
        </div>
      </div>

      <div className="candidate-radar-reveal h-28 w-36 justify-self-start lg:justify-self-center">
        <RadarPolygon points={radar} />
      </div>

      <div className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Rank in job</p>
        <p className="text-xs font-semibold text-zinc-500">{rank}</p>
      </div>

      <div className="flex flex-col items-start gap-3 lg:items-end">
        <Link
          to={`/candidates/${candidate.id}`}
          className={`${buttonBaseClassName} candidate-open-button min-h-10 w-24 bg-zinc-950 px-4 text-sm !text-white focus:ring-zinc-950`}
          style={{ color: '#fff' }}
        >
          <span className="!text-white">Open</span>
        </Link>
      </div>
    </article>
  );
};

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ jobId: '', status: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filters]);

  const loadData = async () => {
    try {
      const [jobsRes] = await Promise.all([api.jobs.list()]);
      setJobs((jobsRes.data.items || []).filter((job) => String(job.status || '').toUpperCase() !== 'CLOSED'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadCandidates = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.status) params.status = filters.status;
      const res = await api.candidates.list(params);
      setCandidates(res.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const intelligence = useMemo(() => {
    const shortlisted = candidates.filter((candidate) => candidate.isShortlisted).length;
    return {
      shortlisted,
    };
  }, [candidates]);

  const candidateLanes = useMemo(() => {
    const usedStatuses = new Set(reviewLanes.flatMap((lane) => lane.statuses));
    const lanes = reviewLanes
      .map((lane) => ({
        ...lane,
        candidates: candidates.filter((candidate) => lane.statuses.includes(String(candidate.status || '').toUpperCase())),
      }))
      .filter((lane) => lane.candidates.length > 0);

    const otherCandidates = candidates.filter((candidate) => !usedStatuses.has(String(candidate.status || '').toUpperCase()));
    if (otherCandidates.length > 0) {
      lanes.push({
        key: 'other',
        title: 'Other Status',
        description: 'Candidates with other workflow states.',
        candidates: otherCandidates,
      });
    }

    return lanes;
  }, [candidates]);

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="candidate-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.05em] text-zinc-950 sm:text-4xl">Candidates</h1>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  { label: 'Total', value: candidates.length },
                  { label: 'AI passed', value: intelligence.shortlisted },
                ].map((metric, index) => (
                  <div
                    key={metric.label}
                    className="candidate-metric-pop min-w-28"
                    style={{ animationDelay: `${120 + index * 70}ms` }}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                <span>Job</span>
                <select
                  className={selectClassName}
                  value={filters.jobId}
                  onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                >
                  <option value="">All jobs</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                <span>Status</span>
                <select
                  className={selectClassName}
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm font-bold text-zinc-500">
            Loading candidates...
          </div>
        ) : candidates.length === 0 ? (
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">No matches</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-zinc-950">No candidates found</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600">
              Clear a filter or wait for new applicants to enter this pipeline.
            </p>
          </section>
        ) : (
          <section>
            <div className="candidate-page-enter rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">Candidate list</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-zinc-950">Pipeline</h2>
                </div>
              </div>

              <div className="grid gap-4 p-4">
                {candidateLanes.map((lane, laneIndex) => (
                  <section
                    key={lane.key}
                    className="candidate-lane-enter overflow-hidden rounded-lg border border-zinc-200 bg-white"
                    style={{ animationDelay: `${120 + laneIndex * 80}ms` }}
                  >
                    <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-zinc-950">{lane.title}</h3>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">{lane.description}</p>
                      </div>
                      <p className="text-sm font-black text-zinc-500">{lane.candidates.length}</p>
                    </div>

                    <div className="divide-y divide-zinc-100">
                      {lane.candidates.map((candidate, index) => (
                        <CandidateRow key={candidate.id} candidate={candidate} index={index} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Candidates;
