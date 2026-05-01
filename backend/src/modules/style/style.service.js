const prisma = require('../../config/db');
const { fetchSentEmails } = require('../emails/gmail.service');
const { generate, buildStyleAnalysisPrompt } = require('../ai/ai.orchestrator');
const logger = require('../../utils/logger');

/**
 * Analyze a user's sent emails to build a writing style profile.
 * Stores the result in StyleProfile table.
 *
 * @param {Object} user - User object with decrypted tokens accessible via gmail.service
 * @param {Object} options - { force: boolean } — force re-analysis even if recent
 * @returns {Object} StyleProfile
 */
const learnUserStyle = async (user, options = {}) => {
  const { force = false } = options;

  // Check if we have a recent style profile (less than 3 days old)
  const existing = await prisma.styleProfile.findUnique({
    where: { userId: user.id },
  });

  if (!force && existing) {
    const ageMs = Date.now() - new Date(existing.updatedAt).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (ageMs < threeDaysMs) {
      logger.info(`Style profile for ${user.id} is fresh, skipping re-analysis`);
      return existing;
    }
  }

  // Fetch sent emails for analysis
  logger.info(`Fetching sent emails for style analysis: user ${user.id}`);
  const sentEmails = await fetchSentEmails(user, 30);

  if (sentEmails.length < 3) {
    logger.warn(`Not enough sent emails for style analysis (${sentEmails.length} found)`);
    // Return a default style profile
    const defaultStyle = {
      tone: 'professional',
      avgLength: 'medium',
      greetings: ['Hi', 'Hello'],
      closings: ['Best', 'Thanks'],
      commonPhrases: [],
      formality: 'semi-formal',
      responseStyle: 'Default professional style (insufficient email samples)',
    };

    return prisma.styleProfile.upsert({
      where: { userId: user.id },
      update: { inferredStyle: defaultStyle, sampleCount: sentEmails.length },
      create: { userId: user.id, inferredStyle: defaultStyle, sampleCount: sentEmails.length },
    });
  }

  // Filter out very short emails (< 20 chars — auto-replies, etc.)
  const meaningfulEmails = sentEmails
    .filter((e) => e.body && e.body.length > 20)
    .slice(0, 25); // Cap at 25 to stay within token limits

  // Build and send analysis prompt
  const { systemPrompt, userPrompt } = buildStyleAnalysisPrompt(meaningfulEmails);

  let inferredStyle;
  try {
    const result = await generate(systemPrompt, userPrompt, {
      maxTokens: 500,
      temperature: 0.3, // Low temperature for consistent JSON output
      preferredProvider: 'openrouter',
    });

    // Parse JSON — strip any accidental markdown fences
    const cleaned = result.text
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    inferredStyle = JSON.parse(cleaned);
    logger.info(`Style analysis complete for user ${user.id}: tone=${inferredStyle.tone}`);
  } catch (parseErr) {
    logger.error('Style analysis JSON parse failed:', parseErr.message);
    // Fallback to defaults if AI returns invalid JSON
    inferredStyle = {
      tone: 'professional',
      avgLength: 'medium',
      greetings: ['Hi', 'Hello'],
      closings: ['Best', 'Thanks'],
      commonPhrases: [],
      formality: 'semi-formal',
      responseStyle: 'Could not analyze — using defaults',
    };
  }

  // Save to DB
  const profile = await prisma.styleProfile.upsert({
    where: { userId: user.id },
    update: { inferredStyle, sampleCount: meaningfulEmails.length },
    create: { userId: user.id, inferredStyle, sampleCount: meaningfulEmails.length },
  });

  return profile;
};

/**
 * Get the current style profile for a user (without re-analysis)
 */
const getStyleProfile = async (userId) => {
  return prisma.styleProfile.findUnique({ where: { userId } });
};

module.exports = { learnUserStyle, getStyleProfile };
