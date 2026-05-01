const prisma = require('../../config/db');
const { getThreadContext } = require('../emails/gmail.service');
const {
  generate,
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
} = require('../ai/ai.orchestrator');
const { learnUserStyle } = require('../style/style.service');
const { enqueueSendEmail } = require('../../jobs/queue');
const logger = require('../../utils/logger');

/**
 * Generate an AI draft reply for an email.
 *
 * @param {Object} user - Full user object
 * @param {Object} options - { emailId, tone }
 * @returns {Object} Draft
 */
const generateDraft = async (user, { emailId, tone }) => {
  // ── Validate email ────────────────────────────────────────────────────────
  const email = await prisma.email.findFirst({
    where: { id: emailId, userId: user.id },
    include: { draft: true },
  });

  if (!email) throw Object.assign(new Error('Email not found.'), { statusCode: 404 });
  if (email.isFiltered) {
    throw Object.assign(
      new Error('This email is filtered and not eligible for AI drafts.'),
      { statusCode: 400 }
    );
  }

  // ── Get user context ──────────────────────────────────────────────────────
  const [preference, styleProfile, threadContext] = await Promise.all([
    prisma.preference.findUnique({ where: { userId: user.id } }),
    prisma.styleProfile.findUnique({ where: { userId: user.id } }),
    getThreadContext(user, email.threadId).catch(() => []), // Non-fatal
  ]);

  // If no style profile exists yet, try to generate one (async, non-blocking)
  if (!styleProfile) {
    learnUserStyle(user).catch((err) =>
      logger.warn(`Background style learn failed: ${err.message}`)
    );
  }

  const effectiveTone = tone || preference?.defaultTone || 'professional';

  // ── Build prompts ─────────────────────────────────────────────────────────
  const systemPrompt = buildDraftSystemPrompt(preference, styleProfile);
  const userPrompt = buildDraftUserPrompt({
    email,
    threadContext,
    tone: effectiveTone,
    styleProfile,
  });

  // ── Call AI ───────────────────────────────────────────────────────────────
  logger.info(`Generating draft for email ${emailId} with tone: ${effectiveTone}`);
  const aiResult = await generate(systemPrompt, userPrompt, {
    maxTokens: 800,
    temperature: 0.7,
    preferredProvider: preference?.preferredModel || 'openrouter',
  });

  // ── Save or update draft ──────────────────────────────────────────────────
  // If a draft already exists for this email (regenerate case), update it
  const draftData = {
    content: aiResult.text,
    tone: effectiveTone,
    status: 'pending',
    aiProvider: aiResult.provider,
    aiModel: aiResult.model,
    promptUsed: userPrompt.substring(0, 1000), // Store truncated prompt for debugging
  };

  let draft;
  if (email.draft) {
    draft = await prisma.draft.update({
      where: { id: email.draft.id },
      data: draftData,
    });
    logger.info(`Draft regenerated: ${draft.id}`);
  } else {
    draft = await prisma.draft.create({
      data: { ...draftData, emailId, userId: user.id },
    });
    logger.info(`Draft created: ${draft.id}`);
  }

  return draft;
};

/**
 * Get all drafts for a user with optional status filter
 */
const getDrafts = async (userId, { status, page = 1, limit = 20 }) => {
  const where = {
    userId,
    ...(status && { status }),
  };

  const [drafts, total] = await Promise.all([
    prisma.draft.findMany({
      where,
      include: {
        email: {
          select: {
            id: true,
            sender: true,
            senderEmail: true,
            subject: true,
            receivedAt: true,
            snippet: true,
          },
        },
        sentLog: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.draft.count({ where }),
  ]);

  return { drafts, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Get a single draft by ID (must belong to user)
 */
const getDraftById = async (draftId, userId) => {
  const draft = await prisma.draft.findFirst({
    where: { id: draftId, userId },
    include: {
      email: true,
      sentLog: true,
    },
  });
  if (!draft) throw Object.assign(new Error('Draft not found.'), { statusCode: 404 });
  return draft;
};

/**
 * Update draft content and/or tone (user edits)
 */
const updateDraft = async (draftId, userId, { content, tone }) => {
  const draft = await prisma.draft.findFirst({ where: { id: draftId, userId } });
  if (!draft) throw Object.assign(new Error('Draft not found.'), { statusCode: 404 });

  if (draft.status === 'sent') {
    throw Object.assign(new Error('Cannot edit a sent draft.'), { statusCode: 400 });
  }

  const validTones = ['professional', 'friendly', 'concise', 'formal', 'casual'];
  if (tone && !validTones.includes(tone)) {
    throw Object.assign(
      new Error(`Invalid tone. Valid: ${validTones.join(', ')}`),
      { statusCode: 400 }
    );
  }

  return prisma.draft.update({
    where: { id: draftId },
    data: {
      ...(content !== undefined && { content }),
      ...(tone !== undefined && { tone }),
      // If user edited content, mark as 'edited' status
      status: draft.status === 'pending' ? 'edited' : draft.status,
    },
  });
};

/**
 * Approve a draft — allows it to be sent
 */
const approveDraft = async (draftId, userId) => {
  const draft = await prisma.draft.findFirst({ where: { id: draftId, userId } });
  if (!draft) throw Object.assign(new Error('Draft not found.'), { statusCode: 404 });

  if (draft.status === 'sent') {
    throw Object.assign(new Error('Draft already sent.'), { statusCode: 400 });
  }
  if (draft.status === 'rejected') {
    throw Object.assign(new Error('Cannot approve a rejected draft.'), { statusCode: 400 });
  }

  return prisma.draft.update({
    where: { id: draftId },
    data: { status: 'approved' },
  });
};

/**
 * Reject a draft
 */
const rejectDraft = async (draftId, userId, reason) => {
  const draft = await prisma.draft.findFirst({ where: { id: draftId, userId } });
  if (!draft) throw Object.assign(new Error('Draft not found.'), { statusCode: 404 });

  if (draft.status === 'sent') {
    throw Object.assign(new Error('Cannot reject a sent draft.'), { statusCode: 400 });
  }

  return prisma.draft.update({
    where: { id: draftId },
    data: { status: 'rejected' },
  });
};

/**
 * Send an approved draft — enqueues to BullMQ for reliable delivery
 */
const sendDraft = async (draftId, userId) => {
  const draft = await prisma.draft.findFirst({ where: { id: draftId, userId } });
  if (!draft) throw Object.assign(new Error('Draft not found.'), { statusCode: 404 });

  if (draft.status !== 'approved') {
    throw Object.assign(
      new Error(`Draft must be approved before sending. Current status: ${draft.status}`),
      { statusCode: 400 }
    );
  }

  // Enqueue the send job (idempotent — won't double-send)
  const job = await enqueueSendEmail({ draftId, userId });

  return {
    message: 'Draft queued for sending.',
    jobId: job.id,
    draftId,
  };
};

/**
 * Get send logs for the user
 */
const getSentLogs = async (userId, { page = 1, limit = 20 }) => {
  const [logs, total] = await Promise.all([
    prisma.sentLog.findMany({
      where: { draft: { userId } },
      include: {
        draft: {
          include: {
            email: {
              select: { sender: true, subject: true, receivedAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sentLog.count({ where: { draft: { userId } } }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = {
  generateDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  approveDraft,
  rejectDraft,
  sendDraft,
  getSentLogs,
};
