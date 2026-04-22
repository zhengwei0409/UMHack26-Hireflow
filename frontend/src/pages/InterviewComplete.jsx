import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import api from '../services/api';

const InterviewComplete = () => {
  const { token } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(location.state || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      return;
    }

    api.interviews
      .get(token)
      .then((res) => setSession(res.data))
      .catch((err) => setError(err.message));
  }, [session, token]);

  const breakdownEntries = useMemo(
    () => (session?.scoreBreakdown && typeof session.scoreBreakdown === 'object' ? Object.entries(session.scoreBreakdown) : []),
    [session?.scoreBreakdown],
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-[32px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-2xl font-extrabold text-emerald-700">
            ✓
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Interview submitted</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
            Thanks for completing the AI pre-screen
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm font-medium leading-7 text-zinc-600 sm:text-base">
            Your responses have been recorded and scored. The hiring team will review your interview evidence and reach
            out with next steps if there is a fit.
          </p>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {session?.overallScore !== undefined && (
          <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
            <div className="px-6 py-6 sm:px-8 sm:py-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">Submission snapshot</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                This is a quick confirmation view of what the system recorded after submission.
              </p>
            </div>

            <div className="grid gap-px border-y border-zinc-200 bg-zinc-200 sm:grid-cols-2">
              <div className="bg-zinc-50 px-6 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Overall score</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">{session.overallScore}</p>
              </div>
              <div className="bg-zinc-50 px-6 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Session status</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">Received</p>
              </div>
            </div>

            {breakdownEntries.length > 0 && (
              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Score breakdown</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {breakdownEntries.map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">{key}</p>
                      <p className="mt-2 text-lg font-extrabold tracking-tight text-zinc-950">
                        {typeof value === 'number' ? value : JSON.stringify(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default InterviewComplete;
