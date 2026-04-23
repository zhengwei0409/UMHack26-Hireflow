import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request, Response } from 'express';
import * as interviewService from '../services/interview-orchestrator.service';
import * as proctorService from '../services/proctor.service';
import * as rankingService from '../services/ranking.service';

const uploadDir = path.resolve(process.cwd(), 'uploads', 'interview-recordings');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeToken = String(req.params.token || 'session').replace(/[^a-zA-Z0-9_-]/g, '');
    const extension = path.extname(file.originalname) || '.webm';
    cb(null, `${safeToken}-${file.fieldname}-${Date.now()}${extension}`);
  },
});

export const interviewRecordingUpload = multer({ storage }).fields([
  { name: 'screenRecording', maxCount: 1 },
  { name: 'cameraRecording', maxCount: 1 },
]);

function mapInterviewError(err: Error) {
  const errorMap: Record<string, [number, string]> = {
    SESSION_NOT_FOUND: [404, 'Interview session not found'],
    SESSION_ALREADY_COMPLETED: [409, 'This AI interview link has already been used. Each candidate can only complete it once.'],
    SESSION_NOT_STARTED: [409, 'Please start the interview before submitting answers.'],
    QUESTION_NOT_FOUND: [404, 'Interview question not found'],
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

export async function uploadInterviewRecordings(req: Request<{ token: string }>, res: Response) {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const screenRecording = files?.screenRecording?.[0];
    const cameraRecording = files?.cameraRecording?.[0];
    const metadata =
      typeof req.body?.metadata === 'string' && req.body.metadata
        ? JSON.parse(req.body.metadata)
        : undefined;

    if (!screenRecording && !cameraRecording) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one recording file is required' },
      });
    }

    const recordings = await interviewService.attachInterviewRecordings(req.params.token, {
      screenRecording: screenRecording
        ? {
            path: path.relative(process.cwd(), screenRecording.path).replace(/\\/g, '/'),
            filename: screenRecording.filename,
            mimeType: screenRecording.mimetype,
            size: screenRecording.size,
          }
        : undefined,
      cameraRecording: cameraRecording
        ? {
            path: path.relative(process.cwd(), cameraRecording.path).replace(/\\/g, '/'),
            filename: cameraRecording.filename,
            mimeType: cameraRecording.mimetype,
            size: cameraRecording.size,
          }
        : undefined,
      metadata,
    });

    return res.status(201).json({ success: true, data: recordings });
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
