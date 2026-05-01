// Owner: AI/ML Engineer
// LLM integration with deterministic fallbacks so the MVP still runs without external keys.

import fs from 'fs';
import path from 'path';

const GLM_API_BASE = process.env.GLM_API_BASE || 'https://api.ilmu.ai/v1';
const GLM_API_KEY = process.env.GLM_API_KEY;

export interface GLMAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'ACCEPT' | 'REJECT';
  summary: string;
}

export interface OfferLetter {
  subject: string;
  body: string;
}

export interface InterviewQuestionDraft {
  type: 'DSA' | 'MCQ' | 'BEHAVIORAL';
  prompt: string;
  choices?: string[];
  metadata?: Record<string, unknown>;
}

export interface InterviewAnswerScore {
  score: number;
  reasoning: string;
  strengths: string[];
  risks: string[];
  evaluator: 'GLM' | 'FALLBACK';
}

export interface JobDraftData {
  title: string;
  department: string;
  description: string;
  requirements: string[];
  location: string;
  closingDate: string;
  autoScreenThreshold: number;
  shortlistSize: number;
}

export interface JobDraftConversationResult {
  status: 'NEEDS_INFO' | 'READY';
  reply: string;
  missingFields: string[];
  job?: JobDraftData;
  evaluator: 'GLM';
}

interface GLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CVHighlight {
  text: string;
  type: 'skill' | 'experience' | 'education' | 'project' | 'certification' | 'achievement' | 'tool' | 'other';
  relevance: 'high' | 'medium' | 'low';
  context: string;
  matchedRequirement: string;
}

export interface HighlightSegment {
  text: string;
  type: 'skill' | 'experience' | 'education' | 'project' | 'certification' | 'achievement' | 'tool' | 'other';
  relevance: 'high' | 'medium' | 'low';
  context: string;
  matchedRequirement: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field?: string;
  cgpa?: string;
  startYear?: string;
  endYear?: string;
  description?: string;
}

export interface ExperienceEntry {
  title: string;
  organization: string;
  duration: string;
  description: string;
  type: 'leadership' | 'work' | 'internship';
}

export interface ProjectEntry {
  name: string;
  date: string;
  description: string;
  technologies: string[];
  outcome?: string;
  role?: string;
}

export interface PaperEntry {
  title: string;
  status: string;
  venue: string;
  date?: string;
  description?: string;
}

export interface SkillEntry {
  category: string;
  items: string[];
  proficiency?: string;
  relevance?: 'high' | 'medium' | 'low';
  matchedRequirement?: string;
}

export interface ProjectEntry {
  name: string;
  date: string;
  description: string;
  technologies: string[];
  outcome?: string;
  role?: string;
  relevance?: 'high' | 'medium' | 'low';
  matchedRequirement?: string;
}

export interface LanguageEntry {
  language: string;
  proficiency: string;
}

export interface EvaluationStep {
  step: string;
  analysis: string;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'cv' | 'linkedin' | 'github' | 'combined';
}

export interface EvaluationSection {
  methodology: EvaluationStep[];
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'ACCEPT' | 'REVIEW' | 'REJECT';
  rationale: string;
}

export interface CompleteCVAnalysis {
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  papers: PaperEntry[];
  skills: SkillEntry[];
  languages: LanguageEntry[];
  evaluation: EvaluationSection;
  links: ExtractedLink[];
  rawText: string;
}

export interface ExtractedLink {
  url: string;
  platform: 'github' | 'linkedin' | 'portfolio' | 'leetcode' | 'medium' | 'twitter' | 'other';
  label: string;
}

export interface CvAnalysis {
  fullText: string;
  highlightedSegments: HighlightSegment[];
  highlights: CVHighlight[];
  links: ExtractedLink[];
  skillMatches: { skill: string; matched: boolean; requirement: string }[];
  summary: string;
}

