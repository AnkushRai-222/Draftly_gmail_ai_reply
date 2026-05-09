const axios = require('axios');
const logger = require('../../utils/logger');

const GEMINI_BASE_URL_V1 = 'https://generativelanguage.googleapis.com/v1';
const GEMINI_BASE_URL_V1BETA = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Call Google Gemini API (flash model - generous free tier).
 * Used as fallback when OpenRouter fails or is rate limited.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} options - { maxTokens, temperature }
 * @returns {{ text: string, model: string, provider: 'gemini' }}
 */
const generateCompletion = async (systemPrompt, userPrompt, options = {}) => {
  const {
    maxTokens = 800,
    temperature = 0.7,
    model = process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  } = options;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  try {
    const sharedBody = {
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        topP: 0.9,
      },
      safetySettings: [
        // Relax safety for professional email content
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const requestBodyV1 = {
      ...sharedBody,
      // v1 generateContent does not always accept systemInstruction; inline it.
      contents: [
        {
          role: 'user',
          parts: [{ text: `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}` }],
        },
      ],
    };

    const requestBodyV1Beta = {
      ...sharedBody,
      // v1beta expects snake_case system_instruction
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
    };

    const callGemini = (baseUrl, body) =>
      axios.post(
        `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        body,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

    let response;
    try {
      response = await callGemini(GEMINI_BASE_URL_V1, requestBodyV1);
    } catch (err) {
      if (err.response?.status === 404) {
        logger.warn(`Gemini v1 does not support ${model}, trying v1beta`);
        response = await callGemini(GEMINI_BASE_URL_V1BETA, requestBodyV1Beta);
      } else {
        throw err;
      }
    }

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      const blockReason = response.data?.candidates?.[0]?.finishReason;
      throw new Error(`Gemini returned empty response. Reason: ${blockReason || 'unknown'}`);
    }

    logger.info(`Gemini: success with model ${model}`);
    return { text, model, provider: 'gemini' };
  } catch (err) {
    const status = err.response?.status;
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.error(`Gemini failed (${status}): ${errMsg}`);
    throw new Error(`Gemini error: ${errMsg}`);
  }
};

module.exports = { generateCompletion };
