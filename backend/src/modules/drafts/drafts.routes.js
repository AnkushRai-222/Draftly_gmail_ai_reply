const express = require('express');
const {
  generate,
  list,
  getOne,
  update,
  approve,
  reject,
  send,
  regenerate,
  logs,
  queueStats,
} = require('./drafts.controller');
const { authenticate } = require('../../middleware/auth');
const { aiLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();
router.use(authenticate);

// ── Specific routes first (before /:id) ──────────────────────────────────────

/** GET /drafts/logs — sent history */
router.get('/logs', logs);

/** GET /drafts/queue-stats — BullMQ queue monitor */
router.get('/queue-stats', queueStats);

/** POST /drafts/generate — generate AI draft */
router.post('/generate', aiLimiter, generate);

// ── CRUD routes ───────────────────────────────────────────────────────────────

/** GET /drafts — list all drafts (filter by ?status=pending|approved|sent|rejected) */
router.get('/', list);

/** GET /drafts/:id */
router.get('/:id', getOne);

/** PATCH /drafts/:id — edit content or tone */
router.patch('/:id', update);

/** POST /drafts/:id/approve */
router.post('/:id/approve', approve);

/** POST /drafts/:id/reject */
router.post('/:id/reject', reject);

/** POST /drafts/:id/send — enqueue for sending */
router.post('/:id/send', send);

/** POST /drafts/:id/regenerate — re-generate with optional new tone */
router.post('/:id/regenerate', aiLimiter, regenerate);

module.exports = router;
