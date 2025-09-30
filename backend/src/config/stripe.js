const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe configuration and utility functions for WeCinema Marketplace
 */
const stripeConfig = {
  
  // Platform Settings
  platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT) || 0.15, // 15% default
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'usd',
  
  /**
   * Calculate platform fee and seller amount
   * @param {number} amount - Original amount
   * @returns {Object} Fee breakdown
   */
  calculateFees: (amount) => {
    const platformFee = Math.round(amount * stripeConfig.platformFeePercent * 100) / 100;
    const sellerAmount = Math.round((amount - platformFee) * 100) / 100;
    
    return {
      platformFee,
      sellerAmount,
      originalAmount: amount,
      platformFeePercent: stripeConfig.platformFeePercent
    };
  },
  
  /**
   * Create payment intent for marketplace escrow
   * @param {number} amount - Amount in dollars
   * @param {Object} metadata - Additional metadata
   * @returns {Promise} Stripe payment intent
   */
  createPaymentIntent: async (amount, metadata = {}) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: stripeConfig.defaultCurrency,
        capture_method: 'manual', // Manual capture for escrow
        metadata: {
          ...metadata,
          platform: 'wecinema-marketplace',
          environment: process.env.NODE_ENV || 'development'
        },
        description: `Marketplace order - ${metadata.orderId || 'N/A'}`
      });
      
      console.log('✅ Stripe Payment Intent Created:', paymentIntent.id);
      return paymentIntent;
      
    } catch (error) {
      console.error('❌ Stripe Payment Intent Error:', error);
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  },
  
  /**
   * Capture payment (release funds from escrow to seller)
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise} Captured payment intent
   */
  capturePayment: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
      console.log('✅ Stripe Payment Captured:', paymentIntentId);
      return paymentIntent;
      
    } catch (error) {
      console.error('❌ Stripe Capture Error:', error);
      throw new Error(`Payment capture failed: ${error.message}`);
    }
  },
  
  /**
   * Cancel payment intent
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise} Canceled payment intent
   */
  cancelPayment: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      console.log('✅ Stripe Payment Canceled:', paymentIntentId);
      return paymentIntent;
      
    } catch (error) {
      console.error('❌ Stripe Cancel Error:', error);
      throw new Error(`Payment cancellation failed: ${error.message}`);
    }
  },
  
  /**
   * Get payment intent status
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Promise} Payment intent details
   */
  getPaymentStatus: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
      
    } catch (error) {
      console.error('❌ Stripe Retrieve Error:', error);
      throw new Error(`Payment status check failed: ${error.message}`);
    }
  },
  
  /**
   * Verify Stripe webhook signature
   * @param {Buffer} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Stripe event
   */
  verifyWebhook: (payload, signature) => {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Stripe Webhook Verified:', event.type);
      return event;
      
    } catch (error) {
      console.error('❌ Webhook verification failed:', error);
      throw new Error(`Webhook verification failed: ${error.message}`);
    }
  },
  
  /**
   * Create refund for a payment intent
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {number} amount - Amount to refund (in dollars)
   * @returns {Promise} Refund details
   */
  createRefund: async (paymentIntentId, amount = null) => {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
      };
      
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }
      
      const refund = await stripe.refunds.create(refundData);
      console.log('✅ Stripe Refund Created:', refund.id);
      return refund;
      
    } catch (error) {
      console.error('❌ Stripe Refund Error:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  },
  
  /**
   * Check if Stripe is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured: () => {
    const hasKeys = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY;
    if (!hasKeys) {
      console.warn('⚠️ Stripe keys not found in environment variables');
    }
    return hasKeys;
  }
};

// Check configuration on startup
if (stripeConfig.isConfigured()) {
  console.log('✅ Stripe configuration loaded successfully');
} else {
  console.warn('⚠️ Stripe configuration incomplete - Marketplace payments will not work');
}

module.exports = stripeConfig;