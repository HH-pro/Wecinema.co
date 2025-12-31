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

// ========== GET ALL SELLERS EARNINGS (PUBLIC/NO AUTH) ========== //
router.get("/all-sellers", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      sortBy = 'totalEarnings', 
      sortOrder = -1,
      export: exportData = false 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build search query - ONLY GET SELLERS
    const searchQuery = {
      role: 'seller'
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
          sellerId: { $in: sellerIds },
          status: { $in: ['completed', 'pending', 'cancelled'] } // Only these statuses
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
          totalCommission: { $sum: { $ifNull: ['$commission', 0] } },
          pendingEarnings: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $ne: ['$isPaidToSeller', true] }
                  ]
                },
                { 
                  $subtract: [
                    '$amount', 
                    { $ifNull: ['$commission', 0] }
                  ] 
                },
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
      const earning = earningsData.find(e => e.sellerId && e.sellerId.toString() === seller._id.toString());
      const orders = orderStatsMap[seller._id] || {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalSales: 0,
        totalCommission: 0,
        pendingEarnings: 0
      };

      const netEarnings = orders.totalSales - orders.totalCommission;
      const totalEarningsValue = earning?.totalEarnings || 0;
      
      return {
        _id: seller._id,
        name: seller.name || 'Unknown',
        email: seller.email || 'N/A',
        phone: seller.phone || 'N/A',
        businessName: seller.businessName || 'N/A',
        stripeAccountId: seller.stripeAccountId || null,
        joinedAt: seller.createdAt || new Date(),
        earnings: {
          availableBalance: earning?.availableBalance || 0,
          pendingBalance: earning?.pendingBalance || 0,
          totalEarnings: totalEarningsValue,
          totalWithdrawn: earning?.totalWithdrawn || 0
        },
        orders: {
          total: orders.totalOrders,
          completed: orders.completedOrders,
          pending: orders.pendingOrders,
          cancelled: orders.cancelledOrders,
          completionRate: orders.totalOrders > 0 
            ? parseFloat(((orders.completedOrders / orders.totalOrders) * 100).toFixed(2))
            : 0
        },
        sales: {
          total: parseFloat(orders.totalSales.toFixed(2)),
          commission: parseFloat(orders.totalCommission.toFixed(2)),
          net: parseFloat(netEarnings.toFixed(2)),
          pending: parseFloat(orders.pendingEarnings.toFixed(2))
        },
        performance: {
          averageOrderValue: orders.totalOrders > 0 
            ? parseFloat((orders.totalSales / orders.totalOrders).toFixed(2))
            : 0,
          commissionRate: orders.totalSales > 0 
            ? parseFloat(((orders.totalCommission / orders.totalSales) * 100).toFixed(2))
            : 0,
          earningsPerOrder: orders.totalOrders > 0 
            ? parseFloat((totalEarningsValue / orders.totalOrders).toFixed(2))
            : 0
        }
      };
    });

    // Get totals for all sellers
    const totals = sellersWithStats.reduce((acc, seller) => ({
      totalSellers: acc.totalSellers + 1,
      totalBalance: acc.totalBalance + (seller.earnings.availableBalance || 0),
      totalPending: acc.totalPending + (seller.earnings.pendingBalance || 0),
      totalEarnings: acc.totalEarnings + (seller.earnings.totalEarnings || 0),
      totalWithdrawn: acc.totalWithdrawn + (seller.earnings.totalWithdrawn || 0),
      totalOrders: acc.totalOrders + (seller.orders.total || 0),
      totalSales: acc.totalSales + (seller.sales.total || 0),
      totalCommission: acc.totalCommission + (seller.sales.commission || 0),
      totalNet: acc.totalNet + (seller.sales.net || 0),
      totalPendingEarnings: acc.totalPendingEarnings + (seller.sales.pending || 0)
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

    // Format totals
    const formattedTotals = {
      totalSellers: totals.totalSellers,
      totalBalance: parseFloat(totals.totalBalance.toFixed(2)),
      totalPending: parseFloat(totals.totalPending.toFixed(2)),
      totalEarnings: parseFloat(totals.totalEarnings.toFixed(2)),
      totalWithdrawn: parseFloat(totals.totalWithdrawn.toFixed(2)),
      totalOrders: totals.totalOrders,
      totalSales: parseFloat(totals.totalSales.toFixed(2)),
      totalCommission: parseFloat(totals.totalCommission.toFixed(2)),
      totalNet: parseFloat(totals.totalNet.toFixed(2)),
      totalPendingEarnings: parseFloat(totals.totalPendingEarnings.toFixed(2)),
      averageStats: {
        avgEarningsPerSeller: totals.totalSellers > 0 ? parseFloat((totals.totalEarnings / totals.totalSellers).toFixed(2)) : 0,
        avgOrdersPerSeller: totals.totalSellers > 0 ? parseFloat((totals.totalOrders / totals.totalSellers).toFixed(2)) : 0,
        avgSalesPerSeller: totals.totalSellers > 0 ? parseFloat((totals.totalSales / totals.totalSellers).toFixed(2)) : 0,
        overallCommissionRate: totals.totalSales > 0 ? parseFloat(((totals.totalCommission / totals.totalSales) * 100).toFixed(2)) : 0
      }
    };

    // Get count for pagination
    const totalSellers = await User.countDocuments(searchQuery);

    // Check if export is requested
    if (exportData === 'true' || exportData === 'csv') {
      // Generate CSV data
      const headers = [
        'Seller ID', 'Name', 'Email', 'Business Name', 'Joined Date',
        'Total Orders', 'Completed Orders', 'Pending Orders', 'Cancelled Orders',
        'Total Sales ($)', 'Total Commission ($)', 'Net Earnings ($)', 
        'Pending Earnings ($)', 'Available Balance ($)', 'Total Withdrawn ($)',
        'Completion Rate (%)', 'Avg Order Value ($)', 'Commission Rate (%)'
      ];

      const csvRows = sellersWithStats.map(seller => [
        seller._id,
        seller.name,
        seller.email,
        seller.businessName,
        new Date(seller.joinedAt).toISOString().split('T')[0],
        seller.orders.total,
        seller.orders.completed,
        seller.orders.pending,
        seller.orders.cancelled,
        seller.sales.total,
        seller.sales.commission,
        seller.sales.net,
        seller.sales.pending,
        seller.earnings.availableBalance,
        seller.earnings.totalWithdrawn,
        seller.orders.completionRate,
        seller.performance.averageOrderValue,
        seller.performance.commissionRate
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.map(cell => 
          typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
        ).join(','))
      ].join('\n');

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sellers-earnings-${Date.now()}.csv`);
      return res.send(csvContent);
    }

    if (exportData === 'json') {
      // Return JSON export
      return res.status(200).json({
        success: true,
        type: 'export',
        exportedAt: new Date().toISOString(),
        data: {
          sellers: sellersWithStats,
          totals: formattedTotals,
          summary: {
            totalSellers: formattedTotals.totalSellers,
            totalEarnings: formattedTotals.totalEarnings,
            totalOrders: formattedTotals.totalOrders,
            totalSales: formattedTotals.totalSales
          }
        }
      });
    }

    // Normal API response
    res.status(200).json({
      success: true,
      data: {
        sellers: sellersWithStats,
        totals: formattedTotals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalSellers,
          pages: Math.ceil(totalSellers / limit)
        },
        filters: {
          search,
          sortBy,
          sortOrder: parseInt(sortOrder)
        }
      }
    });
  } catch (error) {
    console.error('Get all sellers earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sellers earnings data',
      message: error.message,
      timestamp: new Date().toISOString()
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