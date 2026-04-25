import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { callLLM, loadTextFromCv } from './glm.service';
import { extractJsonFromResponse } from './glm.service';
import { crawlUrl as crawlUrlFn } from './crawl4ai.service';
import fs from 'fs';
import path from 'path';

const CRAWL4AI_API_URL = process.env.CRAWL4AI_API_URL || 'http://localhost:11235';
const ENABLE_LINKEDIN_CRAWL = process.env.ENABLE_LINKEDIN_CRAWL === 'true';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubHeaders = () => ({
  Accept: 'application/vnd.github.v3+json',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
});

export interface InvestigationResult {
  githubVerified: boolean;
  linkedinVerified: boolean;
  githubData: GitHubData | null;
  linkedinData: LinkedinData | null;
  claimsVerified: ClaimsVerification;
  projectVerification?: ProjectVerification;
  redFlags: string[];
  overallScore: number;
  recommendation: 'ACCEPT' | 'REVIEW' | 'REJECT';
}

export interface GitHubData {
  username: string | null;
  exists: boolean;
  publicRepos: number;
  followers: number;
  following: number;
  bio: string | null;
  recentActivity: string[];
  contributions: number;
  topLanguages: string[];
  pinnedRepos: string[];
  verified: boolean;
}

export interface LinkedinData {
  profileUrl: string | null;
  exists: boolean;
  headline: string | null;
  company: string | null;
  education: string | null;
  connections: number | null;
  skills: string[];
  about: string | null;
}

export interface ClaimsVerification {
  claimedSkills: string[];
  verifiedSkills: string[];
  unverifiedSkills: string[];
  skillEvidence: Record<string, string[]>;
}

export interface ProjectVerification {
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  matches: Array<{
    resumeProject: string;
    githubRepo: string;
    evidence: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  gaps: string[];
  conflicts: string[];
}

export interface ExtractedLink {
  url: string;
  platform: 'github' | 'linkedin' | 'portfolio' | 'leetcode' | 'medium' | 'twitter' | 'other';
  label: string;
}

export interface DeepInvestigationResult {
  links: ExtractedLink[];
  githubData: GitHubProfileData | null;
  linkedinData: LinkedInProfileData | null;
  profileAnalysis: ProfileAnalysis;
}

export interface GitHubProfileData {
  username: string;
  bio: string;
  topLanguages: string[];
  repos: { name: string; description: string; language: string; stars: number }[];
  recentActivity: string[];
  contributions: number;
  verified: boolean;
}

export interface LinkedInProfileData {
  username: string;
  headline: string;
  about: string;
  experience: { title: string; company: string; duration: string }[];
  education: { institution: string; degree: string; field: string }[];
  skills: string[];
  verified: boolean;
}

export interface ProfileAnalysis {
  summary: string;
  cvMatchesLinkedIn: string[];
  cvConflictsLinkedIn: string[];
  cvMatchesGitHub: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface SocialLinks {
  githubUrl?: string;
  linkedinUrl?: string;
}

export interface GitHubData {
  username: string | null;
  exists: boolean;
  publicRepos: number;
  followers: number;
  following: number;
  bio: string | null;
  recentActivity: string[];
  contributions: number;
  topLanguages: string[];
  pinnedRepos: string[];
  verified: boolean;
  repoDetails?: Array<{ name: string; languages: string[]; frameworks: string[]; description: string }>;
}
export interface LinkedinData {
  profileUrl: string | null;
  exists: boolean;
  headline: string | null;
  company: string | null;
  education: string | null;
  connections: number | null;
  skills: string[];
  about: string | null;
}

export interface ClaimsVerification {
  claimedSkills: string[];
  verifiedSkills: string[];
  unverifiedSkills: string[];
  skillEvidence: Record<string, string[]>;
}

interface SocialLinks {
  githubUrl?: string;
  linkedinUrl?: string;
}

function extractGitHubUsername(url: string): string | null {
  const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractLinkedinUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function fetchGitHubProfile(username: string): Promise<GitHubData> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      return {
        username,
        exists: false,
        publicRepos: 0,
        followers: 0,
        following: 0,
        bio: null,
        recentActivity: [],
        contributions: 0,
        topLanguages: [],
        pinnedRepos: [],
        verified: false,
      };
    }

    const data = await response.json() as {
      public_repos: number;
      followers: number;
      following: number;
      bio: string | null;
      login: string;
      site_admin: boolean;
    };

    return {
      username,
      exists: true,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following,
      bio: data.bio,
      recentActivity: [],
      contributions: 0,
      topLanguages: [],
      pinnedRepos: [],
      verified: data.site_admin,
    };
  } catch {
    return {
      username,
      exists: false,
      publicRepos: 0,
      followers: 0,
      following: 0,
      bio: null,
      recentActivity: [],
      contributions: 0,
      topLanguages: [],
      pinnedRepos: [],
      verified: false,
    };
  }
}

