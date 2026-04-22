import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const STATUS_ACTIONS = {
  CV_UNDER_REVIEW: [
    { key: 'accept-cv', label: 'Invite to AI Interview', variant: 'success' },
    { key: 'reject-cv', label: 'Reject Candidate', variant: 'danger' },
  ],
  AI_INTERVIEW_SCORED: [
    { key: 'advance-to-human-interview', label: 'Advance to Human Interview', variant: 'success' },
    { key: 'reject-after-ai', label: 'Reject After AI Review', variant: 'danger' },
  ],
  INTERVIEW_PENDING: [{ key: 'schedule-interview', label: 'Schedule Interview', variant: 'primary' }],
  INTERVIEW_SCHEDULED: [{ key: 'mark-interview-done', label: 'Mark Interview Done', variant: 'primary' }],
  INTERVIEW_CONFIRMED: [{ key: 'mark-interview-done', label: 'Mark Interview Done', variant: 'primary' }],
  INTERVIEW_RESCHEDULE_REQUESTED: [
    { key: 'schedule-interview', label: 'Reschedule Interview', variant: 'warning' },
  ],
  INTERVIEW_DONE: [
    { key: 'accept-interview', label: 'Accept & Generate Offer', variant: 'success' },
    { key: 'reject-interview', label: 'Reject', variant: 'danger' },
  ],
  CV_PARSE_FAILED: [{ key: 'retry', label: 'Retry Analysis', variant: 'primary' }],
  INTERVIEW_INVITE_FAILED: [{ key: 'retry', label: 'Retry Invite', variant: 'primary' }],
  FAILED: [{ key: 'retry', label: 'Retry', variant: 'primary' }],
};

const fieldClassName =
  'w-full rounded-md border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const formatStatusLabel = (status) =>
  String(status || 'UNKNOWN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('rejected') || normalized.includes('failed')) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized.includes('offer') || normalized.includes('hired')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized.includes('scheduled') || normalized.includes('confirmed')) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized.includes('review') || normalized.includes('pending') || normalized.includes('progress')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-zinc-200 bg-zinc-100 text-zinc-700';
};

