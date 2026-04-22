import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const inputClassName =
  'min-h-[44px] w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const textareaClassName = `${inputClassName} min-h-[120px] py-3`;

const formatStatusLabel = (status) =>
  String(status || 'OPEN')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized.includes('open') || normalized.includes('review')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized.includes('closed')) {
    return 'border-zinc-200 bg-zinc-100 text-zinc-600';
  }

  return 'border-zinc-200 bg-white text-zinc-700';
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    location: '',
    autoScreenThreshold: 60,
    shortlistSize: 10,
  });

  useEffect(() => {
    loadJobs();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        requirements: formData.requirements.split('\n').filter((requirement) => requirement.trim()),
      };
      await api.jobs.create(data);
      setShowForm(false);
      setFormData({
        title: '',
        department: '',
        description: '',
        requirements: '',
        location: '',
        autoScreenThreshold: 60,
        shortlistSize: 10,
      });
      await loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to close this job?')) return;

    try {
      await api.jobs.delete(id);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const visibleJobs = useMemo(
    () => jobs.filter((job) => String(job.status || '').toUpperCase() !== 'CLOSED'),
    [jobs],
  );

  const metrics = useMemo(() => {
    const openRoles = visibleJobs.filter((job) => String(job.status).toUpperCase() === 'OPEN').length;
    const applicants = visibleJobs.reduce((sum, job) => sum + Number(job._count?.candidates || 0), 0);
    const avgThreshold = visibleJobs.length
      ? Math.round(
          visibleJobs.reduce((sum, job) => sum + Number(job.autoScreenThreshold ?? 60), 0) / visibleJobs.length,
        )
      : 60;

    return [
      { label: 'Open roles', value: openRoles },
      { label: 'Active postings', value: visibleJobs.length },
      { label: 'Applicants tracked', value: applicants },
      { label: 'Avg. AI threshold', value: `${avgThreshold}%` },
    ];
  }, [visibleJobs]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm font-semibold text-zinc-500">
          Loading roles...
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
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Hiring workspace</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                Job positions
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Create roles, tune the AI prescreen rules, and keep the hiring pipeline organized in one place.
              </p>
            </div>

            <div className="flex items-start justify-start lg:justify-end">
              <button
                type="button"
                className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition"
                onClick={() => setShowForm((current) => !current)}
              >
                {showForm ? 'Close form' : 'Create job'}
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

        {showForm && (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">Create a new role</h2>
              <p className="text-sm font-medium leading-6 text-zinc-600">
                Start with the essentials first. The AI prescreen settings can be adjusted again later from the job
                detail page.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Job title</span>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Software Engineer"
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Department</span>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    placeholder="Engineering"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>Description</span>
                <textarea
                  className={textareaClassName}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Describe what the role owns, what success looks like, and who the person will work with."
                  rows={5}
                />
              </label>

              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                <span>Requirements</span>
                <textarea
                  className={textareaClassName}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder={'3+ years experience\nReact\nNode.js'}
                  rows={5}
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Location</span>
                  <input
                    type="text"
                    className={inputClassName}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                    placeholder="Kuala Lumpur"
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>AI screen threshold</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={inputClassName}
                    value={formData.autoScreenThreshold}
                    onChange={(e) => setFormData({ ...formData, autoScreenThreshold: Number(e.target.value) })}
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                  <span>Shortlist size</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={inputClassName}
                    value={formData.shortlistSize}
                    onChange={(e) => setFormData({ ...formData, shortlistSize: Number(e.target.value) })}
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-70"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create job'}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {error && !showForm && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {visibleJobs.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-zinc-300 bg-white px-6 py-14 text-center lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">No roles yet</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-950">Create your first job posting</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-zinc-600">
              Once a role exists, applicants, AI screening, and ranked shortlist data will start collecting here.
            </p>
            <button
              type="button"
              className="primary-cta mt-6 inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition"
              onClick={() => setShowForm(true)}
            >
              Create job
            </button>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {visibleJobs.map((job) => {
              const applicantCount = Number(job._count?.candidates || 0);

              return (
                <article
                  key={job.id}
                  className="flex h-full flex-col rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">
                        {job.department || 'General'}
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold tracking-tight text-zinc-950">{job.title}</h3>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">{job.location || 'Location TBD'}</p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${getStatusTone(job.status)}`}
                    >
                      {formatStatusLabel(job.status)}
                    </span>
                  </div>

                  <p className="mt-5 line-clamp-4 text-sm font-medium leading-6 text-zinc-600">
                    {job.description || 'No job description added yet.'}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Applicants</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">{applicantCount}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">AI threshold</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
                        {job.autoScreenThreshold ?? 60}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">Shortlist</p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">
                        {job.shortlistSize ?? 10}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition"
                    >
                      View role details
                    </Link>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                      onClick={() => handleDelete(job.id)}
                    >
                      Close role
                    </button>
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

export default Jobs;
