import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const formatStatus = (status = '') =>
  status
    .toString()
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const getStatusClass = (status = '') => {
  const normalized = status.toString().toLowerCase();

  if (normalized.includes('reject') || normalized.includes('closed')) {
    return 'border-[#efc7c7] bg-[#fff7f7] text-[#991b1b]';
  }

  if (normalized.includes('interview') || normalized.includes('offer')) {
    return 'border-[#c9d7f2] bg-[#f3f6ff] text-[#1a3077]';
  }

  if (normalized.includes('review') || normalized.includes('screen')) {
    return 'border-[#ded4b8] bg-[#fffaf0] text-[#7a5617]';
  }

  return 'border-[#d8d8d8] bg-[#f7f7f7] text-[#444444]';
};

const DetailIcon = ({ type }) => {
  const paths = {
    link: (
      <>
        <path d="M7.25 10.75 6.5 11.5a2.5 2.5 0 0 0 3.54 3.54l1.1-1.1" />
        <path d="m8.85 11.15 2.3-2.3" />
        <path d="m12.75 9.25.75-.75a2.5 2.5 0 0 0-3.54-3.54l-1.1 1.1" />
      </>
    ),
    location: (
      <>
        <path d="M10 10.25a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M14.75 8.25c0 3.6-4.75 7-4.75 7s-4.75-3.4-4.75-7a4.75 4.75 0 1 1 9.5 0Z" />
      </>
    ),
    document: (
      <>
        <path d="M6.25 4.75h5l2.5 2.5v8h-7.5z" />
        <path d="M11.25 4.75v2.5h2.5M8.25 10h3.5M8.25 12.5h3.5" />
      </>
    ),
    applicants: (
      <>
        <path d="M7.25 15.25v-1a2.75 2.75 0 0 1 5.5 0v1" />
        <path d="M10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M14 9.25a1.75 1.75 0 0 1 1.5 2.65" />
      </>
    ),
  };

  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
};

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [jobRes, candidatesRes] = await Promise.all([
        api.jobs.get(id),
        api.candidates.list({ jobId: id }),
      ]);
      setJob(jobRes.data);
      setCandidates(candidatesRes.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/apply/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
        <section className="rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#555555]">Loading job details...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
        <section className="rounded-md border border-[#f0b8b8] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#991b1b]">{error}</p>
        </section>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
        <section className="rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#555555]">Job not found</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#d9d9d9] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link to="/jobs" className="inline-flex items-center gap-2 text-xs font-bold text-[#555555] transition hover:text-[#202020]">
            <span aria-hidden="true">&larr;</span>
            Back to Jobs
          </Link>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a3077]">Role Details</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-normal text-[#202020]">{job.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#555555]">
            <span className="rounded-sm bg-[#eeeeee] px-2 py-1 uppercase tracking-[0.12em]">{job.department || 'General'}</span>
            <span className="inline-flex items-center gap-1.5">
              <DetailIcon type="location" />
              {job.location || 'Remote'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#050505] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#202020] focus:outline-none focus:ring-2 focus:ring-[#202020]/20 sm:w-fit"
          onClick={copyPublicUrl}
        >
          <DetailIcon type="link" />
          {copied ? 'Copied Link' : 'Copy Application Link'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="flex min-h-24 items-center gap-5 rounded-md border border-[#d9d9d9] bg-white px-6 py-5 shadow-sm">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#eeeeee] bg-[#f7f7f7] text-[#202020]">
            <DetailIcon type="applicants" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#525252]">Applicants</p>
            <p className="mt-1 text-2xl font-bold leading-none text-[#202020]">{candidates.length}</p>
          </div>
        </article>
        <article className="flex min-h-24 items-center gap-5 rounded-md border border-[#d9d9d9] bg-white px-6 py-5 shadow-sm md:col-span-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#eeeeee] bg-[#f7f7f7] text-[#202020]">
            <DetailIcon type="document" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#525252]">Application URL</p>
            <p className="mt-1 truncate text-sm font-bold text-[#202020]">{`${window.location.origin}/apply/${id}`}</p>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <DetailIcon type="document" />
          <h2 className="text-base font-extrabold tracking-normal text-[#303030]">Job Description</h2>
        </div>
        <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-7 text-[#555555]">{job.description || 'No job description provided.'}</p>
        {job.requirements?.length > 0 && (
          <div className="mt-6 border-t border-[#eeeeee] pt-5">
            <h3 className="text-sm font-extrabold text-[#202020]">Requirements</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border border-[#eeeeee] bg-[#f7f7f7] px-3 py-2 text-sm font-semibold leading-6 text-[#555555]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a3077]" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-md border border-[#d9d9d9] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#e3e3e3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold tracking-normal text-[#202020]">Applicants</h2>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#666666]">{candidates.length} total</span>
        </div>
        {candidates.length === 0 ? (
          <div className="bg-[#f5f5f5] p-5">
            <div className="rounded-md border border-[#d9d9d9] bg-white px-5 py-10 text-center shadow-sm">
              <p className="text-sm font-bold text-[#202020]">No applicants yet.</p>
              <p className="mt-1 text-sm font-semibold text-[#666666]">Share the application link to start collecting candidates.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f3f3f3] text-[11px] font-bold uppercase tracking-[0.12em] text-[#5f5f5f]">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Applied</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e3e3]">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="text-sm transition hover:bg-[#fafafa]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#202020]">{candidate.fullName}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#555555]">{candidate.email}</td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-[#202020]">
                        {candidate.glmScore !== null && candidate.glmScore !== undefined ? `${candidate.glmScore}%` : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-bold ${getStatusClass(candidate.status)}`}>
                        {formatStatus(candidate.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#555555]">
                      {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/candidates/${candidate.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[#d9d9d9] bg-white px-3 text-xs font-bold text-[#202020] transition hover:border-[#202020]"
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
  );
};

export default JobDetail;
