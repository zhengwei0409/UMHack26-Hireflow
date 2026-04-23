import { Request, Response } from 'express';
import * as jobService from '../services/job.service';
import * as glmService from '../services/glm.service';

export async function createJob(req: Request, res: Response) {
  const {
    title,
    department,
    description,
    requirements,
    location,
    autoScreenThreshold,
    shortlistSize,
  } = req.body;

  if (!title || !department || !description || !location) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'title, department, description, and location are required' },
    });
  }

  if (!Array.isArray(requirements)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'requirements must be an array of strings' },
    });
  }

  try {
    const job = await jobService.createJob({
      title,
      department,
      description,
      requirements,
      location,
      autoScreenThreshold,
      shortlistSize,
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.status(201).json({
      success: true,
      data: {
        id: job.id,
        title: job.title,
        publicApplyUrl: `${frontendUrl}/apply/${job.id}`,
        createdAt: job.createdAt,
      },
    });
  } catch {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function draftJobFromChat(req: Request, res: Response) {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages
    .filter((message: any) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-12)
    .map((message: any) => ({
      role: message.role,
      content: message.content.slice(0, 4000),
    }));

  if (safeMessages.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'messages are required' },
    });
  }

  try {
    const result = await glmService.draftJobFromConversation(safeMessages);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'GLM_UNAVAILABLE') {
      return res.status(503).json({
        success: false,
        error: { code: 'GLM_UNAVAILABLE', message: 'GLM is not configured or did not return a response' },
      });
    }

    if (err.message === 'GLM_INVALID_JOB_DRAFT' || err.message === 'GLM_INVALID_RESPONSE') {
      return res.status(502).json({
        success: false,
        error: { code: err.message, message: 'GLM returned an invalid job draft response' },
      });
    }

    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function listJobs(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);

  try {
    const result = await jobService.listJobs({ status, page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function getJob(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  try {
    const job = await jobService.getJobById(id);
    return res.status(200).json({ success: true, data: job });
  } catch (err: any) {
    if (err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function updateJob(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const {
    title,
    department,
    description,
    requirements,
    location,
    autoScreenThreshold,
    shortlistSize,
  } = req.body;

  try {
    const job = await jobService.updateJob(id, {
      title,
      department,
      description,
      requirements,
      location,
      autoScreenThreshold,
      shortlistSize,
    });
    return res.status(200).json({ success: true, data: job });
  } catch (err: any) {
    if (err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function updatePrescreenConfig(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;
  const { autoScreenThreshold, shortlistSize } = req.body ?? {};

  try {
    const job = await jobService.updateJob(id, {
      autoScreenThreshold,
      shortlistSize,
    });
    return res.status(200).json({ success: true, data: job });
  } catch (err: any) {
    if (err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}

export async function deleteJob(req: Request<{ id: string }>, res: Response) {
  const { id } = req.params;

  try {
    await jobService.closeJob(id);
    return res.status(200).json({ success: true, data: { message: 'Job closed successfully' } });
  } catch (err: any) {
    if (err.message === 'JOB_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found' } });
    }
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}
