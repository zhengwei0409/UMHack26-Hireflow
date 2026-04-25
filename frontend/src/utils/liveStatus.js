const LIVE_CANDIDATE_STATUSES = new Set([
  'APPLIED',
  'CV_PARSING',
  'AI_INTERVIEW_IN_PROGRESS',
  'AI_INTERVIEW_COMPLETED',
  'OFFER_GENERATING',
]);

export const isLiveCandidateStatus = (status) =>
  LIVE_CANDIDATE_STATUSES.has(String(status || '').toUpperCase());

export const hasLiveCandidateStatus = (candidates = []) =>
  candidates.some((candidate) => isLiveCandidateStatus(candidate.status));
