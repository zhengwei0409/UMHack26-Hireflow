import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const fieldClassName =
  'w-full rounded-md border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const Shell = ({ children }) => (
  <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 text-black sm:px-6 lg:px-8">
    <div className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
  </div>
);

const InterviewResponse = ({ type }) => {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    submitResponse();
  }, []);

  const submitResponse = async (rescheduleReason = null) => {
    setLoading(true);
    setError('');

    try {
      const email = searchParams.get('email');
      if (!email) {
        const emailInput = prompt('Please enter your email address to confirm your identity:');
        if (!emailInput) {
          navigate('/');
          return;
        }
        await submitWithEmail(emailInput, rescheduleReason);
      } else {
        await submitWithEmail(email, rescheduleReason);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const submitWithEmail = async (email, rescheduleReason) => {
    if (type === 'confirm') {
      await api.candidates.confirmInterview(candidateId, email);
    } else {
      await api.candidates.requestReschedule(candidateId, email, rescheduleReason);
    }
  };

  const handleReschedule = (e) => {
    e.preventDefault();
    submitResponse(reason);
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Processing</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">Processing your response</h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-600">
          Please wait a moment while we update the interview response.
        </p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-red-100 text-xl font-extrabold text-red-700">
          !
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Unable to process</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">We could not complete this request</h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-600">{error}</p>
        <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
          Please contact HR directly or try again later.
        </p>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-xl font-extrabold text-emerald-700">
          ✓
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">
          {type === 'confirm' ? 'Interview confirmed' : 'Reschedule received'}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">
          {type === 'confirm' ? 'Interview confirmed' : 'Reschedule request submitted'}
        </h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-600">
          {type === 'confirm'
            ? 'Thank you for confirming your interview. The hiring team now has your response.'
            : 'Your request to reschedule has been submitted to HR for review.'}
        </p>
        <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
          {type === 'confirm'
            ? 'A confirmation email has been sent to your email address.'
            : 'HR will review your request and contact you with a new time if needed.'}
        </p>
      </Shell>
    );
  }

  if (type === 'reschedule' && !showReason) {
    return (
      <Shell>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Interview timing</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">Request a reschedule</h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-600">
          If the proposed interview time does not work, you can send a reschedule request to the HR team.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition"
            onClick={() => setShowReason(true)}
          >
            Yes, I need to reschedule
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>
      </Shell>
    );
  }

  if (type === 'reschedule' && showReason && !success) {
    return (
      <Shell>
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Interview timing</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">Request a reschedule</h1>
        <p className="mt-4 text-sm font-medium leading-7 text-zinc-600">
          Adding a short reason helps HR understand the context, but it is optional.
        </p>

        <form className="mt-6 grid gap-5" onSubmit={handleReschedule}>
          <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
            <span>Reason</span>
            <textarea
              className={`${fieldClassName} min-h-[140px]`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for the request..."
              rows={5}
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-70"
              disabled={loading}
            >
              Submit request
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  return null;
};

export default InterviewResponse;
