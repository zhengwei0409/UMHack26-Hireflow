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
  // Enhanced bias audit metrics
  adverseImpactRatio: Record<string, number>;
  statisticalSignificance: Record<string, { chiSquare: number; pValue: number; isSignificant: boolean }>;
  biasScore: number;
  biasRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ageBiasMetrics: { averageScoreByAgeGroup: Record<string, number>; ageDistribution: Record<string, number>; adverseImpactByAge: Record<string, number> };
  intersectionalityMetrics: Array<{ gender: string; nameOrigin: string; passRate: number; count: number; adverseImpactRatio: number }>;
  scoreDistribution: { mean: number; stdDev: number; median: number; min: number; max: number };
  disparateImpactRatios: Record<string, { passRate: number; adverseImpactRatio: number; isProblematic: boolean }>;
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

// Age inference from CV text (look for experience years or graduation dates)
function inferAgeGroup(cvText: string): string {
  const currentYear = new Date().getFullYear();

  // Look for experience patterns like "X years of experience"
  const expMatch = cvText.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?experience/i);
  if (expMatch) {
    const yearsExp = parseInt(expMatch[1], 10);
    const estimatedAge = 22 + yearsExp; // Assume started working at 22
    return getAgeGroup(estimatedAge);
  }

  // Look for graduation years
  const gradMatch = cvText.match(/(?:graduat|class of|batch of)\D*?(20\d{2}|19\d{2})/i);
  if (gradMatch) {
    const gradYear = parseInt(gradMatch[1], 10);
    const estimatedAge = currentYear - gradYear + 22;
    return getAgeGroup(estimatedAge);
  }

  return 'unknown';
}

