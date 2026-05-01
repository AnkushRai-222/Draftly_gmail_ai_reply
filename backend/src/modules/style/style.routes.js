const express = require('express');
const { learnUserStyle, getStyleProfile } = require('./style.service');
const { authenticate } = require('../../middleware/auth');
const { aiLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();
router.use(authenticate);

/**
 * GET /style
 * Get current style profile
 */
router.get('/', async (req, res, next) => {
  try {
    const profile = await getStyleProfile(req.user.id);

    if (!profile) {
      return res.json({
        success: true,
        data: null,
        message: 'No style profile yet. Send a POST /style/learn to generate one.',
      });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /style/learn
 * Trigger style analysis from sent emails.
 * Query param: ?force=true to force re-analysis even if recent.
 */
router.post('/learn', aiLimiter, async (req, res, next) => {
  try {
    const { force = false } = req.query;

    const profile = await learnUserStyle(req.user, { force: force === 'true' });

    res.json({
      success: true,
      data: profile,
      message: 'Style profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
