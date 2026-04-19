import { Request, Response } from 'express';
import path from 'path';
import * as candidateService from '../services/candidate.service';

export async function applyToJob(req: Request, res: Response) {
  const { jobId, fullName, email, phone } = req.body;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!jobId || !fullName || !email) {
    if (file) require('fs').unlinkSync(file.path);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'jobId, fullName, and email are required' },
    });
  }

  if (!file) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'cvFile is required' },
    });
  }

  try {
    const candidate = await candidateService.applyToJob({
      jobId,
      fullName,
      email,
      phone,
      cvFilePath: file.path,
    });

    return res.status(201).json({
      success: true,
      data: {
        candidateId: candidate.id,
        status: candidate.status,
        message: 'Application received. We will contact you soon.',
      },
    });
  } catch (err: any) {
    require('fs').unlinkSync(file.path);
    if (err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    }
    if (err.message === 'JOB_CLOSED') {
      return res.status(400).json({ success: false, error: { code: 'JOB_CLOSED', message: 'This job is no longer accepting applications' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function listCandidates(req: Request, res: Response) {
  const jobId = req.query.jobId as string | undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);

  try {
    const result = await candidateService.listCandidates({ jobId, status, page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function getCandidate(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  try {
    const candidate = await candidateService.getCandidateById(id);
    return res.status(200).json({ success: true, data: candidate });
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function downloadCv(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  try {
    const filePath = await candidateService.getCvFilePath(id);
    return res.download(filePath);
  } catch (err: any) {
    if (err.message === 'CANDIDATE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' } });
    }
    if (err.message === 'CV_FILE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'CV_FILE_NOT_FOUND', message: 'CV file not found on server' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}
