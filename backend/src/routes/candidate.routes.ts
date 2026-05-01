import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';
import * as candidateController from '../controllers/candidate.controller';
import * as workflowController from '../controllers/workflow.controller';
import * as interviewController from '../controllers/interview.controller';

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
      cb(new Error('INVALID_CV_FILE_TYPE'));
    }
  },
});

const router = Router();

const uploadCv = (req: Request, res: Response, next: NextFunction) => {
  upload.single('cvFile')(req, res, (err: any) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'CV_FILE_TOO_LARGE',
          message: 'Your CV is too large. Please upload a PDF or DOCX file smaller than 5MB.',
        },
      });
    }

    if (err.message === 'INVALID_CV_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CV_FILE_TYPE',
          message: 'Please upload your CV as a PDF or DOCX file only.',
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: {
        code: 'CV_UPLOAD_FAILED',
        message: 'We could not upload your CV. Please try again with a PDF or DOCX file smaller than 5MB.',
      },
    });
  });
};

// Public — candidate submits application
router.post('/apply', uploadCv, candidateController.applyToJob);

// Public — candidate downloads their own CV (using candidate ID as token)
router.get('/:id/cv', candidateController.downloadCv);

// Protected — HR only
router.get('/', requireAuth, candidateController.listCandidates);
router.get('/:id', requireAuth, candidateController.getCandidate);
router.delete('/:id', requireAuth, candidateController.deleteCandidate);
router.get('/:id/history', requireAuth, workflowController.getHistory);
router.get('/:id/ai-report', requireAuth, interviewController.getCandidateAiReport);

// Workflow actions
router.post('/:id/actions/accept-cv', requireAuth, workflowController.acceptCv);
router.post('/:id/actions/reject-cv', requireAuth, workflowController.rejectCv);
router.post('/:id/actions/override-auto-screen-pass', requireAuth, workflowController.overrideAutoScreenPass);
router.post('/:id/actions/schedule-interview', requireAuth, workflowController.scheduleInterview);
router.post('/:id/actions/mark-interview-done', requireAuth, workflowController.markInterviewDone);
router.post('/:id/actions/accept-interview', requireAuth, workflowController.acceptInterview);
router.post('/:id/actions/reject-interview', requireAuth, workflowController.rejectInterview);
router.post('/:id/actions/advance-to-human-interview', requireAuth, workflowController.advanceToHumanInterview);
router.post('/:id/actions/mark-hired', requireAuth, workflowController.markHired);
router.post('/:id/actions/retry', requireAuth, workflowController.retry);

// Public — candidate responds to interview
router.post('/respond/:id/confirm', workflowController.confirmInterview);
router.post('/respond/:id/reschedule', workflowController.requestReschedule);

export default router;
