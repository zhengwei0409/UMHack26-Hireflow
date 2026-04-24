import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as biasAuditController from '../controllers/bias-audit.controller';

const router = Router();

router.get('/metrics', requireAuth, biasAuditController.getBiasMetrics);
router.get('/snapshots', requireAuth, biasAuditController.getRecentSnapshots);
router.get('/snapshots/:candidateId', requireAuth, biasAuditController.getSnapshotsForCandidate);

export default router;