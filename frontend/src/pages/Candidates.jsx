import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { buttonBaseClassName } from '../styles/buttonStyles';
import InDepthCVAnalysisModal from '../components/InDepthCVAnalysisModal';

const selectClassName =
  'min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const collapseToggleClassName = `${buttonBaseClassName} h-9 w-9 border border-zinc-200 bg-white p-0 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus:ring-zinc-300`;
const sectionCountClassName = 'inline-flex min-h-7 items-center rounded-full bg-zinc-100 px-2.5 text-xs font-black tracking-[0.08em] text-zinc-600';
const isFinalizedJob = (candidate) =>
  String(candidate.jobStatus || '').toUpperCase() === 'CLOSED' ||
  (candidate.jobClosingDate ? new Date(candidate.jobClosingDate).getTime() <= Date.now() : false);

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

const CollapseIcon = ({ collapsed }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 8l5 5 5-5" />
  </svg>
);

const reviewLanes = [
  {
    key: 'ai-scored',
    title: 'Waiting for HR decision',
    description: 'AI interview completed. HR can accept for human interview or reject.',
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
    description: 'Auto CV screening or AI interview still in progress.',
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

const CandidateRow = ({ candidate, index = 0, hideRank = false, hideRadar = false }) => {
  const score = getNumericScore(candidate);
  const radar = getCandidateRadar(candidate);
  const rank = candidate.aiInterviewRank ? `#${candidate.aiInterviewRank} for this job` : 'No rank yet';
  const appliedDate = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'No date';

  return (
    <article
      className={`candidate-row grid items-center gap-5 px-5 py-5 ${
        hideRadar && hideRank
          ? 'lg:grid-cols-[minmax(320px,1fr)_112px]'
          : hideRank
            ? 'lg:grid-cols-[minmax(320px,1fr)_170px_112px]'
            : 'lg:grid-cols-[minmax(320px,1fr)_170px_120px_112px]'
      }`}
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
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-500">{candidate.email}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-zinc-800">
            <span>{candidate.jobTitle || 'No linked role'}</span>
            <span className="text-zinc-300">/</span>
            <span className="text-zinc-500">Applied {appliedDate}</span>
          </div>
        </div>
      </div>

      {hideRadar ? null : (
        <div className="candidate-radar-reveal h-28 w-36 justify-self-start lg:justify-self-center">
          <RadarPolygon points={radar} />
        </div>
      )}

      {hideRank ? null : (
        <div className="grid gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Rank in job</p>
          <p className="text-xs font-semibold text-zinc-500">{rank}</p>
        </div>
      )}

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
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ jobId: '', status: searchParams.get('status') || '' });
  const [analysisCandidate, setAnalysisCandidate] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const status = searchParams.get('status') || '';
    setFilters((current) => (current.status === status ? current : { ...current, status }));
  }, [searchParams]);

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
    const pendingReview = candidates.filter(
      (candidate) =>
        candidate.isShortlisted &&
        isFinalizedJob(candidate) &&
        String(candidate.status || '').toUpperCase() === 'AI_INTERVIEW_SCORED',
    ).length;

    return {
      pendingReview,
    };
  }, [candidates]);

  const toggleLane = (laneKey) => {
    setCollapsedLanes((current) => ({
      ...current,
      [laneKey]: !current[laneKey],
    }));
  };

  const formatScore = (candidate) => {
    const score = getNumericScore(candidate);
    if (score !== null) {
      return `${Math.round(score)}%`;
    }
    return '-';
  };

  const getStatusTone = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized.includes('REJECT') || normalized === 'FAILED') {
      return 'border-red-200 bg-red-50 text-red-600';
    }
    if (normalized === 'HIRED' || normalized === 'ONBOARDING') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (normalized.includes('INTERVIEW_DONE') || normalized === 'AI_INTERVIEW_SCORED' || normalized.includes('OFFER')) {
      return 'border-blue-200 bg-blue-50 text-blue-700';
    }
    return 'border-zinc-200 bg-zinc-50 text-zinc-700';
  };

  return (
    <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="candidate-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="app-page-title text-3xl text-zinc-950 sm:text-4xl">Candidates</h1>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {[
                  { label: 'Total', value: candidates.length },
                  { label: 'Pending review', value: intelligence.pendingReview },
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
            <h2 className="app-section-title mt-3 text-2xl text-zinc-950">No candidates found</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600">
              Clear a filter or wait for new applicants to appear in this list.
            </p>
          </section>
        ) : (
          <section>
            <div className="grid gap-4">
              {candidateLanes.map((lane, laneIndex) => (
                <section
                  key={lane.key}
                  className="candidate-lane-enter overflow-hidden rounded-lg border border-zinc-200 bg-white"
                  style={{ animationDelay: `${120 + laneIndex * 80}ms` }}
                >
                  <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-black tracking-tight text-zinc-950">{lane.title}</h3>
                      <span className={sectionCountClassName}>{lane.candidates.length}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className={collapseToggleClassName}
                        onClick={() => toggleLane(lane.key)}
                        aria-expanded={!collapsedLanes[lane.key]}
                        aria-label={collapsedLanes[lane.key] ? `Expand ${lane.title}` : `Collapse ${lane.title}`}
                      >
                        <CollapseIcon collapsed={collapsedLanes[lane.key]} />
                      </button>
                    </div>
                  </div>

                  {collapsedLanes[lane.key] ? null : (
                    <div className="divide-y divide-zinc-100">
                      {lane.candidates.map((candidate, index) => (
                        <CandidateRow
                          key={candidate.id}
                          candidate={candidate}
                          index={index}
                          hideRank={lane.key === 'rejected-closed'}
                          hideRadar={lane.key === 'rejected-closed'}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </section>
        )}
      </div>

      <InDepthCVAnalysisModal
        candidateId={analysisCandidate?.id}
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
      />
    </div>
  );
};

export default Candidates;
