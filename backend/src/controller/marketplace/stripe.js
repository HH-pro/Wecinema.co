const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');

const { authenticateMiddleware } = require("../../utils");

const User = require('../../models/user');
const Order = require("../../models/marketplace/order");
const Payout = require("../../models/marketplace/Payout");
const Payment = require("../../models/marketplace/Payment"); // Add Payment model

// Helper function to safely create ObjectId
const createObjectId = (id) => {
  try {
    if (!id) return null;
    // If it's already an ObjectId, return it
    if (id instanceof mongoose.Types.ObjectId) return id;
    // If it's a valid string, create new ObjectId
    if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      return new mongoose.Types.ObjectId(id);
    }
    return null;
  } catch (error) {
    console.error('Error creating ObjectId:', error);
    return null;
  }
};

// ============================================
// ✅ EARNINGS ROUTES
// ============================================

// GET EARNINGS DASHBOARD
router.get('/earnings/dashboard', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Use safe ObjectId creation
    const userObjectId = createObjectId(userId);
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Calculate total earnings from completed orders
    const orders = await Order.aggregate([
      {
        $match: {
          sellerId: userObjectId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    // Calculate this month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: userObjectId,
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          thisMonthRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get available balance (from completed orders that haven't been withdrawn)
    const availableBalance = await Payment.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'earning',
          status: 'completed',
          payoutStatus: { $ne: 'withdrawn' }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Get pending balance (from pending/completed orders not yet released)
    const pendingBalance = await Order.aggregate([
      {
        $match: {
          sellerId: userObjectId,
          status: { $in: ['pending', 'completed'] },
          paymentReleased: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get total withdrawn amount
    const totalWithdrawn = await Payment.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'withdrawal',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Get last withdrawal
    const lastWithdrawal = await Payment.findOne({
      userId: userObjectId,
      type: 'withdrawal',
      status: 'completed'
    }).sort({ createdAt: -1 });

    // Calculate next payout date (7 days from now)
    const nextPayoutDate = new Date();
    nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

    // Get Stripe status
    const user = await User.findById(userId);
    const stripeStatus = {
      connected: !!user?.stripeAccountId,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false
    };

    if (user?.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        stripeStatus.chargesEnabled = account.charges_enabled || false;
        stripeStatus.payoutsEnabled = account.payouts_enabled || false;
        stripeStatus.detailsSubmitted = account.details_submitted || false;
      } catch (error) {
        console.error('Error fetching Stripe account:', error.message);
      }
    }

    const dashboardData = {
      success: true,
      data: {
        // Convert to cents (assuming frontend expects cents)
        totalEarnings: Math.round((orders[0]?.totalEarnings || 0) * 100),
        totalOrders: orders[0]?.totalOrders || 0,
        thisMonthRevenue: Math.round((thisMonthEarnings[0]?.thisMonthRevenue || 0) * 100),
        availableBalance: Math.round((availableBalance[0]?.amount || 0) * 100),
        pendingBalance: Math.round((pendingBalance[0]?.amount || 0) * 100),
        totalWithdrawn: Math.round((totalWithdrawn[0]?.amount || 0) * 100),
        lastWithdrawal: lastWithdrawal?.createdAt || null,
        nextPayoutDate: nextPayoutDate.toISOString(),
        stripeStatus: stripeStatus,
        userId: userId.toString()
      }
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Earnings dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings dashboard',
      message: error.message
    });
  }
});

// GET PAYMENT HISTORY
router.get('/earnings/payment-history', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { page = 1, limit = 20, type, status } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userObjectId = createObjectId(userId);
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { userId: userObjectId };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }

    // Get payments with pagination
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const totalCount = await Payment.countDocuments(query);

    // Convert amounts to cents for frontend
    const formattedPayments = payments.map(payment => ({
      ...payment,
      amount: Math.round(payment.amount * 100), // Convert to cents
      _id: payment._id.toString(),
      userId: payment.userId?.toString() || userId,
      createdAt: payment.createdAt,
      date: payment.createdAt
    }));

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
      message: error.message
    });
  }
});

