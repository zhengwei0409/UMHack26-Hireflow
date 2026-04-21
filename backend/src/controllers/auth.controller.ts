import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import * as authService from '../services/auth.service';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email, password, and name are required' },
    });
  }

  try {
    const result = await authService.registerUser(email, password, name);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
    });
  }

  try {
    const result = await authService.loginUser(email, password);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  }
}

export function googleRedirect(_req: Request, res: Response) {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
  });
  res.redirect(url);
}

export async function googleCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: { code: 'MISSING_CODE', message: 'No auth code provided' } });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload()!;
    const email = payload.email!;
    const name = payload.name || email;

    const result = await authService.findOrCreateGoogleUser(email, name);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'GOOGLE_AUTH_FAILED', message: 'Google authentication failed' } });
  }
}

export async function me(req: Request, res: Response) {
  // req.userId is set by the auth middleware
  const userId = (req as any).userId;

  try {
    const user = await authService.getUserById(userId);
    return res.status(200).json({ success: true, data: user });
  } catch {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
    });
  }

  try {
    await authService.forgotPassword(email);
    // Always return success for security (don't reveal if email exists)
    return res.status(200).json({
      success: true,
      data: { message: 'If an account exists with this email, a reset link will be sent.' },
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  }
}