async function llmExtractCompleteAnalysis(
  cvText: string,
  jobRequirements: string[]
): Promise<CompleteCVAnalysis> {
  const requirementsStr = jobRequirements.join(', ');

  const prompt = `You are an expert HR analyst. Analyze this CV comprehensively.

Return JSON with COMPLETE data - include ALL sections from the CV:

{
  "education": [
    {"institution": "full name", "degree": "exact degree name", "field": "field of study", "cgpa": "GPA value", "startYear": "year", "endYear": "year or Expected", "description": "any additional details"}
  ],
  "experience": [
    {"title": "exact role title", "organization": "company/org name", "duration": "Sep 2024 - Present", "description": "what they did", "type": "leadership|work|internship"}
  ],
  "projects": [
    {"name": "project name", "date": "month year", "description": "what it does", "technologies": ["tech1", "tech2"], "outcome": "results achieved", "role": "your role if mentioned"}
  ],
  "papers": [
    {"title": "exact paper title", "status": "Published|Under Review|Submitted", "venue": "journal/conference name", "date": "month year", "description": "brief description"}
  ],
"skills": [
    {"category": "Data Science", "items": ["skill1", "skill2"], "proficiency": "if mentioned", "relevance": "high|medium|low"}
  ],
  "projects": [
    {"name": "project name", "date": "month year", "description": "what it does", "technologies": ["tech1", "tech2"], "outcome": "results achieved", "role": "your role if mentioned", "relevance": "high|medium|low", "matchedRequirement": "job requirement it matches"}
  ],
  "languages": [
    {"language": "language name", "proficiency": "Native|Basic|Professional Working"}
  ],
  "evaluation": {
    "methodology": [
      {"step": "Step 1: Education Analysis", "analysis": "What was analyzed and why", "evidence": "Exact text from CV referencing this", "confidence": "high|medium|low", "source": "cv|linkedin|github|combined"},
      {"step": "Step 2: Skills Verification", "analysis": "How skills were verified", "evidence": "CV text location", "confidence": "high|medium|low", "source": "cv|linkedin|github|combined"},
      {"step": "Step 3: Project Experience", "analysis": "What was evaluated", "evidence": "CV text", "confidence": "high|medium|low", "source": "cv"},
      {"step": "Step 4: Research/Papers", "analysis": "Research experience verified", "evidence": "CV text", "confidence": "high|medium|low", "source": "cv"},
      {"step": "Step 5: Leadership Potential", "analysis": "Leadership roles assessed", "evidence": "CV text", "confidence": "high|medium|low", "source": "cv"}
    ],
    "overallScore": 0-100,
    "strengths": ["top 5 strengths with evidence from CV"],
    "weaknesses": ["gaps or areas needing clarification"],
    "recommendation": "ACCEPT|REVIEW|REJECT",
    "rationale": "2-3 sentence explanation of recommendation"
  },
  "links": [
    {"url": "complete URL", "platform": "github|linkedin|leetcode", "label": "descriptive label"}
  ],
  "rawText": "FULL VERBATIM CV TEXT - copy everything exactly as written"
}

CRITICAL REQUIREMENTS:
1. rawText: Copy ENTIRE CV text - every word, every number, every punctuation mark
2. education: List ALL institutions, degrees, CGPA
3. projects: Include EVERY project with full description and technologies used
4. skills: Categorize ALL skills mentioned (programming, frameworks, tools)
5. evaluation: Each step must reference SPECIFIC evidence text from CV
6. Confidence based on: high=cv text explicit, medium=implied, low=assumed

CV Text:
${cvText}

Job Requirements:
${requirementsStr}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
    const parsed = response ? extractJsonFromResponse(response) : null;
    console.log('[CV ANALYSIS] LLM Response:', JSON.stringify(parsed).slice(0, 500));

    if (parsed) {
      return {
        education: parsed.education || [],
        experience: parsed.experience || [],
        projects: parsed.projects || [],
        papers: parsed.papers || [],
        skills: parsed.skills || [],
        languages: parsed.languages || [],
        evaluation: parsed.evaluation || {
          methodology: [],
          overallScore: 0,
          strengths: [],
          weaknesses: [],
          recommendation: 'REVIEW',
          rationale: 'Incomplete analysis'
        },
        links: parsed.links || [],
        rawText: parsed.rawText || cvText,
      };
    }
  } catch (error) {
    console.error('LLM complete analysis error:', error);
  }

  console.log('[CV ANALYSIS] LLM failed, using fallback');
  return parseCvFallback(cvText);
}

function parseCvFallback(cvText: string): CompleteCVAnalysis {
  const links: ExtractedLink[] = [];
  
  const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)/gi;
  let match;
  while ((match = githubRegex.exec(cvText)) !== null) {
    links.push({ url: `https://github.com/${match[1]}`, platform: 'github', label: `${match[1]}'s GitHub` });
  }
  
  const linkedinRegex = /(?:linkedin\.com\/in\/|www\.linkedin\.com\/in\/)([a-zA-Z0-9_-]+)/gi;
  while ((match = linkedinRegex.exec(cvText)) !== null) {
    links.push({ url: `https://www.linkedin.com/in/${match[1]}`, platform: 'linkedin', label: `${match[1]}'s LinkedIn` });
  }

  return {
    education: [],
    experience: [],
    projects: [],
    papers: [],
    skills: [],
    languages: [],
    evaluation: {
      methodology: [
        {
          step: 'Text Extraction',
          analysis: 'Extracted raw text from CV document',
          evidence: 'CV file parsed successfully',
          confidence: 'high',
          source: 'cv'
        }
      ],
      overallScore: 50,
      strengths: ['Content extracted'],
      weaknesses: ['Insufficient structured data'],
      recommendation: 'REVIEW',
      rationale: 'Manual review required'
    },
    links,
    rawText: cvText,
  };
}

