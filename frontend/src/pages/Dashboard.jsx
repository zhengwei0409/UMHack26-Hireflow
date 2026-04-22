import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatPostedDate = (value) => {
  if (!value) return 'Recently';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const statusLabel = (status) => {
  const clean = String(status || 'Reviewing').replaceAll('_', ' ').toLowerCase();
  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const progressTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('closed') || normalized.includes('completed')) return 'bg-zinc-500';
  return 'bg-black';
};

const ViewIcon = ({ type }) => {
  if (type === 'card') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M4 5h12v2H4V5Zm0 4h12v2H4V9Zm0 4h12v2H4v-2Z" />
    </svg>
  );
};

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await api.dashboard.get();
        if (!cancelled) {
          setDashboard(res.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to fetch dashboard metrics.');
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

  const metrics = dashboard?.metrics ?? {
    openRoles: 0,
    totalApplicants: 0,
    screenedResumes: 0,
    nextInterviews: 0,
  };

  const positions = useMemo(
    () =>
      (dashboard?.positions ?? []).map((position, index) => {
        const applicants = Number(position.applicants ?? 0);
        const screened = Number(position.screened ?? 0);
        const progress = applicants > 0 ? Math.min(Math.round((screened / applicants) * 100), 100) : 0;

        return {
          ...position,
          applicants,
          screened,
          progress,
          department: position.department || 'General',
          location: position.location || 'Location TBD',
          postedDate: formatPostedDate(position.createdAt || position.datePosted),
          displayStatus: position.status === 'OPEN' ? 'Reviewing' : statusLabel(position.status),
        };
      }),
    [dashboard?.positions],
  );

  const kpis = [
    {
      label: 'Active Roles',
      value: metrics.openRoles,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M6 4V3h8v1h3v12H3V4h3Zm2 0h4V3H8v1Zm7 4H5v6h10V8Z" />
        </svg>
      ),
    },
    {
      label: 'Total Applicants',
      value: metrics.totalApplicants,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M7.5 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0 1.5c3 0 5.5 1.4 5.5 3.1V16H2v-1.4c0-1.7 2.5-3.1 5.5-3.1Zm6.1-1.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Zm.4 1.3c2.2.2 4 1.3 4 2.7V16h-3.5v-1.4c0-1.1-.6-2.1-1.5-2.8.3-.1.7-.2 1-.3Z" />
        </svg>
      ),
    },
    {
      label: 'AI Screened',
      value: metrics.screenedResumes,
      icon: (
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M6 4h8v2H6V4Zm-1 4h10v8H5V8Zm2 2v1.5h6V10H7Zm0 3v1.5h4V13H7Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-normal text-black">Dashboard</h1>
      </header>

      {loading && (
        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-600">Loading dashboard data...</p>
        </section>
      )}

      {error && (
        <section className="rounded-md border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </section>
      )}

      {!loading && !error && (
        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="flex items-center gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">{kpi.icon}</span>
                <div>
                  <p className="text-xs font-medium text-zinc-500">{kpi.label}</p>
                  <strong className="mt-1 block text-2xl font-extrabold leading-none">{kpi.value}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-extrabold tracking-normal">Open Positions</h2>
              <div className="inline-flex w-fit rounded-md border border-zinc-300 bg-zinc-100 p-1" aria-label="Switch position view">
                {['card', 'table'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`grid h-10 w-14 place-items-center rounded-md transition ${
                      viewMode === mode ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
                    }`}
                    aria-label={`Show ${mode} view`}
                    title={`Show ${mode} view`}
                  >
                    <ViewIcon type={mode} />
                  </button>
                ))}
              </div>
            </div>

            {positions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-zinc-700">No open positions yet.</p>
                <p className="mt-1 text-sm text-zinc-500">Create a job to start tracking applicants here.</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-left">
                  <thead className="bg-zinc-100 text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-5 py-3">Job Title &amp; Department</th>
                      <th className="px-5 py-3">Applicants</th>
                      <th className="px-5 py-3">Date Posted</th>
                      <th className="px-5 py-3">AI Screening</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {positions.map((position) => (
                      <tr key={position.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-extrabold text-black">{position.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {position.department} - {position.location}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm font-extrabold">
                          {position.applicants}
                          <span className="ml-2 text-xs font-medium text-zinc-500">+{position.screened} screened</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-600">{position.postedDate}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                            <span className={`h-2 w-2 rounded-full ${progressTone(position.displayStatus)}`} />
                            <span>{position.displayStatus}</span>
                            <span className="text-zinc-500">({position.progress}%)</span>
                          </div>
                          <div className="mt-2 h-1.5 w-28 rounded-full bg-zinc-200">
                            <div className={`h-full rounded-full ${progressTone(position.displayStatus)}`} style={{ width: `${position.progress}%` }} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black" aria-label={`Actions for ${position.title}`}>
                            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                              <path fill="currentColor" d="M10 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3 p-3 md:grid-cols-3 xl:grid-cols-5">
                {positions.map((position) => (
                  <article key={position.id} className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-extrabold text-zinc-700">{position.department}</span>
                      <button type="button" className="rounded-md p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-black" aria-label={`Actions for ${position.title}`}>
                        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                          <path fill="currentColor" d="M10 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                        </svg>
                      </button>
                    </div>

                    <h3 className="text-base font-extrabold leading-tight tracking-normal">{position.title}</h3>
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-zinc-600">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                        <path fill="currentColor" d="M10 2.5A5.5 5.5 0 0 0 4.5 8c0 4 5.5 9.5 5.5 9.5S15.5 12 15.5 8A5.5 5.5 0 0 0 10 2.5Zm0 7.3A1.8 1.8 0 1 1 10 6.2a1.8 1.8 0 0 1 0 3.6Z" />
                      </svg>
                      {position.location}
                    </p>

                    <div className="my-4 h-px bg-zinc-200" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">Applicants</p>
                        <strong className="mt-1.5 block text-2xl font-extrabold leading-none">{position.applicants}</strong>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">Status</p>
                        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold">
                          <span className={`h-2 w-2 rounded-full ${progressTone(position.displayStatus)}`} />
                          {position.displayStatus}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-1.5">
                      {[0, 25, 50, 75].map((step) => (
                        <span key={step} className={`h-1.5 rounded-full ${position.progress > step ? 'bg-black' : 'bg-zinc-200'}`} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
