import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { callLLM, loadTextFromCv } from './glm.service';
import { extractJsonFromResponse } from './glm.service';
import { crawlUrl as crawlUrlFn } from './crawl4ai.service';
import fs from 'fs';
import path from 'path';

const CRAWL4AI_API_URL = process.env.CRAWL4AI_API_URL || 'http://localhost:11235';
const ENABLE_LINKEDIN_CRAWL = process.env.ENABLE_LINKEDIN_CRAWL === 'true';

export interface InvestigationResult {
  githubVerified: boolean;
  linkedinVerified: boolean;
  githubData: GitHubData | null;
  linkedinData: LinkedinData | null;
  claimsVerified: ClaimsVerification;
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
      headers: { Accept: 'application/vnd.github.v3+json' },
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
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
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

function analyzeSkills(cvText: string, claimedSkills: string[]): ClaimsVerification {
  const normalizedCV = cvText.toLowerCase();
  const verifiedSkills: string[] = [];
  const unverifiedSkills: string[] = [];
  const skillEvidence: Record<string, string[]> = {};

  const skillPatterns: Record<string, string[]> = {
    javascript: ['javascript', 'js', 'ecmascript'],
    typescript: ['typescript', 'ts'],
    python: ['python', 'py'],
    java: [' java ', 'java '],
    react: ['react', 'reactjs', 'react.js'],
    nodejs: ['node', 'node.js', 'nodejs'],
    sql: ['sql', 'mysql', 'postgresql', 'postgres'],
    aws: ['aws', 'amazon web services', 'ec2', 's3'],
    docker: ['docker', 'container'],
    kubernetes: ['kubernetes', 'k8s'],
    git: ['git', 'github', 'gitlab'],
    'machine learning': ['machine learning', 'ml', 'deep learning', 'ai'],
    'data analysis': ['data analysis', 'analytics', 'pandas', 'numpy'],
  };

  for (const skill of claimedSkills) {
    const normalizedSkill = skill.toLowerCase();
    const patterns = skillPatterns[normalizedSkill] || [normalizedSkill];

    let found = false;
    const evidence: string[] = [];

    for (const pattern of patterns) {
      if (normalizedCV.includes(pattern)) {
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
  let score = 40;

  if (result.githubData?.exists) score += 20;
  if (result.linkedinData?.exists) score += 15;

  if (result.githubData?.exists && result.githubData.publicRepos > 5) score += 5;
  if (result.githubData?.exists && result.githubData.followers > 20) score += 5;
  if (result.githubData?.verified) score += 5;

  const skillRatio = result.claimsVerified.verifiedSkills.length / Math.max(1, result.claimsVerified.claimedSkills.length);
  score += Math.round(skillRatio * 15);

  if (result.redFlags.length === 0) score += 10;
  else if (result.redFlags.length <= 2) score += 5;

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
    const [repos, crawlData] = await Promise.all([
      fetchGitHubRepos(githubUsername),
      analyzeGitHubWithCrawl(githubUsername),
    ]);

    Object.assign(githubData, {
      recentActivity: repos,
      topLanguages: crawlData.topLanguages || githubData.topLanguages,
      pinnedRepos: crawlData.pinnedRepos || [],
      contributions: crawlData.contributions || githubData.contributions,
      bio: crawlData.bio || githubData.bio,
    });
  }

  const claimedSkills = (candidate.glmAnalysis as { skills?: string[] })?.skills || [];
  const claimsVerified = analyzeSkills(cvText, claimedSkills);

  const redFlags = detectRedFlags(githubData, linkedinData, cvText, claimsVerified);

  const investigationData: InvestigationResult = {
    githubVerified: githubData?.exists || false,
    linkedinVerified: linkedinData?.exists || false,
    githubData,
    linkedinData,
    claimsVerified,
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