export async function extractCompleteCVAnalysis(
  cvText: string,
  jobRequirements: unknown[]
): Promise<CompleteCVAnalysis> {
  const stringRequirements = (jobRequirements || []).map(String);
  return llmExtractCompleteAnalysis(cvText, stringRequirements);
}

function fallbackExtractHighlights(cvText: string, jobRequirements: string[]): {
  fullText: string;
  highlightedSegments: HighlightSegment[];
  links: ExtractedLink[];
  summary: string;
} {
  const links: ExtractedLink[] = [];
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urlMatches = cvText.match(urlRegex) || [];

  const platformPatterns: Record<string, ExtractedLink['platform']> = {
    github: 'github',
    linkedin: 'linkedin',
    leetcode: 'leetcode',
    medium: 'medium',
    twitter: 'twitter',
  };

  for (const url of [...new Set(urlMatches)]) {
    let platform: ExtractedLink['platform'] = 'other';
    let label = url;

    for (const [pattern, plat] of Object.entries(platformPatterns)) {
      if (url.toLowerCase().includes(pattern)) {
        platform = plat;
        label = `${plat.charAt(0).toUpperCase() + plat.slice(1)} Profile`;
        break;
      }
    }

    links.push({ url, platform, label });
  }

  const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9_-]+)/gi;
  let linkedinMatch: RegExpExecArray | null;
  while ((linkedinMatch = linkedinRegex.exec(cvText)) !== null) {
    const username = linkedinMatch[1];
    if (username) {
      const cleanUrl = `https://www.linkedin.com/in/${username}`;
      if (!links.find(l => l.url.includes(username))) {
        links.push({ url: cleanUrl, platform: 'linkedin', label: 'LinkedIn Profile' });
      }
    }
  }

  const highlightedSegments: HighlightSegment[] = [];
  const cvTextLower = cvText.toLowerCase();
  const requirementsLower = jobRequirements.map(r => r.toLowerCase());

  for (const req of requirementsLower) {
    const reqWords = req.split(/\s+/).filter(w => w.length > 3);
    for (const word of reqWords) {
      if (cvTextLower.includes(word)) {
        const idx = cvTextLower.indexOf(word);
        const start = Math.max(0, idx - 30);
        const end = Math.min(cvText.length, idx + word.length + 30);
        highlightedSegments.push({
          text: cvText.slice(start, end),
          type: 'skill',
          relevance: 'high',
          context: `Found "${word}" in CV`,
          matchedRequirement: req,
        });
        break;
      }
    }
  }

  return {
    fullText: cvText,
    highlightedSegments: highlightedSegments.slice(0, 20),
    links,
    summary: highlightedSegments.length > 0
      ? `Found ${highlightedSegments.length} relevant sections matching job requirements.`
      : 'Partial match with job requirements.',
  };
}

