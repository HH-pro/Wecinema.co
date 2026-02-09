const twilio = require('twilio');
const { createLogger } = require('../utils/logger');

const logger = createLogger('TwilioService');

/**
 * Twilio configuration schema
 */
const CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  smsFrom: process.env.TWILIO_SMS_FROM,
  defaultRecipient: process.env.TWILIO_DEFAULT_RECIPIENT,
};

/**
 * Validate Twilio configuration
 * @returns {string[]}
 */
const validateConfig = () => {
  const errors = [];

  if (!CONFIG.accountSid) {
    errors.push('TWILIO_ACCOUNT_SID not configured');
  } else if (!CONFIG.accountSid.startsWith('AC')) {
    errors.push('Invalid Account SID format (must start with AC)');
  }

  if (!CONFIG.authToken) {
    errors.push('TWILIO_AUTH_TOKEN not configured');
  }

  return errors;
};

/**
 * Initialize Twilio client
 * @returns {twilio.Twilio|null}
 */
const initializeClient = () => {
  const errors = validateConfig();

  if (errors.length > 0) {
    logger.error('Twilio configuration invalid', { errors });
    return null;
  }

  try {
    const client = twilio(CONFIG.accountSid, CONFIG.authToken);
    logger.info('Twilio client initialized');
    return client;
  } catch (error) {
    logger.error('Twilio client initialization failed', { error: error.message });
    return null;
  }
};

const client = initializeClient();

/**
 * Check if Twilio is configured
 * @returns {boolean}
 */
const isConfigured = () => !!client;

/**
 * Format WhatsApp number
 * @param {string} number 
 * @returns {string}
 */
const formatWhatsAppNumber = (number) => {
  if (!number) return null;
  return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
};

/**
 * Send WhatsApp message
 * @param {Object} params
 * @param {string} params.to - Recipient number (with or without whatsapp: prefix)
 * @param {string} params.body - Message body
 * @param {string} [params.from] - Sender number (defaults to env config)
 * @returns {Promise<Object>}
 */
const sendWhatsAppMessage = async ({ to, body, from }) => {
  if (!client) {
    logger.error('Twilio not configured, cannot send WhatsApp message');
    throw new Error('WhatsApp service unavailable');
  }

  if (!to || !body) {
    throw new Error('Recipient (to) and message body are required');
  }

  const fromNumber = from || CONFIG.whatsappFrom;
  const toNumber = formatWhatsAppNumber(to);

  try {
    logger.info('Sending WhatsApp message', { to: toNumber });

    const message = await client.messages.create({
      body,
      from: fromNumber,
      to: toNumber,
    });

    logger.info('WhatsApp message sent', {
      sid: message.sid,
      status: message.status,
      to: toNumber,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      dateCreated: message.dateCreated,
    };
  } catch (error) {
    logger.error('Failed to send WhatsApp message', {
      error: error.message,
      code: error.code,
      to: toNumber,
    });

    throw new Error(`WhatsApp delivery failed: ${error.message}`);
  }
};

/**
 * Send SMS message
 * @param {Object} params
 * @param {string} params.to - Recipient phone number
 * @param {string} params.body - Message body
 * @param {string} [params.from] - Sender number
 * @returns {Promise<Object>}
 */
const sendSMS = async ({ to, body, from }) => {
  if (!client) {
    logger.error('Twilio not configured, cannot send SMS');
    throw new Error('SMS service unavailable');
  }

  if (!to || !body) {
    throw new Error('Recipient (to) and message body are required');
  }

  if (!from && !CONFIG.smsFrom) {
    throw new Error('SMS from number not configured');
  }

  const fromNumber = from || CONFIG.smsFrom;

  try {
    logger.info('Sending SMS', { to });

    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    logger.info('SMS sent', {
      sid: message.sid,
      status: message.status,
      to,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error) {
    logger.error('Failed to send SMS', {
      error: error.message,
      code: error.code,
      to,
    });

    throw new Error(`SMS delivery failed: ${error.message}`);
  }
};

/**
 * Send alert to default recipient (legacy support)
 * @param {string} message 
 * @returns {Promise<Object>}
 */
const sendAlert = async (message) => {
  if (!CONFIG.defaultRecipient) {
    throw new Error('TWILIO_DEFAULT_RECIPIENT not configured');
  }

  return sendWhatsAppMessage({
    to: CONFIG.defaultRecipient,
    body: message,
  });
};

/**
 * Check account balance and status
 * @returns {Promise<Object|null>}
 */
const getAccountInfo = async () => {
  if (!client) {
    logger.warn('Twilio not configured, cannot fetch account info');
    return null;
  }

  try {
    const account = await client.api.accounts(CONFIG.accountSid).fetch();
    const balance = await client.api.accounts(CONFIG.accountSid).balance.fetch();

    return {
      status: account.status,
      type: account.type,
      balance: balance.balance,
      currency: balance.currency,
    };
  } catch (error) {
    logger.error('Failed to fetch account info', { error: error.message });
    return null;
  }
};

/**
 * Health check for Twilio service
 * @returns {Promise<Object>}
 */
const healthCheck = async () => {
  const configErrors = validateConfig();
  
  if (configErrors.length > 0) {
    return {
      status: 'unconfigured',
      errors: configErrors,
    };
  }

  if (!client) {
    return {
      status: 'error',
      message: 'Client initialization failed',
    };
  }

  const accountInfo = await getAccountInfo();

  if (!accountInfo) {
    return {
      status: 'error',
      message: 'Cannot connect to Twilio API',
    };
  }

  return {
    status: 'healthy',
    account: {
      status: accountInfo.status,
      balance: `${accountInfo.balance} ${accountInfo.currency}`,
    },
  };
};

module.exports = {
  sendWhatsAppMessage,
  sendSMS,
  sendAlert,
  getAccountInfo,
  healthCheck,
  isConfigured,
};