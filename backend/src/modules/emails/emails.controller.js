const prisma = require('../../config/db');
const { fetchEmails, getEmail } = require('./gmail.service');
const { generateDraft } = require('../drafts/drafts.service');
const logger = require('../../utils/logger');

/**
 * GET /emails
 * Fetch and sync recent emails from Gmail.
 * Returns emails split into actionable vs filtered.
 */
const getEmails = async (req, res, next) => {
  try {
    const { maxResults = 20, onlyUnread = false, pageToken, refresh = false } = req.query;

    // If not refresh, return cached emails from DB first
    if (refresh !== 'true') {
      const cached = await prisma.email.findMany({
        where: { userId: req.user.id, isFiltered: false },
        orderBy: { receivedAt: 'desc' },
        take: parseInt(maxResults),
        include: { draft: { select: { id: true, status: true, tone: true } } },
      });

      if (cached.length > 0) {
        return res.json({
          success: true,
          data: { emails: cached, filtered: [], fromCache: true },
        });
      }
    }

    // Fetch fresh from Gmail
    const { emails, filtered, nextPageToken } = await fetchEmails(req.user, {
      maxResults: parseInt(maxResults),
      onlyUnread: onlyUnread === 'true',
      pageToken,
    });

    logger.info(`Fetched ${emails.length} actionable, ${filtered.length} filtered for ${req.user.email}`);

    // Auto-generate drafts for new emails if user has enabled this preference
    if (emails.length > 0) {
      const preference = await prisma.preference.findUnique({
        where: { userId: req.user.id },
      });
      if (preference?.autoGenerate) {
        emails.forEach((email) => {
          generateDraft(req.user, { emailId: email.id }).catch((err) =>
            logger.warn(`Auto-draft generation failed for email ${email.id}: ${err.message}`)
          );
        });
      }
    }

    res.json({
      success: true,
      data: {
        emails,
        filtered,
        nextPageToken,
        fromCache: false,
      },
    });
  } catch (error) {
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(401).json({
        success: false,
        message: 'Gmail access revoked. Please log in again.',
        code: 'GMAIL_AUTH_EXPIRED',
      });
    }
    next(error);
  }
};

/**
 * GET /emails/:id
 * Get a single email by internal DB id.
 */
const getEmailById = async (req, res, next) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        draft: {
          include: { sentLog: true },
        },
      },
    });

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found.' });
    }

    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /emails/:id/skip
 * Manually mark an email as filtered (user doesn't want a draft for it).
 */
const skipEmail = async (req, res, next) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found.' });
    }

    const updated = await prisma.email.update({
      where: { id: req.params.id },
      data: {
        isFiltered: true,
        filterReason: 'Manually skipped by user',
      },
    });

    res.json({ success: true, data: updated, message: 'Email skipped.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmails, getEmailById, skipEmail };
