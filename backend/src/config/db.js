const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Connection resilience for serverless databases (Neon, etc.)
let isConnected = false;

const connectWithRetry = async (retries = 5, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      isConnected = true;
      logger.info('✅ Database connected');
      return;
    } catch (error) {
      logger.warn(`Database connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw new Error('Failed to connect to database after multiple attempts');
};

// Health check function - tests if connection is alive
const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn('Database health check failed:', error.message);
    return false;
  }
};

// Ensure connection is alive before queries
const ensureConnection = async () => {
  if (!isConnected || !(await healthCheck())) {
    logger.info('Reconnecting to database...');
    try {
      await prisma.$connect();
      isConnected = true;
    } catch (error) {
      logger.error('Failed to reconnect:', error.message);
      throw error;
    }
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  isConnected = false;
  await prisma.$disconnect();
});

// Handle connection errors gracefully
prisma.$on('error', (e) => {
  logger.error('Prisma error:', e.message);
  isConnected = false;
});

module.exports = prisma;
module.exports.connectWithRetry = connectWithRetry;
module.exports.ensureConnection = ensureConnection;
