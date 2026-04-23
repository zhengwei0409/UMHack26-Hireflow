import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const inputClassName =
  'min-h-[46px] w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const fileInputClassName =
  'block w-full rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm font-semibold text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3.5 file:py-2 file:text-sm file:font-extrabold file:text-white hover:border-zinc-400';

const Apply = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const res = await api.jobs.get(jobId);
      setJob(res.data);
    } catch (err) {
      setError('Job not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cvFile) {
      setError('Please upload your CV');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('jobId', jobId);
      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      if (formData.phone) data.append('phone', formData.phone);
      data.append('cvFile', cvFile);

      await api.candidates.apply(data);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const jobMeta = useMemo(() => {
    if (!job) return [];

    return [
      { label: 'Department', value: job.department || 'General' },
      { label: 'Location', value: job.location || 'Flexible' },
      { label: 'Requirements', value: job.requirements?.length || 0 },
    ];
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading application form...
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-2xl font-extrabold text-emerald-700">
            ✓
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Application received</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">Application submitted</h1>
          <p className="mt-4 text-sm font-medium leading-7 text-zinc-600 sm:text-base">
            Thank you for applying for the {job?.title} position. We have received your CV and the hiring team will
            review it shortly.
          </p>
          <p className="mt-3 text-sm font-medium leading-7 text-zinc-600 sm:text-base">
            If your background matches the role, you will hear from the team about the next step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Apply now</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
              {job?.title || 'Open role'}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600 sm:text-base">
              Submit your profile in one sitting. A clear CV and accurate contact details are enough to get started.
            </p>
          </div>

          <div className="grid gap-px border-y border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {jobMeta.map((item) => (
              <div key={item.label} className="bg-zinc-50 px-6 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                <p className="mt-2 text-lg font-extrabold tracking-tight text-zinc-950">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Role details</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-zinc-600">{job?.description}</p>

            {job?.requirements?.length > 0 && (
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
          </div>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">Your application</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
              Keep it simple. We only need your basic contact details and your latest CV.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span>Full name</span>
              <input
                type="text"
                className={inputClassName}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                placeholder="John Doe"
              />
            </label>

            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span>Email</span>
              <input
                type="email"
                className={inputClassName}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="john@example.com"
              />
            </label>

            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span>Phone</span>
              <input
                type="tel"
                className={inputClassName}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+60 123 456 789"
              />
            </label>

            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span>Upload CV</span>
              <input
                type="file"
                accept=".pdf,.docx"
                className={fileInputClassName}
                onChange={(e) => setCvFile(e.target.files[0])}
                required
              />
              <span className="text-[11px] font-bold normal-case tracking-normal text-zinc-500">
                Accepted formats: PDF or DOCX, maximum 5MB.
              </span>
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-black px-4 text-sm font-extrabold text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Apply;