async function fetchGitHubRepos(username: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`, {
      headers: githubHeaders(),
    });

    if (!response.ok) return [];

    const repos = await response.json() as Array<{ name: string; language: string | null; description: string | null }>;
    return repos.map(r => `${r.name}${r.language ? ` (${r.language})` : ''}: ${r.description || 'No description'}`);
  } catch {
    return [];
  }
}

async function fetchLinkedinProfile(username: string): Promise<LinkedinData> {
  const profileUrl = `https://www.linkedin.com/in/${username}`;

  if (!ENABLE_LINKEDIN_CRAWL) {
    return {
      profileUrl,
      exists: true,
      headline: null,
      company: null,
      education: null,
      connections: null,
      skills: [],
      about: null,
    };
  }

  try {
    const content = await crawlUrlFn(profileUrl);

    if (!content) {
      return {
        profileUrl,
        exists: true,
        headline: null,
        company: null,
        education: null,
        connections: null,
        skills: [],
        about: null,
      };
    }

    const prompt = `Extract LinkedIn profile information from this scraped content. Return JSON only:
{
  "headline": "string or null",
  "company": "string or null", 
  "education": "string or null",
  "connections": number or null,
  "skills": ["string"],
  "about": "string or null"
}

Content:
${content.slice(0, 5000)}`;

    const llmResponse = await callLLM([{ role: 'user', content: prompt }], 0.3);
    const parsed = llmResponse ? extractJsonFromResponse(llmResponse) : null;

    return {
      profileUrl,
      exists: true,
      headline: parsed?.headline || null,
      company: parsed?.company || null,
      education: parsed?.education || null,
      connections: typeof parsed?.connections === 'number' ? parsed.connections : null,
      skills: Array.isArray(parsed?.skills) ? parsed.skills : [],
      about: parsed?.about || null,
    };
  } catch {
    return {
      profileUrl,
      exists: true,
      headline: null,
      company: null,
      education: null,
      connections: null,
      skills: [],
      about: null,
    };
  }
}

async function analyzeGitHubWithCrawl(username: string): Promise<Partial<GitHubData>> {
  const profileUrl = `https://github.com/${username}`;
  
  try {
    const content = await crawlUrlFn(profileUrl);
    
    if (!content) return {};
    
    const prompt = `Analyze this GitHub profile and extract:
{
  "topLanguages": ["string"],
  "pinnedRepos": [{"name": "string", "description": "string", "language": "string", "stars": number}],
  "contributions": number,
  "bio": "string or null",
  "allRepos": [{"name": "string", "language": "string", "description": "string"}]
}

Profile content:
${content.slice(0, 8000)}`;
    
    const llmResponse = await callLLM([{ role: 'user', content: prompt }], 0.3);
    const parsed = llmResponse ? extractJsonFromResponse(llmResponse) : null;
    
    // Now crawl individual repos to get more details about languages and frameworks used
    const repoDetails: Array<{name: string, languages: string[], frameworks: string[], description: string}> = [];
    
    if (parsed?.pinnedRepos && Array.isArray(parsed.pinnedRepos)) {
      for (const repo of parsed.pinnedRepos.slice(0, 3)) {  // Limit to 3 repos to avoid timeout
        try {
          const repoUrl = `https://github.com/${username}/${repo.name}`;
          const repoContent = await crawlUrlFn(repoUrl);
          
          if (repoContent) {
            const repoPrompt = `Analyze this GitHub repo page and extract:
{
  "languages": ["string"],
  "frameworks": ["string"],
  "tools": ["string"],
  "description": "string"
}

Repo content:
${repoContent.slice(0, 5000)}`;
            
            const repoResponse = await callLLM([{ role: 'user', content: repoPrompt }], 0.2);
            const repoParsed = repoResponse ? extractJsonFromResponse(repoResponse) : null;
            
            if (repoParsed) {
              repoDetails.push({
                name: repo.name,
                languages: repoParsed.languages || [],
                frameworks: repoParsed.frameworks || [],
                description: repoParsed.description || repo.description || '',
              });
            }
          }
        } catch (err) {
          console.error(`Failed to crawl repo ${repo.name}:`, err);
        }
      }
    }
    
    return {
      topLanguages: Array.isArray(parsed?.topLanguages) ? parsed.topLanguages : [],
      pinnedRepos: Array.isArray(parsed?.pinnedRepos) ? parsed.pinnedRepos : [],
      contributions: typeof parsed?.contributions === 'number' ? parsed.contributions : 0,
      bio: parsed?.bio || null,
      repoDetails: repoDetails,  // This will contain hidden skills from repos
    };
  } catch {
    return {};
  }
}

async function loadCvText(cvFilePath: string): Promise<string> {
  if (!cvFilePath) return '';

  try {
    const ext = path.extname(cvFilePath).toLowerCase();
    if (ext === '.pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const dataBuffer = fs.readFileSync(cvFilePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    }
    if (ext === '.docx') {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ path: cvFilePath });
      return result.value;
    }
    return fs.readFileSync(cvFilePath, 'utf-8');
  } catch {
    return '';
  }
}

