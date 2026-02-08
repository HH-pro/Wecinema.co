require('dotenv').config();
const twilio = require('twilio');
const logger = require('../utils');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sends a WhatsApp message using Twilio API
 * @param {string} message - The message content to send
 * @param {string} [recipient] - Optional recipient override
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
const sendWhatsAppMessage = async (message, recipient = process.env.WHATSAPP_RECIPIENT) => {
  try {
    if (!recipient || !message) {
      logger.error('Missing recipient or message');
      return false;
    }

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: recipient
    });

    logger.info(`WhatsApp message sent to ${recipient}: ${message.substring(0, 30)}...`);
    return true;
  } catch (error) {
    logger.error('WhatsApp send error:', error.message);
    return false;
  }
};

/**
 * Sends domain expiry notification
 * @param {Object} domain - Domain object
 * @param {string} [recipient] - Optional recipient override
 * @returns {Promise<boolean>} - Whether notification was sent
 */
const sendDomainExpiryNotification = async (domain, recipient) => {
  const today = new Date();
  const domainExpiry = new Date(domain.date);
  const hostingExpiry = new Date(domain.hosting.date);
  
  const domainDaysLeft = Math.ceil((domainExpiry - today) / (1000 * 60 * 60 * 24));
  const hostingDaysLeft = Math.ceil((hostingExpiry - today) / (1000 * 60 * 60 * 24));

  let message = `🔔 *Domain Expiry Alert* 🔔\n\n`;
  message += `*Domain:* ${domain.name}\n`;
  
  if (domainDaysLeft <= process.env.EXPIRY_THRESHOLD_DAYS) {
    message += `⚠️ *Domain* expires in ${domainDaysLeft} day(s) (${domainExpiry.toLocaleDateString()})\n`;
  }
  
  if (hostingDaysLeft <= process.env.EXPIRY_THRESHOLD_DAYS) {
    message += `⚠️ *Hosting* (${domain.hosting.name}) expires in ${hostingDaysLeft} day(s) (${hostingExpiry.toLocaleDateString()})\n`;
  }
  
  message += `\nPlease renew to avoid service interruption.`;

  return await sendWhatsAppMessage(message, recipient);
};

module.exports = {
  sendWhatsAppMessage,
  sendDomainExpiryNotification
};