import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/dateFormat';

const STATUS_CONFIG = {
  CV_RECEIVED: { label: 'Application Received', color: 'border-zinc-200 bg-zinc-50 text-zinc-700', step: 1 },
  CV_UNDER_REVIEW: { label: 'Under Review', color: 'border-amber-200 bg-amber-50 text-amber-700', step: 2 },
  AI_INTERVIEW_SCORED: { label: 'AI Interview', color: 'border-blue-200 bg-blue-50 text-blue-700', step: 3 },
  INTERVIEW_PENDING: { label: 'Interview Pending', color: 'border-blue-200 bg-blue-50 text-blue-700', step: 4 },
  INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: 'border-purple-200 bg-purple-50 text-purple-700', step: 5 },
  INTERVIEW_CONFIRMED: { label: 'Interview Confirmed', color: 'border-purple-200 bg-purple-50 text-purple-700', step: 6 },
  INTERVIEW_DONE: { label: 'Interview Complete', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', step: 7 },
  OFFER_SENT: { label: 'Offer Sent', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', step: 8 },
  HIRED: { label: 'Hired', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', step: 9 },
  REJECTED: { label: 'Not Selected', color: 'border-red-200 bg-red-50 text-red-700', step: -1 },
};

const CandidatePortal = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [telegramConnected, setTelegramConnected] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.interviews.get(token);
      setCandidate(res.data.candidate);
      setJob(res.data.job);
    } catch (err) {
      setError(err.message || 'Unable to load your application status.');
    } finally {
      setLoading(false);
    }
  };

  const connectTelegram = async () => {
    const botUsername = 'YourTelegramBotUsername';
    const message = `Connect to HireFlow to receive updates about your ${job?.title || 'job'} application.`;
    window.open(`https://t.me/${botUsername}?start=${token}`, '_blank');
    setTelegramConnected(true);
  };

  const currentStep = STATUS_CONFIG[candidate?.status]?.step || 0;
  const progress = Math.max(0, Math.min(100, (currentStep / 9) * 100));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-black mx-auto" />
          <p className="mt-4 text-sm font-medium text-zinc-500">Loading your application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-red-200 bg-red-50 px-6 py-12 text-center">
          <h2 className="text-xl font-extrabold text-red-700">Unable to Load Application</h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-black text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-zinc-950">Candidate Portal</h1>
              <p className="text-sm text-zinc-500">Track your application status</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-extrabold text-zinc-950">Your Application</h2>
          <div className="mt-4">
            <h3 className="text-xl font-bold text-zinc-900">{candidate?.jobTitle || job?.title || 'Position'}</h3>
            <p className="mt-1 text-sm text-zinc-600">{candidate?.fullName} - Applied {formatDate(candidate?.createdAt)}</p>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-700">Application Status</span>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${STATUS_CONFIG[candidate?.status]?.color || 'border-zinc-200 bg-zinc-100 text-zinc-700'}`}>
                {STATUS_CONFIG[candidate?.status]?.label || 'Processing'}
              </span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-extrabold text-zinc-950">Timeline</h2>
          <div className="mt-4 space-y-4">
            {candidate?.history?.length > 0 ? (
              candidate.history.map((event, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-black" />
                    {i < candidate.history.length - 1 && <div className="w-px flex-1 bg-zinc-200" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-semibold text-zinc-900">{event.description}</p>
                    <p className="text-xs text-zinc-500">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No updates yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-extrabold text-zinc-950">Interview</h2>
          {candidate?.status === 'INTERVIEW_SCHEDULED' || candidate?.status === 'INTERVIEW_CONFIRMED' ? (
            <div className="mt-4 space-y-3 rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">Your Interview is Scheduled</p>
              {candidate.interviewDate && (
                <p className="text-sm text-zinc-600">Date: {formatDate(candidate.interviewDate)}</p>
              )}
              {candidate.interviewTime && (
                <p className="text-sm text-zinc-600">Time: {formatTime(candidate.interviewTime)}</p>
              )}
              {candidate.meetingLink && (
                <a href={candidate.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800">
                  Join Interview
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              {candidate?.status === 'INTERVIEW_DONE' || candidate?.status === 'OFFER_SENT' || candidate?.status === 'HIRED'
                ? 'Interview completed. Check your email for next steps.'
                : 'No interview scheduled yet.'}
            </p>
          )}
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-zinc-950">Get Updates on Telegram</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Connect your Telegram to receive instant updates about your application.
              </p>
            </div>
          </div>
          <button
            onClick={connectTelegram}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.826.826 0 0 1 .454 .655c.003.164.003.335.003.523 0 .63-.049 1.259-.144 1.887h-.001v3.933l2.275 1.486c.252.168.546.26.843.26.314 0 .61-.107.83-.308.237-.218.355-.534.355-.921v-4.46l-.005-.007zm-8.231 6.994l-.005.007v2.274l1.486-.486.005-.007v-1.782l-.005-.007zm-1.806 3.034V5.538H1.93v9.415l2.276-1.486h4.927v-.943zM1.93 5.538H5.86v.943l-1.863.616-1.067-.55v1.786zm5.933 1.487H5.86v1.786l2.276.741 2.274-1.486V5.538h-3.003zm8.962-.55L17.02 5.538h1.067l-.616 1.067-1.82.55v1.786zm-4.027 9.41l.005-.007-1.486-2.276-.005.007v1.782l.005.007 1.486 1.486v-2.274zm-.616-5.533l-.005.007 1.782-.55-.005.007-1.486.55-.005-.007V8.26l-.005-.007-.006 1.487 1.486 1.486.005-.007-1.486-2.276-.005.007v1.782z"/>
            </svg>
            Connect Telegram
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandidatePortal;