// GET WITHDRAWAL HISTORY
router.get('/earnings/withdrawal-history', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { status } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userObjectId = createObjectId(userId);
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Build query - withdrawals are payments with type 'withdrawal'
    const query = { 
      userId: userObjectId,
      type: 'withdrawal'
    };
    
    if (status) {
      query.status = status;
    }

    // Get withdrawals
    const withdrawals = await Payment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Convert amounts to cents for frontend
    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      ...withdrawal,
      amount: Math.round(withdrawal.amount * 100), // Convert to cents
      _id: withdrawal._id.toString(),
      userId: withdrawal.userId?.toString() || userId,
      description: withdrawal.description || `Withdrawal to ${withdrawal.paymentMethod || 'bank'}`,
      createdAt: withdrawal.createdAt,
      date: withdrawal.createdAt
    }));

    res.json({
      success: true,
      data: formattedWithdrawals
    });

  } catch (error) {
    console.error('Withdrawal history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history',
      message: error.message
    });
  }
});

// PROCESS PAYOUT/WITHDRAWAL
router.post('/earnings/process-payout', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { amount, paymentMethod = 'stripe', accountDetails } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const userObjectId = createObjectId(userId);
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Convert amount from cents to actual currency
    const amountInCurrency = amount / 100;

    // Check available balance
    const availableBalance = await Payment.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: 'earning',
          status: 'completed',
          payoutStatus: { $ne: 'withdrawn' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const currentBalance = availableBalance[0]?.total || 0;
    
    if (amountInCurrency > currentBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Check user has Stripe account
    const user = await User.findById(userId);
    if (!user?.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account not connected'
      });
    }

    // Check Stripe status
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.retrieve(user.stripeAccountId);
    } catch (stripeError) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account not accessible'
      });
    }

    if (!stripeAccount.charges_enabled || !stripeAccount.payouts_enabled) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account not fully setup for payouts'
      });
    }

    // Process payout with Stripe
    let payoutResult;
    try {
      payoutResult = await stripe.payouts.create({
        amount: Math.round(amountInCurrency * 100), // Convert to smallest currency unit
        currency: process.env.STRIPE_CURRENCY || 'usd',
        method: 'standard',
        metadata: {
          userId: userId.toString(),
          paymentMethod: paymentMethod,
          platform: process.env.PLATFORM_NAME || 'WECINEMA'
        }
      }, {
        stripeAccount: user.stripeAccountId
      });
    } catch (payoutError) {
      console.error('Stripe payout error:', payoutError);
      return res.status(400).json({
        success: false,
        error: 'Failed to process payout with Stripe',
        details: payoutError.message
      });
    }

    // Create withdrawal record
    const withdrawal = new Payment({
      userId: userObjectId,
      type: 'withdrawal',
      amount: amountInCurrency,
      paymentMethod: paymentMethod,
      status: 'pending', // Will be updated by webhook
      stripePayoutId: payoutResult.id,
      description: `Withdrawal to ${paymentMethod}`,
      metadata: {
        accountDetails: accountDetails,
        stripeResponse: {
          payoutId: payoutResult.id,
          amount: payoutResult.amount,
          currency: payoutResult.currency,
          arrivalDate: payoutResult.arrival_date
        }
      }
    });

    await withdrawal.save();

    // Mark corresponding earnings as withdrawn
    await Payment.updateMany(
      {
        userId: userObjectId,
        type: 'earning',
        status: 'completed',
        payoutStatus: { $ne: 'withdrawn' }
      },
      {
        $set: { payoutStatus: 'withdrawn' },
        $push: { 
          linkedTransactions: {
            type: 'withdrawal',
            transactionId: withdrawal._id,
            amount: amountInCurrency,
            date: new Date()
          }
        }
      }
    );

    res.json({
      success: true,
      message: 'Withdrawal request processed successfully',
      data: {
        withdrawalId: withdrawal._id.toString(),
        amount: Math.round(amount),
        status: 'pending',
        estimatedArrival: payoutResult.arrival_date,
        payoutId: payoutResult.id
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

// RELEASE PENDING PAYMENT
router.post('/earnings/release-payment/:orderId', authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userObjectId = createObjectId(userId);
    const orderObjectId = createObjectId(orderId);
    
    if (!userObjectId || !orderObjectId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IDs'
      });
    }

    // Find the order
    const order = await Order.findOne({
      _id: orderObjectId,
      sellerId: userObjectId,
      status: 'completed',
      paymentReleased: { $ne: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or already released'
      });
    }

    // Create payment record for the seller
    const payment = new Payment({
      userId: userObjectId,
      type: 'earning',
      amount: order.totalAmount,
      status: 'completed',
      orderId: orderObjectId,
      description: `Payment for order #${order.orderNumber || order._id.toString().slice(-6)}`,
      metadata: {
        orderDetails: {
          orderId: order._id.toString(),
          buyerId: order.buyerId?.toString(),
          items: order.items,
          totalAmount: order.totalAmount
        }
      }
    });

    await payment.save();

    // Mark order as payment released
    order.paymentReleased = true;
    order.paymentReleasedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Payment released successfully',
      data: {
        paymentId: payment._id.toString(),
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        orderId: order._id.toString()
      }
    });

  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release payment',
      message: error.message
    });
  }
});

