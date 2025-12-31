// routes/seller/earnings.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const Order = require('../../models/Order');
const SellerEarning = require('../../models/SellerEarning');
const PaymentHistory = require('../../models/PaymentHistory');
const WithdrawalRequest = require('../../models/WithdrawalRequest');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ========== SELLER EARNINGS DASHBOARD ========== //

// ========== GET ALL SELLERS EARNINGS (ADMIN) ========== //
router.get("/all-sellers",  async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'totalEarnings', sortOrder = -1 } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = {
      role: 'seller' // Only get sellers
    };
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    // Get sellers with pagination
    const sellers = await User.find(searchQuery)
      .select('_id name email phone businessName stripeAccountId createdAt')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    // Get seller IDs
    const sellerIds = sellers.map(seller => seller._id);

    // Get earnings data for all sellers
    const earningsData = await SellerEarning.find({ 
      sellerId: { $in: sellerIds } 
    });

    // Get order statistics for all sellers
    const orderStats = await Order.aggregate([
      {
        $match: {
          sellerId: { $in: sellerIds }
        }
      },
      {
        $group: {
          _id: '$sellerId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalSales: { $sum: '$amount' },
          totalCommission: { $sum: '$commission' },
          pendingEarnings: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $ne: ['$isPaidToSeller', true] }
                  ]
                },
                { $subtract: ['$amount', '$commission'] },
                0
              ]
            }
          }
        }
      }
    ]);

    // Create a map of order stats by sellerId
    const orderStatsMap = orderStats.reduce((map, stat) => {
      map[stat._id] = stat;
      return map;
    }, {});

    // Combine seller info with earnings and order stats
    const sellersWithStats = sellers.map(seller => {
      const earning = earningsData.find(e => e.sellerId.toString() === seller._id.toString());
      const orders = orderStatsMap[seller._id] || {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalSales: 0,
        totalCommission: 0,
        pendingEarnings: 0
      };

      return {
        _id: seller._id,
        name: seller.name,
        email: seller.email,
        phone: seller.phone,
        businessName: seller.businessName,
        stripeAccountId: seller.stripeAccountId,
        joinedAt: seller.createdAt,
        earnings: {
          availableBalance: earning?.availableBalance || 0,
          pendingBalance: earning?.pendingBalance || 0,
          totalEarnings: earning?.totalEarnings || 0,
          totalWithdrawn: earning?.totalWithdrawn || 0
        },
        orders: {
          total: orders.totalOrders,
          completed: orders.completedOrders,
          pending: orders.pendingOrders,
          cancelled: orders.cancelledOrders,
          completionRate: orders.totalOrders > 0 
            ? (orders.completedOrders / orders.totalOrders) * 100 
            : 0
        },
        sales: {
          total: orders.totalSales,
          commission: orders.totalCommission,
          net: orders.totalSales - orders.totalCommission,
          pending: orders.pendingEarnings
        },
        performance: {
          averageOrderValue: orders.totalOrders > 0 
            ? orders.totalSales / orders.totalOrders 
            : 0,
          commissionRate: orders.totalSales > 0 
            ? (orders.totalCommission / orders.totalSales) * 100 
            : 0
        }
      };
    });

    // Get totals for all sellers
    const totals = sellersWithStats.reduce((acc, seller) => ({
      totalSellers: acc.totalSellers + 1,
      totalBalance: acc.totalBalance + seller.earnings.availableBalance,
      totalPending: acc.totalPending + seller.earnings.pendingBalance,
      totalEarnings: acc.totalEarnings + seller.earnings.totalEarnings,
      totalWithdrawn: acc.totalWithdrawn + seller.earnings.totalWithdrawn,
      totalOrders: acc.totalOrders + seller.orders.total,
      totalSales: acc.totalSales + seller.sales.total,
      totalCommission: acc.totalCommission + seller.sales.commission,
      totalNet: acc.totalNet + seller.sales.net,
      totalPendingEarnings: acc.totalPendingEarnings + seller.sales.pending
    }), {
      totalSellers: 0,
      totalBalance: 0,
      totalPending: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      totalOrders: 0,
      totalSales: 0,
      totalCommission: 0,
      totalNet: 0,
      totalPendingEarnings: 0
    });

    // Get count for pagination
    const totalSellers = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        sellers: sellersWithStats,
        totals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalSellers,
          pages: Math.ceil(totalSellers / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all sellers earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sellers earnings data',
      message: error.message
    });
  }
});
router.get("/dashboard", auth, async (req, res) => {
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
router.post("/process-payout", auth, async (req, res) => {
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
router.get("/payment-history", auth, async (req, res) => {
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
router.get("/withdrawal-history", auth, async (req, res) => {
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
router.post("/release-payment/:orderId", auth, async (req, res) => {
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