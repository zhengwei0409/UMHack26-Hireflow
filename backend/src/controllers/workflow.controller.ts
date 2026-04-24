import { Request, Response } from 'express';
import * as engine from '../workflow/engine';
import * as automation from '../services/workflow-automation.service';

const NEXT_ACTIONS: Record<string, string[]> = {
  AI_INTERVIEW_INVITED: ['Candidate can open the AI interview link to begin the prescreen'],
  AI_INTERVIEW_IN_PROGRESS: ['Wait for the candidate to submit the AI interview'],
  AI_INTERVIEW_COMPLETED: ['AI scoring will finalize the result automatically'],
  AI_INTERVIEW_SCORED: ['Review AI evidence, then accept for human interview or reject'],
  INTERVIEW_PENDING: ['Schedule interview time slot'],
  INTERVIEW_SCHEDULED: ['Candidate will receive email to confirm'],
  INTERVIEW_CONFIRMED: ['Mark interview as done after completion'],
  INTERVIEW_RESCHEDULE_REQUESTED: ['Review and reschedule interview'],
  CV_REJECTED: [],
  OFFER_GENERATING: ['Offer letter will be generated automatically'],
  INTERVIEW_REJECTED: [],
  CV_PARSING: ['GLM analysis will start automatically'],
  INTERVIEW_DONE: ['HR can now accept or reject the candidate'],
  CV_UNDER_REVIEW: ['Review GLM analysis and make decision'],
};

async function handleAction(req: Request<{ id: string }>, res: Response, action: string) {
  const { id } = req.params;
  const { note } = req.body ?? {};
  const triggeredBy = (req as any).user?.id ?? 'UNKNOWN';

  try {
    const { previousStatus, newStatus } = await engine.applyAction(id, action, triggeredBy, note);

    if (action === 'accept-cv') {
      await automation.onAcceptCV(id).catch((err) => {
        console.error('onAcceptCV automation failed:', err.message);
      });
    } else if (action === 'reject-cv') {
      await automation.onRejectCV(id).catch((err) => {
        console.error('onRejectCV automation failed:', err.message);
      });
    } else if (action === 'accept-interview') {
      await automation.onAcceptInterview(id).catch((err) => {
        console.error('onAcceptInterview automation failed:', err.message);
      });
    } else if (action === 'reject-interview' || action === 'reject-after-ai') {
      await automation.onRejectInterview(id).catch((err) => {
        console.error('reject automation failed:', err.message);
      });
    } else if (action === 'mark-interview-done') {
      // No automation needed after marking interview done - just wait for HR decision
    } else if (action === 'advance-to-human-interview') {
      // HR accepted the candidate for a human interview. Scheduling is the next step.
    }

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

export const advanceToHumanInterview = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'advance-to-human-interview');

export const overrideAutoScreenPass = (req: Request<{ id: string }>, res: Response) =>
  handleAction(req, res, 'override-auto-screen-pass');

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

export async function scheduleInterview(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { date, time, location, meetingLink, note } = req.body ?? {};
  const triggeredBy = (req as any).user?.id ?? 'UNKNOWN';

  if (!date || !time || !location) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'date, time, and location are required' } });
  }

  try {
    const { newStatus } = await engine.applyAction(id, 'schedule-interview', triggeredBy, note);
    await automation.scheduleInterview(id, { date, time, location, meetingLink });
    return res.status(200).json({ success: true, data: { candidateId: id, message: 'Interview scheduled', newStatus } });
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    if (err.message === 'INVALID_STATE_FOR_ACTION') {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATE_FOR_ACTION', message: 'Candidate is not ready for interview scheduling' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function confirmInterview(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { email } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'email is required' } });
  }

  try {
    await automation.confirmInterview(id, email);
    return res.status(200).json({ success: true, data: { candidateId: id, message: 'Interview confirmed' } });
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    if (err.message === 'UNAUTHORIZED') {
      return res.status(403).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Email does not match' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function requestReschedule(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { email, reason } = req.body ?? {};

  if (!email) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'email is required' } });
  }

  try {
    await automation.requestReschedule(id, email, reason);
    return res.status(200).json({ success: true, data: { candidateId: id, message: 'Reschedule request submitted' } });
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    if (err.message === 'UNAUTHORIZED') {
      return res.status(403).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Email does not match' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}
