const express = require('express');
const { getEmails, getEmailById, skipEmail } = require('./emails.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// All email routes require authentication
router.use(authenticate);

/**
 * GET /emails
 * Query params: maxResults, onlyUnread, pageToken, refresh
 */
router.get('/', getEmails);

/**
 * GET /emails/:id
 */
router.get('/:id', getEmailById);

/**
 * POST /emails/:id/skip
 * Manually filter out an email
 */
router.post('/:id/skip', skipEmail);

module.exports = router;
