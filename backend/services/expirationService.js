const cron = require('node-cron');
const Domain = require('../../backend/src/models/domainModel');
const { sendWhatsAppMessage } = require('./twilioService');

// Configure these values
const OWNER_PHONE = '+923117836704'; // Your WhatsApp number
const DAYS_BEFORE_EXPIRY = 7;

const checkExpirations = async () => {
  try {
    const domains = await Domain.find();
    const today = new Date();
    
    domains.forEach(domain => {
      // Check domain expiration
      const domainExpiry = new Date(domain.date);
      const domainDaysLeft = Math.ceil((domainExpiry - today) / (1000 * 60 * 60 * 24));
      
      if (domainDaysLeft === DAYS_BEFORE_EXPIRY) {
        const message = `🔔 Domain Reminder: ${domain.name} expires in ${DAYS_BEFORE_EXPIRY} days (${domainExpiry.toDateString()})`;
        sendWhatsAppMessage(OWNER_PHONE, message);
      }

      // Check hosting expiration
      const hostingExpiry = new Date(domain.hosting.date);
      const hostingDaysLeft = Math.ceil((hostingExpiry - today) / (1000 * 60 * 60 * 24));
      
      if (hostingDaysLeft === DAYS_BEFORE_EXPIRY) {
        const message = `🔔 Hosting Reminder: ${domain.hosting.name} for ${domain.name} expires in ${DAYS_BEFORE_EXPIRY} days (${hostingExpiry.toDateString()})`;
        sendWhatsAppMessage(OWNER_PHONE, message);
      }
    });
  } catch (error) {
    console.error('Expiration check error:', error);
  }
};

// Schedule daily check at 9 AM
cron.schedule('0 9 * * *', checkExpirations);

module.exports = { checkExpirations };