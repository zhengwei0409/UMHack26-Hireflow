import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';
import * as candidateController from '../controllers/candidate.controller';
import * as workflowController from '../controllers/workflow.controller';

const storage = multer.diskStorage({
  destination: 'uploads/cv/',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
});

const router = Router();

// Public — candidate submits application
router.post('/apply', upload.single('cvFile'), candidateController.applyToJob);

// Protected — HR only
router.get('/', requireAuth, candidateController.listCandidates);
router.get('/:id', requireAuth, candidateController.getCandidate);
router.delete('/:id', requireAuth, candidateController.deleteCandidate);
router.get('/:id/cv', requireAuth, candidateController.downloadCv);
router.get('/:id/history', requireAuth, workflowController.getHistory);

// Workflow actions
router.post('/:id/actions/accept-cv', requireAuth, workflowController.acceptCv);
router.post('/:id/actions/reject-cv', requireAuth, workflowController.rejectCv);
router.post('/:id/actions/schedule-interview', requireAuth, workflowController.scheduleInterview);
router.post('/:id/actions/mark-interview-done', requireAuth, workflowController.markInterviewDone);
router.post('/:id/actions/accept-interview', requireAuth, workflowController.acceptInterview);
router.post('/:id/actions/reject-interview', requireAuth, workflowController.rejectInterview);
router.post('/:id/actions/retry', requireAuth, workflowController.retry);

// Public — candidate responds to interview
router.post('/respond/:id/confirm', workflowController.confirmInterview);
router.post('/respond/:id/reschedule', workflowController.requestReschedule);

export default router;
