const axios = require('axios');
const logger = require('../../utils/logger');

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Free models on OpenRouter — ordered by quality for email drafting
const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'microsoft/phi-4-reasoning:free',
  'qwen/qwen3-8b:free',
];

/**
 * Call OpenRouter chat completion API.
 * Tries the configured model first, falls back to other free models.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} options - { maxTokens, temperature, model }
 * @returns {{ text: string, model: string, provider: 'openrouter' }}
 */
const generateCompletion = async (systemPrompt, userPrompt, options = {}) => {
  const {
    maxTokens = 800,
    temperature = 0.7,
    model = process.env.OPENROUTER_MODEL || FREE_MODELS[0],
  } = options;

  const modelsToTry = [model, ...FREE_MODELS.filter((m) => m !== model)];

  let lastError;

  for (const currentModel of modelsToTry) {
    try {
      logger.debug(`OpenRouter: trying model ${currentModel}`);

      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
            'X-Title': 'Draftly - Gmail AI Reply Agent',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const text = response.data?.choices?.[0]?.message?.content?.trim();

      if (!text) throw new Error('Empty response from OpenRouter');

      logger.info(`OpenRouter: success with model ${currentModel}`);
      return { text, model: currentModel, provider: 'openrouter' };
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || err.message;

      logger.warn(`OpenRouter model ${currentModel} failed (${status}): ${errMsg}`);

      // Don't try other models if it's an auth error
      if (status === 401) {
        throw new Error(`OpenRouter auth failed: ${errMsg}. Check OPENROUTER_API_KEY.`);
      }

      // Rate limited or model unavailable — try next model
      if (status === 429 || status === 503 || status === 404) {
        continue;
      }

      // Other errors — propagate up to trigger Gemini fallback
      throw err;
    }
  }

  throw lastError || new Error('All OpenRouter models failed');
};

module.exports = { generateCompletion };