export async function extractCvHighlights(
  cvText: string,
  jobRequirements: unknown[]
): Promise<CvAnalysis> {
  const stringRequirements: string[] = (jobRequirements || []).map(String);
  const completeAnalysis = await llmExtractCompleteAnalysis(cvText, stringRequirements);

  if (completeAnalysis.education.length > 0 || completeAnalysis.projects.length > 0 || completeAnalysis.skills.length > 0) {
    const allSkills = completeAnalysis.skills.flatMap(s => s.items);
    const skillMatches = stringRequirements.map(req => ({
      skill: req,
      matched: allSkills.some(s => s.toLowerCase().includes(req.toLowerCase())),
      requirement: req,
    }));

    return {
      fullText: completeAnalysis.rawText,
      highlightedSegments: [],
      highlights: [],
      links: completeAnalysis.links,
      skillMatches,
      summary: completeAnalysis.evaluation.rationale,
    };
  }

  const fallback = fallbackExtractHighlights(cvText, stringRequirements);

  return {
    fullText: fallback.fullText,
    highlightedSegments: fallback.highlightedSegments,
    highlights: fallback.highlightedSegments,
    links: fallback.links,
skillMatches: [],
    summary: fallback.summary,
  };
}

export function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

export function extractJsonFromResponse(text: string): any {
  const jsonMatch =
    text.match(/```json\n([\s\S]*?)\n```/) ||
    text.match(/```\n([\s\S]*?)\n```/) ||
    text.match(/\{[\s\S]*\}/) ||
    text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

function normalizeJobDraft(raw: any): JobDraftData | null {
  if (!raw || typeof raw !== 'object') return null;

  const requirements = Array.isArray(raw.requirements)
    ? raw.requirements.filter((item: unknown) => typeof item === 'string' && item.trim()).map((item: string) => item.trim())
    : [];

  const draft = {
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    department: typeof raw.department === 'string' ? raw.department.trim() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    requirements,
    location: typeof raw.location === 'string' ? raw.location.trim() : '',
    closingDate: typeof raw.closingDate === 'string' ? raw.closingDate.trim() : '',
    autoScreenThreshold: clampScore(Number(raw.autoScreenThreshold ?? 60)),
    shortlistSize: Math.min(50, Math.max(1, Math.round(Number(raw.shortlistSize ?? 10)))),
  };

  if (!draft.title || !draft.department || !draft.description || !draft.location || !draft.closingDate || draft.requirements.length === 0) {
    return null;
  }

  if (Number.isNaN(new Date(draft.closingDate).getTime())) {
    return null;
  }

  return draft;
}

export async function callLLM(messages: GLMMessage[], temperature = 0.5): Promise<string | null> {
  if (!GLM_API_KEY) {
    return null;
  }

  const response = await fetch(`${GLM_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? null;
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractTextFromDOCX(filePath: string): Promise<string> {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function loadTextFromCv(cvFilePath: string): Promise<string> {
  const ext = path.extname(cvFilePath).toLowerCase();
  if (ext === '.pdf') {
    return extractTextFromPDF(cvFilePath);
  }
  if (ext === '.docx') {
    return extractTextFromDOCX(cvFilePath);
  }
  return fs.readFileSync(cvFilePath, 'utf-8');
}

export { loadTextFromCv };

function fallbackCvAnalysis(cvText: string, jobDescription: string): GLMAnalysis {
  const jobWords = Array.from(new Set(normalizeWords(jobDescription)));
  const cvWords = new Set(normalizeWords(cvText));
  const matchedWords = jobWords.filter((word) => cvWords.has(word));
  const overlapRatio = jobWords.length > 0 ? matchedWords.length / jobWords.length : 0.5;
  const score = clampScore(35 + overlapRatio * 55 + Math.min(cvText.length / 1000, 10));

  const strengths = matchedWords.slice(0, 5).map((word) => `Mentions relevant skill or concept: ${word}`);
  const missingWords = jobWords.filter((word) => !cvWords.has(word)).slice(0, 4);
  const weaknesses = missingWords.map((word) => `No clear evidence for requirement: ${word}`);

  return {
    score,
    strengths: strengths.length > 0 ? strengths : ['General alignment with the role was detected.'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Few obvious gaps were detected from the CV text alone.'],
    recommendation: score >= 60 ? 'ACCEPT' : 'REJECT',
    summary:
      score >= 60
        ? 'The CV appears to cover a useful portion of the job requirements and should continue to the next screening step.'
        : 'The CV shows partial overlap with the job requirements, but important skill signals are still weak or missing.',
  };
}

export async function parseCV(cvFilePath: string, jobDescription: string): Promise<GLMAnalysis> {
  const cvText = await loadTextFromCv(cvFilePath);

  const prompt = `You are an HR analyst evaluating a candidate's CV for a software role.
Job Description:
${jobDescription}

Candidate CV:
${cvText}

Return JSON only with this exact structure:
{
  "score": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendation": "ACCEPT" or "REJECT",
  "summary": "string"
}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.2);
    const parsed = response ? extractJsonFromResponse(response) : null;

    if (parsed && typeof parsed.score === 'number') {
      return {
        score: clampScore(parsed.score),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        recommendation: parsed.recommendation === 'REJECT' ? 'REJECT' : 'ACCEPT',
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      };
    }
  } catch (error) {
    console.error('LLM parseCV error, falling back to heuristic analysis:', error);
  }

  return fallbackCvAnalysis(cvText, jobDescription);
}

