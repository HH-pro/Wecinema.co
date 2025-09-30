const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const User = require("../../models/User");
const stripe = require("../../config/stripe");

// 1. Create Payment Intent (Escrow mein funds hold karein)
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate('listingId', 'title');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns this order
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already paid
    if (order.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Order already paid or cancelled' });
    }

    // Create Stripe Payment Intent with manual capture (escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), // Convert to cents
      currency: 'usd',
      capture_method: 'manual', // Manual capture for escrow
      metadata: {
        orderId: orderId.toString(),
        userId: req.user.id.toString(),
        type: 'marketplace_escrow'
      },
      description: `Payment for: ${order.listingId?.title || 'Marketplace Order'}`
    });

    // Update order with payment intent ID
    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.amount
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// 2. Confirm Payment Success (Frontend se call karein)
router.post("/confirm-payment", async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify payment intent
    if (order.stripePaymentIntentId !== paymentIntentId) {
      return res.status(400).json({ error: 'Invalid payment intent' });
    }

    // Update order status to PAID
    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    res.status(200).json({ 
      message: 'Payment confirmed successfully', 
      order,
      nextStep: 'seller_will_start_work'
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// 3. Capture Payment (Funds release to seller)
router.post("/capture-payment", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'delivered' // Only capture if delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not delivered' });
    }

    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ error: 'No payment intent found' });
    }

    // Capture the payment - funds release from escrow
    const paymentIntent = await stripe.paymentIntents.capture(
      order.stripePaymentIntentId
    );

    // Calculate platform fee (15%) and seller amount
    const platformFee = order.amount * 0.15;
    const sellerAmount = order.amount - platformFee;

    // Update seller balance
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { 
        balance: sellerAmount,
        totalSales: 1 
      }
    });

    // Update order status
    order.status = 'completed';
    order.paymentReleased = true;
    order.releaseDate = new Date();
    order.completedAt = new Date();
    order.platformFee = platformFee;
    order.sellerAmount = sellerAmount;
    
    await order.save();

    res.status(200).json({ 
      message: 'Payment captured and funds released to seller', 
      order,
      sellerAmount: sellerAmount,
      platformFee: platformFee
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    
    // Stripe specific errors
    if (error.type === 'StripeError') {
      return res.status(400).json({ 
        error: 'Payment capture failed', 
        details: error.message 
      });
    }
    
    res.status(500).json({ error: 'Failed to capture payment' });
  }
});

// 4. Cancel Payment Intent (Agar order cancel ho)
router.post("/cancel-payment", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'pending_payment'
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or already processed' });
    }

    if (order.stripePaymentIntentId) {
      // Cancel the payment intent
      await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ 
      message: 'Payment cancelled successfully', 
      order 
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

// 5. Get Payment Status
router.get("/payment-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (order.buyerId.toString() !== req.user.id && order.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let paymentIntent = null;
    if (order.stripePaymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    }

    res.status(200).json({
      orderStatus: order.status,
      paymentIntent: paymentIntent ? {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created
      } : null,
      paymentReleased: order.paymentReleased,
      releaseDate: order.releaseDate
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// 6. Stripe Webhook (Important for real-time updates)
router.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe Webhook Received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('PaymentIntent was successful!');
      
      // Update order status if needed
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentSucceeded.id },
        { 
          status: 'paid',
          paidAt: new Date()
        }
      );
      break;

    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('Payment failed:', paymentIntentFailed.last_payment_error?.message);
      break;

    case 'payment_intent.canceled':
      const paymentIntentCanceled = event.data.object;
      console.log('PaymentIntent was canceled!');
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

module.exports = router;