// ============================================
// ✅ STRIPE ROUTES (Existing - Keep as is)
// ============================================

// ✅ FIXED: Stripe Status Endpoint with timeout handling
router.get('/stripe/status', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set response timeout
    req.setTimeout(5000); // 5 second timeout
    
    // Quick response - don't wait for Stripe if it's slow
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 4000);
    });

    const statusPromise = (async () => {
      const user = await User.findById(userId).select('stripeAccountId email firstName lastName');
      
      if (!user) {
        return {
          connected: false,
          status: 'user_not_found',
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false
        };
      }
      
      if (!user.stripeAccountId) {
        return {
          connected: false,
          status: 'not_connected',
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        };
      }

      try {
        // Quick Stripe account retrieval with timeout
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        
        return {
          connected: true,
          status: 'connected',
          chargesEnabled: account.charges_enabled || false,
          payoutsEnabled: account.payouts_enabled || false,
          detailsSubmitted: account.details_submitted || false,
          accountId: user.stripeAccountId,
          email: account.email || user.email,
          country: account.country || 'US',
          name: account.individual?.first_name || user.firstName || ''
        };
      } catch (stripeError) {
        console.error('Stripe retrieval error:', stripeError.message);
        
        // If account doesn't exist in Stripe
        if (stripeError.code === 'resource_missing') {
          await User.findByIdAndUpdate(userId, { 
            $unset: { 
              stripeAccountId: 1,
              stripeAccountStatus: 1,
              stripeAccountCreatedAt: 1
            } 
          });
          return {
            connected: false,
            status: 'account_not_found',
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
          };
        }
        
        // Return basic info without Stripe details
        return {
          connected: true,
          status: 'connected_but_error',
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          accountId: user.stripeAccountId,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          error: stripeError.message
        };
      }
    })();

    // Race between status check and timeout
    const status = await Promise.race([statusPromise, timeoutPromise]);
    res.json(status);
    
  } catch (error) {
    console.error('Stripe status error:', error.message);
    
    // Return safe fallback response
    res.json({
      connected: false,
      status: 'error',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      message: 'Unable to check payment status'
    });
  }
});

// ✅ SIMPLE Status Endpoint (Always works)
router.get('/stripe/status-simple', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('stripeAccountId email firstName lastName');
    
    if (!user) {
      return res.json({
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        status: 'user_not_found'
      });
    }
    
    if (!user.stripeAccountId) {
      return res.json({
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        status: 'not_connected',
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      });
    }
    
    // Return basic info without checking Stripe
    return res.json({
      connected: true,
      chargesEnabled: false, // Assume not enabled until verified
      detailsSubmitted: false,
      status: 'connected',
      accountId: user.stripeAccountId,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    });
    
  } catch (error) {
    console.error('Simple status error:', error);
    
    return res.json({
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      status: 'error'
    });
  }
});

