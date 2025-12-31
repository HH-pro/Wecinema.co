const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");
const stripeConfig = require("../../config/stripe");
const mongoose = require("mongoose");
const Withdrawal = require("../../models/Withdrawal"); // Add this import
const Seller = require("../../models/Seller"); // Add this import

// ========== PAYMENT ROUTES ========== //

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

// ========== WITHDRAWAL ROUTES ========== //

// 7. Get Withdrawal History
router.get("/withdrawals", async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { sellerId: mongoose.Types.ObjectId(userId) };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get withdrawals with pagination
    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(query);

    // Get seller's current balance
    const seller = await Seller.findOne({ userId: mongoose.Types.ObjectId(userId) });
    const earningsSummary = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$amount" }
        }
      }
    ]);

    const totalEarnings = earningsSummary[0]?.totalEarnings || 0;
    const availableBalance = totalEarnings - (seller?.totalWithdrawn || 0);
    const pendingBalance = seller?.pendingBalance || 0;

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        balance: {
          availableBalance,
          pendingBalance,
          totalEarnings,
          totalWithdrawn: seller?.totalWithdrawn || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch withdrawal history',
      details: error.message 
    });
  }
});

// 8. Request Withdrawal
router.post("/withdrawals", async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal amount'
      });
    }

    // Convert amount to number (it comes in cents)
    const amountInCents = parseInt(amount);

    // Get seller
    const seller = await Seller.findOne({ userId: mongoose.Types.ObjectId(userId) });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // Calculate available balance from completed orders
    const earningsSummary = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed'
        } 
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$amount" }
        }
      }
    ]);

    const totalEarnings = earningsSummary[0]?.totalEarnings || 0;
    const availableBalance = totalEarnings - (seller.totalWithdrawn || 0);

    // Check if withdrawal amount is valid
    if (amountInCents > availableBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        availableBalance,
        totalEarnings,
        totalWithdrawn: seller.totalWithdrawn || 0
      });
    }

    // Check minimum withdrawal amount ($5 = 500 cents)
    const MIN_WITHDRAWAL = 500;
    if (amountInCents < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is $${(MIN_WITHDRAWAL / 100).toFixed(2)}`
      });
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      sellerId: userId,
      amount: amountInCents,
      status: 'pending',
      requestDate: new Date(),
      description: `Withdrawal of $${(amountInCents / 100).toFixed(2)}`,
      destination: seller.stripeAccountId ? 'Stripe Account' : 'Bank Account',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    });

    await withdrawal.save();

    // Update seller's withdrawal stats
    seller.totalWithdrawn = (seller.totalWithdrawn || 0) + amountInCents;
    seller.pendingBalance = (seller.pendingBalance || 0) + amountInCents;
    seller.lastWithdrawal = new Date();
    await seller.save();

    // If Stripe is connected, create Stripe transfer
    if (seller.stripeAccountId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: seller.stripeAccountId,
          description: `Withdrawal for seller ${seller._id}`
        });

        // Update withdrawal with Stripe info
        withdrawal.stripeTransferId = transfer.id;
        withdrawal.status = 'processing';
        await withdrawal.save();

      } catch (stripeError) {
        console.error('Stripe transfer error:', stripeError);
        // Continue even if Stripe fails - manual review needed
      }
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        withdrawalId: withdrawal._id,
        amount: amountInCents,
        status: withdrawal.status,
        estimatedArrival: withdrawal.estimatedArrival,
        newBalance: availableBalance - amountInCents,
        availableBalance: availableBalance - amountInCents
      }
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process withdrawal',
      details: error.message 
    });
  }
});

// 9. Get Withdrawal Details
router.get("/withdrawals/:withdrawalId", async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { withdrawalId } = req.params;

    const withdrawal = await Withdrawal.findOne({
      _id: withdrawalId,
      sellerId: userId
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: withdrawal
    });

  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch withdrawal details',
      details: error.message 
    });
  }
});

// 10. Cancel Withdrawal
router.post("/withdrawals/:withdrawalId/cancel", async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { withdrawalId } = req.params;

    const withdrawal = await Withdrawal.findOne({
      _id: withdrawalId,
      sellerId: userId
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found'
      });
    }

    // Only pending withdrawals can be cancelled
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel withdrawal with status: ${withdrawal.status}`
      });
    }

    // Update withdrawal status
    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    await withdrawal.save();

    // Update seller's balance
    const seller = await Seller.findOne({ userId: mongoose.Types.ObjectId(userId) });
    if (seller) {
      seller.totalWithdrawn = Math.max(0, (seller.totalWithdrawn || 0) - withdrawal.amount);
      seller.pendingBalance = Math.max(0, (seller.pendingBalance || 0) - withdrawal.amount);
      await seller.save();
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal cancelled successfully',
      data: withdrawal
    });

  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel withdrawal',
      details: error.message 
    });
  }
});

// 11. Get Withdrawal Stats
router.get("/withdrawals/stats/summary", async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Get withdrawal stats
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $match: { sellerId: mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get total withdrawn
    const totalWithdrawn = await Withdrawal.aggregate([
      {
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get pending withdrawals
    const pendingWithdrawals = await Withdrawal.aggregate([
      {
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: { $in: ['pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get latest withdrawal
    const lastWithdrawal = await Withdrawal.findOne({
      sellerId: userId,
      status: 'completed'
    }).sort({ completedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        statsByStatus: withdrawalStats,
        totalWithdrawn: totalWithdrawn[0]?.total || 0,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        lastWithdrawal: lastWithdrawal
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch withdrawal stats',
      details: error.message 
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

    case 'transfer.paid':
      const transferPaid = event.data.object;
      console.log('Transfer was paid to seller!');
      
      // Update withdrawal status
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
      
      // Update withdrawal status
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