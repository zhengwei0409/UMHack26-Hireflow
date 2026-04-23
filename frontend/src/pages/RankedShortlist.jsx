import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

const formatStatusLabel = (status) =>
  String(status || 'UNKNOWN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('rejected') || normalized.includes('failed')) {
    return 'border-red-200 bg-red-50 text-red-600';
  }

  return 'border-zinc-200 bg-zinc-50 text-zinc-700';
};

const RankedShortlist = () => {
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionKey, setActionKey] = useState('');

  const loadRows = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.interviews.shortlist(id);
      setRows(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [id]);

  const handleAdvance = async (candidateId) => {
    setActionKey(`advance-${candidateId}`);
    setError('');

    try {
      await api.candidates.advanceToHumanInterview(candidateId, 'Advanced from ranked AI shortlist');
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionKey('');
    }
  };

  const handleShortlistToggle = async (sessionId, shortlisted) => {
    setActionKey(`shortlist-${sessionId}`);
    setError('');

    try {
      await api.interviews.updateShortlist(sessionId, shortlisted);
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionKey('');
    }
  };

  const metrics = useMemo(() => {
    const shortlisted = rows.filter((row) => row.isShortlisted).length;
    const readyToAdvance = rows.filter((row) => row.candidate.status === 'AI_INTERVIEW_SCORED').length;
    const averageScore = rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + Number(row.overallScore || 0), 0) / Math.max(rows.length, 1),
        )
      : 0;

    return [
      { label: 'Ranked sessions', value: rows.length },
      { label: 'Shortlisted', value: shortlisted },
      { label: 'Ready to advance', value: readyToAdvance },
      { label: 'Avg. score', value: `${averageScore}%` },
    ];
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading ranked shortlist...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">AI evaluation</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                Ranked shortlist
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Compare ranked interview evidence, mark shortlist decisions, and promote strong candidates into the
                human interview flow.
              </p>
            </div>

            {id && (
              <div className="flex items-start justify-start lg:justify-end">
                <Link
                  to={`/jobs/${id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
                >
                  Back to role
                </Link>
              </div>
            )}
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

        {rows.length === 0 ? (
          <section className="rounded-md border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">No ranked sessions</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-950">No scored AI interviews yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-zinc-600">
              This page will fill up after candidates complete the AI interview and the scoring pipeline finishes.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {rows.map((row, index) => {
              const canAdvance = row.candidate.status === 'AI_INTERVIEW_SCORED';

              return (
                <article
                  key={row.id}
                  className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">
                        Rank #{row.rankPosition || index + 1}
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
                          {row.candidate.fullName}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">{row.candidate.email}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getStatusTone(row.candidate.status)}`}
                    >
                      {formatStatusLabel(row.candidate.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Job</p>
                      <p className="mt-2 text-sm font-extrabold text-zinc-950">
                        {row.candidate.job?.title || row.jobId}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Score</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
                        {row.overallScore ?? '-'}
                      </p>
                    </div>
                    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        Shortlist
                      </p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
                        {row.isShortlisted ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/candidates/${row.candidate.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
                    >
                      View profile
                    </Link>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-black disabled:cursor-wait disabled:opacity-70"
                      onClick={() => handleShortlistToggle(row.id, !row.isShortlisted)}
                      disabled={actionKey === `shortlist-${row.id}`}
                    >
                      {actionKey === `shortlist-${row.id}`
                        ? 'Saving...'
                        : row.isShortlisted
                          ? 'Remove shortlist'
                          : 'Add to shortlist'}
                    </button>
                    {canAdvance && (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-black px-4 text-sm font-extrabold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
                        onClick={() => handleAdvance(row.candidate.id)}
                        disabled={actionKey === `advance-${row.candidate.id}`}
                      >
                        {actionKey === `advance-${row.candidate.id}` ? 'Advancing...' : 'Advance to interview'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default RankedShortlist;
