// Owner: AI/ML Engineer
// DeepSeek API integration for CV parsing and offer letter generation.

import fs from 'fs';
import path from 'path';

const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

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

export interface SpiderMapAspect {
  aspect: string;
  score: number;
}

export interface SpiderMapEvaluation {
  aspects: SpiderMapAspect[];
  summary: string;
}

interface GLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callLLM(messages: GLMMessage[], temperature = 0.7): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

function extractJsonFromResponse(text: string): any {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

export async function parseCV(cvFilePath: string, jobDescription: string): Promise<GLMAnalysis> {
  let cvText: string;

  const ext = path.extname(cvFilePath).toLowerCase();
  if (ext === '.pdf') {
    cvText = await extractTextFromPDF(cvFilePath);
  } else if (ext === '.docx') {
    cvText = await extractTextFromDOCX(cvFilePath);
  } else {
    cvText = fs.readFileSync(cvFilePath, 'utf-8');
  }

  const prompt = `You are an HR analyst evaluating a candidate's CV for a job.
Job Description:
${jobDescription}

Candidate CV:
${cvText}

Analyze the CV and return a JSON object with exactly this structure:
{
  "score": number (0-100),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendation": "ACCEPT" or "REJECT",
  "summary": "A brief summary paragraph"
}

Only return the JSON, no other text.`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
    const parsed = extractJsonFromResponse(response);

    if (parsed && typeof parsed.score === 'number') {
      return {
        score: Math.min(100, Math.max(0, parsed.score)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        recommendation: parsed.recommendation === 'REJECT' ? 'REJECT' : 'ACCEPT',
        summary: parsed.summary || '',
      };
    }

    throw new Error('Invalid LLM response format');
  } catch (error) {
    console.error('LLM parseCV error:', error);
    throw new Error('CV_ANALYSIS_FAILED');
  }
}

export async function generateOfferLetter(
  candidateInfo: { fullName: string; email: string },
  jobInfo: { title: string; department: string; location: string; salary?: string }
): Promise<OfferLetter> {
  const prompt = `Generate a professional job offer letter with the following details:

Candidate: ${candidateInfo.fullName}
Position: ${jobInfo.title}
Department: ${jobInfo.department}
Location: ${jobInfo.location}
${jobInfo.salary ? `Salary: ${jobInfo.salary}` : ''}

Return a JSON object with exactly this structure:
{
  "subject": "string - email subject line",
  "body": "string - full email body in a professional tone"
}

Only return the JSON, no other text.`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.5);
    const parsed = extractJsonFromResponse(response);

    if (parsed && parsed.subject && parsed.body) {
      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    }

    throw new Error('Invalid LLM response format');
  } catch (error) {
    console.error('LLM generateOfferLetter error:', error);
    throw new Error('OFFER_LETTER_GENERATION_FAILED');
  }
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

export async function generateSpiderMap(cvFilePath: string, jobDescription: string): Promise<SpiderMapEvaluation> {
  let cvText: string;

  const ext = path.extname(cvFilePath).toLowerCase();
  if (ext === '.pdf') {
    cvText = await extractTextFromPDF(cvFilePath);
  } else if (ext === '.docx') {
    cvText = await extractTextFromDOCX(cvFilePath);
  } else {
    cvText = fs.readFileSync(cvFilePath, 'utf-8');
  }

  const prompt = `You are an HR analyst evaluating a candidate's CV for a job using a spider map (radar chart).
Job Description:
${jobDescription}

Candidate CV:
${cvText}

Determine the most relevant evaluation aspects based on the job requirements. Common aspects include: Technical Skills, Experience, Education, Communication, Problem Solving, Leadership, Domain Knowledge, Creativity, Teamwork, Adaptability.

Generate exactly 5-8 aspects that are most relevant to this specific job. For each aspect, provide a score from 0-100 based on how well the candidate's CV demonstrates that skill.

Return a JSON object with exactly this structure:
{
  "aspects": [
    { "aspect": "string", "score": number },
    ...
  ],
  "summary": "A brief overall evaluation summary (1-2 sentences)"
}

Only return the JSON, no other text.`;

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 0.3);
    const parsed = extractJsonFromResponse(response);

    if (parsed && Array.isArray(parsed.aspects)) {
      const aspects = parsed.aspects
        .filter((a: any) => a.aspect && typeof a.score === 'number')
        .map((a: any) => ({
          aspect: a.aspect,
          score: Math.min(100, Math.max(0, Math.round(a.score))),
        }));

      return {
        aspects,
        summary: parsed.summary || '',
      };
    }

    throw new Error('Invalid LLM response format');
  } catch (error) {
    console.error('LLM generateSpiderMap error:', error);
    throw new Error('SPIDER_MAP_GENERATION_FAILED');
  }
}