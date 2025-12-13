const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../../models/marketplace/order");
const MarketplaceListing = require("../../models/marketplace/listing");
const Offer = require("../../models/marketplace/offer");
const User = require("../../models/user");
const Delivery = require("../../models/marketplace/Delivery"); // Add Delivery model
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');
const emailService = require("../../../services/emailService"); // Add email service

// Helper functions for fee calculation
function calculatePlatformFee(amount) {
  const platformFeePercentage = 0.10;
  return parseFloat((amount * platformFeePercentage).toFixed(2));
}

function calculateSellerPayout(amount) {
  const platformFee = calculatePlatformFee(amount);
  return parseFloat((amount - platformFee).toFixed(2));
}

// ========== ORDER CREATION ========== //
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
      notes,
      expectedDeliveryDays = 7
    } = req.body;

    const currentUserId = req.user.id || req.user._id || req.user.userId;

    console.log("🛒 Creating new order with data:", {
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
        success: false,
        error: 'Missing required fields: offerId, listingId, buyerId, sellerId, amount'
      });
    }

    // Validate amount is positive
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Verify that the current user is the seller
    if (sellerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only create orders for your own listings'
      });
    }

    // Check if seller has connected and active Stripe account
    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'Seller not found'
      });
    }

    if (!seller.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Please connect your Stripe account before accepting offers',
        stripeSetupRequired: true,
        message: 'You need to set up Stripe payments to receive funds from orders'
      });
    }

    if (seller.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Your Stripe account is not yet active. Please complete the setup process.',
        stripeSetupRequired: true,
        message: 'Complete your Stripe onboarding to start accepting payments'
      });
    }

    // Check if offer exists and is still pending
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer is no longer available for order creation',
        currentStatus: offer.status
      });
    }

    // Verify offer belongs to the correct listing and buyer
    if (offer.listingId.toString() !== listingId || offer.buyerId.toString() !== buyerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer details do not match with provided listing or buyer'
      });
    }

    // Check if listing exists and is active
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: 'Listing not found' 
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Listing is not available for purchase',
        currentStatus: listing.status
      });
    }

    // Verify listing belongs to the seller
    if (listing.sellerId.toString() !== sellerId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to create orders for this listing'
      });
    }

    // Check if order already exists for this offer
    const existingOrder = await Order.findOne({ offerId });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        error: 'Order already exists for this offer',
        orderId: existingOrder._id
      });
    }

    // Calculate expected delivery date
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + parseInt(expectedDeliveryDays));

    // Create new order
    const order = new Order({
      offerId,
      listingId,
      buyerId,
      sellerId,
      amount,
      shippingAddress: shippingAddress || {
        address: 'Not provided',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      paymentMethod: paymentMethod || 'card',
      notes: notes || '',
      status: 'pending_payment',
      orderType: 'accepted_offer',
      orderDate: new Date(),
      expectedDelivery,
      maxRevisions: listing.maxRevisions || 3,
      revisions: 0,
      stripePaymentIntentId: null,
      stripeTransferId: null,
      platformFee: calculatePlatformFee(amount),
      sellerPayoutAmount: calculateSellerPayout(amount)
    });

    await order.save();

    // Update offer status to accepted
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    offer.orderId = order._id;
    await offer.save();

    // Update listing status to sold if it's a one-time purchase
    if (listing.availability === 'single') {
      listing.status = 'sold';
      listing.soldAt = new Date();
      await listing.save();
    }

    // Update seller stats
    await User.findByIdAndUpdate(sellerId, {
      $inc: { totalOrders: 1 }
    });

    console.log("✅ Order created successfully:", order._id);

    // Populate the order with related data
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: 'buyerId',
        select: 'username avatar email firstName lastName',
        model: 'User'
      })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email firstName lastName stripeAccountId',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags availability deliveryTime',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery createdAt',
        model: 'Offer'
      })
      .lean();

    console.log(`🎉 New order created: 
      Order ID: ${order._id}
      Amount: $${amount}
      Seller: ${seller.username} (${seller._id})
      Buyer: ${populatedOrder.buyerId.username}
      Listing: ${populatedOrder.listingId.title}
    `);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder,
      nextSteps: {
        paymentRequired: true,
        message: 'Buyer needs to complete payment to start the order'
      }
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Order already exists for this offer'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ========== DELIVERY SYSTEM WITH EMAIL NOTIFICATION ========== //