const SKILL_PATTERNS: Record<string, string[]> = {
  javascript: ['javascript', 'js', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  python: ['python', 'py'],
  java: ['java'],
  react: ['react', 'reactjs', 'react.js'],
  nodejs: ['node', 'node.js', 'nodejs'],
  'node.js': ['node', 'node.js', 'nodejs'],
  express: ['express', 'express.js', 'expressjs'],
  'express.js': ['express', 'express.js', 'expressjs'],
  mongodb: ['mongodb', 'mongo db'],
  mongoose: ['mongoose'],
  sql: ['sql', 'mysql', 'postgresql', 'postgres'],
  mysql: ['mysql'],
  jdbc: ['jdbc'],
  aws: ['aws', 'amazon web services', 'ec2', 's3'],
  docker: ['docker', 'container'],
  kubernetes: ['kubernetes', 'k8s'],
  git: ['git', 'github', 'gitlab'],
  github: ['github'],
  'rest api': ['rest api', 'restful api', 'restful apis'],
  'mern stack': ['mern', 'mern stack'],
  firebase: ['firebase'],
  'google maps api': ['google maps api', 'maps api'],
  'places api': ['places api'],
  'chart.js': ['chart.js', 'chartjs'],
  'java swing': ['java swing', 'swing'],
  'machine learning': ['machine learning', 'ml', 'deep learning', 'ai'],
  'data analysis': ['data analysis', 'analytics', 'pandas', 'numpy'],
  html: ['html'],
  css: ['css'],
  tailwind: ['tailwind', 'tailwind css'],
};

const normalizeSkillText = (value: string) => ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
const compactSkillText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
const COMPACT_MATCH_PATTERNS = new Set([
  'jdbc',
  'mysql',
  'mongodb',
  'mongoose',
  'mern',
  'restapi',
  'restfulapi',
  'expressjs',
  'nodejs',
  'chartjs',
  'googlemapsapi',
  'placesapi',
]);

function hasSkillPattern(text: string, pattern: string) {
  const normalizedPattern = normalizeSkillText(pattern).trim();
  if (normalizeSkillText(text).includes(` ${normalizedPattern} `)) return true;

  const compactPattern = compactSkillText(pattern);
  return COMPACT_MATCH_PATTERNS.has(compactPattern) && compactSkillText(text).includes(compactPattern);
}

function analyzeSkills(cvText: string, claimedSkills: string[]): ClaimsVerification {
  const verifiedSkills: string[] = [];
  const unverifiedSkills: string[] = [];
  const skillEvidence: Record<string, string[]> = {};

  for (const skill of claimedSkills) {
    const normalizedSkill = skill.toLowerCase();
    const patterns = SKILL_PATTERNS[normalizedSkill] || [normalizedSkill];

    let found = false;
    const evidence: string[] = [];

    for (const pattern of patterns) {
      if (hasSkillPattern(cvText, pattern)) {
        found = true;
        evidence.push(`Found "${pattern}" in CV`);
      }
    }

    if (found) {
      verifiedSkills.push(skill);
      skillEvidence[skill] = evidence;
    } else {
      unverifiedSkills.push(skill);
      skillEvidence[skill] = [];
    }
  }

  return { claimedSkills, verifiedSkills, unverifiedSkills, skillEvidence };
}

function collectTextValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectTextValues);
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(collectTextValues);
}

function extractKnownSkillsFromText(text: string): string[] {
  return Object.entries(SKILL_PATTERNS)
    .filter(([, patterns]) => patterns.some((pattern) => hasSkillPattern(text, pattern)))
    .map(([skill]) => skill);
}

function formatSkillName(skill: string) {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    nodejs: 'Node.js',
    'node.js': 'Node.js',
    express: 'Express.js',
    'express.js': 'Express.js',
    mongodb: 'MongoDB',
    mysql: 'MySQL',
    aws: 'AWS',
    jdbc: 'JDBC',
    'rest api': 'REST API',
    'mern stack': 'MERN Stack',
    'google maps api': 'Google Maps API',
    'places api': 'Places API',
    'chart.js': 'Chart.js',
    'java swing': 'Java Swing',
    html: 'HTML',
    css: 'CSS',
  };

  return displayNames[skill] || skill.replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractClaimedSkills(glmAnalysis: unknown, cvText: string): string[] {
  const skills = (glmAnalysis as { skills?: unknown })?.skills;
  const claimedSkills = Array.isArray(skills) ? skills.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];

    const items = (entry as { items?: unknown })?.items;
    if (Array.isArray(items)) {
      return items.filter((item): item is string => typeof item === 'string');
    }

    return [];
  }) : [];

  const analysis = glmAnalysis as {
    summary?: unknown;
    strengths?: unknown;
    skills?: unknown;
    projects?: unknown;
    skillMatches?: unknown;
  };
  const analysisText = [
    collectTextValues(analysis.summary),
    collectTextValues(analysis.strengths),
    collectTextValues(analysis.skills),
    collectTextValues(analysis.projects),
    collectTextValues(analysis.skillMatches),
  ].flat().join(' ');
  const fallbackSkills = extractKnownSkillsFromText(`${analysisText} ${cvText}`).map(formatSkillName);

  return [...new Set([...claimedSkills, ...fallbackSkills].map((skill) => skill.trim()).filter(Boolean))];
}

type ResumeProject = {
  name: string;
  description: string;
  technologies: string[];
};

type GitHubRepoEvidence = {
  name: string;
  description: string;
  languages: string[];
  frameworks: string[];
};

type GitHubRepoSummary = {
  name: string;
  language: string | null;
  description: string | null;
};

const normalizeMatchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

