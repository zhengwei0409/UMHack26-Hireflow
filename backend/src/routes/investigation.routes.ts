import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as investigationController from '../controllers/investigation.controller';

const router = Router();

router.post('/investigate/:candidateId', requireAuth, investigationController.runInvestigation);
router.get('/investigation/:candidateId', requireAuth, investigationController.getInvestigationResult);
router.post('/deep-investigate/:candidateId', requireAuth, investigationController.runDeepInvestigation);

export default router;