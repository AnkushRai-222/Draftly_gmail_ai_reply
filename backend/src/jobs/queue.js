const { Queue, Worker, QueueEvents } = require('bullmq');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = 'send-email';

let sendEmailQueue;
let sendEmailWorker;

/**
 * Initialize the BullMQ queue and worker.
 * Must be called after Redis is connected.
 */
const initQueue = () => {
  const connection = getRedis();

  // ── Queue ──────────────────────────────────────────────────────────────────
  sendEmailQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s → 25s → 125s between retries
      },
      removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
      removeOnFail: { count: 200 },     // Keep last 200 failed jobs
    },
  });

  logger.info(`📬 BullMQ queue "${QUEUE_NAME}" initialized`);
  return sendEmailQueue;
};

/**
 * Start the worker that processes send-email jobs.
 * Imported lazily to avoid circular deps.
 */
const startWorker = () => {
  const connection = getRedis();
  const { processSendEmailJob } = require('./sendEmail.job');

  sendEmailWorker = new Worker(QUEUE_NAME, processSendEmailJob, {
    connection,
    concurrency: 3, // Process up to 3 emails at once
  });

  sendEmailWorker.on('completed', (job) => {
    logger.info(`✅ Job ${job.id} completed: draft ${job.data.draftId} sent`);
  });

  sendEmailWorker.on('failed', (job, err) => {
    logger.error(`❌ Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  sendEmailWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  logger.info('⚙️  BullMQ worker started');
  return sendEmailWorker;
};

/**
 * Add a send-email job to the queue.
 * Uses draftId as jobId for idempotency — prevents duplicate sends.
 *
 * @param {Object} data - { draftId, userId }
 */
const enqueueSendEmail = async (data) => {
  if (!sendEmailQueue) throw new Error('Queue not initialized');

  const { draftId } = data;

  // Check for existing job with same draftId (idempotency)
  const existingJob = await sendEmailQueue.getJob(draftId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (['waiting', 'active', 'delayed'].includes(state)) {
      logger.warn(`Job for draft ${draftId} already in queue (state: ${state}), skipping`);
      return existingJob;
    }
  }

  const job = await sendEmailQueue.add('send-email', data, {
    jobId: draftId, // Idempotency key
  });

  logger.info(`📤 Enqueued send job ${job.id} for draft ${draftId}`);
  return job;
};

/**
 * Get queue stats for monitoring
 */
const getQueueStats = async () => {
  if (!sendEmailQueue) return null;
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    sendEmailQueue.getWaitingCount(),
    sendEmailQueue.getActiveCount(),
    sendEmailQueue.getCompletedCount(),
    sendEmailQueue.getFailedCount(),
    sendEmailQueue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
};

module.exports = { initQueue, startWorker, enqueueSendEmail, getQueueStats };
