import { Router } from 'express';
import { getCandidateById } from '../services/candidate.service';
import { loadTextFromCv, extractCvHighlights, extractCompleteCVAnalysis } from '../services/glm.service';
import { performDeepInvestigation } from '../services/investigation.service';

const router = Router();

router.get('/:candidateId/cv-text', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await getCandidateById(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    if (!candidate.cvFilePath) {
      return res.status(404).json({ success: false, error: 'CV file not found' });
    }

    const text = await loadTextFromCv(candidate.cvFilePath);

    return res.json({
      success: true,
      data: { text, candidateId },
    });
  } catch (error) {
    console.error('CV text extraction failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to extract CV text' });
  }
});

router.get('/:candidateId/cv-highlights', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const candidate = await getCandidateById(candidateId);

    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    if (!candidate.cvFilePath) {
      return res.status(404).json({ success: false, error: 'CV file not found' });
    }

    const text = await loadTextFromCv(candidate.cvFilePath);
    const requirementsRaw = candidate.job?.requirements;
    const jobRequirements = Array.isArray(requirementsRaw) ? requirementsRaw : [];

    const analysis = await extractCompleteCVAnalysis(text, jobRequirements);

    let deepInvestigation = null;
    if (analysis.links && analysis.links.length > 0) {
      try {
        console.log('[CV ROUTES] Auto-running deep investigation for links:', analysis.links.map(l => l.platform));
        deepInvestigation = await performDeepInvestigation(text, analysis.links);
      } catch (err) {
        console.error('[CV ROUTES] Deep investigation failed:', err);
      }
    }

    return res.json({
      success: true,
      data: {
        ...analysis,
        deepInvestigation: deepInvestigation || null,
      },
    });
  } catch (error) {
    console.error('CV highlights extraction failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to extract highlights' });
  }
});

export default router;