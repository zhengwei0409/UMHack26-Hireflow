import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  buttonBaseClassName,
  buttonCompactClassName,
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../styles/buttonStyles';

const inputClassName =
  'min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';

const textareaClassName = `${inputClassName} min-h-[120px] py-3`;
const primaryButtonClassName = `${buttonPrimaryClassName} primary-cta`;
const secondaryButtonClassName = buttonSecondaryClassName;
const compactSecondaryButtonClassName = `${buttonCompactClassName} border border-zinc-200`;
const collapseToggleClassName = `${buttonBaseClassName} h-9 w-9 border border-zinc-200 bg-white p-0 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus:ring-zinc-300`;
const sectionCountClassName = 'inline-flex min-h-7 items-center rounded-full bg-zinc-100 px-2.5 text-xs font-black tracking-[0.08em] text-zinc-600';

const initialChatMessages = [
  {
    role: 'assistant',
    content:
      'Describe the role you want to create. Include title, department, location, closing date, responsibilities, and requirements if you have them.',
  },
];

const statusOptions = [
  ['ALL', 'All roles'],
  ['OPEN', 'Open'],
  ['CLOSED', 'Closed'],
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

const getApplicantCount = (job) => Number(job._count?.candidates || job.candidateCount || 0);

const formatDate = (date) => {
  if (!date) return 'No date';

  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isDeadlineClosed = (job) => {
  if (!job?.closingDate) return false;
  return new Date(job.closingDate).getTime() <= Date.now();
};

const formatClosingLabel = (job) => {
  if (!job?.closingDate) return 'No closing date';
  return `${isDeadlineClosed(job) ? 'Deadline passed' : 'Deadline'} ${formatDate(job.closingDate)}`;
};

const JobRow = ({ job, index, onClose }) => {
  const applicantCount = getApplicantCount(job);

  return (
    <article
      className="job-row grid gap-5 px-5 py-5 lg:grid-cols-[minmax(300px,1fr)_150px_132px]"
      style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
            {job.department || 'General'}
          </span>
        </div>

        <h3 className="mt-3 truncate text-lg font-black tracking-[-0.03em] text-zinc-950">{job.title}</h3>
        <p className="mt-1 text-sm font-semibold text-zinc-500">
          {job.location || 'Location TBD'} / Posted {formatDate(job.createdAt)} / {formatClosingLabel(job)}
        </p>
      </div>

      <div className="job-metric-pop grid content-start gap-1">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Applicants</p>
        <p className="text-3xl font-black tracking-tight text-zinc-950">{applicantCount}</p>
      </div>

      <div className="flex flex-col items-start gap-3 lg:items-end">
        <Link
          to={`/jobs/${job.id}`}
          className={`${buttonBaseClassName} job-open-button min-h-10 w-32 bg-zinc-950 px-4 text-sm !text-white focus:ring-zinc-950`}
          style={{ color: '#fff' }}
        >
          <span className="!text-white">See details</span>
        </Link>
        <button
          type="button"
          className={`${compactSecondaryButtonClassName} w-32 bg-zinc-50 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-800`}
          onClick={() => onClose(job.id)}
        >
          Close role
        </button>
      </div>
    </article>
  );
};

const ClosedJobRow = ({ job, index }) => (
  <article
    className="job-row grid items-center gap-3 px-5 py-4 md:grid-cols-[minmax(220px,1fr)_150px_120px_auto]"
    style={{ animationDelay: `${Math.min(index * 35, 180)}ms` }}
  >
    <div className="min-w-0">
      <h3 className="truncate text-sm font-black text-zinc-800">{job.title}</h3>
      <p className="mt-1 text-xs font-bold text-zinc-500">
        {job.department || 'General'} / {job.location || 'Location TBD'} / {formatClosingLabel(job)}
      </p>
    </div>
    <p className="text-xs font-bold text-zinc-500">Closed role</p>
    <p className="text-xs font-bold text-zinc-500">Posted {formatDate(job.createdAt)}</p>
    <Link
      to={`/jobs/${job.id}`}
      className={`${compactSecondaryButtonClassName} bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950`}
    >
      See details
    </Link>
  </article>
);

const Jobs = () => {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(() => searchParams.get('create') === '1');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ status: 'ALL', query: '' });
  const [chatMessages, setChatMessages] = useState(initialChatMessages);
  const [chatInput, setChatInput] = useState('');
  const [createdJob, setCreatedJob] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({
    open: false,
    closed: true,
  });

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowForm(true);
    }
  }, [searchParams]);

  const loadJobs = async () => {
    try {
      const res = await api.jobs.list();
      setJobs(res.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const nextInput = chatInput.trim();
    if (!nextInput || submitting) return;

    setError('');
    setSubmitting(true);
    setCreatedJob(null);

    const nextMessages = [...chatMessages, { role: 'user', content: nextInput }];
    setChatMessages(nextMessages);
    setChatInput('');

    try {
      const draftRes = await api.jobs.draftFromChat(nextMessages);
      const draft = draftRes.data;

      if (draft.status === 'READY' && draft.job) {
        setChatMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `${draft.reply || 'I have enough information.'}\n\nCreating job: ${draft.job.title}`,
          },
        ]);

        const createRes = await api.jobs.create(draft.job);
        setCreatedJob(createRes.data);
        setChatMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `Created job: ${createRes.data.title}. You can open it from the jobs list.`,
          },
        ]);
        await loadJobs();
        setShowForm(false);
        setChatMessages(initialChatMessages);
        setChatInput('');
      } else {
        setChatMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: draft.reply || 'Please provide more details for the job.',
          },
        ]);
      }
    } catch (err) {
      setError(err.message);
      setChatMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Could not create the job from this chat. Please add more details or try again.',
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const resetJobChat = () => {
    setChatMessages(initialChatMessages);
    setChatInput('');
    setCreatedJob(null);
    setError('');
  };

  const handleClose = async (id) => {
    if (!confirm('Close this job? Candidates can no longer apply.')) return;

    try {
      await api.jobs.delete(id);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSection = (sectionKey) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const filteredJobs = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return jobs.filter((job) => {
      const statusMatch =
        filters.status === 'ALL' || String(job.status || 'OPEN').toUpperCase() === filters.status;
      const searchText = [job.title, job.department, job.location].filter(Boolean).join(' ').toLowerCase();
      const queryMatch = !query || searchText.includes(query);

      return statusMatch && queryMatch;
    });
  }, [filters, jobs]);

  const openJobs = useMemo(
    () => filteredJobs.filter((job) => String(job.status || 'OPEN').toUpperCase() === 'OPEN'),
    [filteredJobs],
  );

  const closedJobs = useMemo(
    () => filteredJobs.filter((job) => String(job.status || 'OPEN').toUpperCase() === 'CLOSED'),
    [filteredJobs],
  );

  const metrics = useMemo(() => {
    const openRoles = jobs.filter((job) => String(job.status || 'OPEN').toUpperCase() === 'OPEN').length;
    const closedRoles = jobs.filter((job) => String(job.status || 'OPEN').toUpperCase() === 'CLOSED').length;

    return [
      { label: 'Total roles', value: jobs.length },
      { label: 'Open roles', value: openRoles },
      { label: 'Closed roles', value: closedRoles },
    ];
  }, [jobs]);

  return (
    <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <section className="job-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="app-page-title text-3xl text-zinc-950 sm:text-4xl">Jobs</h1>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                {metrics.map((metric, index) => (
                  <div
                    key={metric.label}
                    className="job-metric-pop min-w-24"
                    style={{ animationDelay: `${120 + index * 55}ms` }}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[180px_minmax(220px,1fr)] xl:w-[560px]">
              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                <span>Status</span>
                <select
                  className={inputClassName}
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                <span>Search</span>
                <input
                  type="search"
                  className={inputClassName}
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  placeholder="Title, team, location"
                />
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-zinc-500">
            <p>
              Open jobs <span className="text-zinc-950">{openJobs.length}</span>
            </p>
            <p>
              Closed roles <span className="text-zinc-950">{closedJobs.length}</span>
            </p>
          </div>
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => setShowForm((current) => !current)}
          >
            {showForm ? 'Close form' : 'Create job'}
          </button>
        </div>

        {showForm && (
          <section className="job-page-enter rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="app-section-title text-2xl text-zinc-950">Create job</h2>
              <p className="text-sm font-semibold leading-6 text-zinc-600">
                GLM will ask for missing details. When enough information is available, the job is created automatically.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="job-chat-surface max-h-[420px] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-3">
                  {chatMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                      className={`job-chat-bubble max-w-[88%] rounded-xl px-4 py-3 text-sm font-semibold leading-6 ${
                        message.role === 'user'
                          ? 'job-chat-bubble-user justify-self-end bg-zinc-950 text-white'
                          : 'job-chat-bubble-assistant justify-self-start border border-zinc-200 bg-white text-zinc-700'
                      }`}
                      style={{ animationDelay: `${Math.min(index * 45, 220)}ms` }}
                    >
                      <p className="whitespace-pre-line">{message.content}</p>
                    </div>
                  ))}
                  {submitting && (
                    <div className="job-chat-bubble job-chat-bubble-assistant justify-self-start rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-500">
                      <span className="inline-flex items-center gap-2">
                        <span>GLM is checking the job details</span>
                        <span className="job-thinking-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {createdJob && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Job created: {createdJob.title}
                </div>
              )}

              <form onSubmit={handleChatSubmit} className="grid gap-3">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                  <span>Message GLM</span>
                  <textarea
                    className={`job-chat-composer ${textareaClassName} min-h-[104px]`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Example: Create a Backend Engineer role for Engineering in Kuala Lumpur. They will build APIs, work with PostgreSQL, and need 3+ years Node.js experience."
                    rows={4}
                    disabled={submitting}
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className={primaryButtonClassName}
                    disabled={submitting || !chatInput.trim()}
                  >
                    {submitting ? 'Checking...' : 'Send to GLM'}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    onClick={resetJobChat}
                    disabled={submitting}
                  >
                    Start over
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {error && !showForm && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm font-bold text-zinc-500">
            Loading jobs...
          </div>
        ) : filteredJobs.length === 0 ? (
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">No jobs found</p>
            <h2 className="app-section-title mt-3 text-2xl text-zinc-950">
              {jobs.length === 0 ? 'Create your first job listing' : 'No role matches this view'}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600">
              {jobs.length === 0
                ? 'Create a role before collecting applications.'
                : 'Change the search or status filter to see more listed jobs.'}
            </p>
            {jobs.length === 0 && (
              <button
                type="button"
                className={`${primaryButtonClassName} mt-6`}
                onClick={() => setShowForm(true)}
              >
                Create job
              </button>
            )}
          </section>
        ) : (
          <>
            {openJobs.length > 0 && (
              <section className="job-page-enter rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="app-section-title text-2xl text-zinc-950">Open jobs</h2>
                    <span className={sectionCountClassName}>{openJobs.length}</span>
                  </div>
                  <button
                    type="button"
                    className={collapseToggleClassName}
                    onClick={() => toggleSection('open')}
                    aria-expanded={!collapsedSections.open}
                    aria-label={collapsedSections.open ? 'Expand open jobs' : 'Collapse open jobs'}
                  >
                    <CollapseIcon collapsed={collapsedSections.open} />
                  </button>
                </div>

                {collapsedSections.open ? null : (
                  <div className="divide-y divide-zinc-100">
                    {openJobs.map((job, index) => (
                      <JobRow key={job.id} job={job} index={index} onClose={handleClose} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {closedJobs.length > 0 && (
              <section className="job-page-enter overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="app-section-title-sm text-lg text-zinc-800">Closed roles</h2>
                    <span className={sectionCountClassName}>{closedJobs.length}</span>
                  </div>
                  <button
                    type="button"
                    className={collapseToggleClassName}
                    onClick={() => toggleSection('closed')}
                    aria-expanded={!collapsedSections.closed}
                    aria-label={collapsedSections.closed ? 'Expand closed roles' : 'Collapse closed roles'}
                  >
                    <CollapseIcon collapsed={collapsedSections.closed} />
                  </button>
                </div>

                {collapsedSections.closed ? null : (
                  <div className="divide-y divide-zinc-100">
                    {closedJobs.map((job, index) => (
                      <ClosedJobRow key={job.id} job={job} index={index} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {openJobs.length === 0 && closedJobs.length === 0 && (
              <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">No jobs found</p>
                <h2 className="app-section-title mt-3 text-2xl text-zinc-950">No role matches this view</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600">
                  Change the search or status filter to see more listed jobs.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Jobs;
