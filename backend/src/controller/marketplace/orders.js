// routes/order.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Order = require("../../models/marketplace/order");
const MarketplaceListing = require("../../models/marketplace/listing");
const Offer = require("../../models/marketplace/offer");
const User = require("../../models/user");
const Delivery = require("../../models/marketplace/Delivery");
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require("../../../services/emailService");

// ========== FILE UPLOAD CONFIGURATION ========== //
const uploadsDir = 'uploads/deliveries/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime', 'video/x-msvideo',
  'application/pdf', 'application/zip', 'application/x-rar-compressed',
  'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    allowedMimeTypes.includes(file.mimetype) 
      ? cb(null, true)
      : cb(new Error(`File type ${file.mimetype} not supported`), false);
  }
});

// ========== HELPER FUNCTIONS ========== //
const calculatePlatformFee = (amount) => parseFloat((amount * 0.10).toFixed(2));
const calculateSellerPayout = (amount) => parseFloat((amount - calculatePlatformFee(amount)).toFixed(2));

const validateUserAccess = (order, userId) => {
  const isBuyer = order.buyerId.toString() === userId.toString();
  const isSeller = order.sellerId.toString() === userId.toString();
  
  if (!isBuyer && !isSeller) {
    throw new Error('Access denied to this order');
  }
  
  return { isBuyer, isSeller };
};

const populateOrder = (orderId) => Order.findById(orderId)
  .populate('buyerId', 'username avatar email firstName lastName')
  .populate('sellerId', 'username avatar sellerRating email firstName lastName stripeAccountId')
  .populate('listingId', 'title mediaUrls price category type description tags availability deliveryTime')
  .populate('offerId', 'amount message requirements expectedDelivery createdAt');

const sendDeliveryEmail = async (order, deliveryData, isRevision = false) => {
  try {
    const siteName = process.env.SITE_NAME || 'WeCinema';
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const orderLink = `${siteUrl}/orders/${order._id}`;

    const emailContent = {
      buyerName: order.buyerId.firstName || order.buyerId.username,
      sellerName: order.sellerId.firstName || order.sellerId.username,
      orderTitle: order.listingId?.title || 'Your Order',
      orderAmount: order.amount,
      orderLink,
      deliveryMessage: deliveryData.message,
      attachmentsCount: deliveryData.attachments?.length || 0,
      isFinalDelivery: deliveryData.isFinalDelivery,
      revisionsUsed: order.revisions || 0,
      maxRevisions: order.maxRevisions || 3,
      orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
      isRevision
    };

    await emailService.sendOrderDeliveryNotification(
      order.buyerId.email,
      order.sellerId.email,
      emailContent
    );

    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
};

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

    if (!offerId || !listingId || !buyerId || !sellerId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    if (sellerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only create orders for your own listings'
      });
    }

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }

    if (!seller.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Please connect your Stripe account before accepting offers',
        stripeSetupRequired: true
      });
    }

    if (seller.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Your Stripe account is not yet active',
        stripeSetupRequired: true
      });
    }

    const [offer, listing, existingOrder] = await Promise.all([
      Offer.findById(offerId),
      MarketplaceListing.findById(listingId),
      Order.findOne({ offerId })
    ]);

    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        error: 'Order already exists for this offer',
        orderId: existingOrder._id
      });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Offer is no longer available',
        currentStatus: offer.status
      });
    }

    if (offer.listingId.toString() !== listingId || offer.buyerId.toString() !== buyerId) {
      return res.status(400).json({
        success: false,
        error: 'Offer details do not match'
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Listing is not available for purchase',
        currentStatus: listing.status
      });
    }

    if (listing.sellerId.toString() !== sellerId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create orders for this listing'
      });
    }

    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + parseInt(expectedDeliveryDays));

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

    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    offer.orderId = order._id;
    await offer.save();

    if (listing.availability === 'single') {
      listing.status = 'sold';
      listing.soldAt = new Date();
      await listing.save();
    }

    await User.findByIdAndUpdate(sellerId, { $inc: { totalOrders: 1 } });

    const populatedOrder = await populateOrder(order._id).lean();

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
    console.error('Error creating order:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Order already exists for this offer' });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ========== FILE UPLOAD ROUTES ========== //
router.post("/upload/delivery", authenticateMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `${siteUrl}/${file.path.replace(/\\/g, '/')}`,
      path: file.path
    }));

    res.status(200).json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed',
      details: error.message
    });
  }
});