export async function generateOfferLetter(
  candidateInfo: { fullName: string; email: string },
  jobInfo: { title: string; department: string; location: string; salary?: string }
): Promise<OfferLetter> {
  const prompt = `Generate a professional job offer letter and return JSON only:
{
  "subject": "string",
  "body": "string"
}

Candidate: ${candidateInfo.fullName}
Position: ${jobInfo.title}
Department: ${jobInfo.department}
Location: ${jobInfo.location}
${jobInfo.salary ? `Salary: ${jobInfo.salary}` : ''}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.4);
    const parsed = response ? extractJsonFromResponse(response) : null;
    if (parsed?.subject && parsed?.body) {
      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    }
  } catch (error) {
    console.error('LLM generateOfferLetter error, using fallback:', error);
  }

  return {
    subject: `Offer Letter - ${jobInfo.title}`,
    body: `We are pleased to offer you the ${jobInfo.title} role in ${jobInfo.department} based in ${jobInfo.location}. Please reply to this email and our HR team will coordinate the next steps.`,
  };
}

export async function draftJobFromConversation(messages: GLMMessage[]): Promise<JobDraftConversationResult> {
  const transcript = messages
    .filter((message) => message.content?.trim())
    .map((message) => `${message.role.toUpperCase()}: ${message.content.trim()}`)
    .join('\n');

  const prompt = `You are an HR job intake assistant inside an internal dashboard.
Your job is to collect enough information to create a job record.

Required fields:
- title
- department
- description
- requirements as an array of strings
- location
- closingDate in YYYY-MM-DD format

Optional fields:
- autoScreenThreshold number from 0 to 100, default 60
- shortlistSize number from 1 to 50, default 10

Rules:
- If required fields are missing or unclear, ask one short follow-up question.
- If enough information is present, return structured data ready for the create job endpoint.
- If HR says to "help", "generate the rest", or similar, infer a practical description and requirements from the available details instead of asking for label formatting.
- If HR asks you to think of a title or description, generate it from the conversation instead of asking for that same field.
- Treat casual natural language as valid input. Do not require "Title:" or other labels.
- You are responsible for the decision. Do not wait for perfect wording if the job can be reasonably inferred.
- Do not use marketing copy.
- Keep descriptions practical and candidate-facing.

Return JSON only in one of these shapes:
{
  "status": "NEEDS_INFO",
  "reply": "short question for HR",
  "missingFields": ["title"]
}

or

{
  "status": "READY",
  "reply": "I have enough information to create the job.",
  "missingFields": [],
  "job": {
    "title": "string",
    "department": "string",
    "description": "string",
    "requirements": ["string"],
    "location": "string",
    "closingDate": "2026-05-15",
    "autoScreenThreshold": 60,
    "shortlistSize": 10
  }
}

Conversation:
${transcript || 'No messages yet.'}`;

  const response = await callLLM([{ role: 'user', content: prompt }], 0.2);
  if (!response) {
    throw new Error('GLM_UNAVAILABLE');
  }

  const parsed = extractJsonFromResponse(response);

  if (parsed?.status === 'READY') {
    const job = normalizeJobDraft(parsed.job);
    if (job) {
      return {
        status: 'READY',
        reply: typeof parsed.reply === 'string' ? parsed.reply : 'I have enough information to create the job.',
        missingFields: [],
        job,
        evaluator: 'GLM',
      };
    }

    throw new Error('GLM_INVALID_JOB_DRAFT');
  }

  if (parsed?.status === 'NEEDS_INFO') {
    return {
      status: 'NEEDS_INFO',
      reply: typeof parsed.reply === 'string' ? parsed.reply : 'Please provide more job details.',
      missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.filter(Boolean).map(String) : [],
      evaluator: 'GLM',
    };
  }

  throw new Error('GLM_INVALID_RESPONSE');
}

function fallbackInterviewQuestions(jobTitle: string, requirements: string[], seniorityHint: string): InterviewQuestionDraft[] {
  const focusArea = requirements[0] || 'data structures and algorithms';
  const seniority = seniorityHint.toLowerCase().includes('senior') ? 'senior' : 'junior';

  return [
    {
      type: 'DSA',
      prompt: `Build a function that returns the first non-repeating character in a string for a ${jobTitle} role. Explain the time and space complexity in a short note.`,
      metadata: { difficulty: seniority === 'senior' ? 'medium' : 'easy', focusArea },
    },
    {
      type: 'DSA',
      prompt: `Given an array of integers, return the length of the longest strictly increasing contiguous subarray. Write code and mention how you would test it.`,
      metadata: { difficulty: 'medium', focusArea: 'arrays' },
    },
    {
      type: 'MCQ',
      prompt: 'What is the average-case time complexity of hash table lookup?',
      choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      metadata: { category: 'data structures' },
    },
    {
      type: 'MCQ',
      prompt: 'Which SQL clause is typically used to filter grouped results?',
      choices: ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'],
      metadata: { category: 'databases' },
    },
    {
      type: 'MCQ',
      prompt: 'Which operating system concept allows many programs to appear to run at the same time on one CPU?',
      choices: ['Paging', 'Context switching', 'Deadlock', 'Caching'],
      metadata: { category: 'operating systems' },
    },
    {
      type: 'BEHAVIORAL',
      prompt: `Tell us about a time you had to learn an unfamiliar technical area quickly. What was the situation, what did you do, and what changed because of your work?`,
      metadata: { framework: 'STAR' },
    },
    {
      type: 'BEHAVIORAL',
      prompt: `Describe a time you disagreed with a teammate on an implementation approach. How did you handle the conflict and what was the outcome?`,
      metadata: { framework: 'STAR' },
    },
  ];
}

export async function generateInterviewQuestions(input: {
  jobTitle: string;
  jobDescription: string;
  requirements: string[];
  cvSummary?: string;
}): Promise<InterviewQuestionDraft[]> {
  const seniorityHint = `${input.jobTitle} ${input.cvSummary ?? ''}`;
  const fallback = fallbackInterviewQuestions(input.jobTitle, input.requirements, seniorityHint);

  const prompt = `Generate an interview pack for a software candidate. Return JSON only as an array of 7 objects with keys:
type ("DSA" | "MCQ" | "BEHAVIORAL"), prompt, choices (for MCQ only), metadata.

Requirements:
- 2 DSA questions
- 3 MCQ questions
- 2 behavioral questions
- DSA should be solvable in 10-15 minutes each
- Questions should align to this job:
Title: ${input.jobTitle}
Description: ${input.jobDescription}
Requirements: ${input.requirements.join(', ')}
CV summary: ${input.cvSummary ?? 'N/A'}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.4);
    const parsed = response ? extractJsonFromResponse(response) : null;
    if (Array.isArray(parsed) && parsed.length >= 5) {
      return parsed
        .filter((item) => item && typeof item.prompt === 'string' && typeof item.type === 'string')
        .map((item) => ({
          type: item.type,
          prompt: item.prompt,
          choices: Array.isArray(item.choices) ? item.choices : undefined,
          metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : undefined,
        })) as InterviewQuestionDraft[];
    }
  } catch (error) {
    console.error('LLM generateInterviewQuestions error, using fallback:', error);
  }

  return fallback;
}

