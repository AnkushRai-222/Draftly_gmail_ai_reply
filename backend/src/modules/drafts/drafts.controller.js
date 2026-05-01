const {
  generateDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  approveDraft,
  rejectDraft,
  sendDraft,
  getSentLogs,
} = require('./drafts.service');
const { getQueueStats } = require('../../jobs/queue');

/**
 * POST /drafts/generate
 * Body: { emailId, tone? }
 */
const generate = async (req, res, next) => {
  try {
    const { emailId, tone } = req.body;

    if (!emailId) {
      return res.status(400).json({ success: false, message: 'emailId is required.' });
    }

    const draft = await generateDraft(req.user, { emailId, tone });

    res.status(201).json({
      success: true,
      data: draft,
      message: `Draft generated using ${draft.aiProvider} (${draft.aiModel}).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /drafts
 * Query: status, page, limit
 */
const list = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await getDrafts(req.user.id, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /drafts/:id
 */
const getOne = async (req, res, next) => {
  try {
    const draft = await getDraftById(req.params.id, req.user.id);
    res.json({ success: true, data: draft });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /drafts/:id
 * Body: { content?, tone? }
 */
const update = async (req, res, next) => {
  try {
    const { content, tone } = req.body;
    const draft = await updateDraft(req.params.id, req.user.id, { content, tone });
    res.json({ success: true, data: draft, message: 'Draft updated.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /drafts/:id/approve
 */
const approve = async (req, res, next) => {
  try {
    const draft = await approveDraft(req.params.id, req.user.id);
    res.json({ success: true, data: draft, message: 'Draft approved. Ready to send.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /drafts/:id/reject
 * Body: { reason? }
 */
const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const draft = await rejectDraft(req.params.id, req.user.id, reason);
    res.json({ success: true, data: draft, message: 'Draft rejected.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /drafts/:id/send
 * Enqueues the approved draft for sending
 */
const send = async (req, res, next) => {
  try {
    const result = await sendDraft(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /drafts/:id/regenerate
 * Body: { tone? } — re-generates AI draft with optional new tone
 */
const regenerate = async (req, res, next) => {
  try {
    const { tone } = req.body;

    // Get current draft to find the emailId
    const current = await getDraftById(req.params.id, req.user.id);

    const draft = await generateDraft(req.user, {
      emailId: current.emailId,
      tone: tone || current.tone,
    });

    res.json({
      success: true,
      data: draft,
      message: `Draft regenerated using ${draft.aiProvider}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /drafts/logs
 * Sent history with pagination
 */
const logs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await getSentLogs(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /drafts/queue-stats
 * Monitor the BullMQ queue (admin-friendly)
 */
const queueStats = async (req, res, next) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

module.exports = { generate, list, getOne, update, approve, reject, send, regenerate, logs, queueStats };
