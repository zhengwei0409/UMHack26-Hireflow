import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface BiasAuditSnapshot {
  id: string;
  candidateId: string;
  jobId: string;
  decision: 'PASS' | 'REVIEW' | 'REJECT';
  score: number;
  threshold: number;
  inferredGender: string | null;
  nameOrigin: string | null;
  universityTier: number | null;
  triggerType: string;
  createdAt: Date;
}

export interface BiasMetrics {
  totalSnapshots: number;
  passRate: number;
  reviewRate: number;
  rejectRate: number;
  averageScoreByGender: Record<string, number>;
  averageScoreByNameOrigin: Record<string, number>;
  averageScoreByUniversityTier: Record<string, number>;
  flaggedDecisions: number;
  genderDistribution: Record<string, number>;
  nameOriginDistribution: Record<string, number>;
}

const GENDER_SIGNALS = {
  common: ['she', 'her', 'hers', 'woman', 'women', 'her'],
  rare: ['they', 'them', 'their'],
};

const NAME_ORIGIN_SIGNALS: Record<string, RegExp[]> = {
  western: [/^[A-Z][a-z]+$/],
  east_asian: [/[aeiou]ng$/, /[Ll]i$/, /[Ww]ang$/, /[Cc]hen$/, /[Ll]iu$/],
  south_asian: [/Singh$/, /Sharma$/, /Patel$/, /Kumar$/, /Gupta$/],
  middle_eastern: [/Ali$/, /Ahmed$/, /Mohammed$/, /Hassan$/, /Omar$/],
  latin_american: [/ez$/, /ez$/, /[ao]$/, /Fernandez$/, /Gonzalez$/, /Rodriguez$/],
};

const UNIVERSITY_TIERS: Record<string, string[]> = {
  1: ['MIT', 'Stanford', 'Harvard', 'Yale', 'Princeton', 'Caltech', 'Oxford', 'Cambridge'],
  2: ['UCB', 'UCLA', 'Carnegie Mellon', 'Georgia Tech', 'UIUC', 'UMich', 'Cornell', 'Columbia'],
  3: ['UT Austin', 'UW', 'UT Dallas', 'Purdue', 'Penn State', 'UCI', 'NYU'],
};

function inferGender(cvText: string): string {
  const normalized = cvText.toLowerCase();
  let sheHerCount = 0;
  let theyThemCount = 0;

  for (const word of GENDER_SIGNALS.common) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sheHerCount += (normalized.match(regex) || []).length;
  }

  for (const word of GENDER_SIGNALS.rare) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    theyThemCount += (normalized.match(regex) || []).length;
  }

  if (sheHerCount > theyThemCount) return 'Female';
  if (theyThemCount > sheHerCount) return 'Non-binary';
  return 'Unknown';
}

function inferNameOrigin(fullName: string): string {
  const firstName = fullName.split(' ')[0] || fullName;

  for (const [origin, patterns] of Object.entries(NAME_ORIGIN_SIGNALS)) {
    for (const pattern of patterns) {
      if (pattern.test(firstName)) {
        return origin;
      }
    }
  }

  return 'western';
}

function inferUniversityTier(cvText: string): number {
  const normalized = cvText.toUpperCase();

  for (const [tier, universities] of Object.entries(UNIVERSITY_TIERS)) {
    for (const uni of universities) {
      if (normalized.includes(uni.toUpperCase())) {
        return parseInt(tier, 10);
      }
    }
  }

  return 0;
}

function shouldFlagForBias(
  score: number,
  threshold: number,
  gender: string,
  nameOrigin: string,
  universityTier: number
): boolean {
  if (gender !== 'Unknown' && score > threshold && score < threshold + 5) {
    return true;
  }

  if (universityTier === 0 && score > threshold) {
    return true;
  }

  if (nameOrigin !== 'western' && score > threshold - 10 && score < threshold) {
    return true;
  }

  return false;
}

function getTriggerType(
  score: number,
  threshold: number,
  decision: 'PASS' | 'REVIEW' | 'REJECT'
): string {
  if (decision === 'REJECT' && score >= threshold - 5) {
    return 'BORDERLINE_REJECTION';
  }

  if (decision === 'PASS' && score >= threshold - 10) {
    return 'BORDERLINE_PASS';
  }

  if (decision === 'PASS' && score >= threshold + 20) {
    return 'STRONG_PASS';
  }

  if (decision === 'REVIEW') {
    return 'REVIEW_REQUIRED';
  }

  return 'STANDARD';
}

export async function createBiasSnapshot(
  candidateId: string,
  jobId: string,
  decision: 'PASS' | 'REVIEW' | 'REJECT',
  score: number,
  threshold: number,
  cvText?: string,
  fullName?: string
): Promise<BiasAuditSnapshot> {
  const inferredGender = inferGender(cvText || '');
  const nameOrigin = inferNameOrigin(fullName || '');
  const universityTier = inferUniversityTier(cvText || '');
  const triggerType = getTriggerType(score, threshold, decision);

  const snapshot = await prisma.biasAuditSnapshot.create({
    data: {
      candidateId,
      jobId,
      decision,
      score,
      threshold,
      inferredGender,
      nameOrigin,
      universityTier,
      triggerType,
    },
  });

  return {
    ...snapshot,
    decision: snapshot.decision as 'PASS' | 'REVIEW' | 'REJECT',
  };
}

