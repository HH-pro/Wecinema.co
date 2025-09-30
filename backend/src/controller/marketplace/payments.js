const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");

// Create payment intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Here you would integrate with Stripe
    // For now, we'll simulate payment intent creation
    const paymentIntent = {
      id: `pi_${Date.now()}`,
      client_secret: `cs_test_${Date.now()}`,
      amount: amount * 100, // Convert to cents
      currency: 'usd'
    };

    // Update order with payment intent ID
    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json(paymentIntent);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment (webhook simulation)
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

    // Update order status
    order.status = 'confirmed';
    await order.save();

    res.status(200).json({ message: 'Payment confirmed', order });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Release funds to seller (when buyer accepts delivery)
router.post("/release-funds", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      sellerId: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not ready for payout' });
    }

    // Update order status
    order.status = 'completed';
    await order.save();

    // Update seller balance (simplified - in real app, use MarketplaceTransaction)
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { 
        balance: order.amount * 0.85, // 15% platform fee
        totalSales: 1 
      }
    });

    res.status(200).json({ 
      message: 'Funds released to seller', 
      order,
      payoutAmount: order.amount * 0.85
    });
  } catch (error) {
    console.error('Error releasing funds:', error);
    res.status(500).json({ error: 'Failed to release funds' });
  }
});

module.exports = router;