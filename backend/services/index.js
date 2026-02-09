const { createLogger } = require('../utils/logger');
const logger = createLogger('Services');

/**
 * Initialize all external services
 */
const initializeServices = async () => {
  // Initialize expiration service
  try {
    const expirationService = require('./expirationService');
    await expirationService.initialize();
    logger.info('Expiration service initialized');
  } catch (error) {
    logger.warn('Expiration service not available', { error: error.message });
  }

  // Initialize email service
  try {
    const emailService = require('./emailService');
    await emailService.initialize();
    logger.info('Email service initialized');
  } catch (error) {
    logger.warn('Email service not available', { error: error.message });
  }

  // Initialize chat service
  try {
    const chatService = require('./chatService');
    await chatService.initialize();
    logger.info('Chat service initialized');
  } catch (error) {
    logger.warn('Chat service not available', { error: error.message });
  }
};

/**
 * Run expiration check manually
 */
const expirationCheck = async () => {
  const expirationService = require('./expirationService');
  return expirationService.checkAllExpirations();
};

module.exports = {
  initializeServices,
  expirationCheck,
};