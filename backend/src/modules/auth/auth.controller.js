const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const prisma = require('../../config/db');
const { decrypt } = require('../../utils/encryption');
const logger = require('../../utils/logger');

/**
 * Generate a JWT for a user
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * GET /auth/google/callback
 * Called by Passport after Google OAuth success.
 * Issues a JWT and redirects to frontend.
 */
const googleCallback = (req, res) => {
  try {
    const token = generateToken(req.user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Redirect to frontend with token in query param
    // Frontend will store it in localStorage
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

/**
 * GET /auth/me
 * Return current user profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        createdAt: true,
        preference: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 * Revoke Google token and optionally clear session
 */
const logout = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const accessToken = decrypt(user.accessToken);

    // Revoke the Google OAuth token
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ access_token: accessToken });
      await oauth2Client.revokeToken(accessToken);
    } catch (revokeErr) {
      // Token might already be expired — log but don't fail logout
      logger.warn(`Token revocation failed for user ${req.user.id}:`, revokeErr.message);
    }

    // Clear tokens from DB
    await prisma.user.update({
      where: { id: req.user.id },
      data: { accessToken: '', refreshToken: '' },
    });

    logger.info(`User ${req.user.email} logged out`);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { googleCallback, getMe, logout, generateToken };