router.get("/upload/delivery/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file'
    });
  }
});

// ========== DELIVERY SYSTEM ========== //
router.put("/:orderId/deliver-with-email", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles = [], attachments = [], isFinalDelivery = true } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_progress'
    }).populate('buyerId', 'username email firstName lastName')
      .populate('sellerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready for delivery' 
      });
    }

    if (!deliveryMessage?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Delivery message is required' 
      });
    }

    if (deliveryFiles.length === 0 && attachments.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one file or attachment is required' 
      });
    }

    const existingDeliveries = await Delivery.countDocuments({ orderId: order._id });
    const revisionNumber = existingDeliveries + 1;

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
      isFinalDelivery,
      revisionNumber,
      status: 'pending_review'
    });

    await delivery.save();

    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage.trim();
    order.deliveryFiles = deliveryFiles;
    order.deliveredAt = new Date();
    order.deliveries = order.deliveries || [];
    order.deliveries.push(delivery._id);
    await order.save();

    const emailSent = await sendDeliveryEmail(order, { message: deliveryMessage, attachments, isFinalDelivery });

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email firstName lastName')
      .populate('sellerId', 'username avatar email firstName lastName')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Order delivered successfully. Buyer has been notified via email.', 
      order: updatedOrder,
      delivery,
      emailSent,
      nextAction: 'Wait for buyer acceptance or revision request',
      reviewPeriod: 'Buyer has 3 days to review the delivery'
    });

  } catch (error) {
    console.error('Error delivering order:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to deliver order',
      details: error.message 
    });
  }
});

router.put("/:orderId/complete-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles = [], attachments = [], isFinalDelivery = true } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_revision'
    }).populate('buyerId', 'username email firstName lastName')
      .populate('sellerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not in revision status' 
      });
    }

    if (!deliveryMessage?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Delivery message is required' 
      });
    }

    if (deliveryFiles.length === 0 && attachments.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one file or attachment is required' 
      });
    }

    const existingDeliveries = await Delivery.countDocuments({ orderId: order._id });
    const revisionNumber = existingDeliveries + 1;

    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage.trim();
    order.deliveryFiles = deliveryFiles;
    order.deliveredAt = new Date();
    order.revisions = (order.revisions || 0) + 1;
    
    if (order.revisionNotes && order.revisionNotes.length > 0) {
      const lastRevision = order.revisionNotes[order.revisionNotes.length - 1];
      if (lastRevision && !lastRevision.completedAt) {
        lastRevision.completedAt = new Date();
      }
    }

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
      isFinalDelivery,
      revisionNumber,
      status: 'pending_review'
    });

    await delivery.save();
    order.deliveries = order.deliveries || [];
    order.deliveries.push(delivery._id);
    await order.save();

    const emailSent = await sendDeliveryEmail(order, { message: deliveryMessage, attachments, isFinalDelivery }, true);

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email firstName lastName')
      .populate('sellerId', 'username avatar email firstName lastName')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Revision completed successfully. Buyer has been notified.', 
      order: updatedOrder,
      delivery,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions,
      emailSent
    });

  } catch (error) {
    console.error('Error completing revision:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete revision',
      details: error.message 
    });
  }
});

router.get("/:orderId/deliveries", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    validateUserAccess(order, userId);

    const deliveries = await Delivery.find({ orderId })
      .populate('sellerId', 'username avatar firstName lastName')
      .sort({ revisionNumber: 1 })
      .lean();

    res.status(200).json({
      success: true,
      deliveries,
      count: deliveries.length,
      orderStatus: order.status,
      revisionsUsed: order.revisions || 0,
      revisionsLeft: order.maxRevisions - (order.revisions || 0)
    });

  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch delivery history',
      details: error.message 
    });
  }
});

router.get("/deliveries/:deliveryId", authenticateMiddleware, async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const delivery = await Delivery.findById(deliveryId)
      .populate('sellerId', 'username avatar firstName lastName')
      .populate('buyerId', 'username avatar firstName lastName')
      .populate({
        path: 'orderId',
        select: 'status amount revisions maxRevisions orderNumber',
        populate: { path: 'listingId', select: 'title' }
      })
      .lean();

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    validateUserAccess(delivery.orderId, userId);

    res.status(200).json({
      success: true,
      delivery,
      userRole: delivery.buyerId._id.toString() === userId.toString() ? 'buyer' : 'seller'
    });

  } catch (error) {
    console.error('Error fetching delivery details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch delivery details',
      details: error.message 
    });
  }
});