function extractResumeProjects(glmAnalysis: unknown): ResumeProject[] {
  const projects = (glmAnalysis as { projects?: unknown })?.projects;
  if (!Array.isArray(projects)) return [];

  return projects
    .map((project) => {
      if (!project || typeof project !== 'object') return null;
      const item = project as {
        name?: unknown;
        description?: unknown;
        technologies?: unknown;
      };

      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;

      return {
        name,
        description: typeof item.description === 'string' ? item.description : '',
        technologies: Array.isArray(item.technologies)
          ? item.technologies.filter((tech): tech is string => typeof tech === 'string')
          : [],
      };
    })
    .filter((project): project is ResumeProject => Boolean(project));
}

function extractResumeProjectsFromCvText(cvText: string): ResumeProject[] {
  const projectsSection = cvText.match(/projects\s*([\s\S]*?)(experience|extracurricular|education|skills|$)/i)?.[1];
  if (!projectsSection) return [];

  const projectNames = [...projectsSection.matchAll(/(?:^|\n)\s*([^|\n]{3,80})\|/g)]
    .map((match) => match[1].replace(/[•\n\r]/g, ' ').trim())
    .filter(Boolean);

  return [...new Set(projectNames)].map((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextProjectPattern = projectNames
      .filter((projectName) => projectName !== name)
      .map((projectName) => projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const descriptionMatch = projectsSection.match(
      new RegExp(`${escapedName}[\\s\\S]*?(?=${nextProjectPattern ? `\\n\\s*(?:${nextProjectPattern})\\|` : '$'}|$)`, 'i')
    );
    const description = descriptionMatch?.[0]?.replace(/\s+/g, ' ').trim() || '';
    const technologies = [
      'React',
      'Node.js',
      'Express.js',
      'MongoDB',
      'Mongoose',
      'Gemini',
      'Chart.js',
      'Java',
      'Firebase',
      'Google Maps API',
      'Places API',
      'Java Swing',
      'MySQL',
      'JDBC',
      'SQL',
    ].filter((tech) => description.toLowerCase().includes(tech.toLowerCase()));

    return { name, description, technologies };
  });
}

async function fetchGitHubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: githubHeaders(),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function fetchRepoDependencyEvidence(username: string, repoName: string): Promise<string[]> {
  const files = [
    'package.json',
    'frontend/package.json',
    'backend/package.json',
    'client/package.json',
    'server/package.json',
    'README.md',
  ];
  const evidence = new Set<string>();

  for (const file of files) {
    const data = await fetchGitHubJson<{ content?: string; encoding?: string }>(
      `https://api.github.com/repos/${username}/${repoName}/contents/${file}`
    );
    if (!data?.content || data.encoding !== 'base64') continue;

    const text = Buffer.from(data.content, 'base64').toString('utf-8').toLowerCase();
    [
      'react',
      'node',
      'express',
      'mongodb',
      'mongoose',
      'chart.js',
      'gemini',
      'firebase',
      'mysql',
      'jdbc',
      'java swing',
    ].forEach((keyword) => {
      if (text.includes(keyword)) evidence.add(keyword);
    });
  }

  return [...evidence];
}

async function fetchGitHubRepoEvidence(username: string): Promise<GitHubRepoEvidence[]> {
  const repos = await fetchGitHubJson<GitHubRepoSummary[]>(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=50`
  );
  if (!repos) return [];

  return Promise.all(
    repos.map(async (repo) => {
      const languages = repo.language ? [repo.language] : [];
      const frameworks = await fetchRepoDependencyEvidence(username, repo.name);
      return {
        name: repo.name,
        description: repo.description || '',
        languages,
        frameworks,
      };
    })
  );
}

function normalizeGitHubRepoEvidence(githubData: GitHubData | null): GitHubRepoEvidence[] {
  if (!githubData?.exists) return [];

  const reposFromDetails = (githubData.repoDetails || []).map((repo) => ({
    name: repo.name,
    description: repo.description || '',
    languages: repo.languages || [],
    frameworks: repo.frameworks || [],
  }));

  const reposFromActivity = (githubData.recentActivity || []).map((repoText) => {
    const [namePart, descriptionPart = ''] = repoText.split(':');
    const languageMatch = namePart.match(/\(([^)]+)\)/);
    return {
      name: namePart.replace(/\s*\([^)]+\)/, '').trim(),
      description: descriptionPart.trim(),
      languages: languageMatch ? [languageMatch[1]] : [],
      frameworks: [],
    };
  });

  const reposByName = new Map<string, GitHubRepoEvidence>();
  [...reposFromDetails, ...reposFromActivity].forEach((repo) => {
    if (repo.name) reposByName.set(repo.name.toLowerCase(), repo);
  });

  return [...reposByName.values()];
}

function buildDeterministicProjectVerification(
  resumeProjects: ResumeProject[],
  githubRepos: GitHubRepoEvidence[]
): ProjectVerification {
  const matches: ProjectVerification['matches'] = [];
  const gaps: string[] = [];
  const usedRepos = new Set<string>();

  for (const project of resumeProjects) {
    const projectKey = normalizeMatchText(project.name);
    const repo = githubRepos.find((candidateRepo) => {
      const repoKey = normalizeMatchText(candidateRepo.name);
      return repoKey === projectKey || repoKey.includes(projectKey) || projectKey.includes(repoKey);
    });

    if (repo) {
      usedRepos.add(repo.name);
      const sharedTech = project.technologies.filter((tech) => {
        const techKey = normalizeMatchText(tech);
        return [...repo.languages, ...repo.frameworks, repo.description].some((value) =>
          normalizeMatchText(value).includes(techKey)
        );
      });

      matches.push({
        resumeProject: project.name,
        githubRepo: repo.name,
        evidence: sharedTech.length > 0
          ? `Repository name matches the resume project and shares ${sharedTech.join(', ')} evidence.`
          : 'Repository name closely matches the resume project. Dependency evidence was not fetched or not visible from the available GitHub data.',
        confidence: sharedTech.length > 0 ? 'high' : 'medium',
      });
    } else {
      gaps.push(`${project.name} has no clear matching public GitHub repository.`);
    }
  }

  const confidence = matches.length === resumeProjects.length
    ? 'high'
    : matches.length > 0
      ? 'medium'
      : 'low';

  return {
    summary: matches.length > 0
      ? `${matches.length}/${resumeProjects.length} resume project(s) have a clear GitHub repository name match.`
      : 'No resume projects have a clear GitHub repository name match.',
    confidence,
    matches,
    gaps,
    conflicts: [],
  };
}

async function analyzeProjectVerification(
  glmAnalysis: unknown,
  githubData: GitHubData | null,
  cvText: string
): Promise<ProjectVerification> {
  const resumeProjects = extractResumeProjects(glmAnalysis);
  const fallbackProjects = resumeProjects.length > 0 ? resumeProjects : extractResumeProjectsFromCvText(cvText);
  const githubRepos = normalizeGitHubRepoEvidence(githubData);

  if (fallbackProjects.length === 0) {
    return {
      summary: 'No resume projects were available for GitHub matching.',
      confidence: 'low',
      matches: [],
      gaps: [],
      conflicts: [],
    };
  }

  if (githubRepos.length === 0) {
    return {
      summary: 'No GitHub repositories were available for project matching.',
      confidence: 'low',
      matches: [],
      gaps: fallbackProjects.map((project) => `${project.name} was listed in the resume but no GitHub repository evidence was available.`),
      conflicts: [],
    };
  }

  const deterministicResult = buildDeterministicProjectVerification(fallbackProjects, githubRepos);

  const prompt = `Compare resume projects against GitHub repository evidence.

Return JSON only:
{
  "summary": "2 sentence hiring-focused analysis",
  "confidence": "high|medium|low",
  "matches": [
    {
      "resumeProject": "project name from resume",
      "githubRepo": "matching GitHub repo name",
      "evidence": "why they match, based on name, description, languages, or frameworks",
      "confidence": "high|medium|low"
    }
  ],
  "gaps": ["resume project that has weak or no GitHub evidence"],
  "conflicts": ["specific mismatch or suspicious difference"]
}

Rules:
- Match by project name, purpose, technologies, and repository description.
- Do not invent repositories or claims.
- A weak name-only match should be medium or low confidence.
- Missing framework evidence in GitHub metadata is a gap, not a conflict.
- Only report a conflict when GitHub evidence directly contradicts the resume.
- Do not say the resume overstates the tech stack just because package/framework evidence is unavailable.
- If no project matches, say that clearly in summary.

Resume projects:
${JSON.stringify(fallbackProjects).slice(0, 6000)}

GitHub repositories:
${JSON.stringify(githubRepos).slice(0, 6000)}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0);
    const parsed = response ? extractJsonFromResponse(response) : null;
    const llmMatches = Array.isArray(parsed?.matches)
      ? parsed.matches
          .map((match: unknown) => {
            const item = match as {
              resumeProject?: unknown;
              githubRepo?: unknown;
              evidence?: unknown;
              confidence?: unknown;
            };
            return {
              resumeProject: typeof item.resumeProject === 'string' ? item.resumeProject : '',
              githubRepo: typeof item.githubRepo === 'string' ? item.githubRepo : '',
              evidence: typeof item.evidence === 'string' ? item.evidence : '',
              confidence: ['high', 'medium', 'low'].includes(item.confidence as string)
                ? item.confidence as 'high' | 'medium' | 'low'
                : 'low',
            };
          })
          .filter((match: ProjectVerification['matches'][number]) => match.resumeProject && match.githubRepo)
      : [];

    const matchesByProject = new Map<string, ProjectVerification['matches'][number]>();
    [...deterministicResult.matches, ...llmMatches].forEach((match) => {
      matchesByProject.set(normalizeMatchText(match.resumeProject), match);
    });
    const matches = [...matchesByProject.values()];
    const matchedProjectKeys = new Set(matches.map((match) => normalizeMatchText(match.resumeProject)));
    const llmGaps = Array.isArray(parsed?.gaps)
      ? parsed.gaps.filter((gap: unknown): gap is string => typeof gap === 'string')
      : [];
    const gaps = [...deterministicResult.gaps, ...llmGaps].filter((gap, index, allGaps) => {
      const gapKey = normalizeMatchText(gap);
      return ![...matchedProjectKeys].some((projectKey) => gapKey.includes(projectKey)) && allGaps.indexOf(gap) === index;
    });

    return {
      summary: typeof parsed?.summary === 'string' ? parsed.summary : deterministicResult.summary,
      confidence: matches.length > 0 ? deterministicResult.confidence : 'low',
      matches,
      gaps,
      conflicts: Array.isArray(parsed?.conflicts)
        ? parsed.conflicts.filter((conflict: unknown): conflict is string => typeof conflict === 'string')
        : [],
    };
  } catch (error) {
    console.error('Project verification failed:', error);
    return deterministicResult;
  }
}

