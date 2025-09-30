const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");
const stripe = require("../../config/stripe");

// 1. Create Payment Intent (Funds hold in escrow)
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create Stripe Payment Intent with manual capture (escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      capture_method: 'manual', // Manual capture for escrow
      metadata: {
        orderId: orderId.toString(),
        type: 'marketplace_escrow'
      },
    });

    // Update order with payment intent
    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// 2. Confirm Payment (Webhook - Funds moved to escrow)
router.post("/stripe-webhook", express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update order status to PAID (funds in escrow)
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { 
          status: 'paid',
          // Payment captured but funds held by platform
        }
      );
      console.log('Payment received - Funds in escrow');
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// 3. Seller Delivers Work
router.post("/deliver-order", async (req, res) => {
  try {
    const { orderId, deliveryMessage, deliveryFiles } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      sellerId: req.user.id,
      status: 'paid' // Only deliver if paid
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not paid' });
    }

    // Update order with delivery
    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage;
    order.deliveryFiles = deliveryFiles;
    order.deliveredAt = new Date();
    
    await order.save();

    res.status(200).json({ 
      message: 'Order delivered successfully', 
      order 
    });
  } catch (error) {
    console.error('Error delivering order:', error);
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// 4. Buyer Accepts Delivery & Release Funds
router.post("/accept-delivery", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'delivered' // Only accept if delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not delivered' });
    }

    // CAPTURE PAYMENT - Release funds from escrow to seller
    const paymentIntent = await stripe.paymentIntents.capture(
      order.stripePaymentIntentId
    );

    // Calculate platform fee and seller amount
    const platformFee = order.amount * 0.15; // 15% platform fee
    const sellerAmount = order.amount - platformFee;

    // Update seller balance
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { 
        balance: sellerAmount,
        totalSales: 1 
      }
    });

    // Mark order as completed
    order.status = 'completed';
    order.paymentReleased = true;
    order.releaseDate = new Date();
    order.completedAt = new Date();
    
    await order.save();

    res.status(200).json({ 
      message: 'Delivery accepted and funds released to seller', 
      order,
      sellerAmount: sellerAmount,
      platformFee: platformFee
    });
  } catch (error) {
    console.error('Error accepting delivery:', error);
    res.status(500).json({ error: 'Failed to accept delivery' });
  }
});

// 5. Request Revision
router.post("/request-revision", async (req, res) => {
  try {
    const { orderId, revisionNotes } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check revision limit
    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ error: 'Maximum revisions reached' });
    }

    order.status = 'in_revision';
    order.revisions += 1;
    order.revisionNotes = revisionNotes;
    
    await order.save();

    res.status(200).json({ 
      message: 'Revision requested', 
      order,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

module.exports = router;