// ========== SELLER ORDER MANAGEMENT ========== //
router.put("/:orderId/start-processing", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'paid'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not in paid status' 
      });
    }

    order.status = 'processing';
    order.processingAt = new Date();
    await order.save();

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
    console.error('Error starting order processing:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start order processing',
      details: error.message 
    });
  }
});

router.put("/:orderId/start-work", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: { $in: ['processing', 'paid'] }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready to start work' 
      });
    }

    order.status = 'in_progress';
    order.startedAt = new Date();
    await order.save();

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
    console.error('Error starting work:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start work',
      details: error.message 
    });
  }
});

// Legacy delivery route
router.put("/:orderId/deliver", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      sellerId: userId,
      status: 'in_progress'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not ready for delivery' 
      });
    }

    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage || '';
    order.deliveryFiles = deliveryFiles || [];
    order.deliveredAt = new Date();
    await order.save();

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
    console.error('Error delivering order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to deliver order',
      details: error.message 
    });
  }
});

router.put("/:orderId/cancel-by-seller", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({
      _id: orderId,
      sellerId: userId,
      status: { $in: ['paid', 'processing'] }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or cannot be cancelled at this stage' 
      });
    }

    if (order.stripePaymentIntentId && order.status === 'paid') {
      try {
        await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.sellerNotes = cancelReason ? `Cancelled by seller: ${cancelReason}` : 'Cancelled by seller';
    await order.save();

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
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
});

// ========== BUYER ORDER MANAGEMENT ========== //
router.put("/:orderId/request-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { revisionNotes } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not delivered' 
      });
    }

    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ 
        success: false,
        error: 'Maximum revisions reached' 
      });
    }

    order.status = 'in_revision';
    order.revisions += 1;
    order.revisionNotes = order.revisionNotes || [];
    order.revisionNotes.push({ notes: revisionNotes, requestedAt: new Date() });
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Revision requested successfully', 
      order: await Order.findById(orderId).lean(),
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to request revision',
      details: error.message 
    });
  }
});

router.put("/:orderId/complete", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or not delivered' 
      });
    }

    if (order.stripePaymentIntentId && !order.paymentReleased) {
      try {
        await stripe.paymentIntents.capture(order.stripePaymentIntentId);
        
        const platformFeePercent = 0.15;
        const platformFee = order.amount * platformFeePercent;
        const sellerAmount = order.amount - platformFee;

        order.platformFee = platformFee;
        order.sellerAmount = sellerAmount;
        order.paymentReleased = true;
        order.releaseDate = new Date();
        
        await User.findByIdAndUpdate(order.sellerId, {
          $inc: { 
            balance: sellerAmount,
            totalEarnings: sellerAmount
          }
        });
      } catch (stripeError) {
        console.error('Stripe capture error:', stripeError);
      }
    }

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    await User.findByIdAndUpdate(order.sellerId, { $inc: { completedOrders: 1 } });

    res.status(200).json({ 
      success: true,
      message: 'Order completed successfully', 
      order: await Order.findById(orderId)
        .populate('buyerId', 'username avatar')
        .populate('sellerId', 'username avatar')
        .lean()
    });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete order',
      details: error.message 
    });
  }
});

router.put("/:orderId/cancel-by-buyer", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: { $in: ['pending_payment', 'paid'] }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or cannot be cancelled at this stage' 
      });
    }

    if (order.stripePaymentIntentId && order.status === 'paid') {
      try {
        await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
      }
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.buyerNotes = cancelReason ? `Cancelled by buyer: ${cancelReason}` : 'Cancelled by buyer';
    await order.save();

    res.status(200).json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order: await Order.findById(orderId).lean()
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel order',
      details: error.message 
    });
  }
});