// 1. Deliver order with email notification (in_progress → delivered)
router.put("/:orderId/deliver-with-email", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      deliveryMessage, 
      deliveryFiles = [],
      attachments = [],
      isFinalDelivery = true 
    } = req.body;
    
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log("📤 Seller delivering order with email notification:", orderId);
    console.log("Delivery details:", {
      messageLength: deliveryMessage?.length || 0,
      filesCount: deliveryFiles.length,
      attachmentsCount: attachments.length,
      isFinalDelivery
    });

    // Find the order with populated user data
    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_progress' // Only deliver if in progress
    })
      .populate('buyerId', 'username email firstName lastName')
      .populate('sellerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready for delivery' 
      });
    }

    // Validate required fields
    if (!deliveryMessage || deliveryMessage.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Delivery message is required' 
      });
    }

    // Check if we have any delivery content
    const hasContent = deliveryFiles.length > 0 || attachments.length > 0;
    
    if (!hasContent) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one file or attachment is required for delivery' 
      });
    }

    // Calculate revision number (first delivery = 1)
    const existingDeliveries = await Delivery.countDocuments({ orderId: order._id });
    const revisionNumber = existingDeliveries + 1;
    
    // Create delivery record
    const delivery = new Delivery({
      orderId: order._id,
      sellerId: userId,
      buyerId: order.buyerId._id,
      message: deliveryMessage.trim(),
      attachments: attachments.map(att => ({
        filename: att.filename || att.originalName || 'file',
        originalName: att.originalName || att.filename || 'file',
        mimeType: att.mimeType || att.type || 'application/octet-stream',
        size: att.size || 0,
        url: att.url || '',
        key: att.key
      })),
      isFinalDelivery: isFinalDelivery,
      revisionNumber: revisionNumber,
      status: 'pending_review'
    });

    await delivery.save();

    // Update order status
    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage.trim();
    order.deliveryFiles = deliveryFiles;
    order.deliveredAt = new Date();
    
    // Add delivery reference
    if (!order.deliveries) {
      order.deliveries = [];
    }
    order.deliveries.push(delivery._id);
    
    await order.save();

    console.log("✅ Order delivered and saved:", {
      orderId: order._id,
      revision: revisionNumber,
      deliveryId: delivery._id
    });

    // Send email notification to buyer
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const orderLink = `${siteUrl}/orders/${order._id}`;

      // Prepare delivery data for email
      const deliveryData = {
        message: deliveryMessage,
        attachments: attachments,
        isFinalDelivery: isFinalDelivery,
        revisionNumber: revisionNumber,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
      };

      // Create email content
      const emailContent = {
        buyerName: order.buyerId.firstName || order.buyerId.username,
        sellerName: order.sellerId.firstName || order.sellerId.username,
        orderTitle: order.listingId?.title || 'Your Order',
        orderAmount: order.amount,
        orderLink: orderLink,
        deliveryMessage: deliveryMessage,
        attachmentsCount: attachments.length,
        isFinalDelivery: isFinalDelivery,
        revisionsUsed: order.revisions || 0,
        maxRevisions: order.maxRevisions || 3,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
      };

      // Send email using existing email service
      await emailService.sendOrderDeliveryNotification(
        order.buyerId.email,
        order.sellerId.email,
        emailContent
      );

      console.log("📧 Delivery email sent successfully to:", order.buyerId.email);

      // Send confirmation email to seller
      await emailService.transporter.sendMail({
        from: `"${siteName}" <${process.env.GMAIL_USER}>`,
        to: order.sellerId.email,
        subject: `✅ Delivery Submitted - Order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #059669; text-align: center;">✅ Delivery Submitted Successfully</h2>
            <p>Your delivery for order <strong>#${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}</strong> has been sent to the buyer.</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Buyer:</strong> ${order.buyerId.username}</p>
              <p><strong>Order Amount:</strong> $${order.amount}</p>
              <p><strong>Delivery Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Files Sent:</strong> ${attachments.length}</p>
              <p><strong>Delivery Message:</strong> ${deliveryMessage.substring(0, 100)}${deliveryMessage.length > 100 ? '...' : ''}</p>
            </div>
            
            <p>The buyer has 3 days to review and accept the delivery.</p>
            <p>You will be notified when the buyer reviews your delivery.</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${orderLink}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
        `,
        text: `Delivery submitted successfully for order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}. Buyer has been notified.`
      });

    } catch (emailError) {
      console.error('❌ Email sending failed, but delivery was saved:', emailError.message);
      // Continue even if email fails - the delivery was saved
    }

    // Populate the order for response
    const populatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email firstName lastName')
      .populate('sellerId', 'username avatar email firstName lastName')
      .populate('listingId', 'title')
      .lean();

    console.log("🎉 Delivery process completed successfully");

    res.status(200).json({ 
      success: true,
      message: 'Order delivered successfully. Buyer has been notified via email.', 
      order: populatedOrder,
      delivery: delivery,
      emailSent: true,
      nextAction: 'Wait for buyer acceptance or revision request',
      reviewPeriod: 'Buyer has 3 days to review the delivery'
    });

  } catch (error) {
    console.error('❌ Error delivering order:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: 'Delivery already exists for this revision number'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to deliver order',
      details: error.message 
    });
  }
});

