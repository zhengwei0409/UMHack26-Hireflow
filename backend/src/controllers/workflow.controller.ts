import { Request, Response } from 'express';
import * as engine from '../workflow/engine';

const NEXT_ACTIONS: Record<string, string[]> = {
  INTERVIEW_PENDING: ['Email will be sent automatically'],
  CV_REJECTED: [],
  OFFER_GENERATING: ['Offer letter will be generated automatically'],
  INTERVIEW_REJECTED: [],
  CV_PARSING: ['GLM analysis will start automatically'],
  INTERVIEW_DONE: ['HR can now accept or reject the interview'],
};

async function handleAction(req: Request<{ id: string }>, res: Response, action: string) {
  const { id } = req.params;
  const { note } = req.body ?? {};
  const triggeredBy = (req as any).user?.id ?? 'UNKNOWN';

  try {
    const { previousStatus, newStatus } = await engine.applyAction(id, action, triggeredBy, note);
    return res.status(200).json({
      success: true,
      data: {
        candidateId: id,
        previousStatus,
        newStatus,
        nextActions: NEXT_ACTIONS[newStatus] ?? [],
      },
    });
  } catch (err: any) {
    const errorMap: Record<string, [number, string]> = {
      CANDIDATE_NOT_FOUND: [404, 'Candidate not found'],
      INVALID_ACTION: [400, 'Invalid action'],
      INVALID_STATE_FOR_ACTION: [409, 'Candidate is not in the required state for this action'],
      CANDIDATE_IN_TERMINAL_STATE: [409, 'Candidate is already in a terminal state'],
      RETRY_NOT_ALLOWED: [409, 'Retry is not allowed from the current state'],
    };
    const [status, message] = errorMap[err.message] ?? [500, 'Something went wrong'];
    return res.status(status).json({ success: false, error: { code: err.message, message } });
  }
}

export const acceptCv = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'accept-cv');

export const rejectCv = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'reject-cv');

export const markInterviewDone = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'mark-interview-done');

export const acceptInterview = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'accept-interview');

export const rejectInterview = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'reject-interview');

export const retry = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'retry');

export async function getHistory(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  try {
    const history = await engine.getHistory(id);
    const formatted = history.map((h) => ({
      from: h.fromStatus,
      to: h.toStatus,
      event: h.event,
      triggeredBy: h.triggeredBy,
      at: h.createdAt,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}
