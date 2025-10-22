const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");
const stripeConfig = require("../../config/stripe"); // 🆕 Updated import

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

    // 🆕 Use stripeConfig for payment intent creation
    const paymentIntent = await stripeConfig.createPaymentIntent(order.amount, {
      orderId: orderId.toString(),
      userId: req.user.id.toString(),
      type: 'marketplace_escrow'
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
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

/// In your offerRoutes.js - Update confirm-offer-payment route
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔍 Confirming offer payment:", { offerId, paymentIntentId, userId });

    // Find the offer
    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      paymentIntentId: paymentIntentId
    });

    console.log("📋 Offer found:", offer);

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("💳 Payment intent status:", paymentIntent.status);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not completed', 
        paymentStatus: paymentIntent.status 
      });
    }

    // Update offer status
    offer.status = 'pending'; // Now waiting for seller acceptance
    offer.paidAt = new Date();
    await offer.save();

    console.log("✅ Offer payment confirmed:", offer._id);

    // CREATE ORDER FROM THE OFFER
    console.log("🛒 Creating order from offer...");
    const order = new Order({
      buyerId: userId,
      sellerId: offer.listingId.sellerId, // Make sure this is populated
      listingId: offer.listingId,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'paid', // Start as paid since payment is complete
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
      requirements: offer.requirements,
      expectedDelivery: offer.expectedDelivery,
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false
    });

    await order.save();
    console.log("✅ Order created from offer:", order._id);

    res.status(200).json({
      success: true,
      message: 'Offer payment confirmed and order created successfully',
      offer: {
        _id: offer._id,
        status: offer.status,
        amount: offer.amount,
        paidAt: offer.paidAt
      },
      order: {
        _id: order._id,
        status: order.status,
        amount: order.amount
      }
    });

  } catch (error) {
    console.error('❌ Error confirming offer payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: error.message 
    });
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

    // 🆕 Use stripeConfig for payment capture
    const paymentIntent = await stripeConfig.capturePayment(order.stripePaymentIntentId);

    // 🆕 Use stripeConfig for fee calculation
    const fees = stripeConfig.calculateFees(order.amount);
    const platformFee = fees.platformFee;
    const sellerAmount = fees.sellerAmount;

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
      platformFee: platformFee,
      platformFeePercent: fees.platformFeePercent
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ error: error.message || 'Failed to capture payment' });
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
      // 🆕 Use stripeConfig for payment cancellation
      await stripeConfig.cancelPayment(order.stripePaymentIntentId);
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
    res.status(500).json({ error: error.message || 'Failed to cancel payment' });
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
      // 🆕 Use stripeConfig for payment status
      paymentIntent = await stripeConfig.getPaymentStatus(order.stripePaymentIntentId);
    }

    // 🆕 Calculate fees for display
    const fees = stripeConfig.calculateFees(order.amount);

    res.status(200).json({
      orderStatus: order.status,
      paymentIntent: paymentIntent ? {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        created: paymentIntent.created
      } : null,
      paymentReleased: order.paymentReleased,
      releaseDate: order.releaseDate,
      fees: fees // 🆕 Include fee breakdown
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment status' });
  }
});

// 6. Request Refund
router.post("/request-refund", async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'paid' // Only refund if paid but not delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not eligible for refund' });
    }

    // 🆕 Create refund using stripeConfig
    const refund = await stripeConfig.createRefund(order.stripePaymentIntentId);

    // Update order status
    order.status = 'cancelled';
    order.refundReason = reason;
    order.refundedAt = new Date();
    await order.save();

    res.status(200).json({ 
      message: 'Refund processed successfully', 
      refundId: refund.id,
      order 
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: error.message || 'Failed to process refund' });
  }
});

router.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
   
    event = stripeConfig.verifyWebhook(req.body, sig);
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

    case 'charge.refunded':
      const chargeRefunded = event.data.object;
      console.log('Charge was refunded!');
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

module.exports = router;