// 2. Complete revision (in_revision → delivered)
router.put("/:orderId/complete-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      deliveryMessage, 
      deliveryFiles = [],
      attachments = [],
      isFinalDelivery = true 
    } = req.body;
    
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔄 Seller completing revision for order:", orderId);

    // Find the order with populated user data
    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_revision' // Only complete revision if in revision
    })
      .populate('buyerId', 'username email firstName lastName')
      .populate('sellerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not in revision status' 
      });
    }

    // Validate required fields
    if (!deliveryMessage || deliveryMessage.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Delivery message is required' 
      });
    }

    // Check if we have any delivery content
    const hasContent = deliveryFiles.length > 0 || attachments.length > 0;
    
    if (!hasContent) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one file or attachment is required' 
      });
    }

    // Calculate revision number
    const existingDeliveries = await Delivery.countDocuments({ orderId: order._id });
    const revisionNumber = existingDeliveries + 1;
    
    // Update order status back to delivered
    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage.trim();
    order.deliveryFiles = deliveryFiles;
    order.deliveredAt = new Date();
    
    // Increment revision count
    order.revisions = (order.revisions || 0) + 1;
    
    // Update revision notes if they exist
    if (order.revisionNotes && order.revisionNotes.length > 0) {
      const lastRevision = order.revisionNotes[order.revisionNotes.length - 1];
      if (lastRevision && !lastRevision.completedAt) {
        lastRevision.completedAt = new Date();
      }
    }

    // Create delivery record for revision
    const delivery = new Delivery({
      orderId: order._id,
      sellerId: userId,
      buyerId: order.buyerId._id,
      message: deliveryMessage.trim(),
      attachments: attachments.map(att => ({
        filename: att.filename || att.originalName || 'file',
        originalName: att.originalName || att.filename || 'file',
        mimeType: att.mimeType || att.type || 'application/octet-stream',
        size: att.size || 0,
        url: att.url || '',
        key: att.key
      })),
      isFinalDelivery: isFinalDelivery,
      revisionNumber: revisionNumber,
      status: 'pending_review'
    });

    await delivery.save();

    // Add delivery reference
    if (!order.deliveries) {
      order.deliveries = [];
    }
    order.deliveries.push(delivery._id);
    
    await order.save();

    console.log("✅ Revision completed successfully:", {
      orderId: order._id,
      revision: order.revisions
    });

    // Send email notification to buyer about revision completion
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const orderLink = `${siteUrl}/orders/${order._id}`;

      // Prepare delivery data for email
      const deliveryData = {
        message: deliveryMessage,
        attachments: attachments,
        isFinalDelivery: isFinalDelivery,
        revisionNumber: revisionNumber,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
      };

      // Create email content
      const emailContent = {
        buyerName: order.buyerId.firstName || order.buyerId.username,
        sellerName: order.sellerId.firstName || order.sellerId.username,
        orderTitle: order.listingId?.title || 'Your Order',
        orderAmount: order.amount,
        orderLink: orderLink,
        deliveryMessage: deliveryMessage,
        attachmentsCount: attachments.length,
        isFinalDelivery: isFinalDelivery,
        revisionsUsed: order.revisions || 0,
        maxRevisions: order.maxRevisions || 3,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
        isRevision: true
      };

      // Send email using existing email service
      await emailService.sendOrderDeliveryNotification(
        order.buyerId.email,
        order.sellerId.email,
        emailContent
      );

      console.log("📧 Revision completion email sent to:", order.buyerId.email);

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      // Continue even if email fails
    }

    // Populate for response
    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email firstName lastName')
      .populate('sellerId', 'username avatar email firstName lastName')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Revision completed successfully. Buyer has been notified.', 
      order: updatedOrder,
      delivery: delivery,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions,
      emailSent: true
    });

  } catch (error) {
    console.error('❌ Error completing revision:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete revision',
      details: error.message 
    });
  }
});

