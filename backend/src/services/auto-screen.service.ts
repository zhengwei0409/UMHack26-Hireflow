import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { parseCV } from './glm.service';
import { STATES } from '../workflow/states';
import { transitionCandidateStatus } from './workflow-state.service';
import { investigateCandidate } from './investigation.service';
import { checkForBiasFlags } from './bias-audit.service';

const REVIEW_MARGIN = 10;

export type AutoScreenDecision = 'PASS' | 'REVIEW' | 'REJECT';

export interface AutoScreenResult {
  candidate: any;
  analysis: any;
  threshold: number;
  decision: AutoScreenDecision;
  investigationResult?: any;
  biasFlag?: { flagged: boolean; reason: string | null };
}

function formatRequirements(requirements: unknown) {
  return Array.isArray(requirements) ? requirements.join(', ') : String(requirements ?? '');
}

function getJobDescription(candidate: {
  job: { title: string; department: string; description: string; requirements: unknown; location: string };
}) {
  return `
Title: ${candidate.job.title}
Department: ${candidate.job.department}
Description: ${candidate.job.description}
Requirements: ${formatRequirements(candidate.job.requirements)}
Location: ${candidate.job.location}
  `.trim();
}

export function determineAutoScreenDecision(score: number, threshold: number): AutoScreenDecision {
  if (score >= threshold) {
    return 'PASS';
  }
  if (score >= threshold - REVIEW_MARGIN) {
    return 'REVIEW';
  }
  return 'REJECT';
}

export async function runAutoScreen(candidateId: string, runInvestigation = false): Promise<AutoScreenResult> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: true },
  });

  if (!candidate) {
    throw new Error('CANDIDATE_NOT_FOUND');
  }

  const jobDescription = getJobDescription(candidate);
  const analysis = await parseCV(candidate.cvFilePath, jobDescription);
  const threshold = candidate.job.autoScreenThreshold;
  let decision = determineAutoScreenDecision(analysis.score, threshold);

  let investigationResult = null;
  if (runInvestigation) {
    try {
      investigationResult = await investigateCandidate(candidateId);
      if (investigationResult.recommendation === 'REJECT') {
        decision = 'REJECT';
      } else if (investigationResult.recommendation === 'REVIEW' && decision === 'PASS') {
        decision = 'REVIEW';
      }
    } catch (error) {
      console.error('Investigation failed:', error);
    }
  }

  let biasFlag;
  try {
    biasFlag = await checkForBiasFlags(
      candidateId,
      candidate.jobId,
      analysis.score,
      threshold,
      decision,
      candidate.cvFilePath,
      candidate.fullName
    );
  } catch (error) {
    console.error('Bias audit check failed:', error);
    biasFlag = { flagged: false, reason: null };
  }

  const notes = {
    threshold,
    scoreDelta: analysis.score - threshold,
    recommendation: analysis.recommendation,
    investigationScore: investigationResult?.overallScore || null,
    investigationRecommendation: investigationResult?.recommendation || null,
    biasFlag: biasFlag.flagged,
    biasReason: biasFlag.reason,
  } satisfies Prisma.JsonObject;

  await prisma.$transaction(async (tx) => {
    await tx.candidate.update({
      where: { id: candidateId },
      data: {
        glmAnalysis: analysis as unknown as Prisma.InputJsonValue,
        glmScore: analysis.score,
        autoScreenDecision: decision,
        autoScreenNotes: notes as Prisma.InputJsonValue,
      },
    });

    await transitionCandidateStatus({
      candidateId,
      fromStatus: STATES.CV_PARSING,
      toStatus: STATES.CV_UNDER_REVIEW,
      event: 'CV_ANALYZED',
      triggeredBy: 'SYSTEM',
      metadata: {
        score: analysis.score,
        threshold,
        decision,
        investigationScore: investigationResult?.overallScore,
        biasFlag: biasFlag.flagged,
      } as Prisma.InputJsonValue,
      tx,
    });
  });

  return {
    candidate,
    analysis,
    threshold,
    decision,
    investigationResult,
    biasFlag,
  };
}