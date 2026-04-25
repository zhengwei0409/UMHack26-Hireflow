import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const BiasAuditDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('');
  const [candidateStats, setCandidateStats] = useState(null);

  useEffect(() => {
    loadData();
  }, [jobFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, snapshotsRes, candidatesRes] = await Promise.all([
        api.biasAudit.getMetrics(jobFilter || null),
        api.biasAudit.getSnapshots(jobFilter || null, 20),
        api.candidates.list(),
      ]);
      setMetrics(metricsRes.data);
      setSnapshots(snapshotsRes.data || []);
      setCandidateStats(candidatesRes.data);
    } catch (err) {
      console.error('Failed to load bias audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const totalCandidates = candidateStats?.items?.length || 0;
  const screenedCandidates = candidateStats?.items?.filter(c => c.glmScore !== null).length || 0;

  if (loading) {
    return (
      <div className="min-h-full bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-zinc-500">Loading bias audit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="app-page-title text-2xl text-zinc-950 sm:text-3xl">
              Bias Audit Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-600">
              Monitor and analyze screening decisions for potential bias
            </p>
          </div>
        </div>

        {metrics && metrics.totalSnapshots > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Total Decisions</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950">{metrics.totalSnapshots}</p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Pass Rate</p>
                <p className={`mt-2 text-3xl font-extrabold tracking-tight ${getScoreColor(metrics.passRate)}`}>
                  {metrics.passRate.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Review Rate</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-amber-600">
                  {metrics.reviewRate.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-white p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Flagged Decisions</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-red-600">
                  {metrics.flaggedDecisions}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                <h2 className="app-section-title-sm text-lg text-zinc-950">Score by Gender</h2>
                <div className="mt-4 space-y-3">
                  {Object.entries(metrics.averageScoreByGender || {}).map(([gender, score]) => (
                    <div key={gender} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-600">{gender}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-zinc-100">
                          <div className="h-2 rounded-full bg-black" style={{ width: `${score}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">{score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics.averageScoreByGender || {}).length === 0 && (
                    <p className="text-sm text-zinc-500">No gender data available</p>
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                <h2 className="app-section-title-sm text-lg text-zinc-950">Score by Name Origin</h2>
                <div className="mt-4 space-y-3">
                  {Object.entries(metrics.averageScoreByNameOrigin || {}).map(([origin, score]) => (
                    <div key={origin} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-600 capitalize">{origin}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-zinc-100">
                          <div className="h-2 rounded-full bg-black" style={{ width: `${score}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-zinc-900">{score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                  {Object.keys(metrics.averageScoreByNameOrigin || {}).length === 0 && (
                    <p className="text-sm text-zinc-500">No name origin data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
              <h2 className="app-section-title-sm mb-4 text-lg text-zinc-950">Recent Bias Snapshots</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Candidate</th>
                      <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Score</th>
                      <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Decision</th>
                      <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Trigger</th>
                      <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="hover:bg-zinc-50">
                        <td className="py-3 text-sm font-medium text-zinc-900">
                          <Link to={`/candidates/${snapshot.candidateId}`} className="hover:underline">
                            {snapshot.candidateId.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-3 text-sm font-bold text-zinc-900">{snapshot.score}</td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                            snapshot.decision === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                            snapshot.decision === 'REJECT' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {snapshot.decision}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-zinc-600">{snapshot.triggerType}</td>
                        <td className="py-3 text-sm text-zinc-500">
                          {new Date(snapshot.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {snapshots.length === 0 && (
                <p className="text-center py-8 text-sm text-zinc-500">No snapshots recorded yet</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-[20px] border border-zinc-200 bg-white p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="app-section-title-sm mt-4 text-lg text-zinc-950">Bias Audit Dashboard</h3>
            <p className="mt-2 text-sm font-medium text-zinc-600">
              {totalCandidates === 0
                ? 'No candidates have applied yet. Bias data will appear here once candidates are processed.'
                : `${totalCandidates} applicants (${screenedCandidates} screened). Bias audit snapshots are created when candidates are auto-screened.${screenedCandidates === 0 ? ' Run screening to generate bias data.' : ''}`
              }
            </p>
            {totalCandidates > 0 && screenedCandidates === 0 && (
              <div className="mt-4">
                <p className="text-sm text-zinc-500">Candidates are waiting to be screened by the AI system.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BiasAuditDashboard;
