import { Router } from 'express';
import * as candidatePortalController from '../controllers/candidate-portal.controller';

const router = Router();

router.get('/:token', candidatePortalController.getCandidateStatus);

export default router;