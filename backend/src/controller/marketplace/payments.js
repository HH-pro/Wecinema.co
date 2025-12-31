const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { authenticateMiddleware, optionalAuthenticateMiddleware } = require("../../utils");
const Order = require("../../models/marketplace/order");
const User = require("../../models/user");
const Seller = require("../../models/marketplace/Seller");
const Withdrawal = require("../../models/marketplace/Withdrawal");
const stripeConfig = require("../../config/stripe");

// Helper function to convert to ObjectId
const toObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
};

// ========== PUBLIC ROUTES ========== //

// Public route to get all users' total earnings (for leaderboard/stats)
router.get("/public/earnings-leaderboard", async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get top sellers by earnings
    const topSellers = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: "$sellerId",
          totalEarnings: { $sum: { $ifNull: ["$sellerAmount", 0] } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$amount" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "sellers",
          localField: "_id",
          foreignField: "userId",
          as: "seller"
        }
      },
      {
        $unwind: {
          path: "$seller",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          username: "$user.username",
          avatar: "$user.avatar",
          totalEarnings: 1,
          totalOrders: 1,
          totalRevenue: 1,
          sellerRating: "$seller.rating",
          sellerSince: "$seller.createdAt"
        }
      },
      {
        $sort: { totalEarnings: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get total count for pagination
    const totalSellers = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: "$sellerId"
        }
      },
      {
        $count: "total"
      }
    ]);

    // Get platform total statistics
    const platformStats = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: null,
          totalPlatformEarnings: { $sum: { $ifNull: ["$platformFee", 0] } },
          totalSellerEarnings: { $sum: { $ifNull: ["$sellerAmount", 0] } },
          totalTransactions: { $sum: "$amount" },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: "$amount" }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        leaderboard: topSellers,
        platformStats: platformStats[0] || {
          totalPlatformEarnings: 0,
          totalSellerEarnings: 0,
          totalTransactions: 0,
          totalOrders: 0,
          averageOrderValue: 0
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalSellers[0]?.total || 0,
          pages: Math.ceil((totalSellers[0]?.total || 0) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching earnings leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings leaderboard',
      details: error.message
    });
  }
});

