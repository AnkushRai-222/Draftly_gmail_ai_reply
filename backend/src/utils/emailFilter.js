const logger = require('./logger');

// ─── System-level filter patterns (always applied) ───────────────────────────

const SYSTEM_SENDER_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /donotreply/i,
  /do-not-reply/i,
  /mailer-daemon/i,
  /postmaster/i,
  /bounce/i,
  /notification/i,
  /notifications/i,
  /alerts/i,
  /automated/i,
  /auto-confirm/i,
  /support@.*\.(com|io|net)/i, // generic support emails
];

const SYSTEM_SUBJECT_PATTERNS = [
  // OTP / verification
  /\botp\b/i,
  /one.?time.?pass/i,
  /verification.?code/i,
  /confirm.?your.?(email|account|phone)/i,
  /verify.?your/i,
  /\bpin\b.{0,10}\d{4,8}/i,

  // Transactional / invoices
  /invoice\s*#/i,
  /order\s*(confirmation|#)/i,
  /receipt\s*(for|#)/i,
  /payment\s*(received|confirmed|failed)/i,
  /subscription\s*(renewed|cancelled|expiring)/i,
  /your\s+(order|purchase|delivery)/i,
  /shipping\s+confirmation/i,
  /tracking\s+(number|update)/i,

  // Promotions / marketing
  /unsubscribe/i,
  /\b(sale|offer|deal|discount|promo|coupon)\b.{0,30}\d{1,2}%/i,
  /limited.?time.?offer/i,
  /you('ve)?\s+(won|been selected)/i,

  // Newsletters
  /weekly\s+(digest|newsletter|roundup)/i,
  /monthly\s+(digest|newsletter)/i,
  /issue\s+#\d+/i,
];

const SYSTEM_GMAIL_LABELS = [
  'CATEGORY_PROMOTIONS',
  'CATEGORY_UPDATES',
  'CATEGORY_FORUMS',
  'CATEGORY_SOCIAL',
  'SPAM',
];

// Headers that indicate bulk / automated mail
const BULK_HEADERS = ['list-unsubscribe', 'list-id', 'precedence'];

/**
 * Run an email through the full filter pipeline.
 *
 * @param {Object} email - { senderEmail, subject, labels, headers }
 * @param {Array}  userRules - FilterRule[] from DB for this user
 * @returns {{ filtered: boolean, reason: string|null }}
 */
const shouldFilter = (email, userRules = []) => {
  const { senderEmail = '', subject = '', labels = [], headers = [] } = email;

  // ── 1. Check user ALLOW rules first (these override everything) ──────────
  for (const rule of userRules) {
    if (rule.action !== 'allow') continue;
    if (matchesRule(rule, senderEmail, subject, labels)) {
      logger.debug(`Email ALLOWED by user rule: ${rule.type}=${rule.value}`);
      return { filtered: false, reason: null };
    }
  }

  // ── 2. Check user SKIP rules ─────────────────────────────────────────────
  for (const rule of userRules) {
    if (rule.action !== 'skip') continue;
    if (matchesRule(rule, senderEmail, subject, labels)) {
      return {
        filtered: true,
        reason: `User rule: ${rule.type} matches "${rule.value}"`,
      };
    }
  }

  // ── 3. Gmail category labels ─────────────────────────────────────────────
  for (const label of labels) {
    if (SYSTEM_GMAIL_LABELS.includes(label)) {
      return { filtered: true, reason: `Gmail label: ${label}` };
    }
  }

  // ── 4. Bulk mail headers ─────────────────────────────────────────────────
  const headerNames = headers.map((h) => h.name?.toLowerCase());
  for (const bulkHeader of BULK_HEADERS) {
    if (headerNames.includes(bulkHeader)) {
      return { filtered: true, reason: `Bulk mail header: ${bulkHeader}` };
    }
  }

  // ── 5. Sender pattern matching ───────────────────────────────────────────
  for (const pattern of SYSTEM_SENDER_PATTERNS) {
    if (pattern.test(senderEmail)) {
      return { filtered: true, reason: `Automated sender: ${senderEmail}` };
    }
  }

  // ── 6. Subject pattern matching ──────────────────────────────────────────
  for (const pattern of SYSTEM_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return { filtered: true, reason: `Subject pattern match: "${subject}"` };
    }
  }

  return { filtered: false, reason: null };
};

/**
 * Check if a single user rule matches the email
 */
const matchesRule = (rule, senderEmail, subject, labels) => {
  switch (rule.type) {
    case 'sender':
      return senderEmail.toLowerCase().includes(rule.value.toLowerCase());
    case 'subject_keyword':
      return subject.toLowerCase().includes(rule.value.toLowerCase());
    case 'label':
      return labels.includes(rule.value);
    default:
      return false;
  }
};

module.exports = { shouldFilter };
