# AI Prescreen Verification Checklist

## Core flow

- Apply to a job with a valid CV file and verify the candidate enters `APPLIED`, then moves into `CV_PARSING`.
- Verify CV analysis persists `glmScore`, `glmAnalysis`, and `autoScreenDecision`.
- Verify a candidate above `autoScreenThreshold` moves to `AI_INTERVIEW_INVITED`.
- Verify a candidate below `autoScreenThreshold` moves to `CV_REJECTED`.
- Verify a borderline candidate can still be moved forward with `override-auto-screen-pass`.

## Interview session

- Verify the system creates or reuses an `InterviewSession` with an invite token.
- Open the public interview intro page with a valid token and verify candidate/job context loads.
- Start the interview and verify candidate status changes to `AI_INTERVIEW_IN_PROGRESS`.
- Verify question payload includes DSA, MCQ, and behavioral sections.
- Verify a bad or missing token returns a safe error.

## Answer capture and scoring

- Save a DSA answer and verify `CandidateAnswer.codeSubmission` and `programmingLanguage` persist.
- Save an MCQ answer and verify `selectedOption` persists.
- Save a behavioral answer and verify `rawAnswer` persists.
- Run code and verify `executionResult.passRate` is stored.
- Submit the interview and verify candidate status moves through `AI_INTERVIEW_COMPLETED` to `AI_INTERVIEW_SCORED`.
- Verify `aiInterviewScore`, `aiInterviewRank`, and shortlist ordering are recomputed.

## Evidence and HR review

- Verify candidate detail shows AI score, rank, and latest session evidence.
- Verify job detail shows `autoScreenThreshold`, `shortlistSize`, and ranked shortlist data.
- Verify `advance-to-human-interview` moves an AI-scored candidate back into the existing human interview flow.
- Verify `reject-after-ai` moves an AI-scored candidate to `INTERVIEW_REJECTED`.

## Integrity signals

- Trigger a tab switch during interview and verify a `ProctorEvent` is stored.
- Trigger a paste attempt and verify a `ProctorEvent` is stored.
- Verify proctor events affect score penalty in the session breakdown.

## Build checks

- `cd backend && npx prisma validate --schema prisma/schema.prisma`
- `cd backend && npx prisma generate`
- `cd backend && npm run build`
- `cd frontend && npm run build`

## Known caveats for MVP

- Code execution falls back to a deterministic stub if Judge0 is not configured.
- Behavioral scoring falls back to heuristics if the DeepSeek key is not configured.
- The current frontend build depends on local `node_modules` health; if packages are missing, run `npm install`.