// ✅ UPDATED: Stripe Onboarding Endpoint with Improved Business URL
router.post('/stripe/onboard-seller', authenticateMiddleware, async (req, res) => {
  console.log('=== STRIPE ONBOARDING STARTED ===');
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    console.log('1. User ID:', userId);

    // Get user with better error handling
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        error: 'User account not found. Please try logging in again.'
      });
    }
    console.log('2. User found:', user.email, 'Name:', user.firstName, user.lastName);

    // Check for existing Stripe account with improved logic
    if (user.stripeAccountId) {
      console.log('3. Existing Stripe account ID found:', user.stripeAccountId);
      try {
        console.log('4. Retrieving existing Stripe account...');
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        console.log('5. Existing account status:', {
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements
        });
        
        // If account is fully onboarded and active
        if (account.details_submitted && account.charges_enabled) {
          console.log('6. Account already completed onboarding and active');
          return res.status(400).json({
            success: false,
            error: 'Stripe account is already connected and active. You can accept payments.',
            stripeAccountId: user.stripeAccountId,
            accountStatus: 'active'
          });
        }
        
        // If account exists but needs more information
        if (account.details_submitted && !account.charges_enabled) {
          console.log('6a. Account needs additional verification');
          const accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=refresh&account_id=${user.stripeAccountId}`,
            return_url: `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=success&account_id=${user.stripeAccountId}`,
            type: 'account_onboarding',
          });

          return res.json({
            success: true,
            url: accountLink.url,
            stripeAccountId: user.stripeAccountId,
            message: 'Additional verification required for your Stripe account'
          });
        }
        
        // Create onboarding link for existing incomplete account
        console.log('7. Creating account link for existing account...');
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeAccountId,
          refresh_url: `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=refresh&account_id=${user.stripeAccountId}`,
          return_url: `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=success&account_id=${user.stripeAccountId}`,
          type: 'account_onboarding',
        });

        console.log('8. ✅ Success - Returning account link for existing account');
        return res.json({
          success: true,
          url: accountLink.url,
          stripeAccountId: user.stripeAccountId,
          message: 'Continue your Stripe account setup'
        });
      } catch (stripeError) {
        console.log('9. Existing account retrieval failed:', {
          message: stripeError.message,
          code: stripeError.code,
          type: stripeError.type
        });
        console.log('10. Will create new account instead...');
        // Continue to create new account
      }
    }

    // Create new Stripe account with better configuration
    console.log('11. Creating new Stripe account...');
    
    // IMPROVED: Create a valid business URL
    const getValidBusinessUrl = () => {
      const frontendUrl = process.env.FRONTEND_URL || '';
      const platformUrl = process.env.PLATFORM_URL || 'https://wecinema.co';
      
      // Check if URL is valid
      if (frontendUrl && frontendUrl.startsWith('http')) {
        return frontendUrl;
      }
      
      return platformUrl;
    };
    
    const validBusinessUrl = getValidBusinessUrl();
    console.log('11a. Using business URL:', validBusinessUrl);
    
    const accountData = {
      type: 'express',
      country: process.env.STRIPE_DEFAULT_COUNTRY || 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
        first_name: user.firstName || 'Test',
        last_name: user.lastName || 'User',
      },
      // FIXED: Make business_profile optional if URL is invalid
      ...(validBusinessUrl && {
        business_profile: {
          url: validBusinessUrl,
          mcc: process.env.STRIPE_MCC_CODE || '5734',
          product_description: 'Digital products and services'
        }
      }),
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
      metadata: {
        userId: userId.toString(),
        platform: process.env.PLATFORM_NAME || 'WECINEMA',
        userEmail: user.email
      }
    };

    console.log('11b. Account creation data:', JSON.stringify(accountData, null, 2));
    
    const account = await stripe.accounts.create(accountData);
    console.log('12. ✅ Stripe account created:', account.id);

    // Update user with additional fields
    console.log('13. Updating user with Stripe account ID...');
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'pending';
    user.stripeAccountCreatedAt = new Date();
    await user.save();
    console.log('14. ✅ User updated successfully');

    // Create account link with CORRECT DASHBOARD URL
    console.log('15. Creating account link...');
    const returnUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=success&account_id=${account.id}`
      : `https://wecinema.co/marketplace/dashboard?stripe=success&account_id=${account.id}`;
    
    const refreshUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/marketplace/dashboard?stripe=refresh&account_id=${account.id}`
      : `https://wecinema.co/marketplace/dashboard?stripe=refresh&account_id=${account.id}`;
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    console.log('16. ✅ Account link created:', accountLink.url);

    const processingTime = Date.now() - startTime;
    console.log(`17. 🎉 SUCCESS - Onboarding completed in ${processingTime}ms`);
    
    res.json({
      success: true,
      url: accountLink.url,
      stripeAccountId: account.id,
      message: 'Redirecting to Stripe to complete your account setup'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`18. ❌ CATCH BLOCK - Failed after ${processingTime}ms`);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param
    });
    
    // User-friendly error messages
    let userMessage = 'Failed to setup Stripe account. Please try again.';
    
    if (error.type === 'StripeInvalidRequestError') {
      switch (error.code) {
        case 'url_invalid':
          userMessage = 'Invalid business URL configuration. Please contact support.';
          break;
        case 'parameter_invalid':
          if (error.param === 'business_profile[url]') {
            userMessage = 'Business URL is invalid. Using default configuration.';
            // Retry without business_profile
            return res.redirect(307, '/api/marketplace/stripe/onboard-seller-retry');
          }
          userMessage = 'Invalid account information. Please check your profile details.';
          break;
        case 'resource_missing':
          userMessage = 'Stripe service temporarily unavailable. Please try again later.';
          break;
        default:
          userMessage = 'Stripe configuration error. Please contact support.';
      }
    }

    res.status(500).json({
      success: false,
      error: userMessage,
      details: error.message,
      code: error.code
    });
  }
});

