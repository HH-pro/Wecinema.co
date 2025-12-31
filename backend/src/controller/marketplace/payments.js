// routes/payments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateMiddleware } = require("../../utils");
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");
const Seller = require("../../models/marketplace/Seller");
const Withdrawal = require("../../models/marketplace/Withdrawal");
const stripeConfig = require("../../config/stripe");

// ========== PAYMENT ROUTES ========== //

router.post("/create-payment-intent", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate('listingId', 'title');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    if (order.status !== 'pending_payment') {
      return res.status(400).json({ 
        success: false,
        error: 'Order already paid or cancelled' 
      });
    }

    const paymentIntent = await stripeConfig.createPaymentIntent(order.amount, {
      orderId: orderId.toString(),
      userId: req.user.id.toString(),
      type: 'marketplace_escrow'
    });

    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: order.amount,
        orderId: order._id
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create payment intent' 
    });
  }
});

router.post("/confirm-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    if (order.stripePaymentIntentId !== paymentIntentId) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid payment intent' 
      });
    }

    order.status = 'paid';
    order.paidAt = new Date();
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Payment confirmed successfully', 
      data: order
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to confirm payment' 
    });
  }
});

router.post("/capture-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not delivered' 
      });
    }

    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ 
        success: false,
        error: 'No payment intent found' 
      });
    }

    const paymentIntent = await stripeConfig.capturePayment(order.stripePaymentIntentId);
    const fees = stripeConfig.calculateFees(order.amount);
    const platformFee = fees.platformFee;
    const sellerAmount = fees.sellerAmount;

    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { 
        balance: sellerAmount,
        totalSales: 1 
      }
    });

    order.status = 'completed';
    order.paymentReleased = true;
    order.releaseDate = new Date();
    order.completedAt = new Date();
    order.platformFee = platformFee;
    order.sellerAmount = sellerAmount;
    
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Payment captured and funds released to seller', 
      data: {
        order,
        sellerAmount,
        platformFee,
        platformFeePercent: fees.platformFeePercent
      }
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to capture payment' 
    });
  }
});

router.post("/cancel-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'pending_payment'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or already processed' 
      });
    }

    if (order.stripePaymentIntentId) {
      await stripeConfig.cancelPayment(order.stripePaymentIntentId);
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Payment cancelled successfully', 
      data: order 
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to cancel payment' 
    });
  }
});

router.get("/payment-status/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    if (order.buyerId.toString() !== req.user.id && order.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    let paymentIntent = null;
    if (order.stripePaymentIntentId) {
      paymentIntent = await stripeConfig.getPaymentStatus(order.stripePaymentIntentId);
    }

    const fees = stripeConfig.calculateFees(order.amount);

    res.status(200).json({
      success: true,
      data: {
        orderStatus: order.status,
        paymentIntent: paymentIntent ? {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          created: paymentIntent.created
        } : null,
        paymentReleased: order.paymentReleased,
        releaseDate: order.releaseDate,
        fees
      }
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to fetch payment status' 
    });
  }
});

router.post("/request-refund", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: req.user.id,
      status: 'paid'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not eligible for refund' 
      });
    }

    const refund = await stripeConfig.createRefund(order.stripePaymentIntentId);

    order.status = 'cancelled';
    order.refundReason = reason;
    order.refundedAt = new Date();
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Refund processed successfully', 
      data: {
        refundId: refund.id,
        order 
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to process refund' 
    });
  }
});

// ========== STRIPE WEBHOOK ========== //

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

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('PaymentIntent was successful!');
      
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

    case 'transfer.paid':
      const transferPaid = event.data.object;
      console.log('Transfer was paid to seller!');
      
      await Withdrawal.findOneAndUpdate(
        { stripeTransferId: transferPaid.id },
        { 
          status: 'completed',
          completedAt: new Date()
        }
      );
      break;

    case 'transfer.failed':
      const transferFailed = event.data.object;
      console.log('Transfer failed:', transferFailed.failure_message);
      
      await Withdrawal.findOneAndUpdate(
        { stripeTransferId: transferFailed.id },
        { 
          status: 'failed',
          failedAt: new Date(),
          failureReason: transferFailed.failure_message
        }
      );
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({received: true});
});

module.exports = router;