// 3. Get delivery history for an order
router.get("/:orderId/deliveries", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("📦 Fetching delivery history for order:", orderId);

    // Check if user has access to this order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    if (order.buyerId.toString() !== userId.toString() && 
        order.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied to this order' 
      });
    }

    // Fetch all deliveries for this order
    const deliveries = await Delivery.find({ orderId })
      .populate('sellerId', 'username avatar firstName lastName')
      .sort({ revisionNumber: 1 })
      .lean();

    console.log(`✅ Found ${deliveries.length} deliveries for order`);

    res.status(200).json({
      success: true,
      deliveries: deliveries,
      count: deliveries.length,
      orderStatus: order.status,
      revisionsUsed: order.revisions || 0,
      revisionsLeft: order.maxRevisions - (order.revisions || 0)
    });

  } catch (error) {
    console.error('❌ Error fetching deliveries:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch delivery history',
      details: error.message 
    });
  }
});

// 4. Get specific delivery details
router.get("/deliveries/:deliveryId", authenticateMiddleware, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔍 Fetching delivery details:", deliveryId);

    const delivery = await Delivery.findById(deliveryId)
      .populate('sellerId', 'username avatar firstName lastName')
      .populate('buyerId', 'username avatar firstName lastName')
      .populate({
        path: 'orderId',
        select: 'status amount revisions maxRevisions orderNumber',
        populate: {
          path: 'listingId',
          select: 'title'
        }
      })
      .lean();

    if (!delivery) {
      return res.status(404).json({ 
        success: false,
        error: 'Delivery not found' 
      });
    }

    // Check access
    if (delivery.buyerId._id.toString() !== userId.toString() && 
        delivery.sellerId._id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied to this delivery' 
      });
    }

    console.log("✅ Delivery details fetched successfully");

    res.status(200).json({
      success: true,
      delivery: delivery,
      userRole: delivery.buyerId._id.toString() === userId.toString() ? 'buyer' : 'seller'
    });

  } catch (error) {
    console.error('❌ Error fetching delivery details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch delivery details',
      details: error.message 
    });
  }
});

// ========== SELLER ORDER MANAGEMENT ========== //

// 1. Start processing order (paid → processing)
router.put("/:orderId/start-processing", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log("🔄 Seller starting to process order:", orderId);

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'paid' // Only process if paid
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not in paid status' 
      });
    }

    // Update order status
    order.status = 'processing';
    order.processingAt = new Date();
    await order.save();

    console.log("✅ Order marked as processing");

    // Populate for response
    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email')
      .populate('sellerId', 'username avatar')
      .populate('listingId', 'title mediaUrls')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Order processing started successfully',
      order: updatedOrder,
      nextAction: 'Start working on the order'
    });
  } catch (error) {
    console.error('❌ Error starting order processing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start order processing',
      details: error.message 
    });
  }
});

// 2. Start working on order (processing → in_progress)
router.put("/:orderId/start-work", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("👨‍💻 Seller starting work on order:", orderId);

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: { $in: ['processing', 'paid'] } // Can start from processing or paid
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready to start work' 
      });
    }

    // Update order status
    order.status = 'in_progress';
    order.startedAt = new Date();
    await order.save();

    console.log("✅ Work started on order");

    // Populate for response
    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Work started on order successfully', 
      order: updatedOrder,
      nextAction: 'Complete the work and deliver'
    });
  } catch (error) {
    console.error('❌ Error starting work:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start work',
      details: error.message 
    });
  }
});