// ========== ORDER QUERIES ========== //
router.get("/my-orders", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const orders = await Order.find({ buyerId: userId })
      .populate('sellerId', 'username avatar sellerRating email firstName lastName')
      .populate('listingId', 'title mediaUrls price category type description tags')
      .populate('offerId', 'amount message requirements expectedDelivery createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      total: orders.length,
      active: orders.filter(o => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'pending_payment').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };

    res.status(200).json({
      success: true,
      orders,
      stats,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

router.get("/my-sales", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const sales = await Order.find({ sellerId: userId })
      .populate('buyerId', 'username avatar email firstName lastName')
      .populate('listingId', 'title mediaUrls price category type')
      .populate('offerId', 'amount message requirements')
      .sort({ createdAt: -1 })
      .lean();

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
      sales,
      stats,
      count: sales.length
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch sales',
      details: error.message 
    });
  }
});

router.get("/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await populateOrder(orderId).lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    const { isBuyer, isSeller } = validateUserAccess(order, userId);

    const deliveries = await Delivery.find({ orderId: order._id })
      .populate('sellerId', 'username avatar')
      .sort({ revisionNumber: 1 })
      .lean();

    res.status(200).json({
      success: true,
      order,
      deliveries,
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
    console.error('Error fetching order details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order details',
      details: error.message 
    });
  }
});

router.get("/:orderId/timeline", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    validateUserAccess(order, userId);

    const timeline = [{ status: 'created', date: order.createdAt, description: 'Order created', icon: '📝' }];
    if (order.paidAt) timeline.push({ status: 'paid', date: order.paidAt, description: 'Payment received', icon: '💳' });
    if (order.processingAt) timeline.push({ status: 'processing', date: order.processingAt, description: 'Seller started processing', icon: '📦' });
    if (order.startedAt) timeline.push({ status: 'in_progress', date: order.startedAt, description: 'Seller started work', icon: '👨‍💻' });
    if (order.deliveredAt) timeline.push({ status: 'delivered', date: order.deliveredAt, description: 'Work delivered', icon: '🚚' });
    
    if (order.revisionNotes) {
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
    
    if (order.completedAt) timeline.push({ status: 'completed', date: order.completedAt, description: 'Order completed', icon: '✅' });
    if (order.cancelledAt) timeline.push({ status: 'cancelled', date: order.cancelledAt, description: 'Order cancelled', icon: '❌' });

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      timeline,
      currentStatus: order.status
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch timeline',
      details: error.message 
    });
  }
});

// ========== ADMIN/UTILITY ROUTES ========== //
router.delete("/delete-all-orders", authenticateMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found to delete",
        deletedCount: 0
      });
    }

    const deleteResult = await Order.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: `Successfully deleted all ${deleteResult.deletedCount} orders`,
      deletedCount: deleteResult.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting all orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete all orders',
      details: error.message 
    });
  }
});

router.get("/stats/seller", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const stats = await Order.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } }
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
      stats,
      totals: totalStats
    });
  } catch (error) {
    console.error('Error fetching seller stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

router.put("/:orderId/status", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const { isBuyer, isSeller } = validateUserAccess(order, userId);

    const validStatuses = [
      'pending_payment', 'paid', 'processing', 'in_progress', 'delivered',
      'in_revision', 'completed', 'cancelled', 'disputed'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: ${status}`,
        validStatuses
      });
    }

    const now = new Date();
    const previousStatus = order.status;
    order.status = status;

    if (status === 'paid' && !order.paidAt) order.paidAt = now;
    if (status === 'processing' && !order.processingAt) order.processingAt = now;
    if (status === 'in_progress' && !order.startedAt) order.startedAt = now;
    if (status === 'delivered' && !order.deliveredAt) order.deliveredAt = now;
    
    if (status === 'completed' && !order.completedAt) {
      order.completedAt = now;
      if (order.stripePaymentIntentId && !order.paymentReleased) {
        try {
          await stripe.paymentIntents.capture(order.stripePaymentIntentId);
          const platformFeePercent = 0.15;
          const platformFee = order.amount * platformFeePercent;
          order.platformFee = platformFee;
          order.sellerAmount = order.amount - platformFee;
          order.paymentReleased = true;
          order.releaseDate = now;
        } catch (stripeError) {
          console.error('Stripe capture error:', stripeError);
        }
      }
    }
    
    if (status === 'cancelled' && !order.cancelledAt) {
      order.cancelledAt = now;
      if (order.stripePaymentIntentId && previousStatus === 'paid') {
        try {
          await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
        }
      }
    }

    await order.save();

    const populatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar email')
      .populate('sellerId', 'username avatar sellerRating email')
      .populate('listingId', 'title mediaUrls price category type')
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
    console.error('Error updating order status:', error);
    
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