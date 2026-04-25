import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CvEvaluationModal = ({ candidateId, isOpen, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [investigation, setInvestigation] = useState(null);

  useEffect(() => {
    if (isOpen && candidateId) {
      loadData();
    }
  }, [isOpen, candidateId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const investigationRes = await api.investigation.getResult(candidateId).catch(() => ({ data: null }));
      setInvestigation(investigationRes.data || null);
    } catch (err) {
      console.error('Failed to load verification:', err);
    } finally {
      setLoading(false);
    }
  };

  const runInvestigation = async () => {
    setLoading(true);
    try {
      const res = await api.investigation.run(candidateId);
      setInvestigation(res.data);
      onUpdated?.(res.data);
    } catch (err) {
      console.error('Investigation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const verifiedSkills = investigation?.claimsVerified?.verifiedSkills || [];
  const unverifiedSkills = investigation?.claimsVerified?.unverifiedSkills || [];
  const claimedSkills = investigation?.claimsVerified?.claimedSkills || [];
  const projectVerification = investigation?.projectVerification;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-6 shadow-xl sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="app-section-title-sm text-2xl text-zinc-950">Profile verification</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600">Checks the candidate's public profiles and matches resume projects with GitHub repositories.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-sm font-medium text-zinc-500">Loading verification...</p>
          </div>
        ) : (
          <div className="space-y-6 border-t border-zinc-200 pt-6">
            {!investigation ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 mb-4">Run background investigation to verify candidate claims</p>
                <button
                  onClick={runInvestigation}
                  className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                >
                  Start Profile Check
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={runInvestigation}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Run Again
                  </button>
                </div>

                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Verification Score</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          investigation.recommendation === 'ACCEPT' ? 'bg-emerald-100 text-emerald-700' :
                          investigation.recommendation === 'REJECT' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {investigation.overallScore}/100
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-700">
                        Recommendation: {investigation.recommendation}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500 mb-3">GitHub Profile</h3>
                        {investigation.githubData?.exists ? (
                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-emerald-700 flex items-center gap-2">
                              <span className="text-emerald-500">✓</span> Verified
                            </p>
                            <p className="text-zinc-600">Repos: {investigation.githubData.publicRepos}</p>
                            <p className="text-zinc-600">Followers: {investigation.githubData.followers}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 flex items-center gap-2">
                            <span className="text-red-500">✗</span> Not found
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500 mb-3">LinkedIn Profile</h3>
                        {investigation.linkedinData?.exists ? (
                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-emerald-700 flex items-center gap-2">
                              <span className="text-emerald-500">✓</span>
                              Profile URL found
                            </p>
                            {investigation.linkedinData.profileUrl && (
                              <a
                                href={investigation.linkedinData.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-zinc-600 underline underline-offset-2"
                              >
                                {investigation.linkedinData.profileUrl}
                              </a>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 flex items-center gap-2">
                            <span className="text-red-500">✗</span> Not found
                          </p>
                        )}
                      </div>
                    </div>

                    {projectVerification && (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500">Project Match Analysis</h3>
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase text-zinc-600">
                            {projectVerification.confidence || 'low'} confidence
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-6 text-zinc-700">{projectVerification.summary}</p>

                        {projectVerification.matches?.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {projectVerification.matches.map((match, i) => (
                              <div key={`${match.resumeProject}-${match.githubRepo}-${i}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-sm font-extrabold text-emerald-800">
                                  {match.resumeProject} → {match.githubRepo}
                                </p>
                                <p className="mt-1 text-sm font-medium leading-5 text-emerald-700">{match.evidence}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {projectVerification.gaps?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">Gaps</h4>
                            <ul className="mt-2 space-y-2">
                              {projectVerification.gaps.map((gap, i) => (
                                <li key={i} className="text-sm font-medium leading-5 text-amber-700">
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {projectVerification.conflicts?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-700">Conflicts</h4>
                            <ul className="mt-2 space-y-2">
                              {projectVerification.conflicts.map((conflict, i) => (
                                <li key={i} className="text-sm font-medium leading-5 text-red-700">
                                  {conflict}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                {investigation.claimsVerified && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                      <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500 mb-3">Skills Found in CV</h3>
                      {verifiedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {verifiedSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-zinc-500">
                          {claimedSkills.length > 0
                            ? 'No skills were verified from the CV text yet.'
                            : 'No skills were found in the existing investigation result. Run again to refresh skill extraction.'}
                        </p>
                      )}
                    </div>

                    {unverifiedSkills.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber-700 mb-3">Unverified Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {unverifiedSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                              ? {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                    {investigation.redFlags?.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-red-600 mb-3">Red Flags</h3>
                        <ul className="space-y-2">
                          {investigation.redFlags.map((flag, i) => (
                            <li key={i} className="text-sm font-medium text-red-700 flex items-start gap-2">
                              <span className="text-red-500">⚠</span> {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CvEvaluationModal;