function getAgeGroup(age: number): string {
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

// Calculate adverse impact ratio using 4/5ths rule
function calculateAdverseImpact(passCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return passCount / totalCount;
}

// Simplified Chi-square test for statistical significance
function chiSquareTest(observed: number[][], expected: number[][]): { chiSquare: number; pValue: number } {
  let chiSq = 0;
  const rows = observed.length;
  const cols = observed[0].length;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (expected[i][j] > 0) {
        chiSq += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
  }

  // Simplified p-value estimation (for 1 df, chi-square > 3.841 means p < 0.05)
  const pValue = chiSq > 3.841 ? 0.05 : chiSq > 2.706 ? 0.10 : 0.20;

  return { chiSquare: chiSq, pValue };
}

// Calculate overall bias score (0-100, higher = more biased)
function calculateBiasScore(metrics: {
  adverseImpactRatios: Record<string, number>;
  passRateDisparity: number;
  scoreDisparity: number;
  flaggedPercentage: number;
}): number {
  let score = 0;

  // Adverse impact penalty (40% weight)
  const aiValues = Object.values(metrics.adverseImpactRatios).filter(v => v > 0);
  if (aiValues.length > 1) {
    const minAi = Math.min(...aiValues);
    const maxAi = Math.max(...aiValues);
    const aiDisparity = maxAi > 0 ? (maxAi - minAi) / maxAi : 0;
    score += aiDisparity * 40;
  }

  // Pass rate disparity penalty (30% weight)
  score += Math.min(metrics.passRateDisparity * 30, 30);

  // Score disparity penalty (20% weight)
  score += Math.min(metrics.scoreDisparity * 20, 20);

  // Flagged decisions penalty (10% weight)
  score += Math.min(metrics.flaggedPercentage * 10, 10);

  return Math.min(Math.round(score), 100);
}

function getBiasRiskLevel(biasScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (biasScore < 20) return 'LOW';
  if (biasScore < 40) return 'MEDIUM';
  if (biasScore < 60) return 'HIGH';
  return 'CRITICAL';
}

// Calculate standard deviation
function calculateStdDev(scores: number[], mean: number): number {
  if (scores.length === 0) return 0;
  const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  return Math.sqrt(variance);
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

  const emptyMetrics: BiasMetrics = {
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
    adverseImpactRatio: {},
    statisticalSignificance: {},
    biasScore: 0,
    biasRiskLevel: 'LOW',
    ageBiasMetrics: { averageScoreByAgeGroup: {}, ageDistribution: {}, adverseImpactByAge: {} },
    intersectionalityMetrics: [],
    scoreDistribution: { mean: 0, stdDev: 0, median: 0, min: 0, max: 0 },
    disparateImpactRatios: {},
  };

  if (snapshots.length === 0) {
    return emptyMetrics;
  }

  const genderScores: Record<string, number[]> = {};
  const nameOriginScores: Record<string, number[]> = {};
  const universityTierScores: Record<string, number[]> = {};
  const genderCounts: Record<string, { pass: number; total: number }> = {};
  const nameOriginCounts: Record<string, { pass: number; total: number }> = {};
  const universityTierCounts: Record<string, { pass: number; total: number }> = {};
  const ageGroupScores: Record<string, number[]> = {};
  const ageGroupCounts: Record<string, { pass: number; total: number }> = {};

  let passCount = 0;
  let reviewCount = 0;
  let rejectCount = 0;
  let flaggedCount = 0;
  const allScores: number[] = [];

  for (const snapshot of snapshots) {
    allScores.push(snapshot.score);

    if (snapshot.decision === 'PASS') passCount++;
    else if (snapshot.decision === 'REVIEW') reviewCount++;
    else rejectCount++;

    if (snapshot.triggerType !== 'STANDARD') flaggedCount++;

    // Gender tracking
    if (snapshot.inferredGender) {
      if (!genderScores[snapshot.inferredGender]) {
        genderScores[snapshot.inferredGender] = [];
        genderCounts[snapshot.inferredGender] = { pass: 0, total: 0 };
      }
      genderScores[snapshot.inferredGender].push(snapshot.score);
      genderCounts[snapshot.inferredGender].total++;
      if (snapshot.decision === 'PASS') genderCounts[snapshot.inferredGender].pass++;
    }

    // Name origin tracking
    if (snapshot.nameOrigin) {
      if (!nameOriginScores[snapshot.nameOrigin]) {
        nameOriginScores[snapshot.nameOrigin] = [];
        nameOriginCounts[snapshot.nameOrigin] = { pass: 0, total: 0 };
      }
      nameOriginScores[snapshot.nameOrigin].push(snapshot.score);
      nameOriginCounts[snapshot.nameOrigin].total++;
      if (snapshot.decision === 'PASS') nameOriginCounts[snapshot.nameOrigin].pass++;
    }

    // University tier tracking
    if (snapshot.universityTier !== null) {
      const tier = String(snapshot.universityTier);
      if (!universityTierScores[tier]) {
        universityTierScores[tier] = [];
        universityTierCounts[tier] = { pass: 0, total: 0 };
      }
      universityTierScores[tier].push(snapshot.score);
      universityTierCounts[tier].total++;
      if (snapshot.decision === 'PASS') universityTierCounts[tier].pass++;
    }

    // Age group tracking (infer from score patterns or use unknown)
    const ageGroup = inferAgeGroupFromSnapshot(snapshot);
    if (!ageGroupScores[ageGroup]) {
      ageGroupScores[ageGroup] = [];
      ageGroupCounts[ageGroup] = { pass: 0, total: 0 };
    }
    ageGroupScores[ageGroup].push(snapshot.score);
    ageGroupCounts[ageGroup].total++;
    if (snapshot.decision === 'PASS') ageGroupCounts[ageGroup].pass++;
  }

  // Calculate averages
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

  const avgByAge: Record<string, number> = {};
  for (const [age, scores] of Object.entries(ageGroupScores)) {
    avgByAge[age] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const total = snapshots.length;

  // Calculate adverse impact ratios (4/5ths rule)
  const adverseImpactRatio: Record<string, number> = {};
  const disparateImpactRatios: Record<string, { passRate: number; adverseImpactRatio: number; isProblematic: boolean }> = {};

  // Gender adverse impact
  const genderPassRates: Record<string, number> = {};
  for (const [gender, counts] of Object.entries(genderCounts)) {
    genderPassRates[gender] = counts.total > 0 ? counts.pass / counts.total : 0;
  }
  const maxGenderPassRate = Math.max(...Object.values(genderPassRates), 0);
  for (const [gender, passRate] of Object.entries(genderPassRates)) {
    adverseImpactRatio[`gender_${gender}`] = maxGenderPassRate > 0 ? passRate / maxGenderPassRate : 1;
    disparateImpactRatios[`gender_${gender}`] = {
      passRate: passRate * 100,
      adverseImpactRatio: maxGenderPassRate > 0 ? passRate / maxGenderPassRate : 1,
      isProblematic: maxGenderPassRate > 0 && (passRate / maxGenderPassRate) < 0.8,
    };
  }

  // Name origin adverse impact
  const originPassRates: Record<string, number> = {};
  for (const [origin, counts] of Object.entries(nameOriginCounts)) {
    originPassRates[origin] = counts.total > 0 ? counts.pass / counts.total : 0;
  }
  const maxOriginPassRate = Math.max(...Object.values(originPassRates), 0);
  for (const [origin, passRate] of Object.entries(originPassRates)) {
    adverseImpactRatio[`origin_${origin}`] = maxOriginPassRate > 0 ? passRate / maxOriginPassRate : 1;
    disparateImpactRatios[`origin_${origin}`] = {
      passRate: passRate * 100,
      adverseImpactRatio: maxOriginPassRate > 0 ? passRate / maxOriginPassRate : 1,
      isProblematic: maxOriginPassRate > 0 && (passRate / maxOriginPassRate) < 0.8,
    };
  }

  // University tier adverse impact
  const tierPassRates: Record<string, number> = {};
  for (const [tier, counts] of Object.entries(universityTierCounts)) {
    tierPassRates[tier] = counts.total > 0 ? counts.pass / counts.total : 0;
  }
  const maxTierPassRate = Math.max(...Object.values(tierPassRates), 0);
  for (const [tier, passRate] of Object.entries(tierPassRates)) {
    adverseImpactRatio[`tier_${tier}`] = maxTierPassRate > 0 ? passRate / maxTierPassRate : 1;
  }

  // Age adverse impact
  const agePassRates: Record<string, number> = {};
  for (const [age, counts] of Object.entries(ageGroupCounts)) {
    agePassRates[age] = counts.total > 0 ? counts.pass / counts.total : 0;
  }
  const maxAgePassRate = Math.max(...Object.values(agePassRates), 0);
  const adverseImpactByAge: Record<string, number> = {};
  for (const [age, passRate] of Object.entries(agePassRates)) {
    adverseImpactByAge[age] = maxAgePassRate > 0 ? passRate / maxAgePassRate : 1;
  }

  // Statistical significance (Chi-square test for gender)
  const statisticalSignificance: Record<string, { chiSquare: number; pValue: number; isSignificant: boolean }> = {};
  const genderKeys = Object.keys(genderCounts);
  if (genderKeys.length >= 2) {
    const observed = genderKeys.map(g => [genderCounts[g].pass, genderCounts[g].total - genderCounts[g].pass]);
    // Simplified expected values (assuming null hypothesis: no difference in pass rates)
    const totalPass = passCount;
    const totalAll = total;
    const expected = genderKeys.map(g => {
      const count = genderCounts[g].total;
      return [(count / totalAll) * totalPass, (count / totalAll) * (totalAll - totalPass)];
    });
    const result = chiSquareTest(observed, expected);
    statisticalSignificance['gender'] = {
      chiSquare: result.chiSquare,
      pValue: result.pValue,
      isSignificant: result.pValue < 0.05,
    };
  }

  // Score distribution
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const stdDev = calculateStdDev(allScores, mean);
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];

  // Calculate overall bias score
  const passRateValues = Object.values(genderPassRates);
  const passRateDisparity = passRateValues.length > 1
    ? (Math.max(...passRateValues) - Math.min(...passRateValues))
    : 0;

  const scoreValues = Object.values(avgByGender);
  const scoreDisparity = scoreValues.length > 1
    ? (Math.max(...scoreValues) - Math.min(...scoreValues)) / 100
    : 0;

  const flaggedPercentage = total > 0 ? flaggedCount / total : 0;

  const biasScore = calculateBiasScore({
    adverseImpactRatios: adverseImpactRatio,
    passRateDisparity,
    scoreDisparity,
    flaggedPercentage,
  });

  // Intersectionality: combine gender and name origin
  const intersectionalityMetrics: Array<{ gender: string; nameOrigin: string; passRate: number; count: number; adverseImpactRatio: number }> = [];
  const intersectionCounts: Record<string, { pass: number; total: number }> = {};

  for (const snapshot of snapshots) {
    if (!snapshot.inferredGender || !snapshot.nameOrigin) continue;
    const key = `${snapshot.inferredGender}_${snapshot.nameOrigin}`;
    if (!intersectionCounts[key]) {
      intersectionCounts[key] = { pass: 0, total: 0 };
    }
    intersectionCounts[key].total++;
    if (snapshot.decision === 'PASS') intersectionCounts[key].pass++;
  }

  const intersectionPassRates: number[] = [];
  for (const [key, counts] of Object.entries(intersectionCounts)) {
    const [gender, origin] = key.split('_');
    const passRate = counts.total > 0 ? counts.pass / counts.total : 0;
    intersectionPassRates.push(passRate);
    const maxIntersectionRate = Math.max(...intersectionPassRates, 0);
    intersectionalityMetrics.push({
      gender,
      nameOrigin: origin,
      passRate: passRate * 100,
      count: counts.total,
      adverseImpactRatio: maxIntersectionRate > 0 ? passRate / maxIntersectionRate : 1,
    });
  }

  return {
    totalSnapshots: total,
    passRate: total > 0 ? (passCount / total) * 100 : 0,
    reviewRate: total > 0 ? (reviewCount / total) * 100 : 0,
    rejectRate: total > 0 ? (rejectCount / total) * 100 : 0,
    averageScoreByGender: avgByGender,
    averageScoreByNameOrigin: avgByOrigin,
    averageScoreByUniversityTier: avgByTier,
    flaggedDecisions: flaggedCount,
    genderDistribution: Object.fromEntries(Object.entries(genderCounts).map(([k, v]) => [k, v.total])),
    nameOriginDistribution: Object.fromEntries(Object.entries(nameOriginCounts).map(([k, v]) => [k, v.total])),
    adverseImpactRatio,
    statisticalSignificance,
    biasScore,
    biasRiskLevel: getBiasRiskLevel(biasScore),
    ageBiasMetrics: {
      averageScoreByAgeGroup: avgByAge,
      ageDistribution: Object.fromEntries(Object.entries(ageGroupCounts).map(([k, v]) => [k, v.total])),
      adverseImpactByAge,
    },
    intersectionalityMetrics,
    scoreDistribution: {
      mean,
      stdDev,
      median,
      min: Math.min(...allScores),
      max: Math.max(...allScores),
    },
    disparateImpactRatios,
  };
}

// Helper to infer age group from snapshot (simplified - would need CV text for better accuracy)
function inferAgeGroupFromSnapshot(snapshot: any): string {
  // This is a simplified version - in production, you'd store age group in the snapshot
  // or re-infer from CV text
  return 'unknown';
}

// What-If Simulator: Calculate bias metrics with different threshold
export async function simulateThresholdChange(
  newThreshold: number,
  jobId?: string
): Promise<{
  originalMetrics: BiasMetrics;
  simulatedMetrics: BiasMetrics;
  changes: {
    passRateChange: number;
    adverseImpactImprovement: Record<string, number>;
    biasScoreChange: number;
    recommendation: string;
  };
}> {
  const where = jobId ? { jobId } : {};

  const snapshots = await prisma.biasAuditSnapshot.findMany({ where });

  if (snapshots.length === 0) {
    const empty = await getBiasMetrics(jobId);
    return {
      originalMetrics: empty,
      simulatedMetrics: empty,
      changes: { passRateChange: 0, adverseImpactImprovement: {}, biasScoreChange: 0, recommendation: 'No data available' },
    };
  }

  // Get original metrics
  const originalMetrics = await getBiasMetrics(jobId);

  // Simulate new decisions with different threshold
  const simulatedSnapshots = snapshots.map(s => ({
    ...s,
    decision: s.score >= newThreshold ? 'PASS' as const : s.score >= newThreshold - 10 ? 'REVIEW' as const : 'REJECT' as const,
  }));

  // Calculate simulated metrics
  const genderCounts: Record<string, { pass: number; total: number }> = {};
  const originCounts: Record<string, { pass: number; total: number }> = {};
  let simPassCount = 0;

  for (const s of simulatedSnapshots) {
    if (s.decision === 'PASS') simPassCount++;

    if (s.inferredGender) {
      if (!genderCounts[s.inferredGender]) genderCounts[s.inferredGender] = { pass: 0, total: 0 };
      genderCounts[s.inferredGender].total++;
      if (s.decision === 'PASS') genderCounts[s.inferredGender].pass++;
    }

    if (s.nameOrigin) {
      if (!originCounts[s.nameOrigin]) originCounts[s.nameOrigin] = { pass: 0, total: 0 };
      originCounts[s.nameOrigin].total++;
      if (s.decision === 'PASS') originCounts[s.nameOrigin].pass++;
    }
  }

  // Calculate adverse impact improvements
  const adverseImpactImprovement: Record<string, number> = {};
  const genderPassRates: Record<string, number> = {};
  for (const [gender, counts] of Object.entries(genderCounts)) {
    genderPassRates[gender] = counts.total > 0 ? counts.pass / counts.total : 0;
  }
  const maxGenderRate = Math.max(...Object.values(genderPassRates), 0);
  for (const [gender, rate] of Object.entries(genderPassRates)) {
    const originalRate = originalMetrics.disparateImpactRatios?.[`gender_${gender}`]?.passRate / 100 || 0;
    adverseImpactImprovement[`gender_${gender}`] = rate - originalRate;
  }

  const simPassRate = snapshots.length > 0 ? (simPassCount / snapshots.length) * 100 : 0;
  const passRateChange = simPassRate - originalMetrics.passRate;

  // Simple simulated bias score (lower threshold usually reduces bias)
  const biasScoreChange = -Math.abs(passRateChange) * 0.5;

  // Get AI-powered recommendation using DeepSeek
  let aiRecommendation = '';
  try {
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-e31f4ebc00d74757a61591ebd1b296c8';
    const prompt = `You are a hiring bias expert. Analyze this threshold change:

Original pass rate: ${originalMetrics.passRate.toFixed(1)}%
New pass rate (threshold ${newThreshold}): ${simPassRate.toFixed(1)}%
Change: ${passRateChange > 0 ? '+' : ''}${passRateChange.toFixed(1)}%

Adverse impact ratios before: ${Object.entries(originalMetrics.disparateImpactRatios || {}).map(([k, d]) => `${k}: ${(d as any).adverseImpactRatio?.toFixed(3)}`).join(', ')}

Provide ONE concise sentence recommendation (max 20 words):`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      aiRecommendation = data.choices?.[0]?.message?.content?.trim() || '';
    }
  } catch (error) {
    console.error('DeepSeek recommendation error:', error);
  }

  const recommendation = aiRecommendation || (passRateChange > 0
    ? `Lowering threshold to ${newThreshold} increases overall pass rate by ${passRateChange.toFixed(1)}%. This may reduce bias against disadvantaged groups.`
    : `Raising threshold to ${newThreshold} decreases pass rate by ${Math.abs(passRateChange).toFixed(1)}%. Monitor impact on protected groups.`);

  const simulatedMetrics: BiasMetrics = {
    ...originalMetrics,
    passRate: simPassRate,
    totalSnapshots: snapshots.length,
  };

  return {
    originalMetrics,
    simulatedMetrics,
    changes: {
      passRateChange,
      adverseImpactImprovement,
      biasScoreChange,
      recommendation,
    },
  };
}

