// routes/payments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authenticateMiddleware = require("../middleware/auth");
const Order = require("../models/marketplace/order");
const User = require("../models/user");
const Seller = require("../models/marketplace/Seller");
const Withdrawal = require("../models/marketplace/Withdrawal");
const stripeConfig = require("../config/stripe");

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

// ========== WITHDRAWAL ROUTES ========== //

router.get("/withdrawals", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { sellerId: mongoose.Types.ObjectId(userId) };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(query);

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

router.post("/withdrawals", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal amount'
      });
    }

    const amountInCents = parseInt(amount);
    const seller = await Seller.findOne({ userId: mongoose.Types.ObjectId(userId) });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

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

    if (amountInCents > availableBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        availableBalance,
        totalEarnings,
        totalWithdrawn: seller.totalWithdrawn || 0
      });
    }

    const MIN_WITHDRAWAL = 500;
    if (amountInCents < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is $${(MIN_WITHDRAWAL / 100).toFixed(2)}`
      });
    }

    const withdrawal = new Withdrawal({
      sellerId: userId,
      amount: amountInCents,
      status: 'pending',
      requestDate: new Date(),
      description: `Withdrawal of $${(amountInCents / 100).toFixed(2)}`,
      destination: seller.stripeAccountId ? 'Stripe Account' : 'Bank Account',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    await withdrawal.save();

    seller.totalWithdrawn = (seller.totalWithdrawn || 0) + amountInCents;
    seller.pendingBalance = (seller.pendingBalance || 0) + amountInCents;
    seller.lastWithdrawal = new Date();
    await seller.save();

    if (seller.stripeAccountId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: seller.stripeAccountId,
          description: `Withdrawal for seller ${seller._id}`
        });

        withdrawal.stripeTransferId = transfer.id;
        withdrawal.status = 'processing';
        await withdrawal.save();

      } catch (stripeError) {
        console.error('Stripe transfer error:', stripeError);
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

router.get("/withdrawals/:withdrawalId", authenticateMiddleware, async (req, res) => {
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

router.post("/withdrawals/:withdrawalId/cancel", authenticateMiddleware, async (req, res) => {
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

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel withdrawal with status: ${withdrawal.status}`
      });
    }

    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    await withdrawal.save();

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

router.get("/withdrawals/stats/summary", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

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

// ========== EARNINGS ROUTES ========== //

router.get("/earnings/balance", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const seller = await Seller.findOne({ userId: mongoose.Types.ObjectId(userId) });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

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
          totalEarnings: { $sum: "$amount" },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalEarnings = earningsSummary[0]?.totalEarnings || 0;
    const availableBalance = totalEarnings - (seller.totalWithdrawn || 0);
    const pendingBalance = seller.pendingBalance || 0;

    const thisMonthEarnings = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        availableBalance,
        pendingBalance,
        totalEarnings,
        totalWithdrawn: seller.totalWithdrawn || 0,
        walletBalance: seller.walletBalance || 0,
        currency: 'USD',
        lastWithdrawal: seller.lastWithdrawal || null,
        nextPayoutDate: seller.nextPayoutDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        thisMonthRevenue: thisMonthEarnings[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching earnings balance:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch earnings balance',
      details: error.message 
    });
  }
});

router.get("/earnings/monthly", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { months = 6 } = req.query;

    const monthlyEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          completedAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - parseInt(months)))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" }
          },
          earnings: { $sum: "$amount" },
          orders: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: monthlyEarnings
    });
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch monthly earnings',
      details: error.message 
    });
  }
});

router.get("/earnings/history", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { page = 1, limit = 20, type = 'all' } = req.query;

    const query = { sellerId: mongoose.Types.ObjectId(userId) };
    
    if (type !== 'all') {
      query.type = type;
    }

    const earnings = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        earnings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch earnings history',
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