// Public route to get user's public earnings stats (for profile pages)
router.get("/public/user-earnings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId
    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Validate user exists
    const user = await User.findById(objectId).select('name username avatar');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's earnings stats
    const earningsStats = await Order.aggregate([
      {
        $match: {
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: { $ifNull: ["$sellerAmount", 0] } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$amount" },
          avgOrderValue: { $avg: "$amount" }
        }
      }
    ]);

    // Get seller info if exists
    const seller = await Seller.findOne({ userId: objectId }).select('rating totalSales createdAt');

    // Get recent completed orders (public info only)
    const recentOrders = await Order.find({
      sellerId: objectId,
      status: 'completed'
    })
      .select('listingId amount status createdAt')
      .populate('listingId', 'title images category')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          avatar: user.avatar
        },
        earnings: earningsStats[0] || {
          totalEarnings: 0,
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0
        },
        sellerProfile: seller || null,
        recentOrders: recentOrders.map(order => ({
          _id: order._id,
          title: order.listingId?.title,
          category: order.listingId?.category,
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt
        })),
        isSeller: !!seller
      }
    });
  } catch (error) {
    console.error('Error fetching user earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user earnings',
      details: error.message
    });
  }
});

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

    // Update seller's pending balance
    const fees = stripeConfig.calculateFees(order.amount);
    const sellerId = toObjectId(order.sellerId);
    
    await Seller.findOneAndUpdate(
      { userId: sellerId },
      { 
        $inc: { 
          pendingBalance: fees.sellerAmount,
          totalSales: 1 
        },
        $setOnInsert: {
          userId: sellerId,
          rating: 5.0,
          totalWithdrawn: 0
        }
      },
      { upsert: true, new: true }
    );

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

    const sellerId = toObjectId(order.sellerId);

    // Update seller's earnings
    await Seller.findOneAndUpdate(
      { userId: sellerId },
      { 
        $inc: { 
          balance: sellerAmount,
          pendingBalance: -sellerAmount,
          totalSales: 1 
        }
      }
    );

    // Update user's balance
    await User.findByIdAndUpdate(sellerId, {
      $inc: { 
        balance: sellerAmount
      }
    });

    // Update order with detailed payment info
    order.status = 'completed';
    order.paymentReleased = true;
    order.releaseDate = new Date();
    order.completedAt = new Date();
    order.platformFee = platformFee;
    order.sellerAmount = sellerAmount;
    order.paymentDetails = {
      captured: true,
      captureDate: new Date(),
      stripePaymentIntentId: paymentIntent.id,
      stripeChargeId: paymentIntent.latest_charge
    };
    
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Payment captured and funds released to seller', 
      data: {
        order: {
          _id: order._id,
          status: order.status,
          amount: order.amount,
          sellerAmount,
          platformFee,
          paymentReleased: order.paymentReleased
        },
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
    order.cancelledAt = new Date();
    await order.save();

    res.status(200).json({ 
      success: false,
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
        order: {
          status: order.status,
          amount: order.amount,
          sellerAmount: order.sellerAmount,
          platformFee: order.platformFee,
          paymentReleased: order.paymentReleased,
          releaseDate: order.releaseDate,
          paidAt: order.paidAt,
          completedAt: order.completedAt
        },
        paymentIntent: paymentIntent ? {
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          created: paymentIntent.created
        } : null,
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

    order.status = 'refunded';
    order.refundReason = reason;
    order.refundedAt = new Date();
    order.refundId = refund.id;
    
    // Deduct from seller's pending balance if not released yet
    if (!order.paymentReleased && order.sellerAmount) {
      const sellerId = toObjectId(order.sellerId);
      await Seller.findOneAndUpdate(
        { userId: sellerId },
        { 
          $inc: { 
            pendingBalance: -order.sellerAmount
          }
        }
      );
    }
    
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

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const query = { sellerId: objectId };
    
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

    const seller = await Seller.findOne({ userId: objectId });
    
    // CORRECTED EARNINGS CALCULATION
    const earningsSummary = await Order.aggregate([
      { 
        $match: { 
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true
        } 
      },
      {
        $group: {
          _id: null,
          totalSellerEarnings: { 
            $sum: { 
              $ifNull: ["$sellerAmount", { $subtract: ["$amount", { $multiply: ["$amount", 0.10] }] }]
            } 
          },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const totalSellerEarnings = earningsSummary[0]?.totalSellerEarnings || 0;
    const availableBalance = Math.max(0, totalSellerEarnings - (seller?.totalWithdrawn || 0));
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
          totalSellerEarnings,
          totalWithdrawn: seller?.totalWithdrawn || 0,
          walletBalance: seller?.balance || 0
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
    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const seller = await Seller.findOne({ userId: objectId });
    
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    // CORRECTED BALANCE CALCULATION
    const earningsSummary = await Order.aggregate([
      { 
        $match: { 
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true
        } 
      },
      {
        $group: {
          _id: null,
          totalSellerEarnings: { 
            $sum: { 
              $ifNull: ["$sellerAmount", { $subtract: ["$amount", { $multiply: ["$amount", 0.10] }] }]
            } 
          }
        }
      }
    ]);

    const totalSellerEarnings = earningsSummary[0]?.totalSellerEarnings || 0;
    const availableBalance = Math.max(0, totalSellerEarnings - (seller.totalWithdrawn || 0));

    if (amountInCents > availableBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        availableBalance,
        totalSellerEarnings,
        totalWithdrawn: seller.totalWithdrawn || 0
      });
    }

    const MIN_WITHDRAWAL = 500; // $5.00
    if (amountInCents < MIN_WITHDRAWAL) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is $${(MIN_WITHDRAWAL / 100).toFixed(2)}`
      });
    }

    const withdrawal = new Withdrawal({
      sellerId: objectId,
      amount: amountInCents,
      status: 'pending',
      requestDate: new Date(),
      description: `Withdrawal of $${(amountInCents / 100).toFixed(2)}`,
      destination: seller.stripeAccountId ? 'Stripe Account' : 'Bank Account',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });

    await withdrawal.save();

    seller.totalWithdrawn = (seller.totalWithdrawn || 0) + amountInCents;
    seller.balance = Math.max(0, (seller.balance || 0) - amountInCents);
    seller.lastWithdrawal = new Date();
    await seller.save();

    // Also update user balance
    await User.findByIdAndUpdate(objectId, {
      $inc: { 
        balance: -amountInCents
      }
    });

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
        withdrawal.status = 'failed';
        withdrawal.failureReason = stripeError.message;
        await withdrawal.save();
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
        newAvailableBalance: availableBalance - amountInCents,
        newWalletBalance: (seller.balance || 0) - amountInCents
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

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel withdrawal with status: ${withdrawal.status}`
      });
    }

    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    await withdrawal.save();

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const seller = await Seller.findOne({ userId: objectId });
    if (seller) {
      seller.totalWithdrawn = Math.max(0, (seller.totalWithdrawn || 0) - withdrawal.amount);
      seller.balance = (seller.balance || 0) + withdrawal.amount;
      await seller.save();
    }

    // Also update user balance
    await User.findByIdAndUpdate(objectId, {
      $inc: { 
        balance: withdrawal.amount
      }
    });

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
    const objectId = toObjectId(userId);
    
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const withdrawalStats = await Withdrawal.aggregate([
      {
        $match: { sellerId: objectId }
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
          sellerId: objectId,
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
          sellerId: objectId,
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
      sellerId: objectId,
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
    const objectId = toObjectId(userId);
    
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const seller = await Seller.findOne({ userId: objectId });
    
    if (!seller) {
      return res.status(200).json({
        success: true,
        data: {
          availableBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          walletBalance: 0,
          currency: 'USD',
          isSeller: false
        }
      });
    }

    // CORRECTED EARNINGS CALCULATION
    const earningsSummary = await Order.aggregate([
      { 
        $match: { 
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true
        } 
      },
      {
        $group: {
          _id: null,
          totalSellerEarnings: { 
            $sum: { 
              $ifNull: ["$sellerAmount", { $subtract: ["$amount", { $multiply: ["$amount", 0.10] }] }]
            } 
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$amount" }
        }
      }
    ]);

    const totalSellerEarnings = earningsSummary[0]?.totalSellerEarnings || 0;
    const availableBalance = Math.max(0, totalSellerEarnings - (seller.totalWithdrawn || 0));
    const pendingBalance = seller.pendingBalance || 0;

    const thisMonthEarnings = await Order.aggregate([
      { 
        $match: { 
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true,
          completedAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        } 
      },
      {
        $group: {
          _id: null,
          total: { 
            $sum: { 
              $ifNull: ["$sellerAmount", { $subtract: ["$amount", { $multiply: ["$amount", 0.10] }] }]
            } 
          },
          orders: { $sum: 1 }
        }
      }
    ]);

    // Platform fees earned from this seller
    const platformFees = await Order.aggregate([
      { 
        $match: { 
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true
        } 
      },
      {
        $group: {
          _id: null,
          totalPlatformFees: { $sum: { $ifNull: ["$platformFee", { $multiply: ["$amount", 0.10] }] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        availableBalance,
        pendingBalance,
        totalSellerEarnings,
        totalWithdrawn: seller.totalWithdrawn || 0,
        walletBalance: seller.balance || 0,
        currency: 'USD',
        lastWithdrawal: seller.lastWithdrawal || null,
        nextPayoutDate: seller.nextPayoutDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        thisMonthEarnings: thisMonthEarnings[0]?.total || 0,
        thisMonthOrders: thisMonthEarnings[0]?.orders || 0,
        totalOrders: earningsSummary[0]?.totalOrders || 0,
        totalRevenue: earningsSummary[0]?.totalRevenue || 0,
        platformFees: platformFees[0]?.totalPlatformFees || 0,
        isSeller: true
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
    
    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const monthlyEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: objectId,
          status: 'completed',
          paymentReleased: true,
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
          earnings: { 
            $sum: { 
              $ifNull: ["$sellerAmount", { $subtract: ["$amount", { $multiply: ["$amount", 0.10] }] }]
            } 
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$amount" },
          platformFees: { $sum: { $ifNull: ["$platformFee", { $multiply: ["$amount", 0.10] }] } }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          earnings: 1,
          orders: 1,
          revenue: 1,
          platformFees: 1,
          netEarnings: "$earnings"
        }
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

    const objectId = toObjectId(userId);
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get completed orders (earnings)
    const earningsQuery = { 
      sellerId: objectId,
      status: 'completed',
      paymentReleased: true
    };

    const earnings = await Order.find(earningsQuery)
      .select('listingId amount sellerAmount platformFee status completedAt')
      .populate('listingId', 'title')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalEarnings = await Order.countDocuments(earningsQuery);

    // Get withdrawals
    const withdrawals = await Withdrawal.find({ sellerId: objectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalWithdrawals = await Withdrawal.countDocuments({ sellerId: objectId });

    let combinedHistory = [];
    
    if (type === 'all' || type === 'earnings') {
      combinedHistory = combinedHistory.concat(
        earnings.map(e => ({
          type: 'earning',
          _id: e._id,
          amount: e.sellerAmount || (e.amount * 0.9),
          description: e.listingId?.title || 'Order',
          date: e.completedAt,
          status: 'completed',
          details: {
            orderAmount: e.amount,
            platformFee: e.platformFee,
            netAmount: e.sellerAmount || (e.amount * 0.9)
          }
        }))
      );
    }
    
    if (type === 'all' || type === 'withdrawals') {
      combinedHistory = combinedHistory.concat(
        withdrawals.map(w => ({
          type: 'withdrawal',
          _id: w._id,
          amount: -w.amount,
          description: w.description || 'Withdrawal',
          date: w.createdAt,
          status: w.status,
          details: {
            withdrawalId: w._id,
            estimatedArrival: w.estimatedArrival
          }
        }))
      );
    }

    // Sort by date
    combinedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        history: combinedHistory.slice(0, parseInt(limit)),
        earnings: {
          total: totalEarnings,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalEarnings / parseInt(limit))
        },
        withdrawals: {
          total: totalWithdrawals,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalWithdrawals / parseInt(limit))
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

// Debug route for checking earnings calculation
router.get("/earnings/debug", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const objectId = toObjectId(userId);
    
    if (!objectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }
    
    const orders = await Order.find({ 
      sellerId: objectId,
      status: 'completed' 
    })
    .select('amount platformFee sellerAmount paymentReleased status createdAt completedAt')
    .sort({ createdAt: -1 })
    .lean();

    const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalSellerAmount = orders.reduce((sum, o) => sum + (o.sellerAmount || o.amount * 0.9), 0);
    const totalPlatformFee = orders.reduce((sum, o) => sum + (o.platformFee || o.amount * 0.1), 0);

    const seller = await Seller.findOne({ userId: objectId }).select('balance totalWithdrawn pendingBalance');

    res.status(200).json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalAmount,
        calculatedSellerAmount: totalSellerAmount,
        calculatedPlatformFee: totalPlatformFee,
        sellerData: seller,
        orders: orders.map(o => ({
          amount: o.amount,
          sellerAmount: o.sellerAmount,
          platformFee: o.platformFee,
          calculatedSellerAmount: o.sellerAmount || o.amount * 0.9,
          calculatedPlatformFee: o.platformFee || o.amount * 0.1,
          paymentReleased: o.paymentReleased,
          status: o.status,
          createdAt: o.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: error.message });
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
      
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentFailed.id },
        { 
          status: 'payment_failed',
          paymentError: paymentIntentFailed.last_payment_error?.message
        }
      );
      break;

    case 'payment_intent.canceled':
      const paymentIntentCanceled = event.data.object;
      console.log('PaymentIntent was canceled!');
      
      await Order.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentCanceled.id },
        { 
          status: 'cancelled',
          cancelledAt: new Date()
        }
      );
      break;

    case 'charge.refunded':
      const chargeRefunded = event.data.object;
      console.log('Charge was refunded!');
      
      const order = await Order.findOne({ stripePaymentIntentId: chargeRefunded.payment_intent });
      if (order) {
        order.status = 'refunded';
        order.refundedAt = new Date();
        order.refundId = chargeRefunded.id;
        
        // Deduct from seller's pending balance
        if (!order.paymentReleased && order.sellerAmount) {
          const sellerId = toObjectId(order.sellerId);
          await Seller.findOneAndUpdate(
            { userId: sellerId },
            { 
              $inc: { 
                pendingBalance: -order.sellerAmount
              }
            }
          );
        }
        
        await order.save();
      }
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