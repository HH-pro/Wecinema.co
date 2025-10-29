const express = require('express');
const router = express.Router();
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');

const { authenticateMiddleware } = require('../middleware/auth');
const User = require('../../models/user');
const Order = require("../../models/marketplace/order");


// ✅ Check Stripe account status
router.get('/status', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // If no Stripe account ID, return not connected
    if (!user.stripeAccountId) {
      return res.json({
        success: true,
        connected: false,
        status: 'not_connected',
        message: 'Stripe account not connected'
      });
    }

    // Check Stripe account status
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    res.json({
      success: true,
      connected: true,
      status: account.charges_enabled ? 'active' : 'pending',
      stripeAccountId: user.stripeAccountId,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
      account: {
        business_type: account.business_type,
        country: account.country,
        email: account.email,
        default_currency: account.default_currency
      }
    });

  } catch (error) {
    console.error('Error checking Stripe status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Stripe status',
      details: error.message
    });
  }
});

// ✅ Create Stripe Connect account for seller
router.post('/onboard-seller', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // If already has Stripe account, return existing
    if (user.stripeAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      
      if (account.details_submitted) {
        return res.status(400).json({
          success: false,
          error: 'Stripe account already connected',
          stripeAccountId: user.stripeAccountId
        });
      }
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IN', // India
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
        first_name: user.firstName || user.username,
        last_name: user.lastName || '',
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });

    // Update user with Stripe account ID
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'pending';
    await user.save();

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/seller/dashboard?stripe=refresh`,
      return_url: `${process.env.FRONTEND_URL}/seller/dashboard?stripe=success`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url,
      stripeAccountId: account.id,
      message: 'Redirect to Stripe onboarding'
    });

  } catch (error) {
    console.error('Error creating Stripe account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe account',
      details: error.message
    });
  }
});

// ✅ Complete onboarding (webhook or manual check)
router.post('/complete-onboarding', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    // Check account status
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    
    user.stripeAccountStatus = account.charges_enabled ? 'active' : 'pending';
    await user.save();

    res.json({
      success: true,
      status: user.stripeAccountStatus,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      message: 'Onboarding status updated'
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      details: error.message
    });
  }
});

// ✅ Create payment intent for order
router.post('/create-payment-intent', authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get order details
    const order = await Order.findById(orderId)
      .populate('sellerId')
      .populate('buyerId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify buyer is making the payment
    if (order.buyerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only buyer can make payment for this order'
      });
    }

    // Verify seller has active Stripe account
    if (!order.sellerId.stripeAccountId || order.sellerId.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Seller payment account is not ready'
      });
    }

    // Calculate platform fee (15%)
    const platformFee = Math.round(order.amount * 0.15 * 100); // in paise
    const amount = Math.round(order.amount * 100); // in paise

    // Create payment intent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'inr',
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: {
        destination: order.sellerId.stripeAccountId,
      },
      application_fee_amount: platformFee,
      metadata: {
        orderId: order._id.toString(),
        sellerId: order.sellerId._id.toString(),
        buyerId: order.buyerId._id.toString(),
        listingId: order.listingId.toString()
      },
      description: `Payment for order #${order._id.toString().slice(-8)}`
    });

    // Update order with payment intent ID
    order.stripePaymentIntentId = paymentIntent.id;
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.amount,
      currency: 'inr',
      platformFee: platformFee / 100,
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      details: error.message
    });
  }
});

// ✅ Confirm payment
router.post('/confirm-payment', authenticateMiddleware, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find order by payment intent ID
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId })
      .populate('sellerId')
      .populate('buyerId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found for this payment'
      });
    }

    // Verify user has access to this order
    if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this order'
      });
    }

    // Update order status based on payment status
    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.status = 'in_progress';
      order.paidAt = new Date();
      
      // Add to order history
      order.history.push({
        status: 'paid',
        timestamp: new Date(),
        message: 'Payment completed successfully'
      });

      await order.save();

      res.json({
        success: true,
        paymentStatus: 'succeeded',
        orderStatus: order.status,
        message: 'Payment confirmed successfully'
      });
    } else {
      order.paymentStatus = paymentIntent.status;
      await order.save();

      res.json({
        success: false,
        paymentStatus: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      details: error.message
    });
  }
});

// ✅ Get seller balance
router.get('/balance', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeAccountId
    });

    const available = balance.available.find(b => b.currency === 'inr') || { amount: 0 };
    const pending = balance.pending.find(b => b.currency === 'inr') || { amount: 0 };

    res.json({
      success: true,
      balance: {
        available: available.amount / 100, // Convert to rupees
        pending: pending.amount / 100, // Convert to rupees
        currency: 'inr'
      },
      availableBalance: available.amount / 100,
      pendingBalance: pending.amount / 100
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
      details: error.message
    });
  }
});

// ✅ Create payout to seller
router.post('/create-payout', authenticateMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Check if payout is enabled
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({
        success: false,
        error: 'Payouts are not enabled for your account'
      });
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'inr',
      method: 'standard', // or 'instant' for instant payouts (additional fees)
    }, {
      stripeAccount: user.stripeAccountId
    });

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        method: payout.method
      },
      message: 'Payout initiated successfully'
    });

  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payout',
      details: error.message
    });
  }
});

// ✅ Get payout history
router.get('/payouts', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const payouts = await stripe.payouts.list({
      limit: 50,
    }, {
      stripeAccount: user.stripeAccountId
    });

    res.json({
      success: true,
      payouts: payouts.data.map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        method: payout.method,
        created: payout.created
      }))
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payouts',
      details: error.message
    });
  }
});

// ✅ Create login link for Stripe Express dashboard
router.post('/create-login-link', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

    res.json({
      success: true,
      url: loginLink.url,
      message: 'Login link generated successfully'
    });

  } catch (error) {
    console.error('Error creating login link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create login link',
      details: error.message
    });
  }
});

// ✅ Stripe Webhook Handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      
      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook Handlers
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'in_progress';
      order.paidAt = new Date();
      
      order.history.push({
        status: 'paid',
        timestamp: new Date(),
        message: 'Payment completed via webhook'
      });

      await order.save();
      console.log(`✅ Order ${order._id} marked as paid`);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (order) {
      order.paymentStatus = 'failed';
      order.history.push({
        status: 'payment_failed',
        timestamp: new Date(),
        message: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
      });

      await order.save();
      console.log(`❌ Order ${order._id} payment failed`);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account) {
  try {
    const user = await User.findOne({ stripeAccountId: account.id });
    if (user) {
      user.stripeAccountStatus = account.charges_enabled ? 'active' : 'pending';
      await user.save();
      console.log(`✅ Updated Stripe status for user ${user._id}: ${user.stripeAccountStatus}`);
    }
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handlePayoutPaid(payout) {
  try {
    console.log(`💰 Payout ${payout.id} completed: ${payout.amount / 100} ${payout.currency}`);
    // You can add additional logic here for payout notifications
  } catch (error) {
    console.error('Error handling payout:', error);
  }
}

module.exports = router;