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

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await api.interviews.get(token);
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

  const handleStart = async () => {
    if (!consent) {
      setError('Please confirm the recording and integrity consent before starting.');
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
        <div className="mx-auto max-w-5xl rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
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
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">AI pre-screen interview</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
              {session?.candidate?.jobTitle || 'Technical interview'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
              This secure link opens your interview session. You will answer coding, multiple-choice, and behavioral
              questions in one sitting.
            </p>
          </div>

          <div className="grid gap-px border-y border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-zinc-50 px-6 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 px-6 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="rounded-[28px] border border-zinc-200 bg-white p-6">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Before you begin</h2>
              <ul className="mt-5 grid gap-3">
                {[
                  'Keep this tab open for the full session.',
                  'Tab switches and paste attempts may be logged for integrity review.',
                  'Use this interview link only once and complete the work yourself.',
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold leading-6 text-zinc-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-6">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">Consent</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">
                We only ask for consent because the platform records integrity signals during the interview session.
              </p>

              <label className="mt-6 flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-zinc-300 accent-black"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span className="text-sm font-semibold leading-6 text-zinc-700">
                  I understand this session is monitored for integrity signals such as tab switching and paste attempts,
                  and I consent to continue.
                </span>
              </label>

              {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                className="primary-cta mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? 'Starting...' : 'Start interview'}
              </button>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InterviewIntro;
