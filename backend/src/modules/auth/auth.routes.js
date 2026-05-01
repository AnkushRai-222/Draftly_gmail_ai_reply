const express = require('express');
const passport = require('passport');
const { googleCallback, getMe, logout } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

/**
 * GET /auth/google
 * Initiate Google OAuth2 flow.
 * Scopes requested:
 *  - email, profile (basic user info)
 *  - gmail.modify (read + send emails, create drafts)
 *  - gmail.send (send emails)
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', {
    scope: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    accessType: 'offline',    // Get refresh token
    prompt: 'consent',        // Force consent to always get refresh token
  })
);

/**
 * GET /auth/google/callback
 * Google redirects here after user consent.
 * On success → redirect to frontend with JWT token.
 * On failure → redirect to login page with error.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  googleCallback
);

/**
 * GET /auth/me
 * Returns the current authenticated user's profile.
 */
router.get('/me', authenticate, getMe);

/**
 * POST /auth/logout
 * Revokes Google token and clears stored credentials.
 */
router.post('/logout', authenticate, logout);

module.exports = router;
