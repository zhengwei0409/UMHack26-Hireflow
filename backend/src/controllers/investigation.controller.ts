import { Request, Response } from 'express';
import { investigateCandidate, getInvestigationResult as getInvestigation } from '../services/investigation.service';
import { performDeepInvestigation } from '../services/investigation.service';
import { loadTextFromCv } from '../services/glm.service';
import { getCandidateById } from '../services/candidate.service';
import { extractCvHighlights, ExtractedLink } from '../services/glm.service';
import { prisma } from '../config/prisma';

export async function runInvestigation(req: Request, res: Response) {
  try {
    const candidateId = req.params.candidateId as string;
    const { githubUrl, linkedinUrl } = req.body;

    const result = await investigateCandidate(candidateId, { githubUrl, linkedinUrl });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Investigation failed';
    res.status(400).json({ success: false, error: message });
  }
}

export async function getInvestigationResult(req: Request, res: Response) {
  try {
    const candidateId = req.params.candidateId as string;

    const result = await getInvestigation(candidateId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get investigation result';
    res.status(400).json({ success: false, error: message });
  }
}

export async function runDeepInvestigation(req: Request, res: Response) {
  try {
    const candidateId = req.params.candidateId as string;
    const candidate = await getCandidateById(candidateId);

    if (!candidate || !candidate.cvFilePath) {
      return res.status(404).json({ success: false, error: 'Candidate or CV not found' });
    }

    const cvText = await loadTextFromCv(candidate.cvFilePath);
    const requirementsRaw = candidate.job?.requirements;
    const jobRequirements = Array.isArray(requirementsRaw) ? requirementsRaw : [];

    const highlights = await extractCvHighlights(cvText, jobRequirements);
    const existingLinks: ExtractedLink[] = highlights.links || [];

    const result = await performDeepInvestigation(cvText, existingLinks);

    // Save deep investigation result to database
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        investigationResult: result as any,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Deep investigation failed';
    res.status(400).json({ success: false, error: message });
  }
}