/**
 * Decode base64url encoded Gmail message body
 */
const decodeBase64 = (data) => {
  if (!data) return '';
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
};

/**
 * Recursively extract plain text body from Gmail message payload
 * Gmail stores body in nested multipart structure
 */
const extractBody = (payload) => {
  if (!payload) return '';

  // Direct body (non-multipart)
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Multipart: prefer text/plain, fall back to text/html
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) return decodeBase64(textPart.body.data);

    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      // Strip HTML tags for plain text usage
      return decodeBase64(htmlPart.body.data).replace(/<[^>]*>/g, ' ').trim();
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return '';
};

/**
 * Extract a specific header value from Gmail message headers array
 */
const getHeader = (headers = [], name) => {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
};

/**
 * Encode a reply email as RFC 2822 format (base64url) for Gmail API
 */
const encodeReplyMessage = ({ to, subject, body, threadId, inReplyTo, references, signature }) => {
  const fullBody = signature ? `${body}\n\n${signature}` : body;

  // Ensure subject has "Re:" prefix
  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

  const messageParts = [
    `To: ${to}`,
    `Subject: ${replySubject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
    ...(references ? [`References: ${references}`] : []),
    '',
    fullBody,
  ];

  const message = messageParts.join('\r\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Parse sender name and email from "Name <email>" format
 */
const parseSender = (fromHeader) => {
  const match = fromHeader.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/"/g, ''), email: match[2].trim() };
  }
  return { name: fromHeader, email: fromHeader };
};

/**
 * Truncate email body for AI context (avoid token overflow)
 */
const truncateBody = (body, maxChars = 3000) => {
  if (body.length <= maxChars) return body;
  return body.substring(0, maxChars) + '\n\n[... email truncated for length ...]';
};

module.exports = {
  extractBody,
  getHeader,
  encodeReplyMessage,
  parseSender,
  truncateBody,
  decodeBase64,
};
