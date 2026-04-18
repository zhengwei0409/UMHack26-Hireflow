// Owner: AI/ML Engineer
// This file wraps all GLM API calls.
// Return mock data for now — swap with real API when GLM_API_KEY is ready.

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

export async function parseCV(cvFilePath: string, jobDescription: string): Promise<GLMAnalysis> {
  // TODO: replace with real GLM call
  return {
    score: 82,
    strengths: ['Strong React experience', '3 years Node.js'],
    weaknesses: ['No PostgreSQL mentioned'],
    recommendation: 'ACCEPT',
    summary: 'Candidate shows strong frontend skills with relevant backend experience.',
  };
}

export async function generateOfferLetter(
  candidateInfo: { fullName: string },
  jobInfo: { title: string }
): Promise<OfferLetter> {
  // TODO: replace with real GLM call
  return {
    subject: `Offer Letter – ${jobInfo.title} at TechCorp`,
    body: `Dear ${candidateInfo.fullName}, we are pleased to offer you the position of ${jobInfo.title}...`,
  };
}
