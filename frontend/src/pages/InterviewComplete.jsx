import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import api from '../services/api';

const InterviewComplete = () => {
  const { token } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(location.state || null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const shouldPoll = !session || session.status === 'COMPLETED' || session.scoringPending;

    if (!shouldPoll) {
      return undefined;
    }

    const loadSession = () => {
      api.interviews
        .get(token)
        .then((res) => {
          if (!cancelled) {
            setSession((current) => ({
              ...current,
              ...res.data,
              scoringPending: res.data.status === 'COMPLETED',
            }));
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        });
    };

    loadSession();
    const intervalId = window.setInterval(loadSession, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session?.status, session?.scoringPending, token]);

  const wasTerminated = Boolean(session?.wasTerminated);
  const isAnalyzing = session?.status === 'COMPLETED' || session?.scoringPending || !session;
  const heading = isAnalyzing
    ? 'AI is reviewing your interview'
    : wasTerminated
      ? 'Interview ended early'
      : 'Thanks for completing the AI pre-screen';
  const eyebrow = isAnalyzing ? 'Analysis in progress' : wasTerminated ? 'Interview ended' : 'Interview submitted';
  const message = isAnalyzing
    ? 'Your answers were submitted successfully. Please wait a moment while the AI finishes the final review.'
    : wasTerminated
    ? 'This session was ended automatically because repeated integrity violations were detected. The hiring team can review the submitted answers that were captured before the interview ended.'
    : 'Your responses have been recorded. The hiring team will review your interview evidence and reach out with next steps if there is a fit.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f5f5f5_38%,#eeeeee_100%)] px-4 py-6 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="interview-complete-card rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10">
          {isAnalyzing ? (
            <div className="interview-complete-icon mx-auto grid h-20 w-20 place-items-center rounded-full bg-zinc-100">
              <div className="relative h-14 w-14">
                <span className="absolute inset-0 rounded-full border-4 border-zinc-200" />
                <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-zinc-950" />
                <span className="absolute inset-4 rounded-full bg-white shadow-inner" />
              </div>
            </div>
          ) : (
            <div
              className={`interview-complete-icon mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-extrabold ${
                wasTerminated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {wasTerminated ? '!' : '✓'}
            </div>
          )}
          <p className="interview-reveal mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
          <h1 className="app-page-title interview-reveal mt-3 text-3xl text-zinc-950 sm:text-4xl">{heading}</h1>
          <p className="interview-reveal mx-auto mt-4 max-w-3xl text-sm font-medium leading-7 text-zinc-600 sm:text-base">{message}</p>
          {isAnalyzing && (
            <div className="interview-reveal mt-6 flex items-center justify-center gap-2">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-2.5 w-2.5 animate-bounce rounded-full bg-zinc-950"
                  style={{ animationDelay: `${item * 140}ms` }}
                />
              ))}
            </div>
          )}
          {wasTerminated && session?.terminationReason && (
            <div className="interview-reveal mx-auto mt-6 max-w-xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800">
              Reason: {session.terminationReason}
            </div>
          )}
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default InterviewComplete;
