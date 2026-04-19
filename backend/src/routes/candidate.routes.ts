import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';
import * as candidateController from '../controllers/candidate.controller';

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
router.get('/:id/cv', requireAuth, candidateController.downloadCv);

export default router;
