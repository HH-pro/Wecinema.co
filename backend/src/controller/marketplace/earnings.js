// routes/seller/earnings.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateMiddleware } = require("../../utils");

const Order = require("../../models/marketplace/order");
const SellerEarning = require('../../models/marketplace/SellerEarning');
const PaymentHistory = require('../../models/marketplace/PaymentHistory');
const WithdrawalRequest = require('../../models/marketplace/WithdrawalRequest');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ========== SELLER EARNINGS DASHBOARD ========== //
router.get("/:sellerId/stats", async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    // Validate sellerId format
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seller ID format'
      });
    }

    // Get public seller stats
    const [sellerStats, recentOrders] = await Promise.all([
      // Get seller's public earnings stats
      Order.aggregate([
        {
          $match: {
            sellerId: mongoose.Types.ObjectId(sellerId),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$amount" },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: "$amount" }
          }
        }
      ]),
      
      // Get recent successful orders (public info only)
      Order.find({
        sellerId: sellerId,
        status: 'completed'
      })
      .select('orderNumber amount createdAt -_id')
      .sort({ createdAt: -1 })
      .limit(5)
    ]);

    // Calculate seller rating (if you have ratings system)
    const ratingStats = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(sellerId),
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    // Get seller's top products/categories if needed
    const topCategories = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(sellerId),
          status: 'completed'
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.category",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 3 }
    ]);

    const stats = sellerStats[0] || {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };

    const rating = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0
    };

    res.status(200).json({
      success: true,
      data: {
        sellerId,
        stats: {
          totalSales: stats.totalSales,
          totalOrders: stats.totalOrders,
          averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
          successRate: stats.totalOrders > 0 ? '98%' : '0%' // You can calculate this based on your logic
        },
        rating: {
          average: Math.round(rating.averageRating * 10) / 10 || 0,
          totalReviews: rating.totalReviews || 0
        },
        recentOrders,
        topCategories,
        joinDate: req.user?.createdAt // If you want to show when seller joined
      }
    });
  } catch (error) {
    console.error('Public seller stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seller statistics'
    });
  }
});
router.get("/dashboard", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    // 1. Get or create seller earnings record
    let sellerEarning = await SellerEarning.findOne({ sellerId: userId });
    
    if (!sellerEarning) {
      sellerEarning = await SellerEarning.create({
        sellerId: userId,
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        totalWithdrawn: 0
      });
    }

    // 2. Calculate pending earnings from completed orders
    const pendingOrders = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          paymentStatus: { $ne: 'paid_to_seller' },
          isPaidToSeller: { $ne: true }
        } 
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          commission: { $sum: "$commission" || 0 },
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingTotal = pendingOrders[0]?.totalAmount || 0;
    const pendingCommission = pendingOrders[0]?.commission || 0;
    const pendingEarnings = pendingTotal - pendingCommission;

    // Update pending balance
    if (sellerEarning.pendingBalance !== pendingEarnings) {
      sellerEarning.pendingBalance = pendingEarnings;
      await sellerEarning.save();
    }

    // 3. Get payment history
    const paymentHistory = await PaymentHistory.find({ sellerId: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // 4. Get lifetime stats
    const lifetimeStats = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed'
        } 
      },
      {
        $facet: {
          totalEarnings: [
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$amount" },
                totalCommission: { $sum: "$commission" || 0 },
                totalOrders: { $sum: 1 },
                averageOrder: { $avg: "$amount" }
              }
            }
          ],
          monthlyEarnings: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
                net: { $sum: { $subtract: ["$amount", "$commission"] } },
                orders: { $sum: 1 }
              }
            }
          ],
          weeklyEarnings: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
                net: { $sum: { $subtract: ["$amount", "$commission"] } }
              }
            }
          ],
          dailyEarnings: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setDate(new Date().getDate() - 1))
                }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
                net: { $sum: { $subtract: ["$amount", "$commission"] } }
              }
            }
          ]
        }
      }
    ]);

    // 5. Get earnings chart data (last 7 days)
    const chartData = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          createdAt: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: "$amount" },
          net: { $sum: { $subtract: ["$amount", "$commission"] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 6. Check Stripe connectivity
    let stripeConnected = false;
    let stripeAccount = null;
    if (req.user.stripeAccountId) {
      try {
        stripeAccount = await stripe.accounts.retrieve(req.user.stripeAccountId);
        stripeConnected = stripeAccount.charges_enabled && stripeAccount.payouts_enabled;
      } catch (error) {
        console.error('Stripe error:', error);
      }
    }

    const response = {
      success: true,
      earnings: {
        availableBalance: sellerEarning.availableBalance,
        pendingBalance: sellerEarning.pendingBalance,
        totalEarnings: sellerEarning.totalEarnings,
        totalWithdrawn: sellerEarning.totalWithdrawn,
        nextPayoutDate: calculateNextPayoutDate(),
        minimumPayout: process.env.MINIMUM_PAYOUT || 1000,
        payoutFrequency: process.env.PAYOUT_FREQUENCY || 'weekly'
      },
      stats: {
        lifetime: {
          totalSales: lifetimeStats[0]?.totalEarnings[0]?.totalSales || 0,
          totalCommission: lifetimeStats[0]?.totalEarnings[0]?.totalCommission || 0,
          netEarnings: (lifetimeStats[0]?.totalEarnings[0]?.totalSales || 0) - 
                      (lifetimeStats[0]?.totalEarnings[0]?.totalCommission || 0),
          totalOrders: lifetimeStats[0]?.totalEarnings[0]?.totalOrders || 0,
          averageOrder: lifetimeStats[0]?.totalEarnings[0]?.averageOrder || 0
        },
        monthly: {
          total: lifetimeStats[0]?.monthlyEarnings[0]?.total || 0,
          net: lifetimeStats[0]?.monthlyEarnings[0]?.net || 0,
          orders: lifetimeStats[0]?.monthlyEarnings[0]?.orders || 0
        },
        weekly: {
          total: lifetimeStats[0]?.weeklyEarnings[0]?.total || 0,
          net: lifetimeStats[0]?.weeklyEarnings[0]?.net || 0
        },
        daily: {
          total: lifetimeStats[0]?.dailyEarnings[0]?.total || 0,
          net: lifetimeStats[0]?.dailyEarnings[0]?.net || 0
        }
      },
      chartData,
      paymentHistory,
      stripe: {
        connected: stripeConnected,
        accountId: req.user.stripeAccountId,
        email: stripeAccount?.email,
        payoutsEnabled: stripeAccount?.payouts_enabled
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Earnings dashboard error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch earnings data',
      message: error.message 
    });
  }
});

