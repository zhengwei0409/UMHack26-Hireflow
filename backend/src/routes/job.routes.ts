import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protected — HR must be logged in
router.post('/', requireAuth, jobController.createJob);
router.get('/', requireAuth, jobController.listJobs);
router.patch('/:id', requireAuth, jobController.updateJob);
router.delete('/:id', requireAuth, jobController.deleteJob);

// Public — candidates can view job details without logging in
router.get('/:id', jobController.getJob);

export default router;
