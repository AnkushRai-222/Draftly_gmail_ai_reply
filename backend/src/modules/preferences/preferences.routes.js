const express = require('express');
const prisma = require('../../config/db');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /preferences
 */
router.get('/', async (req, res, next) => {
  try {
    const pref = await prisma.preference.findUnique({
      where: { userId: req.user.id },
    });
    res.json({ success: true, data: pref });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /preferences
 * Body: { defaultTone, signature, autoGenerate, preferredModel }
 */
router.put('/', async (req, res, next) => {
  try {
    const { defaultTone, signature, autoGenerate, preferredModel } = req.body;

    const validTones = ['professional', 'friendly', 'concise', 'formal', 'casual'];
    if (defaultTone && !validTones.includes(defaultTone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone. Valid options: ${validTones.join(', ')}`,
      });
    }

    const pref = await prisma.preference.upsert({
      where: { userId: req.user.id },
      update: {
        ...(defaultTone !== undefined && { defaultTone }),
        ...(signature !== undefined && { signature }),
        ...(autoGenerate !== undefined && { autoGenerate }),
        ...(preferredModel !== undefined && { preferredModel }),
      },
      create: {
        userId: req.user.id,
        defaultTone: defaultTone || 'professional',
        signature: signature || '',
        autoGenerate: autoGenerate || false,
        preferredModel: preferredModel || 'openrouter',
      },
    });

    res.json({ success: true, data: pref, message: 'Preferences updated.' });
  } catch (error) {
    next(error);
  }
});

// ─── Filter Rules ─────────────────────────────────────────────────────────────

/**
 * GET /preferences/filters
 */
router.get('/filters', async (req, res, next) => {
  try {
    const rules = await prisma.filterRule.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /preferences/filters
 * Body: { type, value, action }
 * type: "sender" | "subject_keyword" | "label"
 * action: "skip" | "allow"
 */
router.post('/filters', async (req, res, next) => {
  try {
    const { type, value, action } = req.body;

    const validTypes = ['sender', 'subject_keyword', 'label'];
    const validActions = ['skip', 'allow'];

    if (!type || !value || !action) {
      return res.status(400).json({
        success: false,
        message: 'type, value, and action are required.',
      });
    }
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid: ${validTypes.join(', ')}`,
      });
    }
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Valid: ${validActions.join(', ')}`,
      });
    }

    const rule = await prisma.filterRule.create({
      data: { userId: req.user.id, type, value, action },
    });

    res.status(201).json({ success: true, data: rule, message: 'Filter rule created.' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /preferences/filters/:id
 */
router.delete('/filters/:id', async (req, res, next) => {
  try {
    const rule = await prisma.filterRule.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Filter rule not found.' });
    }

    await prisma.filterRule.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Filter rule deleted.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
