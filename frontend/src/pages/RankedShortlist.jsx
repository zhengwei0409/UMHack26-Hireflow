import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { buttonSecondaryClassName } from '../styles/buttonStyles';

const StatusBadge = ({ status }) => {
  const map = {
    SHORTLISTED: 'bg-green-100 text-green-700',
    INTERVIEW_COMPLETED: 'bg-blue-100 text-blue-700',
    HIRED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  const cls = map[status] || 'bg-zinc-100 text-zinc-600';
  const label = status ? status.replace(/_/g, ' ') : 'Unknown';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

export default function RankedShortlist() {
  const [jobs, setJobs] = useState([]);
  const [shortlists, setShortlists] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const jobsRes = await api.jobs.list();
        const jobList = jobsRes.data?.items || jobsRes.data || [];
        setJobs(jobList);

        const results = await Promise.all(
          jobList.map((job) =>
            api.jobs.shortlist(job.id).catch(() => ({ data: [] }))
          )
        );

        const map = {};
        jobList.forEach((job, i) => {
          map[job.id] = (results[i].data || []).map((session) => ({
            id: session.candidate.id,
            fullName: session.candidate.fullName,
            aiInterviewScore: session.candidate.aiInterviewScore ?? session.overallScore,
            aiInterviewRank: session.candidate.aiInterviewRank ?? session.rankPosition,
            isShortlisted: Boolean(session.candidate.isShortlisted ?? session.isShortlisted),
            status: session.candidate.status,
            proctorFlagCount: session.proctorEvents?.length || 0,
          }));
        });
        setShortlists(map);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="p-6 lg:p-10">
        <p className="text-sm font-semibold text-zinc-500">Loading shortlists…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 lg:p-10">
        <p className="text-sm font-semibold text-red-500">{error}</p>
      </main>
    );
  }

  const jobsWithCandidates = jobs.filter((job) => (shortlists[job.id] || []).length > 0);

  return (
    <main className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">Ranked Shortlist</h1>
        <p className="mt-1 text-sm font-medium text-zinc-500">
          Top-ranked candidates by AI interview score across all open roles.
        </p>
      </div>

      {jobsWithCandidates.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          No scored candidates yet. Shortlists appear here once AI interviews are completed.
        </div>
      ) : (
        <div className="space-y-8">
          {jobsWithCandidates.map((job) => {
            const list = shortlists[job.id] || [];
            return (
              <section key={job.id} className="rounded-md border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                  <div>
                    <h2 className="text-base font-extrabold text-zinc-950">{job.title}</h2>
                    <p className="text-xs font-medium text-zinc-500">{job.department} · {list.length} candidate{list.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Link to={`/jobs/${job.id}`} className={`${buttonSecondaryClassName} px-3 min-h-9 text-xs`}>
                    View role
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-100 text-left">
                    <thead className="bg-zinc-50">
                      <tr className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Candidate</th>
                        <th className="px-4 py-3">AI Score</th>
                        <th className="px-4 py-3">Flags</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {list.map((candidate, index) => {
                        const rank = candidate.aiInterviewRank || index + 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                        const rankColor =
                          rank === 1 ? 'text-yellow-600' : rank === 2 ? 'text-zinc-500' : rank === 3 ? 'text-amber-600' : 'text-zinc-950';
                        const rowBg = rank === 1 ? 'bg-yellow-50' : rank === 2 ? 'bg-zinc-50' : rank === 3 ? 'bg-amber-50' : '';

                        return (
                          <tr key={candidate.id} className={rowBg}>
                            <td className={`px-4 py-4 text-sm font-extrabold ${rankColor}`}>
                              {medal ? (
                                <span className="flex items-center gap-1.5">
                                  <span>{medal}</span>
                                  <span>#{rank}</span>
                                </span>
                              ) : (
                                `#${rank}`
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-zinc-700">{candidate.fullName}</td>
                            <td className={`px-4 py-4 text-sm font-extrabold ${rank <= 3 ? rankColor : 'text-zinc-950'}`}>
                              {candidate.aiInterviewScore != null ? `${Number(candidate.aiInterviewScore).toFixed(1)}%` : '-'}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-zinc-700">{candidate.proctorFlagCount}</td>
                            <td className="px-4 py-4">
                              <StatusBadge status={candidate.status} />
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Link
                                to={`/candidates/${candidate.id}`}
                                className={`${buttonSecondaryClassName} min-h-9 px-3 text-xs`}
                              >
                                Review
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
