import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const selectClassName =
  'min-h-[44px] w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10';

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

const formatScore = (candidate) => {
  if (candidate.aiInterviewScore !== null && candidate.aiInterviewScore !== undefined) {
    return `${candidate.aiInterviewScore.toFixed(1)}%`;
  }

  if (candidate.glmScore !== null && candidate.glmScore !== undefined) {
    return `${candidate.glmScore}%`;
  }

  return '-';
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

  const counts = useMemo(() => {
    const statusCounts = {};

    candidates.forEach((candidate) => {
      statusCounts[candidate.status] = (statusCounts[candidate.status] || 0) + 1;
    });

    return statusCounts;
  }, [candidates]);

  const metricCards = useMemo(() => {
    const interviewsInFlight = candidates.filter((candidate) =>
      ['AI_INTERVIEW_INVITED', 'AI_INTERVIEW_IN_PROGRESS', 'INTERVIEW_PENDING', 'INTERVIEW_SCHEDULED'].includes(
        candidate.status,
      ),
    ).length;

    const shortlisted = candidates.filter((candidate) => candidate.isShortlisted).length;

    return [
      { label: 'Visible candidates', value: candidates.length },
      { label: 'Interviews in flight', value: interviewsInFlight },
      { label: 'Shortlisted', value: shortlisted },
      { label: 'Filtered jobs', value: filters.jobId ? 1 : jobs.length || 0 },
    ];
  }, [candidates, filters.jobId, jobs.length]);

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Applicant pipeline</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">Candidates</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Review every applicant in one place, then narrow your focus by role or workflow status.
              </p>
            </div>

            <div className="grid gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
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

              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>Status</span>
                <select
                  className={selectClassName}
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  <option value="APPLIED">Applied</option>
                  <option value="CV_PARSING">CV Parsing</option>
                  <option value="CV_UNDER_REVIEW">Under Review</option>
                  <option value="CV_REJECTED">Rejected</option>
                  <option value="AI_INTERVIEW_INVITED">AI Interview Invited</option>
                  <option value="AI_INTERVIEW_IN_PROGRESS">AI Interview In Progress</option>
                  <option value="AI_INTERVIEW_COMPLETED">AI Interview Completed</option>
                  <option value="AI_INTERVIEW_SCORED">AI Interview Scored</option>
                  <option value="INTERVIEW_PENDING">Interview Pending</option>
                  <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                  <option value="INTERVIEW_DONE">Interview Done</option>
                  <option value="OFFER_SENT">Offer Sent</option>
                  <option value="HIRED">Hired</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => (
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

        {loading ? (
          <div className="rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
            Loading candidates...
          </div>
        ) : (
          <>
            {Object.keys(counts).length > 0 && (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(counts).map(([status, count]) => (
                  <article key={status} className="rounded-md border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                      {formatStatusLabel(status)}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">{count}</p>
                  </article>
                ))}
              </section>
            )}

            {candidates.length === 0 ? (
              <section className="rounded-md border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">No matches</p>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-950">No candidates found</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-zinc-600">
                  Try clearing one of the filters or wait for new applicants to enter the pipeline.
                </p>
              </section>
            ) : (
              <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-zinc-950">Applicant list</h2>
                    <p className="mt-1 text-sm font-medium text-zinc-500">
                      Sorted by the backend response. Open a profile to review details and take action.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-left">
                    <thead className="bg-zinc-50">
                      <tr className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        <th className="px-6 py-4">Candidate</th>
                        <th className="px-6 py-4">Job</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Applied</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {candidates.map((candidate) => (
                        <tr key={candidate.id} className="align-top">
                          <td className="px-6 py-4">
                            <div className="min-w-[220px]">
                              <p className="text-sm font-extrabold text-zinc-950">{candidate.fullName}</p>
                              <p className="mt-1 text-sm font-medium text-zinc-500">{candidate.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-zinc-700">
                            {candidate.jobTitle || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-extrabold text-zinc-900">
                              {formatScore(candidate)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getStatusTone(candidate.status)}`}
                            >
                              {formatStatusLabel(candidate.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-zinc-600">
                            {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/candidates/${candidate.id}`}
                              className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
                            >
                              View profile
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Candidates;