// 3. Deliver order (in_progress → delivered) - Legacy route for backward compatibility
router.put("/:orderId/deliver", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log("📤 Seller delivering order (legacy route):", orderId);

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_progress' // Only deliver if in progress
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready for delivery' 
      });
    }

    // Update order status
    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage || '';
    order.deliveryFiles = deliveryFiles || [];
    order.deliveredAt = new Date();
    
    await order.save();

    console.log("✅ Order delivered successfully (legacy route)");

    // Populate for response
    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Order delivered successfully', 
      order: updatedOrder,
      nextAction: 'Wait for buyer acceptance or revision request'
    });
  } catch (error) {
    console.error('❌ Error delivering order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to deliver order',
      details: error.message 
    });
  }
});

// 4. Seller cancels order
router.put("/:orderId/cancel-by-seller", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("❌ Seller cancelling order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      sellerId: userId,
      status: { $in: ['paid', 'processing'] } // Only cancel if in these statuses
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or cannot be cancelled at this stage' 
      });
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
        // Continue with cancellation even if refund fails
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.sellerNotes = cancelReason ? `Cancelled by seller: ${cancelReason}` : 'Cancelled by seller';
    await order.save();

    console.log("✅ Order cancelled by seller successfully");

    // Update offer status if exists
    if (order.offerId) {
      await Offer.findByIdAndUpdate(order.offerId, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
    }

    res.status(200).json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order: await Order.findById(orderId).lean()
    });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
});

// ========== BUYER ORDER MANAGEMENT ========== //

// Buyer requests revision
router.put("/:orderId/request-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { revisionNotes } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔄 Buyer requesting revision for order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered' // Only request revision if delivered
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not delivered' 
      });
    }

    // Check revision limit
    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ 
        success: false,
        error: 'Maximum revisions reached' 
      });
    }

    // Update order status and add revision notes
    order.status = 'in_revision';
    order.revisions += 1;
    
    if (!order.revisionNotes) {
      order.revisionNotes = [];
    }
    
    order.revisionNotes.push({
      notes: revisionNotes,
      requestedAt: new Date()
    });
    
    await order.save();

    console.log("✅ Revision requested successfully");

    res.status(200).json({ 
      success: true,
      message: 'Revision requested successfully', 
      order: await Order.findById(orderId).lean(),
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions
    });
  } catch (error) {
    console.error('❌ Error requesting revision:', error);
    res.status(500).json({ 
      success: false,
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

    console.log("✅ Buyer completing order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered' // Only complete if delivered
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not delivered' 
      });
    }

    // Release payment to seller
    if (order.stripePaymentIntentId && !order.paymentReleased) {
      try {
        // Capture the payment
        await stripe.paymentIntents.capture(order.stripePaymentIntentId);
        
        // Calculate platform fee and seller amount
        const platformFeePercent = 0.15;
        const platformFee = order.amount * platformFeePercent;
        const sellerAmount = order.amount - platformFee;

        order.platformFee = platformFee;
        order.sellerAmount = sellerAmount;
        order.paymentReleased = true;
        order.releaseDate = new Date();
        
        console.log("💰 Payment released to seller:", sellerAmount);
        
        // Update seller's balance
        await User.findByIdAndUpdate(order.sellerId, {
          $inc: { 
            balance: sellerAmount,
            totalEarnings: sellerAmount
          }
        });
      } catch (stripeError) {
        console.error('❌ Stripe capture error:', stripeError);
      }
    }

    // Update order status
    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    console.log("✅ Order completed successfully");

    // Update seller stats
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { completedOrders: 1 }
    });

    // Send completion email to both parties
    try {
      const order = await Order.findById(orderId)
        .populate('buyerId', 'username email firstName lastName')
        .populate('sellerId', 'username email firstName lastName');

      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const orderLink = `${siteUrl}/orders/${order._id}`;

      // Email to buyer
      await emailService.transporter.sendMail({
        from: `"${siteName}" <${process.env.GMAIL_USER}>`,
        to: order.buyerId.email,
        subject: `✅ Order Completed - Order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #059669; text-align: center;">✅ Order Completed Successfully</h2>
            <p>Your order <strong>#${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}</strong> with ${order.sellerId.username} has been completed.</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Seller:</strong> ${order.sellerId.username}</p>
              <p><strong>Order Amount:</strong> $${order.amount}</p>
              <p><strong>Completed On:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Payment Status:</strong> Released to seller</p>
            </div>
            
            <p>Thank you for your business! We hope you were satisfied with the service.</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${orderLink}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
        `,
        text: `Order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()} completed successfully. Thank you for your business!`
      });

      // Email to seller
      await emailService.transporter.sendMail({
        from: `"${siteName}" <${process.env.GMAIL_USER}>`,
        to: order.sellerId.email,
        subject: `💰 Payment Released - Order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #059669; text-align: center;">💰 Payment Released Successfully</h2>
            <p>Your payment for order <strong>#${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}</strong> has been released.</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Buyer:</strong> ${order.buyerId.username}</p>
              <p><strong>Order Amount:</strong> $${order.amount}</p>
              <p><strong>Your Earnings:</strong> $${order.sellerAmount || (order.amount * 0.85).toFixed(2)}</p>
              <p><strong>Platform Fee:</strong> $${order.platformFee || (order.amount * 0.15).toFixed(2)}</p>
              <p><strong>Released On:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>The funds have been transferred to your account.</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${orderLink}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order Details
              </a>
            </div>
          </div>
        `,
        text: `Payment released for order #${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}. Funds transferred to your account.`
      });

    } catch (emailError) {
      console.error('❌ Completion email sending failed:', emailError.message);
    }

    res.status(200).json({ 
      success: true,
      message: 'Order completed successfully', 
      order: await Order.findById(orderId)
        .populate('buyerId', 'username avatar')
        .populate('sellerId', 'username avatar')
        .lean()
    });
  } catch (error) {
    console.error('❌ Error completing order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete order',
      details: error.message 
    });
  }
});