// ✅ Alternative onboarding without business_profile
router.post('/stripe/onboard-seller-retry', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const accountData = {
      type: 'express',
      country: process.env.STRIPE_DEFAULT_COUNTRY || 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        email: user.email,
        first_name: user.firstName || 'Test',
        last_name: user.lastName || 'User',
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
      metadata: {
        userId: userId.toString(),
        platform: process.env.PLATFORM_NAME || 'WECINEMA'
      }
    };

    const account = await stripe.accounts.create(accountData);
    
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'pending';
    user.stripeAccountCreatedAt = new Date();
    await user.save();

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'https://wecinema.co'}/marketplace/dashboard?stripe=refresh&account_id=${account.id}`,
      return_url: `${process.env.FRONTEND_URL || 'https://wecinema.co'}/marketplace/dashboard?stripe=success&account_id=${account.id}`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url,
      stripeAccountId: account.id,
      message: 'Redirecting to Stripe to complete your account setup'
    });

  } catch (error) {
    console.error('Alternative onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup Stripe account',
      details: error.message
    });
  }
});

// ✅ Complete onboarding
router.post('/stripe/complete-onboarding', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    // Check account status
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    
    user.stripeAccountStatus = account.charges_enabled ? 'active' : 'pending';
    await user.save();

    res.json({
      success: true,
      status: user.stripeAccountStatus,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      message: 'Onboarding status updated'
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      details: error.message
    });
  }
});

// ✅ Get Payout History
router.get('/stripe/payouts', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if Payout model exists, if not return empty array
    let payouts = [];
    
    try {
      payouts = await Payout.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    } catch (dbError) {
      console.log('Payout model not found, returning empty array');
    }

    // Format response
    const formattedPayouts = payouts.map(payout => ({
      id: payout._id || payout.id,
      payoutId: payout.stripePayoutId,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrivalDate,
      createdAt: payout.createdAt,
      method: payout.method
    }));

    // If no payouts in DB, return mock data for testing
    if (formattedPayouts.length === 0) {
      formattedPayouts.push(
        {
          id: 'test_1',
          payoutId: 'po_test_1',
          amount: 5000,
          currency: 'usd',
          status: 'paid',
          arrivalDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          method: 'standard',
          isTest: true
        },
        {
          id: 'test_2',
          payoutId: 'po_test_2',
          amount: 10000,
          currency: 'usd',
          status: 'pending',
          arrivalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          method: 'standard',
          isTest: true
        }
      );
    }

    res.json({
      success: true,
      payouts: formattedPayouts
    });

  } catch (error) {
    console.error('Payouts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payout history',
      details: error.message
    });
  }
});

// ✅ Create payment intent for order
router.post('/stripe/create-payment-intent', authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get order details
    const order = await Order.findById(orderId)
      .populate('sellerId')
      .populate('buyerId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify buyer is making the payment
    if (order.buyerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only buyer can make payment for this order'
      });
    }

    // Verify seller has active Stripe account
    if (!order.sellerId.stripeAccountId || order.sellerId.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Seller payment account is not ready'
      });
    }

    // Calculate platform fee
    const platformFeePercentage = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENTAGE) || 15;
    const platformFee = Math.round(order.amount * (platformFeePercentage / 100) * 100);
    const amount = Math.round(order.amount * 100); // in paise

    // Create payment intent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: process.env.STRIPE_CURRENCY || 'inr',
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: {
        destination: order.sellerId.stripeAccountId,
      },
      application_fee_amount: platformFee,
      metadata: {
        orderId: order._id.toString(),
        sellerId: order.sellerId._id.toString(),
        buyerId: order.buyerId._id.toString(),
        listingId: order.listingId.toString()
      },
      description: `Payment for order #${order._id.toString().slice(-8)}`
    });

    // Update order with payment intent ID
    order.stripePaymentIntentId = paymentIntent.id;
    order.paymentStatus = 'pending';
    await order.save();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.amount,
      currency: process.env.STRIPE_CURRENCY || 'inr',
      platformFee: platformFee / 100,
      message: 'Payment intent created successfully'
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      details: error.message
    });
  }
});

