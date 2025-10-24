const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const MarketplaceListing = require("../../models/marketplace/listing");
const Offer = require("../../models/marketplace/offer");
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');

// Create new order (from accepted offer)
router.post("/create", authenticateMiddleware, async (req, res) => {
  try {
    const {
      offerId,
      listingId,
      buyerId,
      sellerId,
      amount,
      shippingAddress,
      paymentMethod,
    } = req.body;

    const currentUserId = req.user.id || req.user._id || req.user.userId;

    console.log("🛒 Creating new order:", {
      offerId,
      listingId,
      buyerId,
      sellerId,
      amount,
      currentUserId
    });

    // Validate required fields
    if (!offerId || !listingId || !buyerId || !sellerId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: offerId, listingId, buyerId, sellerId, amount'
      });
    }

    // Verify that the current user is the seller
    if (sellerId !== currentUserId) {
      return res.status(403).json({
        error: 'You can only create orders for your own listings'
      });
    }

    // Check if offer exists and is still pending
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        error: 'Offer is no longer available for order creation'
      });
    }

    // Check if listing exists and is active
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        error: 'Listing is not available for purchase'
      });
    }

    // Check if order already exists for this offer
    const existingOrder = await Order.findOne({ offerId });
    if (existingOrder) {
      return res.status(400).json({
        error: 'Order already exists for this offer'
      });
    }

    // Create new order
    const order = new Order({
      offerId,
      listingId,
      buyerId,
      sellerId,
      amount,
      shippingAddress: shippingAddress || 'Not provided',
      paymentMethod: paymentMethod || 'card',
      notes: notes || '',
      status: status,
      orderDate: new Date(),
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxRevisions: 3,
      revisions: 0
    });

    await order.save();

    // Update offer status to accepted
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save();

    // Update listing status to sold if it's a one-time purchase
    if (listing.availability === 'single') {
      listing.status = 'sold';
      await listing.save();
    }

    console.log("✅ Order created successfully:", order._id);

    // Populate the order with related data
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: 'buyerId',
        select: 'username avatar email',
        model: 'User'
      })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery',
        model: 'Offer'
      })
      .lean();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order',
      details: error.message
    });
  }
});
router.delete("/delete-all-orders", async (req, res) => {
  try {
    console.log("🗑️ Attempting to delete ALL orders...");

    // Get count before deletion for reporting
    const orderCount = await Order.countDocuments();
    console.log(`📊 Total orders found: ${orderCount}`);

    if (orderCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found to delete",
        deletedCount: 0
      });
    }

    // Delete all orders
    const deleteResult = await Order.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} orders`);

    res.status(200).json({
      success: true,
      message: `Successfully deleted all ${deleteResult.deletedCount} orders`,
      deletedCount: deleteResult.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error deleting all orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete all orders',
      details: error.message 
    });
  }
});

// Get my orders (buyer) - FIXED VERSION
router.get("/my-orders", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log("📦 Fetching orders for user:", userId);

    // First, let's check if the Order model exists and has the correct schema
    const orderSample = await Order.findOne({ buyerId: userId }).limit(1);
    console.log("Order sample:", orderSample);

    // Use lean() to get plain JavaScript objects and avoid population issues
    const orders = await Order.find({ buyerId: userId })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email',
        model: 'User' // Explicitly specify the model
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags',
        model: 'MarketplaceListing' // Explicitly specify the model
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery',
        model: 'Offer' // Explicitly specify the model
      })
      .sort({ createdAt: -1 })
      .lean(); // Convert to plain JavaScript objects

    console.log(`✅ Found ${orders.length} orders for user`);

    // Calculate order statistics
    const stats = {
      total: orders.length,
      active: orders.filter(o => ['paid', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'pending_payment').length
    };

    res.status(200).json({
      success: true,
      orders: orders,
      stats: stats,
      count: orders.length
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    
    // More detailed error information
    if (error.name === 'StrictPopulateError') {
      return res.status(500).json({ 
        error: 'Database schema error',
        details: 'Please check your Order model schema definitions'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

// Get my sales (seller) - FIXED VERSION
router.get("/my-sales", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log("💰 Fetching sales for seller:", userId);

    const sales = await Order.find({ sellerId: userId })
      .populate({
        path: 'buyerId',
        select: 'username avatar email',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements',
        model: 'Offer'
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${sales.length} sales for seller`);

    // Calculate sales statistics
    const stats = {
      total: sales.length,
      active: sales.filter(o => ['paid', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length,
      completed: sales.filter(o => o.status === 'completed').length,
      pending: sales.filter(o => o.status === 'pending_payment').length,
      totalRevenue: sales.filter(o => o.status === 'completed').reduce((sum, order) => sum + (order.amount || 0), 0)
    };

    res.status(200).json({
      success: true,
      sales: sales,
      stats: stats,
      count: sales.length
    });
  } catch (error) {
    console.error('❌ Error fetching sales:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales',
      details: error.message 
    });
  }
});

// Get order details - FIXED VERSION
router.get("/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔍 Fetching order details:", orderId);

    const order = await Order.findById(orderId)
      .populate({
        path: 'buyerId',
        select: 'username avatar email',
        model: 'User'
      })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery',
        model: 'Offer'
      })
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    const isBuyer = order.buyerId && order.buyerId._id.toString() === userId.toString();
    const isSeller = order.sellerId && order.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Access denied to this order' });
    }

    console.log("✅ Order details fetched successfully");

    res.status(200).json({
      success: true,
      order: order,
      userRole: isBuyer ? 'buyer' : 'seller'
    });
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order details',
      details: error.message 
    });
  }
});