// AI-powered bias explanation using DeepSeek API directly
export async function getAIBiasExplanation(jobId?: string): Promise<{
  explanation: string;
  recommendations: string[];
  riskFactors: string[];
}> {
  const metrics = await getBiasMetrics(jobId);

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-e31f4ebc00d74757a61591ebd1b296c8';
  const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

  const prompt = `As a bias audit expert, analyze these hiring bias metrics and provide actionable insights:

Bias Risk Score: ${metrics.biasScore}/100 (${metrics.biasRiskLevel} Risk)
Total Decisions: ${metrics.totalSnapshots}
Pass Rate: ${metrics.passRate.toFixed(1)}%
Flagged Decisions: ${metrics.flaggedDecisions}

Adverse Impact Ratios (4/5ths rule - below 0.8 is problematic):
${Object.entries(metrics.disparateImpactRatios || {}).map(([key, data]) => `  ${key}: ${(data as any).adverseImpactRatio?.toFixed(3) || 'N/A'} (${(data as any).isProblematic ? 'PROBLEMATIC' : 'OK'})`).join('\n')}

Score Disparities by Gender:
${Object.entries(metrics.averageScoreByGender || {}).map(([g, s]) => `  ${g}: ${(s as number).toFixed(1)}`).join('\n')}

Score Disparities by Origin:
${Object.entries(metrics.averageScoreByNameOrigin || {}).map(([o, s]) => `  ${o}: ${(s as number).toFixed(1)}`).join('\n')}

Provide EXACTLY this format:
EXPLANATION: [2-3 sentence summary of bias situation]

RECOMMENDATIONS:
1. [First actionable recommendation]
2. [Second actionable recommendation]
3. [Third actionable recommendation]

RISK FACTORS:
- [First risk factor]
- [Second risk factor]
- [Third risk factor]`;

  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content || '';

    // Parse structured response
    const explanationMatch = content.match(/EXPLANATION:\s*([^\n]+)/i);
    const explanation = explanationMatch ? explanationMatch[1].trim() : content.substring(0, 200);

    const recommendationsMatch = content.match(/RECOMMENDATIONS:([\s\S]*?)RISK FACTORS:/i);
    const recommendations = recommendationsMatch
      ? recommendationsMatch[1].match(/\d+\.\s*(.+)/g)?.map(s => s.replace(/^\d+\.\s*/, '').trim()) || []
      : [];

    const riskFactorsMatch = content.match(/RISK FACTORS:([\s\S]*?)$/i);
    const riskFactors = riskFactorsMatch
      ? riskFactorsMatch[1].match(/[-•]\s*(.+)/g)?.map(s => s.replace(/^[-•]\s*/, '').trim()) || []
      : [];

    return {
      explanation: explanation,
      recommendations: recommendations.length > 0 ? recommendations : ['Review adverse impact ratios for groups below 0.8.'],
      riskFactors: riskFactors.length > 0 ? riskFactors : ['Monitor groups with high adverse impact ratios.'],
    };
  } catch (error) {
    console.error('DeepSeek API error:', error);
    return {
      explanation: 'Unable to connect to DeepSeek API. Please check API key configuration.',
      recommendations: ['Verify DEEPSEEK_API_KEY is set correctly.', 'Check network connectivity to api.deepseek.com.'],
      riskFactors: ['API communication failed - using fallback analysis.'],
    };
  }
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