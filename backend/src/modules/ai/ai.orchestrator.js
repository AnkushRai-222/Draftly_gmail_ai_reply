const openrouter = require('./openrouter.service');
const gemini = require('./gemini.service');
const logger = require('../../utils/logger');

// ─── Failover Orchestrator ────────────────────────────────────────────────────

/**
 * Generate a completion with automatic failover:
 * OpenRouter (primary) → Gemini (fallback)
 *
 * Respects user's preferredModel setting.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} options - { maxTokens, temperature, preferredProvider }
 */
const generate = async (systemPrompt, userPrompt, options = {}) => {
  const { preferredProvider = 'openrouter', ...aiOptions } = options;

  const primary = preferredProvider === 'gemini' ? gemini : openrouter;
  const fallback = preferredProvider === 'gemini' ? openrouter : gemini;
  const primaryName = preferredProvider === 'gemini' ? 'Gemini' : 'OpenRouter';
  const fallbackName = preferredProvider === 'gemini' ? 'OpenRouter' : 'Gemini';

  let primaryErr;

  // Try primary
  try {
    return await primary.generateCompletion(systemPrompt, userPrompt, aiOptions);
  } catch (err) {
    primaryErr = err;
    logger.warn(`${primaryName} failed, switching to ${fallbackName}: ${err.message}`);
  }

  // Try fallback
  try {
    return await fallback.generateCompletion(systemPrompt, userPrompt, aiOptions);
  } catch (fallbackErr) {
    logger.error(`Both AI providers failed. Last error: ${fallbackErr.message}`);
    const error = new Error(
      `AI service temporarily unavailable. ${primaryName} error: ${primaryErr?.message || 'unknown'}. ` +
        `${fallbackName} error: ${fallbackErr.message}`
    );
    error.statusCode = 503;
    throw error;
  }
};

// ─── Prompt Builders ─────────────────────────────────────────────────────────

/**
 * Build the system prompt for email draft generation.
 * Injects user's style profile and preferences.
 */
const buildDraftSystemPrompt = (userPreferences, styleProfile) => {
  const { defaultTone = 'professional', signature } = userPreferences || {};

  let styleContext = '';
  if (styleProfile?.inferredStyle) {
    const style = styleProfile.inferredStyle;
    styleContext = `
WRITING STYLE (learned from user's past emails):
- Typical tone: ${style.tone || defaultTone}
- Average email length: ${style.avgLength || 'medium'} 
- Common greetings: ${style.greetings?.join(', ') || 'Hi, Hello'}
- Common sign-offs: ${style.closings?.join(', ') || 'Best, Thanks'}
- Notable phrases they use: ${style.commonPhrases?.join(', ') || 'none identified'}
- Formality level: ${style.formality || 'semi-formal'}
`;
  }

  return `You are Draftly, an AI email assistant. Your job is to write a reply email on behalf of the user.

RULES:
1. Write ONLY the email body — no subject line, no "Here is your draft:" preamble, no explanations.
2. Match the requested tone: ${defaultTone}
3. Keep replies concise and professional. Avoid filler phrases like "I hope this email finds you well."
4. Address the sender's actual request or question directly.
5. Do NOT add a signature — it will be added automatically.
6. Do NOT use placeholders like [Name] or [Date]. Write a complete, ready-to-send reply.
7. If the email requires specific information you don't have (like a meeting time), write a natural reply that asks for it.
${styleContext}
OUTPUT FORMAT: Reply email body only. Start directly with the greeting.`;
};

/**
 * Build the user prompt with full email context.
 */
const buildDraftUserPrompt = ({ email, threadContext, tone, styleProfile }) => {
  const effectiveTone = tone || 'professional';

  // Format thread context if available
  let threadSection = '';
  if (threadContext && threadContext.length > 1) {
    const previousMessages = threadContext.slice(0, -1); // Exclude the email we're replying to
    threadSection = `
CONVERSATION HISTORY (for context):
${previousMessages
  .map((m) => `From: ${m.from}\nDate: ${m.date}\n${m.body.substring(0, 500)}`)
  .join('\n---\n')}
`;
  }

  return `Write a ${effectiveTone} reply to the following email.

EMAIL TO REPLY TO:
From: ${email.sender} <${email.senderEmail}>
Subject: ${email.subject}
Date: ${new Date(email.receivedAt).toDateString()}

${email.body}
${threadSection}
Write my reply now:`;
};

/**
 * Build prompt for style learning from sent emails.
 */
const buildStyleAnalysisPrompt = (sentEmailSamples) => {
  const systemPrompt = `You are an AI that analyzes writing patterns. 
Analyze the provided emails and return a JSON object describing the writer's style.
Return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Analyze these sent emails and identify writing patterns:

${sentEmailSamples
  .map((e, i) => `--- Email ${i + 1} ---\nSubject: ${e.subject}\n${e.body.substring(0, 800)}`)
  .join('\n\n')}

Return a JSON object with exactly these fields:
{
  "tone": "professional|friendly|formal|casual|concise",
  "avgLength": "short|medium|long",
  "greetings": ["array", "of", "common", "greetings"],
  "closings": ["array", "of", "common", "sign-offs"],
  "commonPhrases": ["array", "of", "distinctive", "phrases"],
  "formality": "formal|semi-formal|informal",
  "responseStyle": "brief description of how they typically respond"
}`;

  return { systemPrompt, userPrompt };
};

module.exports = {
  generate,
  buildDraftSystemPrompt,
  buildDraftUserPrompt,
  buildStyleAnalysisPrompt,
};
