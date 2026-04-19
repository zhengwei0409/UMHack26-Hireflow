import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public — no token needed
router.post('/register', authController.register);
router.post('/login', authController.login);

// Google OAuth
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);

// Protected — must be logged in
router.get('/me', requireAuth, authController.me);

export default router;
