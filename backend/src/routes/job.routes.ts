import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import * as interviewController from '../controllers/interview.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protected — HR must be logged in
router.post('/', requireAuth, jobController.createJob);
router.post('/draft-from-chat', requireAuth, jobController.draftJobFromChat);
router.get('/', requireAuth, jobController.listJobs);
router.get('/:id/shortlist', requireAuth, interviewController.getShortlist);
router.patch('/:id/prescreen-config', requireAuth, jobController.updatePrescreenConfig);
router.patch('/:id', requireAuth, jobController.updateJob);
router.delete('/:id', requireAuth, jobController.deleteJob);

// Public — candidates can view job details without logging in
router.get('/:id', jobController.getJob);

export default router;
