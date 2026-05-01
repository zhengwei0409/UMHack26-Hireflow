import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { buttonPrimaryClassName } from '../styles/buttonStyles';
import { formatDate } from '../utils/dateFormat';

const inputClassName =
  'min-h-[46px] w-full rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const fileInputClassName =
  'block w-full cursor-pointer rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm font-semibold text-zinc-600 transition duration-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-black file:px-3.5 file:py-2 file:text-sm file:font-extrabold file:text-white file:shadow-sm file:transition file:duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-white hover:file:-translate-y-0.5 hover:file:bg-zinc-800 hover:file:shadow-[0_10px_22px_rgba(24,24,27,0.18)] active:translate-y-0 active:file:translate-y-0 active:file:scale-[0.97] focus-within:border-black focus-within:ring-2 focus-within:ring-black/10';

const MAX_CV_SIZE = 5 * 1024 * 1024;
const ALLOWED_CV_EXTENSIONS = ['pdf', 'docx'];

const isJobClosed = (job) => {
  if (!job) return false;
  return String(job.status || '').toUpperCase() === 'CLOSED' || new Date(job.closingDate).getTime() <= Date.now();
};

const validateCvFile = (file) => {
  if (!file) return 'Please upload your CV.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_CV_EXTENSIONS.includes(extension)) {
    return 'Please upload your CV as a PDF or DOCX file only.';
  }

  if (file.size > MAX_CV_SIZE) {
    return 'Your CV is too large. Please upload a PDF or DOCX file smaller than 5MB.';
  }

  return '';
};

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

    const cvError = validateCvFile(cvFile);
    if (cvError) {
      setError(cvError);
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

  const handleCvChange = (e) => {
    const file = e.target.files?.[0] || null;
    const cvError = validateCvFile(file);

    setCvFile(cvError ? null : file);
    setError(cvError);
    if (cvError) e.target.value = '';
  };

  const jobMeta = useMemo(() => {
    if (!job) return [];

    return [
      { label: 'Department', value: job.department || 'General' },
      { label: 'Location', value: job.location || 'Flexible' },
      { label: 'Closing date', value: formatDate(job.closingDate) },
    ];
  }, [job]);

  if (loading) {
    return (
      <div className="app-ambient-page min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="candidate-page-enter mx-auto max-w-5xl rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading application form...
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="app-ambient-page min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="candidate-page-enter mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="app-ambient-page min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="candidate-page-enter mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <div className="candidate-score-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-2xl font-extrabold text-emerald-700">
            ✓
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Application received</p>
          <h1 className="app-page-title mt-3 text-3xl text-zinc-950">Application submitted</h1>
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

  const closedForApplications = isJobClosed(job);

  return (
    <div className="app-ambient-page min-h-screen bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="candidate-page-enter overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Apply now</p>
            <h1 className="app-page-title mt-3 text-3xl text-zinc-950 sm:text-4xl">
              {job?.title || 'Open role'}
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600 sm:text-base">
              {closedForApplications
                ? 'This role is no longer accepting new applications.'
                : 'Submit your profile in one sitting. A clear CV and accurate contact details are enough to get started.'}
            </p>
          </div>

          <div className="grid gap-px border-y border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {jobMeta.map((item, index) => (
              <div
                key={item.label}
                className="job-metric-pop bg-zinc-50 px-6 py-4"
                style={{ animationDelay: `${120 + index * 70}ms` }}
              >
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{item.label}</p>
                <p className="mt-2 text-lg font-extrabold tracking-tight text-zinc-950">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <h2 className="app-section-title-sm text-xl text-zinc-950">Role details</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-zinc-600">{job?.description}</p>

            {job?.requirements?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Requirements</h3>
                <ul className="mt-4 grid gap-3">
                  {job.requirements.map((requirement, index) => (
                    <li
                      key={`${requirement}-${index}`}
                      className="candidate-lane-enter rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700"
                      style={{ animationDelay: `${160 + index * 55}ms` }}
                    >
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section
          className="candidate-page-enter rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
          style={{ animationDelay: '90ms' }}
        >
          <div className="mb-6">
            <h2 className="app-section-title text-2xl text-zinc-950">Your application</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
              Keep it simple. We only need your basic contact details and your latest CV.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <label className="candidate-lane-enter grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
              <span>Full name</span>
              <input
                type="text"
                className={inputClassName}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                disabled={closedForApplications}
                placeholder="John Doe"
              />
            </label>

            <label
              className="candidate-lane-enter grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500"
              style={{ animationDelay: '70ms' }}
            >
              <span>Email</span>
              <input
                type="email"
                className={inputClassName}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={closedForApplications}
                placeholder="john@example.com"
              />
            </label>

            <label
              className="candidate-lane-enter grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500"
              style={{ animationDelay: '140ms' }}
            >
              <span>Phone</span>
              <input
                type="tel"
                className={inputClassName}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={closedForApplications}
                placeholder="+60 123 456 789"
              />
            </label>

            <label
              className="candidate-lane-enter grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500"
              style={{ animationDelay: '210ms' }}
            >
              <span>Upload CV</span>
              <input
                type="file"
                accept=".pdf,.docx"
                className={fileInputClassName}
                onChange={handleCvChange}
                disabled={closedForApplications}
                required
              />
              <span className="text-[11px] font-bold normal-case tracking-normal text-zinc-500">
                Accepted formats: PDF or DOCX, maximum 5MB.
              </span>
            </label>

            {error && (
              <div className="candidate-lane-enter rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {closedForApplications && (
              <div className="candidate-lane-enter rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                Applications closed on {formatDate(job?.closingDate)}.
              </div>
            )}

            <button
              type="submit"
              className={buttonPrimaryClassName}
              disabled={submitting || closedForApplications}
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
