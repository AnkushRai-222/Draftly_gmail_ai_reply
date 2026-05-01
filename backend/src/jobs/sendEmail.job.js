const prisma = require('../config/db');
const { sendReply } = require('../modules/emails/gmail.service');
const { encodeReplyMessage, getHeader } = require('../utils/gmailHelpers');
const { getGmailClient } = require('../modules/emails/gmail.service');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * BullMQ job processor for sending email replies.
 * This runs in the worker and handles the actual Gmail API send call.
 * Retried automatically by BullMQ on failure (up to 3 attempts).
 *
 * @param {Job} job - BullMQ job with data: { draftId, userId }
 */
const processSendEmailJob = async (job) => {
  const { draftId, userId } = job.data;

  logger.info(`Processing send job for draft ${draftId} (attempt ${job.attemptsMade + 1})`);

  // ── Fetch all needed data ─────────────────────────────────────────────────
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: {
      email: true,
      sentLog: true,
      user: {
        include: { preference: true },
      },
    },
  });

  if (!draft) throw new Error(`Draft ${draftId} not found`);
  if (draft.status === 'sent') {
    logger.warn(`Draft ${draftId} already sent — skipping`);
    return { skipped: true, reason: 'already_sent' };
  }
  if (draft.status !== 'approved') {
    throw new Error(`Draft ${draftId} is not approved (status: ${draft.status})`);
  }

  const user = draft.user;
  const email = draft.email;

  // ── Update attempt count in SentLog ──────────────────────────────────────
  await prisma.sentLog.upsert({
    where: { draftId },
    update: { attemptCount: { increment: 1 } },
    create: {
      draftId,
      attemptCount: 1,
      success: false,
    },
  });

  // ── Fetch thread metadata for proper reply headers ────────────────────────
  const gmail = await getGmailClient(user);
  let inReplyTo = '';
  let references = '';

  try {
    const originalMsg = await gmail.users.messages.get({
      userId: 'me',
      id: email.gmailMessageId,
      format: 'metadata',
      metadataHeaders: ['Message-ID', 'References'],
    });
    const headers = originalMsg.data.payload?.headers || [];
    inReplyTo = getHeader(headers, 'Message-ID');
    const existingRefs = getHeader(headers, 'References');
    references = existingRefs ? `${existingRefs} ${inReplyTo}` : inReplyTo;
  } catch (headerErr) {
    logger.warn(`Could not fetch thread headers for ${email.gmailMessageId}: ${headerErr.message}`);
    // Non-fatal — send without In-Reply-To (email still sends, just no threading)
  }

  // ── Encode RFC 2822 message ───────────────────────────────────────────────
  const rawMessage = encodeReplyMessage({
    to: `${email.sender} <${email.senderEmail}>`,
    subject: email.subject,
    body: draft.content,
    threadId: email.threadId,
    inReplyTo,
    references,
    signature: user.preference?.signature || '',
  });

  // ── Send via Gmail API ────────────────────────────────────────────────────
  const sentData = await sendReply(user, {
    rawMessage,
    threadId: email.threadId,
  });

  // ── Update DB on success ──────────────────────────────────────────────────
  await prisma.$transaction([
    prisma.draft.update({
      where: { id: draftId },
      data: { status: 'sent' },
    }),
    prisma.sentLog.update({
      where: { draftId },
      data: {
        success: true,
        gmailSentId: sentData.id,
        sentAt: new Date(),
        errorMessage: null,
      },
    }),
  ]);

  logger.info(`✅ Draft ${draftId} sent successfully. Gmail ID: ${sentData.id}`);
  return { success: true, gmailSentId: sentData.id };
};

/**
 * Handle job failure — update SentLog with error info
 * Called by BullMQ after all retries exhausted.
 */
const handleSendFailure = async (draftId, errorMessage) => {
  try {
    await prisma.$transaction([
      prisma.draft.update({
        where: { id: draftId },
        data: { status: 'failed' },
      }),
      prisma.sentLog.upsert({
        where: { draftId },
        update: { success: false, errorMessage },
        create: { draftId, success: false, errorMessage, attemptCount: 3 },
      }),
    ]);
  } catch (dbErr) {
    logger.error(`Failed to update SentLog for draft ${draftId}:`, dbErr.message);
  }
};

module.exports = { processSendEmailJob, handleSendFailure };
