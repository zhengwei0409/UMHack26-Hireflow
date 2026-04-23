import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const InterviewIntro = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await api.interviews.get(token);
        if (res.data?.attemptLocked) {
          navigate(`/interview/${token}/complete`, {
            replace: true,
            state: res.data,
          });
          return;
        }

        setSession(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [token]);

  const questionSummary = useMemo(
    () =>
      session?.questions?.reduce((acc, question) => {
        acc[question.type] = (acc[question.type] || 0) + 1;
        return acc;
      }, {}) || {},
    [session?.questions],
  );

  const handleOpenConsent = () => {
    setError('');
    setShowConsentModal(true);
  };

  const handleStart = async () => {
    if (!consent) {
      setError('Please agree before starting.');
      return;
    }

    setStarting(true);
    setError('');

    try {
      await api.interviews.start(token);
      navigate(`/interview/${token}/room`);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading interview session...
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Coding', value: questionSummary.DSA || 0 },
    { label: 'MCQ', value: questionSummary.MCQ || 0 },
    { label: 'Behavioral', value: questionSummary.BEHAVIORAL || 0 },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f5f5f5_38%,#eeeeee_100%)] px-4 py-6 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center">
        <section className="interview-intro-card w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="px-6 py-7 sm:px-8 sm:py-9">
            <div className="interview-reveal flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">AI pre-screen interview</p>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                One sitting
              </span>
            </div>

            <h1 className="interview-reveal mt-5 max-w-3xl text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
              {session?.candidate?.jobTitle || 'Technical interview'}
            </h1>
            <p className="interview-reveal mt-4 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
              Answer coding, multiple-choice, and behavioral questions. Review the rules, then start when you are ready.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className="interview-reveal inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2"
                  style={{ animationDelay: `${140 + index * 55}ms` }}
                >
                  <span className="text-sm font-extrabold text-zinc-950">{metric.value}</span>
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-500">{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="interview-reveal mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Rules</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  'Keep this tab open until submission.',
                  'Camera and screen sharing are required.',
                  'Tab switches, stopping share, or paste attempts may end the interview.',
                  'Use this link once and complete the work yourself.',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-semibold leading-6 text-zinc-700">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-zinc-950" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="interview-reveal mt-7 flex justify-end">
              <button
                type="button"
                className="primary-cta interview-premium-cta inline-flex min-h-12 items-center justify-center rounded-md px-6 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleOpenConsent}
                disabled={starting}
              >
                {starting ? 'Starting...' : 'Start interview'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <section
            aria-labelledby="consent-title"
            aria-modal="true"
            className="interview-modal-card w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.2)]"
            role="dialog"
          >
            <h2 id="consent-title" className="text-2xl font-extrabold tracking-tight text-zinc-950">
              Start monitored interview?
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">
              Camera, screen recording, and integrity checks will run during the session.
            </p>

            <fieldset className="mt-5">
              <legend className="sr-only">Interview monitoring agreement</legend>
              <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-zinc-300 accent-black"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                />
                <span className="text-sm font-semibold leading-6 text-zinc-700">
                  I agree to the monitoring required for this interview.
                </span>
              </label>
            </fieldset>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                onClick={() => {
                  setShowConsentModal(false);
                  setError('');
                }}
                disabled={starting}
              >
                Back
              </button>
              <button
                type="button"
                className="primary-cta interview-premium-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleStart}
                disabled={starting || !consent}
              >
                {starting ? 'Starting...' : 'I agree, start interview'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default InterviewIntro;