const getRecommendationTone = (value) => {
  const normalized = String(value || '').toLowerCase();

  if (normalized.includes('strong') || normalized.includes('accept') || normalized.includes('advance')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized.includes('reject')) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const getActionButtonClass = (variant) => {
  if (variant === 'danger') {
    return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
  }

  if (variant === 'success') {
    return 'bg-black text-white hover:bg-zinc-800';
  }

  if (variant === 'warning') {
    return 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100';
  }

  return 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-black';
};

const DetailCard = ({ title, description, children }) => (
  <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm lg:p-8">
    <div className="mb-5">
      <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">{title}</h2>
      {description && <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">{description}</p>}
    </div>
    {children}
  </section>
);

const MetricTile = ({ label, value }) => (
  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
    <p className="mt-2 text-xl font-extrabold tracking-tight text-zinc-950">{value}</p>
  </div>
);

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiReport, setAiReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [note, setNote] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', location: '', meetingLink: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [candidateRes, historyRes, aiReportRes] = await Promise.all([
        api.candidates.get(id),
        api.candidates.history(id),
        api.candidates.getAiReport(id).catch(() => ({ data: null })),
      ]);

      setCandidate(candidateRes.data);
      setHistory(historyRes.data || []);

      if (aiReportRes.data) {
        const latestSession = aiReportRes.data.interviewSessions?.[0] || null;
        setAiReport({
          summary: latestSession?.scoreBreakdown || null,
          session: latestSession
            ? {
                ...latestSession,
                questions: (latestSession.questions || []).map((question) => ({
                  ...question,
                  latestAnswer: question.answers?.[0] || null,
                })),
              }
            : null,
          proctorFlagCount: latestSession?.proctorEvents?.length || 0,
        });
      } else {
        setAiReport(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionKey) => {
    if (actionKey === 'schedule-interview') {
      setShowScheduleModal(true);
      return;
    }

    setActionLoading(actionKey);
    setError('');

    try {
      let action;
      switch (actionKey) {
        case 'accept-cv':
          action = api.candidates.acceptCv(id, note);
          break;
        case 'reject-cv':
          action = api.candidates.rejectCv(id, note);
          break;
        case 'accept-interview':
          action = api.candidates.acceptInterview(id, note);
          break;
        case 'reject-interview':
          action = api.candidates.rejectInterview(id, note);
          break;
        case 'advance-to-human-interview':
          action = api.candidates.advanceToHumanInterview(id, note);
          break;
        case 'reject-after-ai':
          action = api.candidates.rejectAfterAi(id, note);
          break;
        case 'mark-interview-done':
          action = api.candidates.markInterviewDone(id);
          break;
        case 'retry':
          action = api.candidates.retry(id);
          break;
        default:
          return;
      }

      await action;
      await loadData();
      setNote('');
      setShowScheduleModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('schedule');
    setError('');

    try {
      await api.candidates.scheduleInterview(id, scheduleData);
      await loadData();
      setShowScheduleModal(false);
      setScheduleData({ date: '', time: '', location: '', meetingLink: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${candidate.fullName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.candidates.delete(id);
      navigate('/candidates');
    } catch (err) {
      setError(err.message);
    }
  };

  const actions = STATUS_ACTIONS[candidate?.status] || [];
  const glmAnalysis = candidate?.glmAnalysis;

  const metrics = useMemo(() => {
    if (!candidate) return [];

    return [
      { label: 'Applied', value: candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '-' },
      { label: 'CV score', value: candidate.glmScore !== null && candidate.glmScore !== undefined ? `${candidate.glmScore}/100` : '-' },
      {
        label: 'Interview score',
        value:
          candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined
            ? `${candidate.aiInterviewScore.toFixed(1)}/100`
            : '-',
      },
      {
        label: 'Rank',
        value:
          candidate.aiInterviewRank !== null && candidate.aiInterviewRank !== undefined
            ? `#${candidate.aiInterviewRank}`
            : '-',
      },
    ];
  }, [candidate]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading candidate profile...
        </div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700">
          Candidate not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <Link
                to="/candidates"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-zinc-500 transition hover:text-black"
              >
                <span aria-hidden="true">←</span>
                <span>Back to candidates</span>
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getStatusTone(candidate.status)}`}
                >
                  {formatStatusLabel(candidate.status)}
                </span>

                <span className="text-sm font-semibold text-zinc-500">
                  {candidate.job?.title || 'No linked role'}{candidate.job?.department ? ` · ${candidate.job.department}` : ''}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                {candidate.fullName}
              </h1>
              <p className="mt-3 text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                {candidate.email} · {candidate.phone || 'No phone number provided'}
              </p>
            </div>

            <div className="flex items-start justify-start lg:justify-end">
              <a
                href={`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1'}/candidates/${id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
              >
                Download CV
              </a>
            </div>
          </div>

          <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-zinc-50 px-6 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="grid gap-6">
            <DetailCard
              title="Application details"
              description="Core profile information and screening signals gathered from the application."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile label="Job" value={candidate.job?.title || '-'} />
                <MetricTile label="Department" value={candidate.job?.department || '-'} />
                <MetricTile label="Auto-screen" value={candidate.autoScreenDecision || '-'} />
                <MetricTile label="Shortlisted" value={candidate.isShortlisted ? 'Yes' : 'No'} />
              </div>
            </DetailCard>

            {glmAnalysis && (
              <DetailCard
                title="AI resume analysis"
                description="Resume parsing output and the model's screening interpretation."
              >
                <p className="text-sm font-medium leading-7 text-zinc-600">{glmAnalysis.summary}</p>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Strengths</h3>
                    <ul className="mt-4 grid gap-3">
                      {(glmAnalysis.strengths || []).map((item, index) => (
                        <li key={`${item}-${index}`} className="text-sm font-semibold leading-6 text-zinc-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Weaknesses</h3>
                    <ul className="mt-4 grid gap-3">
                      {(glmAnalysis.weaknesses || []).map((item, index) => (
                        <li key={`${item}-${index}`} className="text-sm font-semibold leading-6 text-zinc-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getRecommendationTone(glmAnalysis.recommendation)}`}
                  >
                    Recommendation: {glmAnalysis.recommendation}
                  </span>
                </div>
              </DetailCard>
            )}

            {aiReport?.session && (
              <DetailCard
                title="AI interview evidence"
                description="Latest interview session status, score breakdown, and question-level evidence."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricTile label="Session status" value={formatStatusLabel(aiReport.session.status)} />
                  <MetricTile label="Proctor flags" value={aiReport.proctorFlagCount} />
                  <MetricTile
                    label="Questions"
                    value={(aiReport.session.questions || []).length}
                  />
                  <MetricTile
                    label="Overall score"
                    value={
                      candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined
                        ? `${candidate.aiInterviewScore.toFixed(1)}`
                        : '-'
                    }
                  />
                </div>

                {aiReport.summary && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <MetricTile label="DSA" value={`${Math.round(aiReport.summary.dsaScore || 0)}%`} />
                    <MetricTile label="MCQ" value={`${Math.round(aiReport.summary.mcqScore || 0)}%`} />
                    <MetricTile label="Behavioral" value={`${Math.round(aiReport.summary.behavioralScore || 0)}%`} />
                    <MetricTile label="CV match" value={`${Math.round(aiReport.summary.cvScore || 0)}%`} />
                    <MetricTile label="Penalty" value={`${Math.round(aiReport.summary.proctorPenalty || 0)} pts`} />
                  </div>
                )}

                <div className="mt-6 grid gap-3">
                  {(aiReport.session.questions || []).map((question) => (
                    <article key={question.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                            {question.type}
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-800">{question.prompt}</p>
                        </div>
                        <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-700">
                          {question.latestAnswer?.aiScore !== undefined && question.latestAnswer?.aiScore !== null
                            ? `${Math.round(question.latestAnswer.aiScore)}%`
                            : 'Pending'}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </DetailCard>
            )}

            <DetailCard
              title="Status history"
              description="Every workflow transition recorded for this candidate."
            >
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm font-semibold text-zinc-500">
                  No history yet
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((item, index) => (
                    <article key={`${item.event}-${item.at}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{item.event}</p>
                      <p className="mt-2 text-sm font-extrabold text-zinc-950">
                        {item.from || 'START'} → {item.to}
                      </p>
                      <p className="mt-2 text-sm font-medium text-zinc-600">
                        by {item.triggeredBy} · {new Date(item.at).toLocaleString()}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </DetailCard>
          </div>

          <div className="grid gap-6 self-start xl:sticky xl:top-6">
            <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Actions</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  Available actions depend on the current workflow status.
                </p>
              </div>

              {actions.length > 0 ? (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                    <span>Note</span>
                    <textarea
                      className={`${fieldClassName} min-h-[110px]`}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add context for the next workflow action..."
                      rows={4}
                    />
                  </label>

                  {actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className={`inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-70 ${getActionButtonClass(action.variant)}`}
                      onClick={() => handleAction(action.key)}
                      disabled={actionLoading === action.key}
                    >
                      {actionLoading === action.key ? 'Processing...' : action.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-500">
                  No actions available for this status.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Documents</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  Open the uploaded resume whenever you need the original source material.
                </p>
              </div>

              <a
                href={`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1'}/candidates/${id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
              >
                Download CV
              </a>
            </section>

            <section className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Danger zone</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  Delete this candidate and all associated workflow data.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                onClick={handleDelete}
              >
                Delete candidate
              </button>
            </section>
          </div>
        </div>

        {showScheduleModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
            onClick={() => setShowScheduleModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white p-6 shadow-xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">Schedule interview</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  Add the details below and the system will send the interview email to the candidate.
                </p>
              </div>

              <form onSubmit={handleScheduleSubmit} className="grid gap-5">
                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Date</span>
                  <input
                    type="date"
                    className={fieldClassName}
                    value={scheduleData.date}
                    onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                    required
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Time</span>
                  <input
                    type="time"
                    className={fieldClassName}
                    value={scheduleData.time}
                    onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                    required
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Location</span>
                  <input
                    type="text"
                    className={fieldClassName}
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                    placeholder="e.g., Conference Room A or Online"
                    required
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Meeting link</span>
                  <input
                    type="url"
                    className={fieldClassName}
                    value={scheduleData.meetingLink}
                    onChange={(e) => setScheduleData({ ...scheduleData, meetingLink: e.target.value })}
                    placeholder="https://zoom.us/..."
                  />
                </label>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-black px-4 text-sm font-extrabold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
                    disabled={actionLoading === 'schedule'}
                  >
                    {actionLoading === 'schedule' ? 'Sending...' : 'Schedule & send email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDetail;