// Buyer cancels order
router.put("/:orderId/cancel-by-buyer", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("❌ Buyer cancelling order:", orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: { $in: ['pending_payment', 'paid'] } // Only cancel if in these statuses
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or cannot be cancelled at this stage' 
      });
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

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.buyerNotes = cancelReason ? `Cancelled by buyer: ${cancelReason}` : 'Cancelled by buyer';
    await order.save();

    console.log("✅ Order cancelled by buyer successfully");

    res.status(200).json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order: await Order.findById(orderId).lean()
    });
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
});

// ========== ORDER QUERIES ========== //

// Get my orders (buyer)
router.get("/my-orders", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    console.log("📦 Fetching orders for buyer:", userId);

    const orders = await Order.find({ buyerId: userId })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email firstName lastName',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery createdAt',
        model: 'Offer'
      })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${orders.length} orders for buyer`);

    // Calculate order statistics
    const stats = {
      total: orders.length,
      active: orders.filter(o => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'pending_payment').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    res.status(200).json({
      success: true,
      orders: orders,
      stats: stats,
      count: orders.length
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

// Get my sales (seller)
router.get("/my-sales", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    console.log("💰 Fetching sales for seller:", userId);

    const sales = await Order.find({ sellerId: userId })
      .populate({
        path: 'buyerId',
        select: 'username avatar email firstName lastName',
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
      active: sales.filter(o => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length,
      completed: sales.filter(o => o.status === 'completed').length,
      pending: sales.filter(o => o.status === 'pending_payment').length,
      cancelled: sales.filter(o => o.status === 'cancelled').length,
      totalRevenue: sales.filter(o => o.status === 'completed').reduce((sum, order) => sum + (order.amount || 0), 0),
      pendingRevenue: sales.filter(o => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status))
        .reduce((sum, order) => sum + (order.amount || 0), 0)
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
      success: false,
      error: 'Failed to fetch sales',
      details: error.message 
    });
  }
});

// Get order details
router.get("/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔍 Fetching order details:", orderId);

    const order = await Order.findById(orderId)
      .populate({
        path: 'buyerId',
        select: 'username avatar email firstName lastName',
        model: 'User'
      })
      .populate({
        path: 'sellerId',
        select: 'username avatar sellerRating email firstName lastName stripeAccountId',
        model: 'User'
      })
      .populate({
        path: 'listingId',
        select: 'title mediaUrls price category type description tags',
        model: 'MarketplaceListing'
      })
      .populate({
        path: 'offerId',
        select: 'amount message requirements expectedDelivery createdAt',
        model: 'Offer'
      })
      .lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Check if user has access to this order
    const isBuyer = order.buyerId && order.buyerId._id.toString() === userId.toString();
    const isSeller = order.sellerId && order.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied to this order' 
      });
    }

    // Get deliveries for this order
    const deliveries = await Delivery.find({ orderId: order._id })
      .populate('sellerId', 'username avatar')
      .sort({ revisionNumber: 1 })
      .lean();

    console.log("✅ Order details fetched successfully");

    res.status(200).json({
      success: true,
      order: order,
      deliveries: deliveries,
      userRole: isBuyer ? 'buyer' : 'seller',
      permissions: {
        canStartProcessing: isSeller && order.status === 'paid',
        canStartWork: isSeller && (order.status === 'processing' || order.status === 'paid'),
        canDeliver: isSeller && order.status === 'in_progress',
        canRequestRevision: isBuyer && order.status === 'delivered' && order.revisions < order.maxRevisions,
        canComplete: isBuyer && order.status === 'delivered',
        canCancelByBuyer: isBuyer && ['pending_payment', 'paid'].includes(order.status),
        canCancelBySeller: isSeller && ['paid', 'processing'].includes(order.status)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order details',
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
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Check access
    if (order.buyerId.toString() !== userId && order.sellerId.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
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

    if (order.processingAt) {
      timeline.push({
        status: 'processing',
        date: order.processingAt,
        description: 'Seller started processing order',
        icon: '📦'
      });
    }

    if (order.startedAt) {
      timeline.push({
        status: 'in_progress',
        date: order.startedAt,
        description: 'Seller started working on order',
        icon: '👨‍💻'
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        status: 'delivered',
        date: order.deliveredAt,
        description: 'Seller delivered the work',
        icon: '🚚'
      });
    }

    if (order.revisionNotes && order.revisionNotes.length > 0) {
      order.revisionNotes.forEach((revision, index) => {
        if (revision.requestedAt) {
          timeline.push({
            status: 'revision_requested',
            date: revision.requestedAt,
            description: `Revision requested (${index + 1}/${order.maxRevisions})`,
            icon: '🔄'
          });
        }
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

    if (order.cancelledAt) {
      timeline.push({
        status: 'cancelled',
        date: order.cancelledAt,
        description: 'Order cancelled',
        icon: '❌'
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log("✅ Timeline fetched successfully");

    res.status(200).json({
      success: true,
      timeline: timeline,
      currentStatus: order.status
    });
  } catch (error) {
    console.error('❌ Error fetching timeline:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch timeline',
      details: error.message 
    });
  }
});

// ========== ADMIN/UTILITY ROUTES ========== //

// Delete all orders (admin only)
router.delete("/delete-all-orders", authenticateMiddleware, async (req, res) => {
  try {
    // Check if user is admin (you should implement proper admin check)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log("🗑️ Attempting to delete ALL orders...");

    const orderCount = await Order.countDocuments();
    console.log(`📊 Total orders found: ${orderCount}`);

    if (orderCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found to delete",
        deletedCount: 0
      });
    }

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

// Get order statistics
router.get("/stats/seller", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const stats = await Order.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const totalStats = {
      totalOrders: await Order.countDocuments({ sellerId: userId }),
      totalRevenue: await Order.aggregate([
        { $match: { sellerId: mongoose.Types.ObjectId(userId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then(result => result[0]?.total || 0),
      pendingRevenue: await Order.aggregate([
        { $match: { 
          sellerId: mongoose.Types.ObjectId(userId), 
          status: { $in: ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'] }
        } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then(result => result[0]?.total || 0)
    };

    res.status(200).json({
      success: true,
      stats: stats,
      totals: totalStats
    });
  } catch (error) {
    console.error('❌ Error fetching seller stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// Generic status update route
router.put("/:orderId/status", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔄 Updating order status via /status endpoint:", { 
      orderId, 
      status, 
      userId 
    });

    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is authorized (must be seller or buyer of this order)
    const isSeller = order.sellerId.toString() === userId.toString();
    const isBuyer = order.buyerId.toString() === userId.toString();
    
    if (!isSeller && !isBuyer) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this order'
      });
    }

    // Validate status transitions based on user role
    const validStatuses = [
      'pending_payment',
      'paid', 
      'processing',
      'in_progress',
      'delivered',
      'in_revision',
      'completed',
      'cancelled',
      'disputed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: ${status}`,
        validStatuses
      });
    }

    // For sellers: Validate transitions
    if (isSeller) {
      const sellerValidTransitions = {
        'paid': ['processing', 'cancelled'],
        'processing': ['in_progress', 'cancelled'],
        'in_progress': ['delivered', 'cancelled'],
        'delivered': ['in_revision'], // Only if buyer requests revision
        'in_revision': ['delivered'], // After completing revision
        'completed': [] // No further changes
      };

      const allowedTransitions = sellerValidTransitions[order.status] || [];
      
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${order.status} to ${status} for seller`,
          currentStatus: order.status,
          allowedTransitions
        });
      }
    }

    // For buyers: Validate transitions
    if (isBuyer) {
      const buyerValidTransitions = {
        'pending_payment': ['cancelled'],
        'paid': ['cancelled'],
        'delivered': ['completed', 'in_revision'],
        'in_revision': [] // Buyer can only request revision, not complete it
      };

      const allowedTransitions = buyerValidTransitions[order.status] || [];
      
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status transition from ${order.status} to ${status} for buyer`,
          currentStatus: order.status,
          allowedTransitions
        });
      }
    }

    // Update order status
    const previousStatus = order.status;
    order.status = status;
    
    // Set timestamps based on status change
    const now = new Date();
    
    if (status === 'paid' && !order.paidAt) {
      order.paidAt = now;
    } else if (status === 'processing' && !order.processingAt) {
      order.processingAt = now;
    } else if (status === 'in_progress' && !order.startedAt) {
      order.startedAt = now;
    } else if (status === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = now;
    } else if (status === 'completed' && !order.completedAt) {
      order.completedAt = now;
      
      // Release payment to seller if not already released
      if (order.stripePaymentIntentId && !order.paymentReleased) {
        try {
          // Capture the payment
          await stripe.paymentIntents.capture(order.stripePaymentIntentId);
          
          // Calculate platform fee and seller amount
          const platformFeePercent = 0.15;
          const platformFee = order.amount * platformFeePercent;
          const sellerAmount = order.amount - platformFee;

          order.platformFee = platformFee;
          order.sellerAmount = sellerAmount;
          order.paymentReleased = true;
          order.releaseDate = now;
          
          console.log("💰 Payment released to seller:", sellerAmount);
        } catch (stripeError) {
          console.error('❌ Stripe capture error:', stripeError);
        }
      }
    } else if (status === 'cancelled' && !order.cancelledAt) {
      order.cancelledAt = now;
      
      // If payment was made, process refund
      if (order.stripePaymentIntentId && previousStatus === 'paid') {
        try {
          await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
          });
          console.log("💰 Refund processed for cancelled order");
        } catch (stripeError) {
          console.error('❌ Stripe refund error:', stripeError);
        }
      }
    }

    // Update permissions based on new status
    order.permissions = {
      canStartProcessing: isSeller && status === 'paid',
      canStartWork: isSeller && (status === 'processing' || status === 'paid'),
      canDeliver: isSeller && status === 'in_progress',
      canRequestRevision: isBuyer && status === 'delivered' && order.revisions < order.maxRevisions,
      canComplete: isBuyer && status === 'delivered',
      canCancelByBuyer: isBuyer && ['pending_payment', 'paid'].includes(status),
      canCancelBySeller: isSeller && ['paid', 'processing'].includes(status)
    };

    await order.save();

    console.log(`✅ Order ${orderId} status updated: ${previousStatus} → ${status}`);

    // Populate the order for response
    const populatedOrder = await Order.findById(orderId)
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
        select: 'title mediaUrls price category type',
        model: 'MarketplaceListing'
      })
      .lean();

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: populatedOrder,
      previousStatus,
      newStatus: status,
      updatedAt: now
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    });
  }
});

module.exports = router;