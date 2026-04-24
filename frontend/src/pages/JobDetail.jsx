import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import {
  buttonPrimaryClassName,
  buttonSecondaryClassName,
} from '../styles/buttonStyles';

const inputClassName =
  'min-h-[44px] w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10';

const formatDate = (date) => {
  if (!date) return 'No date';

  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const toInputDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const isShortlistFinal = (job) => {
  if (!job?.closingDate) return false;
  return String(job.status || '').toUpperCase() === 'CLOSED' || new Date(job.closingDate).getTime() <= Date.now();
};

const formatStatusLabel = (status) =>
  String(status || 'OPEN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('closed')) {
    return 'border-zinc-300 bg-zinc-100 text-zinc-700';
  }

  return 'border-zinc-200 bg-zinc-50 text-zinc-700';
};

const formatScore = (candidate) => {
  if (candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined) {
    return `${candidate.aiInterviewScore.toFixed(1)}%`;
  }

  if (candidate.glmScore !== null && candidate.glmScore !== undefined) {
    return `${candidate.glmScore}%`;
  }

  return '-';
};

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [shortlist, setShortlist] = useState([]);
  const [config, setConfig] = useState({ autoScreenThreshold: 60, shortlistSize: 10, closingDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [jobRes, candidatesRes, shortlistRes] = await Promise.all([
        api.jobs.get(id),
        api.candidates.list({ jobId: id }),
        api.jobs.shortlist(id).catch(() => ({ data: [] })),
      ]);
      setJob(jobRes.data);
      setCandidates(candidatesRes.data.items || []);
      setShortlist(
        (shortlistRes.data || []).map((session) => ({
          id: session.candidate.id,
          fullName: session.candidate.fullName,
          aiInterviewScore: session.candidate.aiInterviewScore ?? session.overallScore,
          aiInterviewRank: session.candidate.aiInterviewRank ?? session.rankPosition,
          isShortlisted: Boolean(session.candidate.isShortlisted ?? session.isShortlisted),
          status: session.candidate.status,
          proctorFlagCount: session.proctorEvents?.length || 0,
        })),
      );
      setConfig({
        autoScreenThreshold: jobRes.data.autoScreenThreshold ?? 60,
        shortlistSize: jobRes.data.shortlistSize ?? 10,
        closingDate: toInputDate(jobRes.data.closingDate),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPublicUrl = async () => {
    const url = `${window.location.origin}/apply/${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Unable to copy application URL.');
    }
  };

  const savePrescreenConfig = async (e) => {
    e.preventDefault();
    setError('');
    setSavingConfig(true);

    try {
      await api.jobs.updatePrescreenConfig(id, config);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const shortlistFinal = useMemo(() => isShortlistFinal(job), [job]);

  const metrics = useMemo(() => {
    const finalShortlistCount = shortlist.filter((candidate) => candidate.isShortlisted).length;
    const averageScore = shortlist.length
      ? Math.round(
          shortlist.reduce((sum, candidate) => sum + Number(candidate.aiInterviewScore || 0), 0) /
            shortlist.length,
        )
      : 0;

    return [
      { label: 'Applicants', value: candidates.length },
      { label: shortlistFinal ? 'Final shortlist' : 'Scored candidates', value: shortlistFinal ? finalShortlistCount : shortlist.length },
      { label: 'AI threshold', value: `${config.autoScreenThreshold}%` },
      { label: shortlistFinal ? 'Avg. final score' : 'Avg. ranked score', value: `${averageScore}%` },
    ];
  }, [candidates.length, shortlist, config.autoScreenThreshold, shortlistFinal]);

  if (loading) {
    return (
      <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading role details...
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700">
          Job not found
        </div>
      </div>
    );
  }

  return (
    <div className="app-ambient-page min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-zinc-500 transition hover:text-black"
              >
                <span aria-hidden="true">←</span>
                <span>Back to jobs</span>
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getStatusTone(job.status)}`}
                >
                  {formatStatusLabel(job.status)}
                </span>
                <span className="text-sm font-semibold text-zinc-500">
                  {job.department} · {job.location} · Closes {formatDate(job.closingDate)}
                </span>
              </div>

              <h1 className="app-page-title mt-4 text-3xl text-zinc-950 sm:text-4xl">{job.title}</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Review the role setup, manage the closing date, and monitor how candidates rank before the shortlist is finalized.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <button
                type="button"
                className={buttonSecondaryClassName}
                onClick={copyPublicUrl}
              >
                {copied ? 'Application link copied' : 'Copy application link'}
              </button>
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm lg:p-8">
            <h2 className="app-section-title text-2xl text-zinc-950">Role overview</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-zinc-600">{job.description}</p>

            {job.requirements?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Requirements</h3>
                <ul className="mt-4 grid gap-3">
                  {job.requirements.map((requirement, index) => (
                    <li
                      key={`${requirement}-${index}`}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700"
                    >
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="app-section-title-sm text-xl text-zinc-950">Hiring rules</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                Set the application closing date and decide how strict the screening and final shortlist should be.
              </p>
            </div>

            <form onSubmit={savePrescreenConfig} className="grid gap-5">
              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>Closing date</span>
                <input
                  type="date"
                  className={inputClassName}
                  value={config.closingDate}
                  onChange={(e) => setConfig((current) => ({ ...current, closingDate: e.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>CV threshold</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={inputClassName}
                  value={config.autoScreenThreshold}
                  onChange={(e) =>
                    setConfig((current) => ({ ...current, autoScreenThreshold: Number(e.target.value) }))
                  }
                />
              </label>

              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>Shortlist size</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className={inputClassName}
                  value={config.shortlistSize}
                  onChange={(e) => setConfig((current) => ({ ...current, shortlistSize: Number(e.target.value) }))}
                />
              </label>

              <button
                type="submit"
                className={`primary-cta ${buttonPrimaryClassName}`}
                disabled={savingConfig}
              >
                {savingConfig ? 'Saving...' : 'Save hiring rules'}
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="app-section-title text-2xl text-zinc-950">
                {shortlistFinal ? 'Final shortlist' : 'Current ranking'}
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-600">
                {shortlistFinal
                  ? 'The shortlist is now frozen because the closing date has passed or the role was closed.'
                  : 'Candidates are ranked live for now. The final shortlist will freeze after the closing date.'}
              </p>
            </div>
          </div>

          {shortlist.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm font-semibold text-zinc-500">
              No scored AI interviews yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead className="bg-zinc-50">
                  <tr className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">AI score</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {shortlist.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-4 py-4 text-sm font-extrabold text-zinc-950">
                        #{candidate.aiInterviewRank || '-'}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-zinc-700">{candidate.fullName}</td>
                      <td className="px-4 py-4 text-sm font-extrabold text-zinc-950">
                        {candidate.aiInterviewScore ? `${candidate.aiInterviewScore.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-zinc-700">{candidate.proctorFlagCount}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-700">
                          {formatStatusLabel(candidate.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/candidates/${candidate.id}`}
                          className={`${buttonSecondaryClassName} min-h-10 px-3`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="mb-5">
            <h2 className="app-section-title text-2xl text-zinc-950">Applicants ({candidates.length})</h2>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              Every candidate attached to this role, including CV-only applicants and interview-stage candidates.
            </p>
          </div>

          {candidates.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm font-semibold text-zinc-500">
              No applicants yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead className="bg-zinc-50">
                  <tr className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-4 py-4">
                        <p className="text-sm font-extrabold text-zinc-950">{candidate.fullName}</p>
                        <p className="mt-1 text-sm font-medium text-zinc-500">{candidate.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-extrabold text-zinc-950">
                          {formatScore(candidate)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-700">
                          {formatStatusLabel(candidate.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-zinc-600">
                        {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/candidates/${candidate.id}`}
                          className={`${buttonSecondaryClassName} min-h-10 px-3`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default JobDetail;
