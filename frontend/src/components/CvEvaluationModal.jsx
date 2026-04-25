import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CvEvaluationModal = ({ candidateId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [investigation, setInvestigation] = useState(null);
  const [activeTab, setActiveTab] = useState('investigation');

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
    } catch (err) {
      console.error('Investigation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-6 shadow-xl sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950">AI Analysis</h2>
            <p className="mt-1 text-sm font-medium text-zinc-600">Comprehensive evaluation of the candidate</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-zinc-200">
          {['investigation', 'skills'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-black text-black'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab === 'investigation' ? 'Investigation' : 'Skills Verification'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-sm font-medium text-zinc-500">Loading verification...</p>
          </div>
        ) : (
          <>
            {activeTab === 'investigation' && (
              <div className="space-y-6">
                {!investigation ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-500 mb-4">Run background investigation to verify candidate claims</p>
                    <button
                      onClick={runInvestigation}
                      className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      Run Investigation
                    </button>
                  </div>
                ) : (
                  <>
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
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc.500 mb-3">LinkedIn Profile</h3>
                        {investigation.linkedinData?.exists ? (
                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-emerald-700 flex items-center gap-2">
                              <span className="text-emerald-500">✓</span> Verified
                            </p>
                            <p className="text-zinc-600">Company: {investigation.linkedinData.company || 'N/A'}</p>
                            <p className="text-zinc-600">Connections: {investigation.linkedinData.connections || 'N/A'}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 flex items-center gap-2">
                            <span className="text-red-500">✗</span> Not found
                          </p>
                        )}
                      </div>
                    </div>

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

            {activeTab === 'skills' && (
              <div className="space-y-6">
                {investigation?.claimsVerified ? (
                  <>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                      <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-500 mb-3">Verified Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {investigation.claimsVerified.verifiedSkills.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {investigation.claimsVerified.unverifiedSkills.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-amber-700 mb-3">Unverified Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {investigation.claimsVerified.unverifiedSkills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                              ? {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    Run investigation to verify skills
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CvEvaluationModal;
