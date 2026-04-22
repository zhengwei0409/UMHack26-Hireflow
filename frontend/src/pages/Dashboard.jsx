import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const MetricIcon = ({ type }) => {
  const paths = {
    roles: (
      <>
        <path d="M7 7.75V6.5A2.5 2.5 0 0 1 9.5 4h1A2.5 2.5 0 0 1 13 6.5v1.25" />
        <path d="M4.75 7.75h10.5v7.5H4.75z" />
      </>
    ),
    applicants: (
      <>
        <path d="M7.25 15.25v-1a2.75 2.75 0 0 1 5.5 0v1" />
        <path d="M10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M14 9.25a1.75 1.75 0 0 1 1.5 2.65" />
      </>
    ),
    screened: (
      <>
        <path d="M6.25 4.75h7.5v10.5h-7.5z" />
        <path d="M8.25 7.5h3.5M8.25 10h3.5M8.25 12.5h2" />
      </>
    ),
  };

  return (
    <svg className="h-4 w-4 text-[#202020]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {paths[type]}
    </svg>
  );
};

const formatStatus = (status = '') =>
  status
    .toString()
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    const token = localStorage.getItem('hireflow_token');
    if (!token) {
      setError('Please log in to view dashboard data.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/v1/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error?.message || 'Failed to load dashboard data.');
        }
        return response.json();
      })
      .then((payload) => setDashboard(payload.data))
      .catch((err) => setError(err.message || 'Unable to fetch dashboard metrics.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = dashboard?.metrics ?? {
    openRoles: 0,
    totalApplicants: 0,
    screenedResumes: 0,
    nextInterviews: 0,
  };
  const positions = dashboard?.positions ?? [];

  const metricCards = [
    { label: 'Active Roles', value: metrics.openRoles, icon: 'roles' },
    { label: 'Total Applicants', value: metrics.totalApplicants, icon: 'applicants' },
    { label: 'AI Screened', value: metrics.screenedResumes, icon: 'screened' },
  ];

  return (
    <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#d9d9d9] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a3077]">Recruitment</p>
          <h1 className="mt-1 text-xl font-bold tracking-normal text-[#202020]">Active Requirements</h1>
        </div>
        
      </header>

      {loading && (
        <section className="rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#555555]">Loading dashboard data...</p>
        </section>
      )}

      {error && (
        <section className="rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {metricCards.map((metric) => (
              <article key={metric.label} className="flex min-h-24 items-center gap-5 rounded-md border border-[#d9d9d9] bg-white px-6 py-5 shadow-sm">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#eeeeee] bg-[#f7f7f7]">
                  <MetricIcon type={metric.icon} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#525252]">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold leading-none text-[#202020]">{metric.value}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-md border border-[#d9d9d9] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e3e3e3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold tracking-normal text-[#202020]">Open Positions</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 rounded-md border border-[#cfcfcf] bg-[#f2f2f2] p-0.5" aria-label="Change open positions view">
                  <button
                    className={`grid h-8 w-10 place-items-center rounded-[4px] transition ${
                      viewMode === 'cards' ? 'border border-[#d0d0d0] bg-white text-[#202020] shadow-sm' : 'text-[#555555] hover:text-[#202020]'
                    }`}
                    type="button"
                    onClick={() => setViewMode('cards')}
                    aria-label="Card view"
                    aria-pressed={viewMode === 'cards'}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" />
                    </svg>
                  </button>
                  <button
                    className={`grid h-8 w-10 place-items-center rounded-[4px] transition ${
                      viewMode === 'table' ? 'border border-[#d0d0d0] bg-white text-[#202020] shadow-sm' : 'text-[#555555] hover:text-[#202020]'
                    }`}
                    type="button"
                    onClick={() => setViewMode('table')}
                    aria-label="Table view"
                    aria-pressed={viewMode === 'table'}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M4 5h12v2H4zM4 9h12v2H4zM4 13h12v2H4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f3f3f3] text-[11px] font-bold uppercase tracking-[0.12em] text-[#5f5f5f]">
                      <th className="px-5 py-3">Job Title &amp; Department</th>
                      <th className="px-5 py-3">Applicants</th>
                      <th className="px-5 py-3">Screened</th>
                      <th className="px-5 py-3">AI Screening</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e3e3]">
                    {positions.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-sm font-semibold text-[#666666]" colSpan={5}>
                          No open positions yet.
                        </td>
                      </tr>
                    ) : (
                      positions.map((position) => {
                        const applicants = Number(position.applicants) || 0;
                        const screened = Number(position.screened) || 0;
                        const screeningProgress = applicants > 0 ? Math.round((screened / applicants) * 100) : 0;

                        return (
                          <tr key={position.id} className="text-sm transition hover:bg-[#fafafa]">
                            <td className="px-5 py-4">
                              <p className="font-bold text-[#202020]">{position.title}</p>
                              <p className="mt-1 text-xs font-semibold text-[#6f6f6f]">{position.department || 'General'}</p>
                            </td>
                            <td className="px-5 py-4 font-bold text-[#202020]">{applicants}</td>
                            <td className="px-5 py-4 font-bold text-[#202020]">{screened}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#d8d8d8]">
                                  <div className="h-full rounded-full bg-[#1a3077]" style={{ width: `${screeningProgress}%` }} />
                                </div>
                                <span className="text-xs font-bold text-[#1a3077]">{screeningProgress}%</span>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-[#666666]">{formatStatus(position.status)}</p>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Link className="inline-flex h-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white px-3 text-xs font-bold text-[#202020] transition hover:border-[#202020]" to={`/jobs/${position.id}`}>
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-[#f5f5f5] p-5">
                {positions.length === 0 ? (
                  <div className="rounded-md border border-[#d9d9d9] bg-white px-5 py-8 text-sm font-semibold text-[#666666]">
                    No open positions yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,250px))] justify-start gap-4">
                    {positions.map((position) => {
                      const applicants = Number(position.applicants) || 0;
                      const screened = Number(position.screened) || 0;
                      const screeningProgress = applicants > 0 ? Math.round((screened / applicants) * 100) : 0;
                      const bars = Math.max(1, Math.min(4, Math.ceil(screeningProgress / 25)));

                      return (
                        <article key={position.id} className="rounded-md border border-[#d9d9d9] bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="inline-flex rounded-sm bg-[#eeeeee] px-2 py-1 text-[10px] font-bold text-[#555555]">
                                {position.department || 'General'}
                              </span>
                              <h3 className="mt-3 max-w-[14rem] text-base font-extrabold leading-tight text-[#202020]">{position.title}</h3>
                              <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#555555]">
                                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                  <path d="M8 1.75a4.75 4.75 0 0 0-4.75 4.75c0 3.25 4.75 7.75 4.75 7.75s4.75-4.5 4.75-7.75A4.75 4.75 0 0 0 8 1.75Zm0 6.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
                                </svg>
                                Remote
                              </p>
                            </div>
                            <Link className="rounded-sm p-1 text-[#555555] transition hover:bg-[#f4f4f4] hover:text-[#202020]" to={`/jobs/${position.id}`} aria-label={`View ${position.title}`}>
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M10 5.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM10 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM10 17a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 10 17Z" />
                              </svg>
                            </Link>
                          </div>

                          <div className="my-4 border-t border-[#eeeeee]" />

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Applicants</p>
                              <p className="mt-1 text-xl font-extrabold leading-none text-[#202020]">{applicants}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Status</p>
                              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#202020]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#1a3077]" />
                                {screeningProgress > 0 ? 'Screening' : formatStatus(position.status)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-2" aria-label={`${screeningProgress}% screened`}>
                            {[0, 1, 2, 3].map((bar) => (
                              <span key={bar} className={`h-1 rounded-full ${bar < bars ? 'bg-[#202020]' : 'bg-[#e4e4e4]'}`} />
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#e3e3e3] px-5 py-3 text-xs font-semibold text-[#666666]">
              <span>
                Showing 1 to {positions.length} of {positions.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button className="grid h-7 w-7 place-items-center rounded-md border border-[#d9d9d9] bg-white text-[#777777]" type="button" aria-label="Previous page">
                  &lt;
                </button>
                <button className="grid h-7 w-7 place-items-center rounded-md border border-[#d9d9d9] bg-white text-[#777777]" type="button" aria-label="Next page">
                  &gt;
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