// ========== PROCESS PAYOUT TO SELLER ========== //
router.post("/process-payout", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod, accountDetails } = req.body;

    // 1. Validate amount
    const sellerEarning = await SellerEarning.findOne({ sellerId: userId });
    if (!sellerEarning) {
      return res.status(404).json({
        success: false,
        error: 'Earnings record not found'
      });
    }

    const minimumPayout = process.env.MINIMUM_PAYOUT || 1000;
    if (amount < minimumPayout) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is ${minimumPayout}`
      });
    }

    if (amount > sellerEarning.availableBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // 2. Create withdrawal request
    const withdrawalRequest = await WithdrawalRequest.create({
      sellerId: userId,
      amount,
      paymentMethod,
      accountDetails,
      status: 'pending'
    });

    // 3. Update seller's balance (reserve the amount)
    sellerEarning.availableBalance -= amount;
    sellerEarning.totalWithdrawn += amount;
    await sellerEarning.save();

    // 4. Create payment history record
    await PaymentHistory.create({
      sellerId: userId,
      amount: -amount, // Negative for withdrawal
      type: 'withdrawal',
      status: 'pending',
      description: `Withdrawal request via ${paymentMethod}`,
      paymentMethod,
      transactionId: `WDR-${Date.now()}`
    });

    // 5. If using Stripe Connect, initiate transfer
    if (req.user.stripeAccountId && paymentMethod === 'stripe') {
      try {
        const transfer = await stripe.transfers.create({
          amount: amount * 100, // Convert to cents
          currency: 'usd',
          destination: req.user.stripeAccountId,
          description: `Payout to seller ${userId}`
        });

        // Update withdrawal request with Stripe details
        withdrawalRequest.status = 'processing';
        withdrawalRequest.transactionId = transfer.id;
        await withdrawalRequest.save();

        // Update payment history
        await PaymentHistory.findOneAndUpdate(
          { transactionId: `WDR-${Date.now()}` },
          { 
            transactionId: transfer.id,
            status: 'processing'
          }
        );
      } catch (stripeError) {
        console.error('Stripe transfer error:', stripeError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: {
        requestId: withdrawalRequest._id,
        amount,
        status: withdrawalRequest.status,
        estimatedProcessing: '3-5 business days'
      }
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payout',
      message: error.message
    });
  }
});

// ========== GET PAYMENT HISTORY ========== //
router.get("/payment-history", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;
    
    const filter = { sellerId: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      PaymentHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PaymentHistory.countDocuments(filter)
    ]);

    // Calculate summary
    const summary = await PaymentHistory.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summary.reduce((acc, item) => {
          acc[item._id] = {
            totalAmount: item.totalAmount,
            count: item.count
          };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

// ========== GET WITHDRAWAL HISTORY ========== //
router.get("/withdrawal-history", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const filter = { sellerId: userId };
    if (status) filter.status = status;

    const withdrawals = await WithdrawalRequest.find(filter)
      .sort({ createdAt: -1 });

    // Calculate stats
    const stats = await WithdrawalRequest.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        withdrawals,
        stats: stats.reduce((acc, item) => {
          acc[item._id] = {
            totalAmount: item.totalAmount,
            count: item.count
          };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Withdrawal history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    });
  }
});

// ========== RELEASE PENDING PAYMENTS ========== //
// This route should be called by admin/cron job to release completed order payments
router.post("/release-payment/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Find the completed order
    const order = await Order.findOne({
      _id: orderId,
      sellerId: userId,
      status: 'completed',
      isPaidToSeller: { $ne: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already paid'
      });
    }

    // Calculate seller's share (after commission)
    const commission = order.commission || 0;
    const sellerAmount = order.amount - commission;

    // Update seller earnings
    const sellerEarning = await SellerEarning.findOne({ sellerId: userId });
    sellerEarning.availableBalance += sellerAmount;
    sellerEarning.totalEarnings += sellerAmount;
    sellerEarning.pendingBalance -= sellerAmount;
    await sellerEarning.save();

    // Mark order as paid to seller
    order.isPaidToSeller = true;
    order.paidToSellerAt = new Date();
    await order.save();

    // Create payment history record
    await PaymentHistory.create({
      sellerId: userId,
      orderId: order._id,
      amount: sellerAmount,
      type: 'sale',
      status: 'completed',
      description: `Payment for order #${order.orderNumber}`,
      transactionId: order.paymentIntentId || `ORD-${order.orderNumber}`
    });

    res.status(200).json({
      success: true,
      message: 'Payment released successfully',
      data: {
        orderId: order._id,
        amount: sellerAmount,
        commission,
        availableBalance: sellerEarning.availableBalance
      }
    });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release payment'
    });
  }
});



// Helper function to calculate next payout date
function calculateNextPayoutDate() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7; // Friday is 5
  const nextPayout = new Date(now);
  nextPayout.setDate(now.getDate() + daysUntilFriday);
  nextPayout.setHours(23, 59, 59, 999);
  return nextPayout;
}

module.exports = router;