function fallbackBehavioralScore(answer: string): InterviewAnswerScore {
  const normalized = answer.toLowerCase();
  const starSignals = ['situation', 'task', 'action', 'result'].filter((signal) => normalized.includes(signal));
  const score = clampScore(
    30 +
      Math.min(answer.trim().length / 8, 35) +
      starSignals.length * 7 +
      (normalized.includes('learn') || normalized.includes('improve') ? 8 : 0),
  );

  return {
    score,
    reasoning:
      score >= 70
        ? 'The answer is reasonably specific, includes actions taken, and shows signs of reflection or measurable outcome.'
        : 'The answer is still high level. It would be stronger with clearer ownership, trade-offs, and concrete results.',
    strengths: starSignals.length > 0 ? [`Includes STAR-like structure with signals: ${starSignals.join(', ')}`] : ['Some relevant experience is described.'],
    risks: score >= 70 ? ['Could still use more measurable outcome detail.'] : ['Needs more concrete actions and outcomes to evaluate real ownership.'],
    evaluator: 'FALLBACK',
  };
}

function fallbackInterviewAnswerScore(input: {
  type: 'DSA' | 'MCQ' | 'BEHAVIORAL';
  answerText?: string;
  selectedOption?: string;
  codeSubmission?: string;
}): InterviewAnswerScore {
  if (input.type === 'DSA') {
    const codeLength = input.codeSubmission?.trim().length ?? 0;
    const hasCodeStructure = /\b(function|def|class|return|for|while|if|const|let|public|static)\b/i.test(input.codeSubmission ?? '');
    const score = clampScore((codeLength >= 40 ? 45 : 15) + (hasCodeStructure ? 25 : 0));
    return {
      score,
      reasoning: 'Fallback scoring estimated code quality from submitted code structure because GLM was unavailable.',
      strengths: hasCodeStructure ? ['Submission contains recognizable programming structure.'] : [],
      risks: ['Fallback did not execute or deeply reason about correctness. Configure GLM for agentic evaluation.'],
      evaluator: 'FALLBACK',
    };
  }

  if (input.type === 'MCQ') {
    const answered = !!input.selectedOption;
    return {
      score: answered ? 50 : 0,
      reasoning: answered
        ? 'Fallback gave neutral credit for an answered MCQ because GLM was unavailable and no answer key was used.'
        : 'No MCQ option was selected.',
      strengths: answered ? ['Candidate selected an option.'] : [],
      risks: ['Fallback did not use an expected answer. Configure GLM for reasoning-based MCQ evaluation.'],
      evaluator: 'FALLBACK',
    };
  }

  return fallbackBehavioralScore(input.answerText ?? '');
}

