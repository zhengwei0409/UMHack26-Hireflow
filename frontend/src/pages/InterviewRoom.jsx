import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const DEFAULT_LANGUAGE = 'python';

const fieldClassName =
  'w-full rounded-md border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const InterviewRoom = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [runningQuestionId, setRunningQuestionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadSession = async () => {
    try {
      const res = await api.interviews.get(token);
      setSession(res.data);
      const nextDrafts = {};
      (res.data.questions || []).forEach((question) => {
        nextDrafts[question.id] = {
          rawAnswer: question.answer?.rawAnswer || '',
          selectedOption: question.answer?.selectedOption || '',
          codeSubmission: question.answer?.codeSubmission || '',
          programmingLanguage: question.answer?.programmingLanguage || DEFAULT_LANGUAGE,
          executionResult: question.answer?.executionResult || null,
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [token]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        api.interviews
          .logProctorEvents(token, [
            {
              type: 'TAB_HIDDEN',
              severity: 2,
              metadata: { source: 'visibilitychange' },
            },
          ])
          .catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [token]);

  const updateDraft = (questionId, patch) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }));
  };

  const handleSaveAnswer = async (question) => {
    setSavingQuestionId(question.id);
    setError('');

    try {
      const draft = drafts[question.id] || {};
      await api.interviews.saveAnswer(token, {
        questionId: question.id,
        rawAnswer: question.type === 'BEHAVIORAL' ? draft.rawAnswer : undefined,
        selectedOption: question.type === 'MCQ' ? draft.selectedOption : undefined,
        codeSubmission: question.type === 'DSA' ? draft.codeSubmission : undefined,
        programmingLanguage: question.type === 'DSA' ? draft.programmingLanguage : undefined,
      });
      await loadSession();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingQuestionId('');
    }
  };

  const handleRunCode = async (question) => {
    setRunningQuestionId(question.id);
    setError('');

    try {
      const draft = drafts[question.id] || {};
      const res = await api.interviews.runCode(token, {
        questionId: question.id,
        language: draft.programmingLanguage || DEFAULT_LANGUAGE,
        sourceCode: draft.codeSubmission || '',
      });
      updateDraft(question.id, { executionResult: res.data });
      await loadSession();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningQuestionId('');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await api.interviews.submit(token);
      navigate(`/interview/${token}/complete`, { state: res.data });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteLog = (questionId) => {
    api.interviews
      .logProctorEvents(token, [
        {
          type: 'PASTE_ATTEMPT',
          severity: 1,
          metadata: { questionId },
        },
      ])
      .catch(() => {});
  };

  const completedAnswers = useMemo(
    () =>
      (session?.questions || []).filter((question) => {
        const answer = question.answer;

        if (!answer) return false;
        return Boolean(answer.rawAnswer || answer.selectedOption || answer.codeSubmission);
      }).length,
    [session?.questions],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading interview room...
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
    { label: 'Questions', value: session?.questions?.length || 0 },
    { label: 'Saved answers', value: completedAnswers },
    { label: 'Signal state', value: 'Active' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-8 lg:py-8">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Interview in progress</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                {session?.candidate?.jobTitle} interview
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Work through each question carefully. Save answers as you go, then submit once you are fully done.
              </p>
            </div>

            <div className="flex items-start justify-start lg:justify-end">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
                Recording signals active
              </div>
            </div>
          </div>

          <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 sm:grid-cols-3">
            {metrics.map((metric) => (
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

        <section className="grid gap-4">
          {(session?.questions || []).map((question) => {
            const draft = drafts[question.id] || {};
            const executionResult = draft.executionResult || question.answer?.executionResult;

            return (
              <article
                key={question.id}
                className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm lg:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-4xl">
                    <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">
                      {question.type} · Question {question.sequence}
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-950">{question.prompt}</h2>
                  </div>

                  <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                    {question.answer ? 'Saved' : 'Draft'}
                  </div>
                </div>

                {question.type === 'MCQ' && (
                  <div className="mt-6 grid gap-3">
                    {(question.choices || []).map((choice) => (
                      <label
                        key={choice}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          draft.selectedOption === choice
                            ? 'border-black bg-zinc-100 text-zinc-950'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          className="mt-1 h-4 w-4 accent-black"
                          checked={draft.selectedOption === choice}
                          onChange={() => updateDraft(question.id, { selectedOption: choice })}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'BEHAVIORAL' && (
                  <textarea
                    rows={7}
                    className={`${fieldClassName} mt-6 min-h-[180px]`}
                    value={draft.rawAnswer}
                    onChange={(e) => updateDraft(question.id, { rawAnswer: e.target.value })}
                    placeholder="Write your answer here..."
                  />
                )}

                {question.type === 'DSA' && (
                  <div className="mt-6 grid gap-4">
                    <div className="max-w-[220px]">
                      <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        <span>Language</span>
                        <select
                          className={`${fieldClassName} min-h-[44px] py-0`}
                          value={draft.programmingLanguage || DEFAULT_LANGUAGE}
                          onChange={(e) => updateDraft(question.id, { programmingLanguage: e.target.value })}
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                        </select>
                      </label>
                    </div>

                    <textarea
                      rows={14}
                      className={`${fieldClassName} min-h-[280px] font-mono text-[13px] leading-6`}
                      value={draft.codeSubmission}
                      onChange={(e) => updateDraft(question.id, { codeSubmission: e.target.value })}
                      onPaste={() => handlePasteLog(question.id)}
                      placeholder="Write your solution here..."
                    />

                    {executionResult && (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                        Pass rate: {Math.round((executionResult.passRate || 0) * 100)}%
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {question.type === 'DSA' && (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-extrabold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-black disabled:cursor-wait disabled:opacity-70"
                      onClick={() => handleRunCode(question)}
                      disabled={runningQuestionId === question.id}
                    >
                      {runningQuestionId === question.id ? 'Running...' : 'Run code'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-cta inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-70"
                    onClick={() => handleSaveAnswer(question)}
                    disabled={savingQuestionId === question.id}
                  >
                    {savingQuestionId === question.id ? 'Saving...' : 'Save answer'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <button
            type="button"
            className="primary-cta inline-flex min-h-12 items-center justify-center rounded-md px-5 text-sm font-extrabold shadow-lg transition disabled:cursor-wait disabled:opacity-70"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit interview'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