function detectRedFlags(
  githubData: GitHubData | null,
  linkedinData: LinkedinData | null,
  cvText: string,
  claimsVerified: ClaimsVerification
): string[] {
  const flags: string[] = [];

  if (!githubData?.exists && !linkedinData?.exists) {
    flags.push('No verifiable social profiles found');
  }

  if (githubData?.exists && githubData.publicRepos === 0 && githubData.followers < 5) {
    flags.push('GitHub profile exists but minimal activity');
  }

  if (githubData?.exists && githubData.followers < 10 && githubData.publicRepos < 3) {
    flags.push('GitHub profile has low engagement - may be inactive');
  }

  if (linkedinData?.exists && linkedinData.connections !== null && linkedinData.connections < 50) {
    flags.push('LinkedIn profile has limited connections');
  }

  if (claimsVerified.unverifiedSkills.length > claimsVerified.verifiedSkills.length) {
    flags.push('More unverified than verified skills on CV');
  }

  if (claimsVerified.unverifiedSkills.length >= 5) {
    flags.push(`Significant number of unverified skills: ${claimsVerified.unverifiedSkills.length}`);
  }

  const suspiciousPatterns = [
    { pattern: 'fake', message: 'Potential fake credentials mentioned' },
    { pattern: 'fraud', message: 'Potential fraud indicators' },
    { pattern: 'misrepresent', message: 'Potential misrepresentation' },
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (cvText.toLowerCase().includes(pattern)) {
      flags.push(message);
    }
  }

  if (githubData?.exists && githubData.bio?.toLowerCase().includes('looking for job')) {
    flags.push('GitHub bio indicates actively seeking job - may be overrepresented');
  }

  return flags;
}

