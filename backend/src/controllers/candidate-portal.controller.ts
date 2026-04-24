import { Request, Response } from 'express';
import { getCandidateById } from '../services/candidate.service';

export async function getCandidateStatus(req: Request, res: Response) {
  try {
    const token = req.params.token as string;

    const candidate = await getCandidateById(token);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        status: candidate.status,
        createdAt: candidate.createdAt,
        jobTitle: candidate.job?.title,
        glmScore: candidate.glmScore,
        aiInterviewScore: candidate.aiInterviewScore,
        interviewDate: candidate.interviewDate,
        interviewTime: candidate.interviewTime,
        history: [],
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load application status' },
    });
  }
}