// ✅ Confirm payment
router.post('/stripe/confirm-payment', authenticateMiddleware, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find order by payment intent ID
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId })
      .populate('sellerId')
      .populate('buyerId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found for this payment'
      });
    }

    // Verify user has access to this order
    if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this order'
      });
    }

    // Update order status based on payment status
    if (paymentIntent.status === 'succeeded') {
      order.paymentStatus = 'paid';
      order.status = 'in_progress';
      order.paidAt = new Date();
      
      // Add to order history
      order.history.push({
        status: 'paid',
        timestamp: new Date(),
        message: 'Payment completed successfully'
      });

      await order.save();

      res.json({
        success: true,
        paymentStatus: 'succeeded',
        orderStatus: order.status,
        message: 'Payment confirmed successfully'
      });
    } else {
      order.paymentStatus = paymentIntent.status;
      await order.save();

      res.json({
        success: false,
        paymentStatus: paymentIntent.status,
        message: `Payment status: ${paymentIntent.status}`
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      details: error.message
    });
  }
});

// ✅ Create payout to seller (Legacy - use /withdraw instead)
router.post('/stripe/create-payout', authenticateMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Check if payout is enabled
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    if (!account.payouts_enabled) {
      return res.status(400).json({
        success: false,
        error: 'Payouts are not enabled for your account'
      });
    }

    // Create payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100),
      currency: process.env.STRIPE_CURRENCY || 'inr',
      method: process.env.STRIPE_PAYOUT_METHOD || 'standard',
    }, {
      stripeAccount: user.stripeAccountId
    });

    res.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        method: payout.method
      },
      message: 'Payout initiated successfully'
    });

  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payout',
      details: error.message
    });
  }
});

// ✅ Get payout history (Legacy - use /payouts instead)
router.get('/stripe/stripe-payouts', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const payouts = await stripe.payouts.list({
      limit: 50,
    }, {
      stripeAccount: user.stripeAccountId
    });

    res.json({
      success: true,
      payouts: payouts.data.map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        method: payout.method,
        created: payout.created
      }))
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payouts',
      details: error.message
    });
  }
});

// ✅ Create login link for Stripe Express dashboard
router.post('/stripe/create-login-link', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);

    res.json({
      success: true,
      url: loginLink.url,
      message: 'Login link generated successfully'
    });

  } catch (error) {
    console.error('Error creating login link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create login link',
      details: error.message
    });
  }
});