function calculateOverallScore(result: InvestigationResult): number {
  let score = 30;

  if (result.githubData?.exists) score += 15;
  if (result.linkedinData?.exists) score += 5;

  if (result.githubData?.exists && result.githubData.publicRepos > 5) score += 5;
  if (result.githubData?.exists && result.githubData.followers > 20) score += 5;
  if (result.githubData?.verified) score += 5;

  const skillRatio = result.claimsVerified.verifiedSkills.length / Math.max(1, result.claimsVerified.claimedSkills.length);
  score += Math.round(skillRatio * 15);

  if (result.projectVerification) {
    const projectSignalCount =
      result.projectVerification.matches.length +
      result.projectVerification.gaps.length +
      result.projectVerification.conflicts.length;
    const projectMatchRatio = result.projectVerification.matches.length / Math.max(1, projectSignalCount);
    score += Math.round(projectMatchRatio * 25);

    if (result.projectVerification.matches.length === 0 && result.projectVerification.gaps.length > 0) {
      score -= 20;
    }

    score -= Math.min(20, result.projectVerification.conflicts.length * 8);
  }

  if (result.redFlags.length === 0) score += 10;
  else score -= Math.min(20, result.redFlags.length * 5);

  if (
    result.projectVerification &&
    result.projectVerification.matches.length === 0 &&
    result.projectVerification.gaps.length > 0
  ) {
    score = Math.min(score, 65);
  }

  return Math.min(100, Math.max(0, score));
}

function determineRecommendation(score: number, redFlags: string[]): 'ACCEPT' | 'REVIEW' | 'REJECT' {
  if (redFlags.length >= 3 || score < 40) return 'REJECT';
  if (redFlags.length >= 1 || score < 70) return 'REVIEW';
  return 'ACCEPT';
}

async function llmExtractLinksFromCv(cvText: string): Promise<ExtractedLink[]> {
  const prompt = `Extract all relevant links from this CV. Return JSON only as an array:
[
  {
    "url": "https://...",
    "platform": "github|linkedin|portfolio|leetcode|medium|twitter|other",
    "label": "Descriptive label"
  }
]

CV Text:
${cvText.slice(0, 5000)}`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.2);
    const parsed = response ? extractJsonFromResponse(response) : null;

    if (Array.isArray(parsed)) {
      return parsed.filter(p => p.url && p.platform);
    }
  } catch (error) {
    console.error('LLM link extraction error:', error);
  }

  return [];
}

async function scrapeLinkData(url: string, platform: string): Promise<unknown> {
  try {
    if (platform === 'linkedin' && !ENABLE_LINKEDIN_CRAWL) {
      return {
        headline: '',
        about: '',
        experience: [],
        education: [],
        skills: [],
      };
    }

    const content = await crawlUrlFn(url);

    if (!content) return null;

    if (platform === 'github') {
      const prompt = `Extract GitHub profile data from this page. Return JSON:
{
  "bio": "string",
  "topLanguages": ["string"],
  "pinnedRepos": ["string"],
  "recentActivity": ["string"],
  "contributions": number
}

Content:
${content.slice(0, 6000)}`;

      const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
      return response ? extractJsonFromResponse(response) : null;
    }

    if (platform === 'linkedin') {
      const prompt = `Extract LinkedIn profile data. Return JSON:
{
  "headline": "string",
  "about": "string",
  "experience": ["string"],
  "education": ["string"],
  "skills": ["string"]
}

Content:
${content.slice(0, 6000)}`;

      const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
      return response ? extractJsonFromResponse(response) : null;
    }

    if (platform === 'leetcode') {
      const prompt = `Extract LeetCode profile data. Return JSON:
{
  "ranking": "string",
  "problemsSolved": number,
  "easy": number,
  "medium": number,
  "hard": number,
  "languages": ["string"]
}

Content:
${content.slice(0, 4000)}`;

      const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
      return response ? extractJsonFromResponse(response) : null;
    }

    return { content: content.slice(0, 2000) };
  } catch (error) {
    console.error(`Failed to scrape ${platform} link:`, error);
    return null;
  }
}