export async function checkForBiasFlags(
  candidateId: string,
  jobId: string,
  score: number,
  threshold: number,
  decision: 'PASS' | 'REVIEW' | 'REJECT',
  cvText?: string,
  fullName?: string
): Promise<{ flagged: boolean; reason: string | null }> {
  const inferredGender = inferGender(cvText || '');
  const nameOrigin = inferNameOrigin(fullName || '');
  const universityTier = inferUniversityTier(cvText || '');

  const flagged = shouldFlagForBias(score, threshold, inferredGender, nameOrigin, universityTier);

  if (flagged) {
    let reason = 'Bias flag triggered: ';

    if (inferredGender !== 'Unknown') {
      reason += `gender inference (${inferredGender}), `;
    }

    if (universityTier === 0) {
      reason += 'unknown university tier, ';
    }

    if (nameOrigin !== 'western') {
      reason += `name origin (${nameOrigin}), `;
    }

    await createBiasSnapshot(candidateId, jobId, decision, score, threshold, cvText, fullName);

    return { flagged: true, reason: reason.slice(0, -2) };
  }

  return { flagged: false, reason: null };
}

export async function getBiasMetrics(jobId?: string): Promise<BiasMetrics> {
  const where = jobId ? { jobId } : {};

  const snapshots = await prisma.biasAuditSnapshot.findMany({
    where,
  });

  if (snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      passRate: 0,
      reviewRate: 0,
      rejectRate: 0,
      averageScoreByGender: {},
      averageScoreByNameOrigin: {},
      averageScoreByUniversityTier: {},
      flaggedDecisions: 0,
      genderDistribution: {},
      nameOriginDistribution: {},
    };
  }

  const genderScores: Record<string, number[]> = {};
  const nameOriginScores: Record<string, number[]> = {};
  const universityTierScores: Record<string, number[]> = {};
  const genderCounts: Record<string, number> = {};
  const nameOriginCounts: Record<string, number> = {};

  let passCount = 0;
  let reviewCount = 0;
  let rejectCount = 0;
  let flaggedCount = 0;

  for (const snapshot of snapshots) {
    if (snapshot.decision === 'PASS') passCount++;
    else if (snapshot.decision === 'REVIEW') reviewCount++;
    else rejectCount++;

    if (snapshot.triggerType !== 'STANDARD') flaggedCount++;

    if (snapshot.inferredGender) {
      if (!genderScores[snapshot.inferredGender]) {
        genderScores[snapshot.inferredGender] = [];
      }
      genderScores[snapshot.inferredGender].push(snapshot.score);
      genderCounts[snapshot.inferredGender] = (genderCounts[snapshot.inferredGender] || 0) + 1;
    }

    if (snapshot.nameOrigin) {
      if (!nameOriginScores[snapshot.nameOrigin]) {
        nameOriginScores[snapshot.nameOrigin] = [];
      }
      nameOriginScores[snapshot.nameOrigin].push(snapshot.score);
      nameOriginCounts[snapshot.nameOrigin] = (nameOriginCounts[snapshot.nameOrigin] || 0) + 1;
    }

    if (snapshot.universityTier !== null) {
      const tier = String(snapshot.universityTier);
      if (!universityTierScores[tier]) {
        universityTierScores[tier] = [];
      }
      universityTierScores[tier].push(snapshot.score);
    }
  }

  const avgByGender: Record<string, number> = {};
  for (const [gender, scores] of Object.entries(genderScores)) {
    avgByGender[gender] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const avgByOrigin: Record<string, number> = {};
  for (const [origin, scores] of Object.entries(nameOriginScores)) {
    avgByOrigin[origin] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const avgByTier: Record<string, number> = {};
  for (const [tier, scores] of Object.entries(universityTierScores)) {
    avgByTier[tier] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const total = snapshots.length;

  return {
    totalSnapshots: total,
    passRate: total > 0 ? (passCount / total) * 100 : 0,
    reviewRate: total > 0 ? (reviewCount / total) * 100 : 0,
    rejectRate: total > 0 ? (rejectCount / total) * 100 : 0,
    averageScoreByGender: avgByGender,
    averageScoreByNameOrigin: avgByOrigin,
    averageScoreByUniversityTier: avgByTier,
    flaggedDecisions: flaggedCount,
    genderDistribution: genderCounts,
    nameOriginDistribution: nameOriginCounts,
  };
}

export async function getRecentBiasSnapshots(
  jobId?: string,
  limit = 50
): Promise<BiasAuditSnapshot[]> {
  const where = jobId ? { jobId } : {};

  const snapshots = await prisma.biasAuditSnapshot.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return snapshots.map((s) => ({
    ...s,
    decision: s.decision as 'PASS' | 'REVIEW' | 'REJECT',
  }));
}