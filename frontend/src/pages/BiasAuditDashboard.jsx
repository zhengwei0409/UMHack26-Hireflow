import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatDate } from '../utils/dateFormat';

const BiasAuditDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('');
  const [candidateStats, setCandidateStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [simThreshold, setSimThreshold] = useState(65);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, snapshotsRes, candidatesRes] = await Promise.all([
        api.biasAudit.getMetrics(jobFilter || null),
        api.biasAudit.getSnapshots(jobFilter || null, 50),
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

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const result = await api.biasAudit.simulateThreshold(simThreshold, jobFilter || null);
      setSimResult(result.data);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const loadAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const result = await api.biasAudit.getAIAnalysis(jobFilter || null);
      setAiAnalysis(result.data);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const getBiasRiskColor = (level) => {
    switch (level) {
      case 'LOW': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
    }
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
            <h1 className="app-page-title text-2xl text-zinc-950 sm:text-3xl">Bias Audit Dashboard</h1>
            <p className="mt-1 text-sm font-medium text-zinc-600">AI-powered bias detection & explainability toolkit</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {['overview', 'demographics', 'intersectionality', 'distribution', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  activeTab === tab ? 'bg-black text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                {tab === 'history' ? 'History Records' : tab}
              </button>
            ))}
          </div>
        </div>

        {metrics && metrics.totalSnapshots > 0 ? (
          <div className="space-y-6">
            {/* Overall Bias Risk Score */}
            <div className={`rounded-[20px] border-2 bg-white p-6 ${getBiasRiskColor(metrics.biasRiskLevel)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Overall Bias Risk Assessment</h2>
                  <p className="mt-1 text-sm text-zinc-600">Composite score based on adverse impact, statistical significance, and flag density</p>
                </div>
                <div className="text-center">
                  <div className={`inline-flex rounded-full px-4 py-2 text-3xl font-extrabold ${getBiasRiskColor(metrics.biasRiskLevel)}`}>
                    {metrics.biasScore}
                  </div>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-500">Risk Score (0-100)</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${getBiasRiskColor(metrics.biasRiskLevel)}`}>
                    {metrics.biasRiskLevel} Risk
                  </span>
                </div>
              </div>
            </div>

            {/* ONE Status Card: Pass Rate */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`rounded-[20px] border-2 p-6 text-center transition-all ${metrics.passRate >= 70 ? 'border-emerald-200 bg-emerald-50' : metrics.passRate >= 50 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50 animate-pulse'}`}>
                <div className="text-5xl mb-2">{metrics.passRate >= 70 ? '✅' : metrics.passRate >= 50 ? '⚠️' : '🚨'}</div>
                <div className={`text-3xl font-extrabold ${metrics.passRate >= 70 ? 'text-emerald-600' : metrics.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {metrics.passRate.toFixed(0)}%
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">Pass Rate</div>
              </div>

              {/* ONE Status Card: Issues */}
              <div className={`rounded-[20px] border-2 p-6 text-center transition-all ${!Object.values(metrics.disparateImpactRatios || {}).some(d => d.isProblematic) ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50 animate-pulse'}`}>
                <div className="text-5xl mb-2">{!Object.values(metrics.disparateImpactRatios || {}).some(d => d.isProblematic) ? '✅' : '⚠️'}</div>
                <div className={`text-3xl font-extrabold ${!Object.values(metrics.disparateImpactRatios || {}).some(d => d.isProblematic) ? 'text-emerald-600' : 'text-red-600'}`}>
                  {Object.values(metrics.disparateImpactRatios || {}).filter(d => d.isProblematic).length}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-1">Issues</div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero: Animated Risk Gauge */}
                <div className="rounded-[20px] border-2 bg-white p-8 text-center" style={{ borderColor: metrics.biasScore < 20 ? '#10b981' : metrics.biasScore < 40 ? '#f59e0b' : metrics.biasScore < 60 ? '#f97316' : '#ef4444' }}>
                  <div className="relative inline-block">
                    <div className="relative h-40 w-80">
                      <svg viewBox="0 0 200 120" className="w-full h-full">
                        {/* Background arc */}
                        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e4e4e7" strokeWidth="12" strokeLinecap="round"/>
                        {/* Risk level zones */}
                        <path d="M 20 100 A 80 80 0 0 1 76 100" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" opacity="0.3"/>
                        <path d="M 76 100 A 80 80 0 0 1 112 100" fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" opacity="0.3"/>
                        <path d="M 112 100 A 80 80 0 0 1 148 100" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round" opacity="0.3"/>
                        <path d="M 148 100 A 80 80 0 0 1 180 100" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" opacity="0.3"/>
                        {/* Animated needle */}
                        <g transform={`rotate(${(metrics.biasScore / 100) * 180 - 90}, 100, 100)`}>
                          <line x1="100" y1="100" x2="100" y2="30" stroke="#000" strokeWidth="3" strokeLinecap="round" className="transition-transform duration-1000"/>
                          <circle cx="100" cy="100" r="6" fill="#000"/>
                        </g>
                      </svg>
                      {/* Score display */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
                        <div className={`text-6xl font-extrabold ${metrics.biasScore < 20 ? 'text-emerald-600' : metrics.biasScore < 40 ? 'text-amber-600' : metrics.biasScore < 60 ? 'text-orange-600' : 'text-red-600'}`}>
                          {metrics.biasScore}
                        </div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${metrics.biasScore < 20 ? 'text-emerald-600' : metrics.biasScore < 40 ? 'text-amber-600' : metrics.biasScore < 60 ? 'text-orange-600' : 'text-red-600'}`}>
                          {metrics.biasRiskLevel} Risk
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Traffic light indicator */}
                  <div className="flex justify-center gap-2 mt-4">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(level => (
                      <div
                        key={level}
                        className={`h-4 w-16 rounded-full transition-all duration-500 ${metrics.biasRiskLevel === level ? 'ring-4 ring-offset-2 ' + (level === 'LOW' ? 'bg-emerald-500 ring-emerald-200' : level === 'MEDIUM' ? 'bg-amber-500 ring-amber-200' : level === 'HIGH' ? 'bg-orange-500 ring-orange-200 animate-pulse' : 'bg-red-500 ring-red-200 animate-pulse') : 'bg-zinc-200'}`}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Minimal: Statistical Significance Dots */}
                {metrics.statisticalSignificance && Object.keys(metrics.statisticalSignificance).length > 0 && (
                  <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                    <div className="flex items-center gap-4 justify-center">
                      {Object.entries(metrics.statisticalSignificance).map(([key, data]) => (
                        <div key={key} className="text-center">
                          <div className={`h-6 w-6 rounded-full mx-auto ${data.isSignificant ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                          <p className="text-xs text-zinc-500 mt-1 capitalize">{key}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Minimal: Bias Grid */}
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
                    {['Female', 'Male', 'Non-binary'].flatMap(gender =>
                      ['western', 'east_asian', 'south_asian', 'middle_eastern', 'latin_american'].map(origin => {
                        const match = metrics.intersectionalityMetrics?.find(m => m.gender === gender && m.nameOrigin === origin);
                        const passRate = match ? match.passRate : 0;
                        return (
                          <div key={`${gender}-${origin}`} className="text-center">
                            <div className={`h-8 w-8 rounded-full mx-auto flex items-center justify-center text-lg transition-transform hover:scale-110 ${passRate >= 80 ? 'bg-emerald-100' : passRate >= 50 ? 'bg-amber-100' : 'bg-red-100 animate-pulse'}`}>
                              {passRate >= 80 ? '✅' : passRate >= 50 ? '⚠️' : '🚨'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-500">
                    <span>✅ Safe</span>
                    <span>⚠️ Watch</span>
                    <span>🚨 Risk</span>
                  </div>
                </div>

                {/* Minimal: Animated Bias Bars */}
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <div className="flex justify-center gap-3">
                    {[
                      { label: 'Uni', impact: 35, bias: false },
                      { label: 'Origin', impact: -28, bias: true },
                      { label: 'Gender', impact: -15, bias: true },
                      { label: 'Exp', impact: 42, bias: false },
                      { label: 'Skills', impact: 38, bias: false },
                    ].map((item, idx) => (
                      <div key={idx} className="text-center w-16">
                        <div className={`h-20 w-8 mx-auto rounded-full overflow-hidden relative ${item.bias ? 'bg-red-100' : 'bg-emerald-100'}`}>
                          <div
                            className={`absolute bottom-0 w-full transition-all duration-1000 ${item.bias ? 'bg-red-400' : 'bg-emerald-400'}`}
                            style={{ height: `${Math.abs(item.impact)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Minimal: Score Bell Curve Simplified */}
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <div className="flex items-end justify-center gap-1 h-24">
                    {[20, 35, 55, 75, 90, 75, 55, 35, 20].map((height, idx) => (
                      <div
                        key={idx}
                        className={`w-6 rounded-t transition-all duration-1000 ${height < 50 ? 'bg-red-300' : 'bg-emerald-400'}`}
                        style={{ height: `${height}%` }}
                      ></div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-xs text-zinc-500">
                    <span>🚨 Risk</span>
                    <span>✅ Safe</span>
                  </div>
                </div>

                {/* MINIMAL: AI One-Liner + 3 Dots */}
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6 text-center">
                  <button
                    onClick={loadAIAnalysis}
                    disabled={aiLoading}
                    className="rounded-full bg-black px-6 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 mb-4"
                  >
                    {aiLoading ? 'Thinking...' : '🤖 Ask AI'}
                  </button>

                  {aiAnalysis && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-700 italic">"{aiAnalysis.explanation}"</p>
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className={`h-3 w-3 rounded-full transition-all duration-500 ${i < (3 - Math.min(aiAnalysis.riskFactors?.length || 0, 3)) ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`}
                          ></div>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {aiAnalysis.recommendations?.[0] || 'Review flagged groups'}
                      </p>
                    </div>
                  )}

                  {!aiAnalysis && !aiLoading && (
                    <p className="text-xs text-zinc-400">Tap for AI verdict</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'demographics' && (
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
                  </div>
                </div>
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Score by Name Origin</h2>
                  <div className="mt-4 space-y-3">
                    {Object.entries(metrics.averageScoreByNameOrigin || {}).map(([origin, score]) => (
                      <div key={origin} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600 capitalize">{origin.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-zinc-100">
                            <div className="h-2 rounded-full bg-black" style={{ width: `${score}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{score.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Score by University Tier</h2>
                  <div className="mt-4 space-y-3">
                    {Object.entries(metrics.averageScoreByUniversityTier || {}).map(([tier, score]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600">Tier {tier}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-zinc-100">
                            <div className="h-2 rounded-full bg-black" style={{ width: `${score}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{score.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Score by Age Group</h2>
                  <div className="mt-4 space-y-3">
                    {Object.entries(metrics.ageBiasMetrics?.averageScoreByAgeGroup || {}).map(([age, score]) => (
                      <div key={age} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-600">{age}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-zinc-100">
                            <div className="h-2 rounded-full bg-black" style={{ width: `${score}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{score.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'intersectionality' && (
              <div className="space-y-6">
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Intersectionality Analysis</h2>
                  <p className="mt-1 text-sm text-zinc-600 mb-4">Examining combined effects of gender and name origin on pass rates</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-200">
                          <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Gender</th>
                          <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Name Origin</th>
                          <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Pass Rate</th>
                          <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Count</th>
                          <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Adverse Impact Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {metrics.intersectionalityMetrics?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="py-3 text-sm font-medium text-zinc-900">{item.gender}</td>
                            <td className="py-3 text-sm font-medium text-zinc-600 capitalize">{item.nameOrigin}</td>
                            <td className="py-3 text-sm font-bold text-zinc-900">{item.passRate.toFixed(1)}%</td>
                            <td className="py-3 text-sm text-zinc-600">{item.count}</td>
                            <td className={`py-3 text-sm font-bold ${item.adverseImpactRatio >= 0.8 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.adverseImpactRatio.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* INNOVATIVE: What-If Simulator */}
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">What-If Simulator</h2>
                  <p className="mt-1 text-sm text-zinc-600 mb-4">Simulate how changing threshold affects bias metrics (threshold = minimum score to PASS)</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">New Threshold</label>
                      <input
                        type="number"
                        value={simThreshold}
                        onChange={(e) => setSimThreshold(Number(e.target.value))}
                        className="ml-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-bold w-20"
                        min="0"
                        max="100"
                      />
                    </div>
                    <button
                      onClick={runSimulation}
                      disabled={simLoading}
                      className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {simLoading ? 'Running...' : 'Run Simulation'}
                    </button>
                  </div>
                  {simResult && (
                    <div className="rounded-lg bg-zinc-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 flex-1 rounded-full ${simResult.changes.passRateChange >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(Math.abs(simResult.changes.passRateChange) * 5, 100)}%` }}
                        ></div>
                        <span className="text-xs font-bold text-zinc-600">
                          {simResult.changes.passRateChange >= 0 ? 'Higher Pass Rate' : 'Lower Pass Rate'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`h-3 flex-1 rounded-full ${simResult.changes.biasScoreChange <= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(Math.abs(simResult.changes.biasScoreChange) * 10, 100)}%` }}
                        ></div>
                        <span className="text-xs font-bold text-zinc-600">
                          {simResult.changes.biasScoreChange <= 0 ? 'Reduced Bias' : 'Increased Bias'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-white p-3 border border-zinc-200">
                        <p className="text-sm text-zinc-700 italic">"{simResult.changes.recommendation}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'distribution' && (
              <div className="space-y-6">
                <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                  <h2 className="app-section-title-sm text-lg text-zinc-950">Demographic Distribution</h2>
                  <div className="mt-4 grid gap-6 lg:grid-cols-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">Gender</h3>
                      {Object.entries(metrics.genderDistribution || {}).map(([gender, count]) => (
                        <div key={gender} className="flex items-center justify-between py-2">
                          <span className="text-sm text-zinc-600">{gender}</span>
                          <span className="text-sm font-bold text-zinc-900">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">Name Origin</h3>
                      {Object.entries(metrics.nameOriginDistribution || {}).map(([origin, count]) => (
                        <div key={origin} className="flex items-center justify-between py-2">
                          <span className="text-sm text-zinc-600 capitalize">{origin}</span>
                          <span className="text-sm font-bold text-zinc-900">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-3">Age Group</h3>
                      {Object.entries(metrics.ageBiasMetrics?.ageDistribution || {}).map(([age, count]) => (
                        <div key={age} className="flex items-center justify-between py-2">
                          <span className="text-sm text-zinc-600">{age}</span>
                          <span className="text-sm font-bold text-zinc-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="rounded-[20px] border border-zinc-200 bg-white p-6">
                <h2 className="app-section-title-sm mb-4 text-lg text-zinc-950">History Records</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Candidate</th>
                        <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Score</th>
                        <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Decision</th>
                        <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Gender</th>
                        <th className="pb-3 text-left text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-500">Origin</th>
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
                          <td className="py-3 text-sm text-zinc-600">{snapshot.inferredGender || 'N/A'}</td>
                          <td className="py-3 text-sm text-zinc-600 capitalize">{snapshot.nameOrigin || 'N/A'}</td>
                          <td className="py-3 text-sm text-zinc-600">{snapshot.triggerType}</td>
                          <td className="py-3 text-sm text-zinc-500">
                            {formatDate(snapshot.createdAt)}
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
            )}
          </div>
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