export async function scoreInterviewAnswer(input: {
  jobTitle: string;
  type: 'DSA' | 'MCQ' | 'BEHAVIORAL';
  question: string;
  answerText?: string;
  selectedOption?: string;
  choices?: unknown;
  codeSubmission?: string;
  programmingLanguage?: string;
}): Promise<InterviewAnswerScore> {
  const prompt = `You are a GLM interview evaluator agent. Score this candidate answer for a software interview.
Return JSON only:
{
  "score": number,
  "reasoning": "string",
  "strengths": ["string"],
  "risks": ["string"]
}

Scoring rules:
- Score must be 0 to 100.
- For DSA, evaluate correctness, algorithmic thinking, edge cases, complexity, and code clarity from the candidate response.
- For MCQ, infer the best answer from the question and choices, then evaluate the selected option. Do not rely on a provided answer key.
- For BEHAVIORAL, evaluate STAR structure, ownership, impact, clarity, and role relevance.

Job title: ${input.jobTitle}
Question type: ${input.type}
Question: ${input.question}
Choices: ${JSON.stringify(input.choices ?? null)}
Selected option: ${input.selectedOption ?? 'N/A'}
Written answer: ${input.answerText ?? 'N/A'}
Programming language: ${input.programmingLanguage ?? 'N/A'}
Code submission: ${input.codeSubmission ?? 'N/A'}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.2);
    const parsed = response ? extractJsonFromResponse(response) : null;
    if (parsed && typeof parsed.score === 'number') {
      return {
        score: clampScore(parsed.score),
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        evaluator: 'GLM',
      };
    }
  } catch (error) {
    console.error('LLM scoreInterviewAnswer error, using fallback:', error);
  }

  return fallbackInterviewAnswerScore(input);
}

