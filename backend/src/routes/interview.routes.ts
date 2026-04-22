import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as interviewController from '../controllers/interview.controller';

const router = Router();

router.get('/session/:token', interviewController.getSessionByToken);
router.post('/session/:token/start', interviewController.startSession);
router.post('/session/:token/answers', interviewController.saveAnswer);
router.post('/session/:token/code-exec', interviewController.runCode);
router.post('/session/:token/proctor-events', interviewController.logProctorEvents);
router.post('/session/:token/submit', interviewController.submitSession);

router.get('/ranked-shortlist', requireAuth, interviewController.getRankedShortlist);
router.patch('/ranked-shortlist/:sessionId', requireAuth, interviewController.updateShortlist);

export default router;
