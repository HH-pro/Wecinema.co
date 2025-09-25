// services/twilioService.js
const twilio = require('twilio');

// Twilio Configuration (Hardcoded - for testing only)
const accountSid = 'AC38eb9207822aa3a28c803f96d49f68ae'; // Your Twilio Account SID
const authToken = '45fc31f42e4719ad907311ca6a61aa58'; // Your Twilio Auth Token
const twilioPhoneNumber = 'whatsapp:+14155238886'; // Twilio WhatsApp sandbox number
const recipientNumber = 'whatsapp:+923117836704'; // Your recipient's WhatsApp number
// ======================
// CLIENT INITIALIZATION
// ======================
let client;
try {
  client = twilio(accountSid, authToken);
} catch (error) {
  console.error('TWILIO CLIENT INIT FAILED:', error);
  throw new Error('Twilio client initialization failed');
}

// ======================
// VALIDATION CHECKS
// ======================
const validateConfig = () => {
  const errors = [];
  
  if (!accountSid || !accountSid.startsWith('AC')) {
    errors.push('Invalid Account SID format');
  }
  if (!authToken || authToken.length !== 32) {
    errors.push('Invalid Auth Token format');
  }
  if (!twilioPhoneNumber.startsWith('whatsapp:+')) {
    errors.push('Invalid Twilio number format');
  }
  if (!recipientNumber.startsWith('whatsapp:+')) {
    errors.push('Invalid recipient number format');
  }

  return errors;
};

// ======================
// CORE FUNCTION
// ======================
const sendWhatsAppMessage = async (message) => {
  try {
    // Configuration validation
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      throw new Error(`Configuration errors:\n${configErrors.join('\n')}`);
    }

    // API Request
    console.log('Attempting to send message to:', recipientNumber);
    const messageInstance = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: recipientNumber
    });

    console.log('Twilio API Response:', {
      status: messageInstance.status,
      sid: messageInstance.sid,
      errorCode: messageInstance.errorCode,
      errorMessage: messageInstance.errorMessage
    });

    return {
      success: true,
      sid: messageInstance.sid,
      status: messageInstance.status
    };
  } catch (error) {
    console.error('FULL ERROR DETAILS:', {
      code: error.code,
      status: error.status,
      twilioError: error.moreInfo,
      message: error.message,
      stack: error.stack
    });

    throw new Error(`Twilio API failure: ${error.message}`);
  }
};

// ======================
// DEBUGGING UTILITIES
// ======================
const debugConnection = async () => {
  try {
    console.log('Testing Twilio API connectivity...');
    const balance = await client.balance.fetch();
    console.log('Account balance:', balance.currency, balance.balance);
    return true;
  } catch (error) {
    console.error('API Connectivity Test Failed:', error);
    return false;
  }
};

// ======================
// TEST EXECUTION
// ======================
const runDiagnostics = async () => {
  console.log('\n=== STARTING DIAGNOSTICS ===');
  
  // 1. Validate configuration
  console.log('\n[1/3] Validating configuration...');
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('Configuration invalid:', configErrors);
    return;
  }
  console.log('✓ Configuration valid');

  // 2. Test API connectivity
  console.log('\n[2/3] Testing API connectivity...');
  const connectionOK = await debugConnection();
  if (!connectionOK) return;

  // 3. Send test message
  console.log('\n[3/3] Sending test message...');
  try {
    await sendWhatsAppMessage('🔧 Diagnostic test message');
    console.log('✓ All tests passed successfully');
  } catch (error) {
    console.error('✖ Final test failed');
  }
};

// Uncomment to run diagnostics
runDiagnostics();

module.exports = { sendWhatsAppMessage, runDiagnostics };