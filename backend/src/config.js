const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe configuration and utility functions
const stripeConfig = {
  // Platform fee percentage (15%)
  platformFeePercent: 0.15,
  
  // Currency
  defaultCurrency: 'usd',
  
  // Calculate platform fee and seller amount
  calculateFees: (amount) => {
    const platformFee = Math.round(amount * 0.15 * 100) / 100; // 15% platform fee
    const sellerAmount = Math.round((amount - platformFee) * 100) / 100;
    return {
      platformFee,
      sellerAmount,
      originalAmount: amount
    };
  },
  
  // Create payment intent for marketplace
  createPaymentIntent: async (amount, metadata = {}) => {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        capture_method: 'manual', // Manual capture for escrow
        metadata: {
          ...metadata,
          platform: 'wecinema-marketplace'
        }
      });
      return paymentIntent;
    } catch (error) {
      console.error('Stripe Payment Intent Error:', error);
      throw error;
    }
  },
  
  // Capture payment (release funds from escrow)
  capturePayment: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Stripe Capture Error:', error);
      throw error;
    }
  },
  
  // Cancel payment intent
  cancelPayment: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Stripe Cancel Error:', error);
      throw error;
    }
  },
  
  // Get payment intent status
  getPaymentStatus: async (paymentIntentId) => {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Stripe Retrieve Error:', error);
      throw error;
    }
  },
  
  // Verify webhook signature
  verifyWebhook: (payload, signature) => {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw error;
    }
  }
};

module.exports = stripeConfig;