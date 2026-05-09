const { google } = require('googleapis');
const prisma = require('../../config/db');
const { decrypt, encrypt } = require('../../utils/encryption');
const { extractBody, getHeader, parseSender } = require('../../utils/gmailHelpers');
const { shouldFilter } = require('../../utils/emailFilter');
const logger = require('../../utils/logger');

/**
 * Build an authenticated Gmail client for a user.
 * Handles automatic token refresh.
 */
const getGmailClient = async (user) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  const accessToken = decrypt(user.accessToken);
  const refreshToken = decrypt(user.refreshToken);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Auto-refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      logger.info(`Refreshing access token for user: ${user.id}`);
      await prisma.user.update({
        where: { id: user.id },
        data: { accessToken: encrypt(tokens.access_token) },
      });
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Fetch recent emails from Gmail inbox, apply filters, save to DB.
 * @param {Object} user - User from DB (with encrypted tokens)
 * @param {Object} options - { maxResults, onlyUnread, pageToken }
 * @returns {{ emails, filtered, nextPageToken }}
 */
const fetchEmails = async (user, options = {}) => {
  const { maxResults = 20, onlyUnread = false, pageToken } = options;
  const gmail = await getGmailClient(user);

  // Build query string
  let q = 'in:inbox -in:sent';
  if (onlyUnread) q += ' is:unread';

  // Fetch message list
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q,
    pageToken,
  });

  const messages = listRes.data.messages || [];
  const nextPageToken = listRes.data.nextPageToken;

  if (messages.length === 0) {
    return { emails: [], filtered: [], nextPageToken: null };
  }

  // Fetch user's filter rules
  const userRules = await prisma.filterRule.findMany({
    where: { userId: user.id },
  });

  const savedEmails = [];
  const filteredEmails = [];

  // Process each message
  await Promise.all(
    messages.map(async (msg) => {
      try {
        // Check if we already have this email
        const existing = await prisma.email.findUnique({
          where: { gmailMessageId: msg.id },
        });
        if (existing) {
          if (!existing.isFiltered) {
            savedEmails.push(existing);
          }
          return;
        }

        // Fetch full message details
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const { payload, threadId, labelIds = [], internalDate } = fullMsg.data;
        const headers = payload?.headers || [];

        const from = getHeader(headers, 'From');
        const subject = getHeader(headers, 'Subject') || '(No Subject)';
        const { name: senderName, email: senderEmail } = parseSender(from);
        const body = extractBody(payload);
        const snippet = fullMsg.data.snippet || '';
        const receivedAt = new Date(parseInt(internalDate));

        // Run through filter pipeline
        const { filtered, reason } = shouldFilter(
          { senderEmail, subject, labels: labelIds, headers },
          userRules
        );

        if (filtered) {
          filteredEmails.push({
            id: msg.id,
            gmailMessageId: msg.id,
            threadId,
            sender: senderName || senderEmail,
            senderEmail,
            subject,
            snippet,
            receivedAt,
            isFiltered: true,
            filterReason: reason,
          });
          return;
        }

        const email = await prisma.email.create({
          data: {
            userId: user.id,
            gmailMessageId: msg.id,
            threadId,
            sender: senderName || senderEmail,
            senderEmail,
            subject,
            body,
            snippet,
            labels: labelIds,
            receivedAt,
            isFiltered: false,
          },
        });

        savedEmails.push(email);
      } catch (err) {
        logger.error(`Failed to process message ${msg.id}:`, err.message);
      }
    })
  );

  return { emails: savedEmails, filtered: filteredEmails, nextPageToken };
};

/**
 * Fetch a single email from Gmail by ID (or from DB if already stored)
 */
const getEmail = async (user, gmailMessageId) => {
  // Check DB first
  const cached = await prisma.email.findUnique({
    where: { gmailMessageId },
    include: { draft: true },
  });
  if (cached) return cached;

  // Fetch from Gmail
  const gmail = await getGmailClient(user);
  const fullMsg = await gmail.users.messages.get({
    userId: 'me',
    id: gmailMessageId,
    format: 'full',
  });

  return fullMsg.data;
};

/**
 * Fetch thread messages for context (last N messages in thread)
 */
const getThreadContext = async (user, threadId, maxMessages = 5) => {
  const gmail = await getGmailClient(user);

  const threadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages = threadRes.data.messages || [];
  // Return last N messages as context
  return messages.slice(-maxMessages).map((msg) => {
    const headers = msg.payload?.headers || [];
    return {
      from: getHeader(headers, 'From'),
      date: getHeader(headers, 'Date'),
      subject: getHeader(headers, 'Subject'),
      body: extractBody(msg.payload),
      messageId: getHeader(headers, 'Message-ID'),
    };
  });
};

/**
 * Fetch user's last N sent emails for style learning
 */
const fetchSentEmails = async (user, maxResults = 30) => {
  const gmail = await getGmailClient(user);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:sent',
  });

  const messages = listRes.data.messages || [];

  const sentEmails = await Promise.all(
    messages.map(async (msg) => {
      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });
        const headers = fullMsg.data.payload?.headers || [];
        return {
          subject: getHeader(headers, 'Subject'),
          body: extractBody(fullMsg.data.payload),
          date: getHeader(headers, 'Date'),
        };
      } catch {
        return null;
      }
    })
  );

  return sentEmails.filter(Boolean);
};

/**
 * Send a reply email via Gmail API with correct thread metadata
 */
const sendReply = async (user, { rawMessage, threadId }) => {
  const gmail = await getGmailClient(user);

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: rawMessage,
      threadId,
    },
  });

  return res.data;
};

module.exports = {
  getGmailClient,
  fetchEmails,
  getEmail,
  getThreadContext,
  fetchSentEmails,
  sendReply,
};