// Update order status (seller - start working)
router.put("/:orderId/start-work", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔄 Starting work on order:", orderId);

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'paid' // Only start work if paid
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not paid' });
    }

    order.status = 'in_progress';
    await order.save();
    
    console.log("✅ Work started on order");

    res.status(200).json({ 
      success: true,
      message: 'Work started on order', 
      order 
    });
  } catch (error) {
    console.error('❌ Error starting work:', error);
    res.status(500).json({ 
      error: 'Failed to start work',
      details: error.message 
    });
  }
});

// Seller delivers work
router.put("/:orderId/deliver", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log("📤 Delivering order:", orderId);

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_progress' // Only deliver if in progress
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not in progress' });
    }

    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage;
    order.deliveryFiles = deliveryFiles || [];
    order.deliveredAt = new Date();
    
    await order.save();

    console.log("✅ Order delivered successfully");

    res.status(200).json({ 
      success: true,
      message: 'Order delivered successfully', 
      order 
    });
  } catch (error) {
    console.error('❌ Error delivering order:', error);
    res.status(500).json({ 
      error: 'Failed to deliver order',
      details: error.message 
    });
  }
});

// Buyer requests revision
router.put("/:orderId/request-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { revisionNotes } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔄 Requesting revision for order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered' // Only request revision if delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not delivered' });
    }

    // Check revision limit
    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ error: 'Maximum revisions reached' });
    }

    order.status = 'in_revision';
    order.revisions += 1;
    order.revisionNotes = revisionNotes;
    
    await order.save();

    console.log("✅ Revision requested successfully");

    res.status(200).json({ 
      success: true,
      message: 'Revision requested successfully', 
      order,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions
    });
  } catch (error) {
    console.error('❌ Error requesting revision:', error);
    res.status(500).json({ 
      error: 'Failed to request revision',
      details: error.message 
    });
  }
});

// Buyer accepts delivery and completes order
router.put("/:orderId/complete", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("✅ Completing order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered' // Only complete if delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not delivered' });
    }

    // Release payment to seller
    if (order.stripePaymentIntentId && !order.paymentReleased) {
      try {
        // Capture the payment (if not already captured)
        await stripe.paymentIntents.capture(order.stripePaymentIntentId);
        
        // Calculate platform fee and seller amount
        const platformFeePercent = 0.15; // 15% platform fee
        const platformFee = order.amount * platformFeePercent;
        const sellerAmount = order.amount - platformFee;

        order.platformFee = platformFee;
        order.sellerAmount = sellerAmount;
        order.paymentReleased = true;
        order.releaseDate = new Date();
        
        console.log("💰 Payment released to seller:", sellerAmount);
      } catch (stripeError) {
        console.error('❌ Stripe capture error:', stripeError);
        // Continue with order completion even if Stripe capture fails
      }
    }

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    console.log("✅ Order completed successfully");

    res.status(200).json({ 
      success: true,
      message: 'Order completed successfully', 
      order 
    });
  } catch (error) {
    console.error('❌ Error completing order:', error);
    res.status(500).json({ 
      error: 'Failed to complete order',
      details: error.message 
    });
  }
});

// Get order timeline/status history
router.get("/:orderId/timeline", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("📅 Fetching timeline for order:", orderId);

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (order.buyerId.toString() !== userId && order.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeline = [
      { 
        status: 'created', 
        date: order.createdAt, 
        description: 'Order created',
        icon: '📝'
      }
    ];

    if (order.paidAt) {
      timeline.push({
        status: 'paid',
        date: order.paidAt,
        description: 'Payment received',
        icon: '💳'
      });
    }

    if (order.status === 'in_progress' || order.status === 'delivered' || order.status === 'completed') {
      timeline.push({
        status: 'in_progress',
        date: order.updatedAt, // Use the last update time
        description: 'Seller started working',
        icon: '👨‍💻'
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        status: 'delivered',
        date: order.deliveredAt,
        description: 'Work delivered',
        icon: '📦'
      });
    }

    if (order.completedAt) {
      timeline.push({
        status: 'completed',
        date: order.completedAt,
        description: 'Order completed',
        icon: '✅'
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log("✅ Timeline fetched successfully");

    res.status(200).json({
      success: true,
      timeline: timeline
    });
  } catch (error) {
    console.error('❌ Error fetching timeline:', error);
    res.status(500).json({ 
      error: 'Failed to fetch timeline',
      details: error.message 
    });
  }
});

// Cancel order
router.put("/:orderId/cancel", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("❌ Cancelling order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { buyerId: userId },
        { sellerId: userId }
      ],
      status: { $in: ['pending_payment', 'paid'] } // Only cancel if not delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    // If payment was made, process refund
    if (order.stripePaymentIntentId && order.status === 'paid') {
      try {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
        });
        console.log("💰 Refund processed for cancelled order");
      } catch (stripeError) {
        console.error('❌ Stripe refund error:', stripeError);
      }
    }

    order.status = 'cancelled';
    await order.save();

    console.log("✅ Order cancelled successfully");

    res.status(200).json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order 
    });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ 
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
});

module.exports = router;