export async function performDeepInvestigation(
  cvText: string,
  existingLinks?: ExtractedLink[]
): Promise<DeepInvestigationResult> {
  let allLinks: ExtractedLink[] = [];

  if (existingLinks && existingLinks.length > 0) {
    allLinks = [...existingLinks];
  }

  if (allLinks.length === 0) {
    const llmLinks = await llmExtractLinksFromCv(cvText);
    allLinks = llmLinks;
  }

  if (allLinks.length === 0) {
    const fallbackLinks = extractLinksFromCvText(cvText);
    allLinks = fallbackLinks;
  }

  console.log('[DEEP INVESTIGATION] Found links:', allLinks);

  let githubData: GitHubProfileData | null = null;
  let linkedinData: LinkedInProfileData | null = null;

  for (const link of allLinks) {
    try {
      const rawData = await scrapeLinkData(link.url, link.platform);
      if (!rawData) continue;

      if (link.platform === 'github' && rawData) {
        githubData = {
          username: extractUsername(link.url) || '',
          bio: (rawData as { bio?: string }).bio || '',
          topLanguages: (rawData as { topLanguages?: string[] }).topLanguages || [],
          repos: (rawData as { repos?: { name: string; description: string; language: string; stars: number }[] }).repos || [],
          recentActivity: (rawData as { recentActivity?: string[] }).recentActivity || [],
          contributions: (rawData as { contributions?: number }).contributions || 0,
          verified: true,
        };
      }

      if (link.platform === 'linkedin' && rawData) {
        linkedinData = {
          username: extractUsername(link.url) || '',
          headline: (rawData as { headline?: string }).headline || '',
          about: (rawData as { about?: string }).about || '',
          experience: (rawData as { experience?: { title: string; company: string; duration: string }[] }).experience || [],
          education: (rawData as { education?: { institution: string; degree: string; field: string }[] }).education || [],
          skills: (rawData as { skills?: string[] }).skills || [],
          verified: true,
        };
      }
    } catch (err) {
      console.error(`[DEEP INVESTIGATION] Failed to scrape ${link.url}:`, err);
    }
  }

  let profileAnalysis: ProfileAnalysis = {
    summary: '',
    cvMatchesLinkedIn: [],
    cvConflictsLinkedIn: [],
    cvMatchesGitHub: [],
    confidence: 'low',
  };

  if (githubData || linkedinData) {
    const scrapedInfo = {
      github: githubData ? {
        username: githubData.username,
        languages: githubData.topLanguages,
        repos: githubData.repos.map(r => r.name),
      } : null,
      linkedin: linkedinData ? {
        headline: linkedinData.headline,
        skills: linkedinData.skills,
        experience: linkedinData.experience,
      } : null,
    };

    const analysisPrompt = `Compare CV with scraped online profiles (GitHub, LinkedIn). 
You MUST provide a detailed and verified analysis in the following format:

1. A 2-3 sentence high-level summary of the candidate's profile, highlights, and technical expertise.
2. "CV Matches LinkedIn": A list of specific points (skills, graduation year, location, company) that align perfectly.
3. "Conflicts": A list of any contradictions, missing data on LinkedIn, or unverified claims.

CV Context:
${cvText.slice(0, 3000)}

Scraped Data:
${JSON.stringify(scrapedInfo).slice(0, 4000)}

Return JSON:
{
  "summary": "Summary text here...",
  "cvMatchesLinkedIn": ["✓ Match 1", "✓ Match 2"],
  "cvConflictsLinkedIn": ["⚠ Conflict/Gap 1", "⚠ Conflict/Gap 2"],
  "cvMatchesGitHub": ["Verified skill 1", "Verified repo 1"],
  "confidence": "high|medium|low"
}`;

    try {
      const response = await callLLM([{ role: 'user', content: analysisPrompt }], 0.4);
      const parsed = response ? extractJsonFromResponse(response) : null;

      if (parsed) {
        profileAnalysis = {
          summary: parsed.summary || 'Profile analyzed',
          cvMatchesLinkedIn: parsed.cvMatchesLinkedIn || [],
          cvConflictsLinkedIn: parsed.cvConflictsLinkedIn || [],
          cvMatchesGitHub: parsed.cvMatchesGitHub || [],
          confidence: parsed.confidence || 'medium',
        };
      }
    } catch (error) {
      console.error('Profile analysis error:', error);
    }
  }

  return {
    links: allLinks,
    githubData,
    linkedinData,
    profileAnalysis,
  };
}

