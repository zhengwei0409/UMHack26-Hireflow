import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const SkillBadge = ({ skill, status }) => {
  const colors = {
    green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    orange: 'bg-amber-100 text-amber-700 border-amber-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${colors[status]}`}>
      {status === 'green' ? '✓' : status === 'orange' ? '~' : '✗'} {skill}
    </span>
  );
};

const TimelineCard = ({ title, items, type, onVerify }) => {
  const typeColors = {
    education: 'bg-indigo-500',
    experience: 'bg-purple-500',
    projects: 'bg-orange-500',
    papers: 'bg-pink-500',
    skills: 'bg-blue-500',
    languages: 'bg-green-500',
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className={`px-4 py-2 ${typeColors[type] || 'bg-gray-500'} text-white font-semibold text-sm flex items-center justify-between`}>
        <span>{title}</span>
        <span className="text-xs opacity-75">{items?.length || 0}</span>
      </div>
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
        {items?.map((item, i) => (
          <div key={i} className="p-2 rounded bg-zinc-50 border border-zinc-100 text-sm">
            {type === 'education' && (
              <>
                <p className="font-medium text-zinc-900">{item.institution}</p>
                <p className="text-zinc-600">{item.degree} {item.field && `in ${item.field}`}</p>
                <p className="text-xs text-zinc-500">{item.startYear} - {item.endYear} {item.cgpa && `• CGPA: ${item.cgpa}`}</p>
              </>
            )}
            {type === 'experience' && (
              <>
                <p className="font-medium text-zinc-900">{item.title}</p>
                <p className="text-zinc-600">{item.organization}</p>
                <p className="text-xs text-zinc-500">{item.duration}</p>
              </>
            )}
            {type === 'projects' && (
              <>
                <p className="font-medium text-zinc-900">{item.name}</p>
                <p className="text-zinc-600 text-xs">{item.description}</p>
                {item.technologies?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.technologies.map((t, j) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 bg-zinc-100 rounded">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">{item.date}</p>
              </>
            )}
            {type === 'papers' && (
              <>
                <p className="font-medium text-zinc-900">{item.title}</p>
                <p className="text-xs text-zinc-600">{item.venue}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${item.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.status}
                  </span>
                  {item.date && <span className="text-xs text-zinc-500">{item.date}</span>}
                </div>
              </>
            )}
            {type === 'skills' && (
              <div className="flex flex-wrap gap-1">
                {item.items?.map((skill, j) => (
                  <span key={j} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {type === 'languages' && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-900">{item.language}</span>
                <span className="text-xs text-zinc-500">{item.proficiency}</span>
              </div>
            )}
          </div>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-sm text-zinc-400 italic">No {title.toLowerCase()} found</p>
        )}
      </div>
    </div>
  );
};

const EvaluationSection = ({ evaluation }) => {
  const steps = evaluation?.methodology || [];
  
  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="px-4 py-2 bg-zinc-800 text-white font-semibold text-sm">
        Evaluation Methodology
      </div>
      <div className="p-3 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="p-2 rounded bg-zinc-50 border border-zinc-100">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-zinc-500">Step {i + 1}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                step.confidence === 'high' ? 'bg-green-100 text-green-700' : 
                step.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 
                'bg-red-100 text-red-700'
              }`}>
                {step.confidence?.toUpperCase()} confidence
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                step.source === 'cv' ? 'bg-blue-100 text-blue-700' :
                step.source === 'linkedin' ? 'bg-sky-100 text-sky-700' :
                step.source === 'github' ? 'bg-gray-100 text-gray-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {step.source?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-900">{step.step}</p>
            <p className="text-xs text-zinc-600 mt-1">{step.analysis}</p>
            {step.evidence && (
              <p className="text-xs text-zinc-500 mt-1 italic">Evidence: "{step.evidence}"</p>
            )}
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-zinc-400 italic">No evaluation steps available</p>
        )}
      </div>
    </div>
  );
};

const ScrapedDataSection = ({ githubData, linkedinData, profileAnalysis }) => {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <div className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm">
        Scraped Profile Data
      </div>
      <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
        {githubData && (
          <div className="p-3 rounded bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🐙</span>
              <span className="font-semibold text-zinc-900">GitHub</span>
              {githubData.verified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>}
            </div>
            {githubData.bio && <p className="text-sm text-zinc-600 mb-2">{githubData.bio}</p>}
            {githubData.topLanguages?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-zinc-500">Top Languages</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {githubData.topLanguages.map((lang, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded">{lang}</span>
                  ))}
                </div>
              </div>
            )}
            {githubData.repos?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500">Recent Repos</p>
                <div className="space-y-1 mt-1">
                  {githubData.repos.slice(0, 5).map((repo, i) => (
                    <div key={i} className="text-xs p-1 bg-white rounded border">
                      <span className="font-medium">{repo.name}</span>
                      {repo.description && <span className="text-zinc-500"> - {repo.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {linkedinData && (
          <div className="p-3 rounded bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💼</span>
              <span className="font-semibold text-zinc-900">LinkedIn</span>
              {linkedinData.verified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>}
            </div>
            {linkedinData.headline && <p className="text-sm text-zinc-600 mb-2">{linkedinData.headline}</p>}
            {linkedinData.about && <p className="text-xs text-zinc-500 mb-2">{linkedinData.about}</p>}
            {linkedinData.skills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500">Skills</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {linkedinData.skills.map((skill, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-50 rounded text-blue-700">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(!githubData && !linkedinData) && (
          <p className="text-sm text-zinc-400 italic">No scraped data available. Run Deep Investigation to scrape profiles.</p>
        )}

        {profileAnalysis && (
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200">
            <p className="text-sm font-semibold text-emerald-700 mb-2">Profile Analysis</p>
            <p className="text-xs text-zinc-600">{profileAnalysis.summary}</p>
            {profileAnalysis.cvMatchesLinkedIn?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-emerald-600">CV Matches LinkedIn:</p>
                <ul className="text-xs text-zinc-600 mt-1 space-y-1">
                  {profileAnalysis.cvMatchesLinkedIn.map((m, i) => (
                    <li key={i}>✓ {m}</li>
                  ))}
                </ul>
              </div>
            )}
            {profileAnalysis.cvConflictsLinkedIn?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-red-600">Conflicts:</p>
                <ul className="text-xs text-zinc-600 mt-1 space-y-1">
                  {profileAnalysis.cvConflictsLinkedIn.map((c, i) => (
                    <li key={i}>⚠ {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CompleteCVAnalysisView = ({ analysis, links, deepInvestigation }) => {
  const { education, experience, projects, papers, skills, languages, evaluation, rawText } = analysis || {};
  const { githubData, linkedinData, profileAnalysis } = deepInvestigation || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimelineCard title="Education" items={education} type="education" />
        <TimelineCard title="Leadership/Experience" items={experience} type="experience" />
      </div>

      <TimelineCard title="Projects" items={projects} type="projects" />
      
      <TimelineCard title="Papers & Publications" items={papers} type="papers" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimelineCard title="Technical Skills" items={skills} type="skills" />
        <TimelineCard title="Languages" items={languages} type="languages" />
      </div>

      {evaluation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EvaluationSection evaluation={evaluation} />
          <ScrapedDataSection 
            githubData={githubData} 
            linkedinData={linkedinData} 
            profileAnalysis={profileAnalysis}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-4 py-2 bg-zinc-800 text-white font-semibold text-sm flex items-center justify-between">
          <span>Links</span>
          <span className="text-xs opacity-75">{links?.length || 0}</span>
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {links?.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 font-medium"
            >
              <span>{link.platform === 'github' ? '🐙' : link.platform === 'linkedin' ? '💼' : '🔗'}</span>
              {link.label || link.platform}
            </a>
          ))}
          {(!links || links.length === 0) && (
            <p className="text-sm text-zinc-400 italic">No links detected</p>
          )}
        </div>
      </div>

      {evaluation?.overallScore !== undefined && (
        <div className="bg-white rounded-lg border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-zinc-900">Overall Score</span>
            <span className={`text-lg font-bold ${
              evaluation.overallScore >= 70 ? 'text-green-600' :
              evaluation.overallScore >= 40 ? 'text-amber-600' :
              'text-red-600'
            }`}>
              {evaluation.overallScore}/100
            </span>
          </div>
          <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                evaluation.overallScore >= 70 ? 'bg-green-500' :
                evaluation.overallScore >= 40 ? 'bg-amber-500' :
                'bg-red-500'
              }`} 
              style={{ width: `${evaluation.overallScore}%` }}
            />
          </div>
          {evaluation.recommendation && (
            <p className="text-sm mt-2">
              Recommendation: <span className={`font-semibold ${
                evaluation.recommendation === 'ACCEPT' ? 'text-green-600' :
                evaluation.recommendation === 'REVIEW' ? 'text-amber-600' :
                'text-red-600'
              }`}>{evaluation.recommendation}</span>
            </p>
          )}
          {evaluation.rationale && (
            <p className="text-xs text-zinc-500 mt-1">{evaluation.rationale}</p>
          )}
        </div>
      )}
    </div>
  );
};

const InDepthCVAnalysisModal = ({ candidateId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [cvText, setCvText] = useState('');
  const [cvLoading, setCvLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [extractedLinks, setExtractedLinks] = useState([]);
  const [activeTab, setActiveTab] = useState('cv');
  const [runningInvestigation, setRunningInvestigation] = useState(false);
  const [runningDeepInvestigation, setRunningDeepInvestigation] = useState(false);
  const [deepInvestigationResult, setDeepInvestigationResult] = useState(null);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [telegramLink, setTelegramLink] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (isOpen && candidateId) loadData();
  }, [isOpen, candidateId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [candidateRes, investigationRes] = await Promise.allSettled([
        api.candidates.get(candidateId),
        api.investigation.getResult(candidateId),
      ]);

      if (candidateRes.status === 'fulfilled') {
        setCandidate(candidateRes.value.data);
        setAnalysis(candidateRes.value.data.glmAnalysis);
      }
      if (investigationRes.status === 'fulfilled') {
        setInvestigation(investigationRes.value.data);
      }

      loadCvText();
    } catch (err) {
      console.error('Failed to load analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCvText = async () => {
    setCvLoading(true);
    try {
      const [textRes, highlightsRes] = await Promise.all([
        api.cv.getText(candidateId),
        api.cv.getHighlights(candidateId),
      ]);

      if (textRes.success) {
        setCvText(textRes.data.text);
      }
      if (highlightsRes.success) {
        const data = highlightsRes.data;
        if (data.education || data.projects || data.skills) {
          setAnalysis(data);
        } else {
          setAnalysis(data);
          setHighlights(data.highlightedSegments || data.highlights || []);
        }
        setExtractedLinks(data.links || []);
        if (data.deepInvestigation) {
          setDeepInvestigationResult(data.deepInvestigation);
        }
      }
    } catch (err) {
      console.error('Failed to load CV data:', err);
    } finally {
      setCvLoading(false);
    }
  };

  const runInvestigation = async () => {
    setRunningInvestigation(true);
    try {
      const res = await api.investigation.run(candidateId);
      setInvestigation(res.data);
    } catch (err) {
      console.error('Investigation failed:', err);
    } finally {
      setRunningInvestigation(false);
    }
  };

const runDeepInvestigation = async () => {
    setRunningDeepInvestigation(true);
    try {
      const res = await api.cv.runDeepInvestigation(candidateId);
      setDeepInvestigationResult(res.data);
    } catch (err) {
      console.error('Deep investigation failed:', err);
    } finally {
      setRunningDeepInvestigation(false);
    }
  };

  const sendToTelegram = async () => {
    if (!candidate?.telegramChatId) {
      alert('Candidate has not connected Telegram yet');
      return;
    }
    setSendingTelegram(true);
    try {
      await api.telegram.sendAnalysis(candidateId, analysis);
      setTelegramSent(true);
    } catch (err) {
      console.error('Failed to send to Telegram:', err);
      alert('Failed to send to Telegram. Please try again.');
    } finally {
      setSendingTelegram(false);
    }
  };

  const generateTelegramLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.telegram.getLink(candidateId);
      console.log('Link response:', res);
      if (res.success && res.data?.link) {
        setTelegramLink(res.data.link);
      } else {
        alert('Failed to generate link: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to generate link:', err);
      alert('Failed to generate link. Please try again.');
    } finally {
      setGeneratingLink(false);
    }
  };

  const skillAnalysis = useMemo(() => {
    if (highlights && highlights.length > 0) {
      return highlights
        .filter(h => h.type === 'skill')
        .map(h => ({
          skill: h.text,
          status: h.relevance === 'high' ? 'green' : h.relevance === 'medium' ? 'orange' : 'red',
          meaning: h.context || (h.matchedRequirement ? 'Matches job requirement' : 'Additional skill'),
        }));
    }

    return [];
  }, [highlights]);

  const evaluationSteps = useMemo(() => {
    if (!analysis) return [];
    const greenCount = skillAnalysis.filter(s => s.status === 'green').length;
    const totalSkills = skillAnalysis.length || 1;
    return [
      { title: 'Document Parsing', description: 'CV structure and readability analyzed', status: 'pass', score: 85 },
      { title: 'Skill Match', description: `${greenCount}/${totalSkills} skills match job requirements`, status: greenCount > totalSkills / 2 ? 'pass' : 'fail', score: analysis.score },
      { title: 'Experience Relevance', description: analysis.summary || 'Experience evaluated', status: analysis.score >= 60 ? 'pass' : 'fail', score: analysis.score },
      { title: 'Red Flag Detection', description: investigation?.redFlags?.length ? `${investigation.redFlags.length} flags detected` : 'No critical issues found', status: investigation?.redFlags?.length ? 'fail' : 'pass', score: 100 - (investigation?.redFlags?.length || 0) * 20 },
      { title: 'Overall Recommendation', description: `AI recommends: ${analysis.recommendation}`, status: analysis.recommendation === 'ACCEPT' ? 'pass' : analysis.recommendation === 'REJECT' ? 'fail' : 'partial', score: analysis.score },
    ];
  }, [analysis, skillAnalysis, investigation]);

  if (!isOpen) return null;

  const handleClose = () => {
    try {
      onClose();
    } catch (e) {
      console.error('Close error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onClick={handleClose}>
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-zinc-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-zinc-950">In-Depth CV Analysis</h2>
              <p className="mt-1 text-sm font-medium text-zinc-600">{candidate?.fullName}</p>
            </div>
            <button onClick={onClose} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex gap-2 border-b border-zinc-200">
            {['analysis', 'cv', 'social'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-semibold capitalize transition ${activeTab === tab ? 'border-b-2 border-black text-black' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {tab === 'analysis' ? 'AI Evaluation' : tab === 'cv' ? 'CV Highlights' : 'Social Verification'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-black" />
              <p className="mt-4 text-sm font-medium text-zinc-500">Loading analysis...</p>
            </div>
          ) : (
            <>
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {analysis?.evaluation ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className={`rounded-2xl border p-4 ${analysis.evaluation.recommendation === 'ACCEPT' ? 'border-emerald-300 bg-emerald-50' : analysis.evaluation.recommendation === 'REJECT' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Recommendation</p>
                          <p className={`mt-1 text-2xl font-extrabold ${analysis.evaluation.recommendation === 'ACCEPT' ? 'text-emerald-700' : analysis.evaluation.recommendation === 'REJECT' ? 'text-red-700' : 'text-amber-700'}`}>{analysis.evaluation.recommendation || 'REVIEW'}</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Overall Score</p>
                          <p className={`mt-1 text-2xl font-extrabold ${analysis.evaluation.overallScore >= 70 ? 'text-emerald-700' : analysis.evaluation.overallScore >= 40 ? 'text-amber-700' : 'text-red-700'}`}>{analysis.evaluation.overallScore || 0}/100</p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Links Found</p>
                          <p className="mt-1 text-2xl font-extrabold text-zinc-950">{(analysis.links || []).length}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 p-5">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Evaluation Methodology</h3>
                        <div className="mt-4 space-y-2">
                          {(analysis.evaluation.methodology || []).map((step, i) => (
                            <div key={i} className="flex gap-4 p-2 rounded bg-zinc-50">
                              <div className="flex flex-col items-center">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step.confidence === 'high' ? 'bg-emerald-500 text-white' : step.confidence === 'medium' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-bold text-zinc-900">{step.step}</h4>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${step.confidence === 'high' ? 'bg-green-100 text-green-700' : step.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                    {step.confidence}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                    {step.source}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-600">{step.analysis}</p>
                                {step.evidence && <p className="text-xs text-zinc-500 mt-1 italic">"{step.evidence}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                          <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600">Strengths</h3>
                          <ul className="mt-3 space-y-2">
                            {(analysis.evaluation.strengths || []).map((s, i) => <li key={i} className="flex items-start gap-2 text-sm font-medium text-emerald-700"><span className="text-emerald-500">✓</span> {s}</li>)}
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                          <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-600">Areas to Address</h3>
                          <ul className="mt-3 space-y-2">
                            {(analysis.evaluation.weaknesses || []).map((w, i) => <li key={i} className="flex items-start gap-2 text-sm font-medium text-red-700"><span className="text-red-500">•</span> {w}</li>)}
                          </ul>
                        </div>
                      </div>

                      {analysis.evaluation.rationale && (
                        <div className="rounded-2xl border border-zinc-200 p-5">
                          <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Rationale</h3>
                          <p className="mt-2 text-sm text-zinc-700">{analysis.evaluation.rationale}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <p>No evaluation data available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cv' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-zinc-500">Skills Found</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillAnalysis.map((item, i) => (
                        <SkillBadge key={i} skill={item.skill} status={item.status} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 p-5">
                    <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-zinc-500">Skill Categories</h3>
                    {(analysis?.skills || []).map((cat, i) => (
                      <div key={i} className="mb-3">
                        <p className="text-xs font-semibold text-zinc-500 mb-1">{cat.category}</p>
                        <div className="flex flex-wrap gap-1">
                          {(cat.items || []).map((item, j) => (
                            <span key={j} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-zinc-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Applicant CV with Highlights</h3>
                      <div className="flex gap-2">
                        <a
                          href={`http://localhost:3001/api/v1/candidates/${candidateId}/cv`}
                          target="_blank"
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Download CV
                        </a>
                      </div>
                    </div>

                    {cvLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-zinc-900" />
                        <span className="ml-2 text-sm text-zinc-500">Loading CV...</span>
                      </div>
                    ) : (
                      <>
                        {extractedLinks.length > 0 && (
                          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-700 mb-2">Extracted Links</p>
                            <div className="flex flex-wrap gap-2">
                              {extractedLinks.map((link, i) => (
                                <a
                                  key={i}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs px-2 py-1 rounded bg-white border border-blue-200 text-blue-600 hover:bg-blue-100"
                                >
                                  {link.label || link.platform} →
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mb-4 flex flex-wrap gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-emerald-300" />
                            High Relevance
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-amber-300" />
                            Medium Relevance
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded bg-zinc-300" />
                            Low Relevance
                          </span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6">
                          <CompleteCVAnalysisView 
                            analysis={analysis} 
                            links={extractedLinks}
                            deepInvestigation={deepInvestigationResult}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Social Profile Investigation</h3>
                    <div className="flex gap-2">
                      <button onClick={runInvestigation} disabled={runningInvestigation} className="inline-flex items-center gap-2 rounded-md bg-zinc-700 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">
                        {runningInvestigation ? 'Verifying...' : 'Verify Social Profiles'}
                      </button>
                      <button onClick={runDeepInvestigation} disabled={runningDeepInvestigation} className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50">
                        {runningDeepInvestigation ? 'Scraping...' : 'Deep Investigation'}
                      </button>
                    </div>
                  </div>

                  {deepInvestigationResult && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-blue-300 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-2xl">🐙</span>
                          <div>
                            <h3 className="text-lg font-bold text-zinc-900 leading-tight">GitHub & LinkedIn</h3>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Verified Profile Analysis</p>
                          </div>
                        </div>
                        
                        <div className="space-y-6">
                          {deepInvestigationResult.profileAnalysis?.summary && (
                            <div className="text-sm text-zinc-700 leading-relaxed">
                              {deepInvestigationResult.profileAnalysis.summary}
                            </div>
                          )}

                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-3">CV Matches LinkedIn:</h4>
                              <ul className="space-y-2">
                                {(deepInvestigationResult.profileAnalysis?.cvMatchesLinkedIn || []).map((match, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm font-medium text-emerald-700">
                                    <span className="text-emerald-500 shrink-0">✓</span>
                                    {match}
                                  </li>
                                ))}
                                {(!deepInvestigationResult.profileAnalysis?.cvMatchesLinkedIn || deepInvestigationResult.profileAnalysis.cvMatchesLinkedIn.length === 0) && (
                                  <li className="text-sm text-zinc-400 italic">No specific matches identified</li>
                                )}
                              </ul>
                            </div>

                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-3">Conflicts:</h4>
                              <ul className="space-y-2">
                                {(deepInvestigationResult.profileAnalysis?.cvConflictsLinkedIn || []).map((conflict, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm font-medium text-amber-700">
                                    <span className="text-amber-500 shrink-0">⚠</span>
                                    {conflict}
                                  </li>
                                ))}
                                {(!deepInvestigationResult.profileAnalysis?.cvConflictsLinkedIn || deepInvestigationResult.profileAnalysis.cvConflictsLinkedIn.length === 0) && (
                                  <li className="text-sm text-emerald-600 font-medium">✓ No conflicts identified</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                         <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Social Evidence Found:</p>
                         <div className="flex flex-wrap gap-2">
                            {deepInvestigationResult.links?.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                              >
                                {link.platform === 'github' && <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>}
                                {link.platform === 'linkedin' && <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764 0-.974.784-1.768 1.75-1.768 1.066 0 1.75.794 1.75 1.768 0 .974-.684 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>}
                                {link.label}
                              </a>
                            ))}
                         </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">GitHub Profile</p>
                          <p className="text-sm text-zinc-500">{investigation?.githubData?.username || 'Not provided'}</p>
                        </div>
                      </div>
                      {investigation?.githubData?.exists ? (
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-zinc-600">Public Repos:</span><span className="font-semibold">{investigation.githubData.publicRepos}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-600">Followers:</span><span className="font-semibold">{investigation.githubData.followers}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-600">Verified:</span><span className={`font-semibold ${investigation.githubData.verified ? 'text-emerald-600' : 'text-zinc-600'}`}>{investigation.githubData.verified ? 'Yes' : 'No'}</span></div>
                          {investigation.githubData.topLanguages?.length > 0 && (
                            <div>
                              <p className="text-zinc-600">Top Languages:</p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {investigation.githubData.topLanguages.map((lang, i) => <span key={i} className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{lang}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-500">No GitHub profile found</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-zinc-200 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764 0-.974.784-1.768 1.75-1.768 1.066 0 1.75.794 1.75 1.768 0 .974-.684 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">LinkedIn Profile</p>
                          <p className="text-sm text-zinc-500">{investigation?.linkedinData?.company || 'Not provided'}</p>
                        </div>
                      </div>
                      {investigation?.linkedinData?.exists ? (
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-zinc-600">Headline:</span><span className="font-semibold">{investigation.linkedinData.headline || 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-600">Company:</span><span className="font-semibold">{investigation.linkedinData.company || 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-zinc-600">Connections:</span><span className="font-semibold">{investigation.linkedinData.connections || 'N/A'}</span></div>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-500">No LinkedIn profile found</p>
                      )}
                    </div>
                  </div>

                  {investigation?.githubData?.pinnedRepos?.length > 0 && (
                    <div className="rounded-2xl border border-zinc-200 p-5">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Notable Projects</h3>
                      <ul className="mt-3 space-y-2">
                        {investigation.githubData.pinnedRepos.map((repo, i) => <li key={i} className="text-sm text-zinc-700">{repo}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InDepthCVAnalysisModal;