// ✅ Create account link for Stripe Express
router.post('/stripe/create-account-link', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL || 'https://wecinema.co'}/marketplace/dashboard?tab=earnings`,
      return_url: `${process.env.FRONTEND_URL || 'https://wecinema.co'}/marketplace/dashboard?tab=earnings`,
      type: 'account_onboarding',
    });

    res.json({
      success: true,
      url: accountLink.url,
      message: 'Account link generated successfully'
    });

  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account link',
      details: error.message
    });
  }
});

// ✅ Get Stripe balance
router.get('/balance', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeAccountId) {
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found'
      });
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeAccountId
    });

    const available = balance.available.reduce((sum, item) => sum + item.amount, 0);
    const pending = balance.pending.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      balance: {
        available: available / 100,
        pending: pending / 100,
        currency: balance.available[0]?.currency || 'usd'
      }
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance',
      details: error.message
    });
  }
});

// ============================================
// ✅ WEBHOOK ROUTE
// ============================================

// ✅ Stripe Webhook Handler
router.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return res.status(400).send('Webhook Error: Webhook secret not configured');
    }

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      
      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
        break;
      
      case 'payout.created':
        await handlePayoutCreated(event.data.object);
        break;
      
      case 'payout.failed':
        await handlePayoutFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook Handlers
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'in_progress';
      order.paidAt = new Date();
      
      order.history.push({
        status: 'paid',
        timestamp: new Date(),
        message: 'Payment completed via webhook'
      });

      await order.save();
      console.log(`✅ Order ${order._id} marked as paid`);
      
      // Create earning record for seller
      if (Payment) {
        const sellerEarning = new Payment({
          userId: order.sellerId,
          type: 'earning',
          amount: order.totalAmount,
          status: 'completed',
          orderId: order._id,
          description: `Earning from order #${order._id.toString().slice(-8)}`,
          metadata: {
            orderId: order._id.toString(),
            buyerId: order.buyerId?.toString(),
            stripePaymentIntentId: paymentIntent.id
          }
        });
        await sellerEarning.save();
        console.log(`✅ Earning record created for seller ${order.sellerId}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
    if (order) {
      order.paymentStatus = 'failed';
      order.history.push({
        status: 'payment_failed',
        timestamp: new Date(),
        message: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
      });

      await order.save();
      console.log(`❌ Order ${order._id} payment failed`);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleAccountUpdated(account) {
  try {
    const user = await User.findOne({ stripeAccountId: account.id });
    if (user) {
      user.stripeAccountStatus = account.charges_enabled ? 'active' : 'pending';
      await user.save();
      console.log(`✅ Updated Stripe status for user ${user._id}: ${user.stripeAccountStatus}`);
    }
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handlePayoutPaid(payout) {
  try {
    console.log(`💰 Payout ${payout.id} completed: ${payout.amount / 100} ${payout.currency}`);
    
    // Update payout status in database
    if (Payout && typeof Payout.findOneAndUpdate === 'function') {
      await Payout.findOneAndUpdate(
        { stripePayoutId: payout.id },
        { 
          status: 'paid',
          processedAt: new Date()
        }
      );
    }
    
    // Update payment status
    if (Payment && typeof Payment.findOneAndUpdate === 'function') {
      await Payment.findOneAndUpdate(
        { stripePayoutId: payout.id },
        { 
          status: 'completed',
          processedAt: new Date()
        }
      );
    }
  } catch (error) {
    console.error('Error handling payout:', error);
  }
}

async function handlePayoutCreated(payout) {
  try {
    console.log(`🔄 Payout ${payout.id} created: ${payout.amount / 100} ${payout.currency}`);
    
    // Update payment status to processing
    if (Payment && typeof Payment.findOneAndUpdate === 'function') {
      await Payment.findOneAndUpdate(
        { stripePayoutId: payout.id },
        { 
          status: 'processing',
          metadata: {
            ...payout.metadata,
            stripePayoutDetails: {
              id: payout.id,
              amount: payout.amount,
              currency: payout.currency,
              arrivalDate: payout.arrival_date,
              status: payout.status
            }
          }
        }
      );
    }
  } catch (error) {
    console.error('Error handling payout created:', error);
  }
}

async function handlePayoutFailed(payout) {
  try {
    console.log(`❌ Payout ${payout.id} failed: ${payout.failure_message}`);
    
    // Update payment status to failed
    if (Payment && typeof Payment.findOneAndUpdate === 'function') {
      await Payment.findOneAndUpdate(
        { stripePayoutId: payout.id },
        { 
          status: 'failed',
          failureMessage: payout.failure_message,
          failureCode: payout.failure_code,
          processedAt: new Date()
        }
      );
      
      // Mark earnings as available again since payout failed
      await Payment.updateMany(
        {
          stripePayoutId: payout.id,
          type: 'earning',
          payoutStatus: 'withdrawn'
        },
        {
          $set: { payoutStatus: 'available' }
        }
      );
    }
  } catch (error) {
    console.error('Error handling payout failure:', error);
  }
}

module.exports = router;