function extractLinksFromCvText(cvText: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  
  const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)/gi;
  let match;
  while ((match = githubRegex.exec(cvText)) !== null) {
    const username = match[1];
    if (username && !links.find(l => l.url.includes(username))) {
      links.push({ 
        url: `https://github.com/${username}`, 
        platform: 'github', 
        label: `${username}'s GitHub` 
      });
    }
  }

  const linkedinRegex = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/|www\.linkedin\.com\/in\/)([a-zA-Z0-9_-]+)/gi;
  while ((match = linkedinRegex.exec(cvText)) !== null) {
    const username = match[1];
    if (username && !links.find(l => l.url.includes(username))) {
      let url = match[0];
      if (!url.startsWith('http')) {
        url = `https://www.linkedin.com/in/${username}`;
      }
      links.push({ 
        url: url, 
        platform: 'linkedin', 
        label: `${username}'s LinkedIn` 
      });
    }
  }

  const leetcodeRegex = /leetcode\.com\/([a-zA-Z0-9_-]+)/gi;
  while ((match = leetcodeRegex.exec(cvText)) !== null) {
    const username = match[1];
    if (username && !links.find(l => l.url.includes(username))) {
      links.push({ 
        url: `https://leetcode.com/${username}`, 
        platform: 'leetcode', 
        label: `${username}'s LeetCode` 
      });
    }
  }

  return links;
}

export async function investigateCandidate(
  candidateId: string,
  socialLinks?: SocialLinks
): Promise<InvestigationResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  let githubUsername: string | null = null;
  let linkedinUsername: string | null = null;

  if (socialLinks?.githubUrl) {
    githubUsername = extractGitHubUsername(socialLinks.githubUrl);
  }

  if (socialLinks?.linkedinUrl) {
    linkedinUsername = extractLinkedinUsername(socialLinks.linkedinUrl);
  }

  const cvText = await loadCvText(candidate.cvFilePath);

  if (!githubUsername || !linkedinUsername) {
    const cvLinks = extractLinksFromCvText(cvText);

    if (!githubUsername) {
      const githubLink = cvLinks.find(link => link.platform === 'github');
      githubUsername = githubLink ? extractGitHubUsername(githubLink.url) : null;
    }

    if (!linkedinUsername) {
      const linkedinLink = cvLinks.find(link => link.platform === 'linkedin');
      linkedinUsername = linkedinLink ? extractLinkedinUsername(linkedinLink.url) : null;
    }
  }

  const [githubData, linkedinData] = await Promise.all([
    githubUsername ? fetchGitHubProfile(githubUsername) : Promise.resolve(null),
    linkedinUsername ? fetchLinkedinProfile(linkedinUsername) : Promise.resolve(null),
  ]);

  if (githubData?.exists && githubUsername) {
    const [repos, repoEvidence, crawlData] = await Promise.all([
      fetchGitHubRepos(githubUsername),
      fetchGitHubRepoEvidence(githubUsername),
      analyzeGitHubWithCrawl(githubUsername),
    ]);

    Object.assign(githubData, {
      recentActivity: repos,
      topLanguages: crawlData.topLanguages || githubData.topLanguages,
      pinnedRepos: crawlData.pinnedRepos || [],
      contributions: crawlData.contributions || githubData.contributions,
      bio: crawlData.bio || githubData.bio,
      repoDetails: repoEvidence.length > 0 ? repoEvidence : crawlData.repoDetails || [],
    });
  }

  const claimedSkills = extractClaimedSkills(candidate.glmAnalysis, cvText);
  const claimsVerified = analyzeSkills(cvText, claimedSkills);

  const projectVerification = await analyzeProjectVerification(candidate.glmAnalysis, githubData, cvText);
  const redFlags = detectRedFlags(githubData, linkedinData, cvText, claimsVerified);
  if (githubData?.exists && projectVerification.matches.length === 0 && projectVerification.gaps.length > 0) {
    redFlags.push('Resume projects have no clear GitHub repository match');
  }
  if (projectVerification.conflicts.length > 0) {
    redFlags.push(`Project verification found ${projectVerification.conflicts.length} conflict(s)`);
  }

  const investigationData: InvestigationResult = {
    githubVerified: githubData?.exists || false,
    linkedinVerified: linkedinData?.exists || false,
    githubData,
    linkedinData,
    claimsVerified,
    projectVerification,
    redFlags,
    overallScore: 0,
    recommendation: 'REVIEW',
  };

  const overallScore = calculateOverallScore(investigationData);
  investigationData.overallScore = overallScore;
  investigationData.recommendation = determineRecommendation(overallScore, redFlags);

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      investigationResult: investigationData as any,
      // Sync the investigation score with glmScore
      glmScore: overallScore,
    },
  });

  return investigationData;
}

export async function runFullInvestigation(candidateId: string): Promise<InvestigationResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  return investigateCandidate(candidateId);
}

export async function getInvestigationResult(candidateId: string): Promise<InvestigationResult | null> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { investigationResult: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  return (candidate.investigationResult as unknown as InvestigationResult) || null;
}

function extractUsername(url: string): string | null {
  const githubMatch = url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  if (githubMatch) return githubMatch[1];
  
  const linkedinMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
  if (linkedinMatch) return linkedinMatch[1];
  
  return null;
}
