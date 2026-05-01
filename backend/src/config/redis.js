const { Redis } = require('ioredis');
const logger = require('../utils/logger');

let redis;

const connectRedis = () => {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
  });

  redis.on('connect', () => logger.info('✅ Redis connected'));
  redis.on('error', (err) => logger.error('Redis error:', err));

  return redis;
};

const getRedis = () => {
  if (!redis) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redis;
};

module.exports = { connectRedis, getRedis };
