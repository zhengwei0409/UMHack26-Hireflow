import { Request, Response } from 'express';
import * as interviewService from '../services/interview-orchestrator.service';
import * as proctorService from '../services/proctor.service';
import * as rankingService from '../services/ranking.service';

function mapInterviewError(err: Error) {
  const errorMap: Record<string, [number, string]> = {
    SESSION_NOT_FOUND: [404, 'Interview session not found'],
    QUESTION_NOT_FOUND: [404, 'Interview question not found'],
    QUESTION_NOT_CODE: [400, 'This question does not support code execution'],
    CANDIDATE_NOT_FOUND: [404, 'Candidate not found'],
  };

  return errorMap[err.message] ?? [500, 'Something went wrong'];
}

export async function getSessionByToken(req: Request<{ token: string }>, res: Response) {
  try {
    const session = await interviewService.getInterviewSessionByToken(req.params.token);
    return res.status(200).json({ success: true, data: session });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function startSession(req: Request<{ token: string }>, res: Response) {
  try {
    const session = await interviewService.startInterviewSession(req.params.token);
    return res.status(200).json({ success: true, data: session });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function saveAnswer(req: Request<{ token: string }>, res: Response) {
  const { questionId, rawAnswer, selectedOption, codeSubmission, programmingLanguage, metadata } = req.body ?? {};

  if (!questionId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_QUESTION_ID', message: 'questionId is required' } });
  }

  try {
    const result = await interviewService.upsertInterviewAnswer(req.params.token, {
      questionId,
      rawAnswer,
      selectedOption,
      codeSubmission,
      programmingLanguage,
      metadata,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function runCode(req: Request<{ token: string }>, res: Response) {
  const { questionId, language, sourceCode } = req.body ?? {};

  if (!questionId || !language || !sourceCode) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'questionId, language, and sourceCode are required' },
    });
  }

  try {
    const result = await interviewService.executeInterviewCode(req.params.token, {
      questionId,
      language,
      sourceCode,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function submitSession(req: Request<{ token: string }>, res: Response) {
  try {
    const result = await interviewService.submitInterviewSession(req.params.token);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function logProctorEvents(req: Request<{ token: string }>, res: Response) {
  const { events } = req.body ?? {};

  if (!Array.isArray(events)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'events must be an array' } });
  }

  try {
    const session = await interviewService.getInterviewSessionByToken(req.params.token);
    const created = await proctorService.logProctorEvents(session.id, events);
    return res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function getRankedShortlist(req: Request, res: Response) {
  try {
    const jobId =
      typeof req.params.id === 'string'
        ? req.params.id
        : typeof req.query.jobId === 'string'
          ? req.query.jobId
          : undefined;
    const shortlist = await rankingService.getRankedShortlist(jobId);
    return res.status(200).json({ success: true, data: shortlist });
  } catch {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unable to load shortlist' } });
  }
}

export const getShortlist = getRankedShortlist;

export async function updateShortlist(req: Request<{ sessionId: string }>, res: Response) {
  const shortlisted = Boolean(req.body?.shortlisted);

  try {
    const updated = await rankingService.setShortlistStatus(req.params.sessionId, shortlisted);
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export async function getCandidateAiReport(req: Request<{ id: string }>, res: Response) {
  try {
    const report = await rankingService.getCandidateAiReport(req.params.id);
    return res.status(200).json({ success: true, data: report });
  } catch (err: any) {
    const [status, message] = mapInterviewError(err);
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}
