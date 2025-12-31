// routes/order.js - UPDATED WITH COMPLETE BUYER ROUTES
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
const emailService = require("../../../services/emailService");
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');
const Withdrawal = require("../../models/marketplace/Withdrawal");
// ========== FILE UPLOAD CONFIGURATION ========== //
const uploadsDir = 'uploads/deliveries/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📂 Setting destination to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueSuffix}_${safeName}${ext}`;
    console.log('📝 Generated filename:', filename);
    cb(null, filename);
  }
});

// ✅ FIXED: Added ALL ZIP file MIME types and extensions
const allowedMimeTypes = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  
  // Videos
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/avi',
  
  // Documents
  'application/pdf', 
  'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-wav',
  
  // ✅ ZIP and Archive Files - ALL POSSIBLE MIME TYPES
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed',
  'application/x-compressed',
  'multipart/x-zip',
  'application/octet-stream', // Generic binary (often used for ZIP)
  
  // Other archive formats
  'application/x-rar-compressed',
  'application/x-rar',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-bzip2',
  'application/x-tar-gz',
  'application/x-gtar'
];

const allowedExtensions = [
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  
  // Videos
  '.mp4', '.mov', '.avi', '.webm', '.mkv',
  
  // Documents
  '.pdf', '.txt', '.csv',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  
  // Audio
  '.mp3', '.wav', '.ogg', '.m4a',
  
  // ✅ ZIP and Archive Files - ALL POSSIBLE EXTENSIONS
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.tgz',
  '.bz2',
  '.tar.gz',
  '.tar.bz2'
];

const upload = multer({
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 File filter checking:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });

    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // First check by MIME type
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log(`✅ Accepted by MIME type: ${file.mimetype}`);
      cb(null, true);
      return;
    }
    
    // Then check by file extension (for safety)
    if (allowedExtensions.includes(fileExt)) {
      console.log(`✅ Accepted by extension: ${fileExt}`);
      cb(null, true);
      return;
    }
    
    // Special case for ZIP files that might have weird MIME types
    if (fileExt === '.zip') {
      console.log(`✅ Accepted as ZIP file (extension: ${fileExt})`);
      cb(null, true);
      return;
    }
    
    // Reject if not allowed
    console.log(`❌ Rejected file: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${fileExt})`);
    cb(new Error(
      `File type not supported. Allowed: Images (JPG, PNG, GIF), Videos (MP4, MOV), ` +
      `Documents (PDF, DOC, DOCX, XLS, XLSX), Audio (MP3, WAV), Archives (ZIP, RAR, 7Z). ` +
      `Your file: ${file.originalname} (${file.mimetype})`
    ), false);
  }
});

// ========== HELPER FUNCTIONS ========== //
const calculatePlatformFee = (amount) => parseFloat((amount * 0.10).toFixed(2));
const calculateSellerPayout = (amount) => parseFloat((amount - calculatePlatformFee(amount)).toFixed(2));
const validateUserAccess = (order, userId, userRole) => {
  console.log('Validating access:', {
    orderId: order._id,
    userId,
    userRole,
    buyerId: order.buyerId?._id?.toString(),
    sellerId: order.sellerId?._id?.toString()
  });

  // Allow admin access
  if (userRole === 'admin') {
    return true;
  }

  // Check if user is either buyer or seller
  const isBuyer = order.buyerId?._id?.toString() === userId.toString();
  const isSeller = order.sellerId?._id?.toString() === userId.toString();

  console.log('Access check:', { isBuyer, isSeller });

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

// ========== FILE UPLOAD ROUTES ========== //
router.post("/upload/delivery", authenticateMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    const userId = req.user.id || req.user._id || req.user.userId;
    
    console.log('📤 File upload request received:', {
      userId,
      fileCount: files ? files.length : 0,
      fileNames: files ? files.map(f => f.originalname) : []
    });

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    // Log details of each file
    files.forEach(file => {
      console.log('📁 File details:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: formatBytes(file.size),
        path: file.path,
        extension: path.extname(file.originalname)
      });
    });

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const uploadedFiles = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `${siteUrl}/marketplace/orders/upload/delivery/${file.filename}`,
      path: file.path,
      extension: path.extname(file.originalname).toLowerCase()
    }));

    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files for user ${userId}`);

    res.status(200).json({
      success: true,
      message: `Uploaded ${uploadedFiles.length} file(s) successfully`,
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed',
      details: error.message,
      allowedTypes: allowedMimeTypes.join(', ')
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

router.get("/upload/delivery/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    console.log('📥 File download request:', filename);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate headers for different file types
    if (['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      // Try to detect MIME type
      const mime = getMimeType(ext);
      if (mime) {
        res.setHeader('Content-Type', mime);
      }
    }
    
    res.setHeader('Content-Length', stats.size);
    
    console.log('✅ Sending file:', {
      filename,
      path: filePath,
      size: formatBytes(stats.size),
      type: res.getHeader('Content-Type')
    });
    
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('❌ File retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file'
    });
  }
});

// Helper function to get MIME type from extension
function getMimeType(ext) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed'
  };
  return mimeTypes[ext] || 'application/octet-stream';
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

// ======================================================
// ========== BUYER-SPECIFIC ROUTES ==========
// ======================================================

// ========== BUYER ORDER QUERIES ========== //
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
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      disputed: orders.filter(o => o.status === 'disputed').length,
      totalSpent: orders.filter(o => ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(o.status))
        .reduce((sum, order) => sum + (order.amount || 0), 0)
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

// Get buyer dashboard statistics
router.get("/stats/buyer", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const stats = await Order.aggregate([
      { $match: { buyerId: mongoose.Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: "$status", 
          count: { $sum: 1 }, 
          totalAmount: { $sum: "$amount" } 
        } 
      }
    ]);

    const totalStats = {
      totalOrders: await Order.countDocuments({ buyerId: userId }),
      totalSpent: await Order.aggregate([
        { $match: { 
          buyerId: mongoose.Types.ObjectId(userId), 
          status: { $in: ['completed', 'delivered', 'in_progress', 'paid', 'processing'] }
        } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]).then(result => result[0]?.total || 0),
      activeOrders: await Order.countDocuments({ 
        buyerId: userId, 
        status: { $in: ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'] }
      }),
      completedOrders: await Order.countDocuments({ buyerId: userId, status: 'completed' }),
      pendingOrders: await Order.countDocuments({ buyerId: userId, status: 'pending_payment' }),
      cancelledOrders: await Order.countDocuments({ buyerId: userId, status: 'cancelled' })
    };

    res.status(200).json({
      success: true,
      stats,
      totals: totalStats
    });
  } catch (error) {
    console.error('Error fetching buyer stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// ======================================================
// ========== SELLER-SPECIFIC ROUTES ==========
// ======================================================

// ========== SELLER ORDER QUERIES ========== //
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

// ========== SINGLE ORDER DETAILS ROUTE ========== //
// ✅ FIXED: This route should be AFTER special routes like /my-sales
router.get("/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;
    const userRole = req.user.role || 'buyer';

    console.log('Fetching order details for:', { orderId, userId, userRole });

    // ✅ FIXED: First check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID format',
        details: 'Order ID must be a valid MongoDB ObjectId'
      });
    }

    const order = await populateOrder(orderId).lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Validate user access
    let isBuyer = false;
    let isSeller = false;
    
    try {
      const access = validateUserAccess(order, userId, userRole);
      if (access === true) {
        // Admin access
        isBuyer = false;
        isSeller = false;
      } else {
        isBuyer = access.isBuyer;
        isSeller = access.isSeller;
      }
    } catch (accessError) {
      return res.status(403).json({ 
        success: false,
        error: accessError.message 
      });
    }

    const deliveries = await Delivery.find({ orderId: order._id })
      .populate('sellerId', 'username avatar firstName lastName')
      .sort({ revisionNumber: 1 })
      .lean();

    // Get delivery files
    const deliveryFiles = deliveries.flatMap(delivery => 
      delivery.attachments?.map(att => ({
        ...att,
        deliveryId: delivery._id,
        revisionNumber: delivery.revisionNumber,
        deliveredAt: delivery.createdAt
      })) || []
    );

    // Get order timeline
    const timeline = getOrderTimeline(order);

    res.status(200).json({
      success: true,
      order,
      deliveries,
      deliveryFiles,
      timeline,
      userRole: isBuyer ? 'buyer' : (isSeller ? 'seller' : 'admin'),
      permissions: {
        canCompletePayment: isBuyer && order.status === 'pending_payment',
        canRequestRevision: isBuyer && order.status === 'delivered' && order.revisions < order.maxRevisions,
        canCompleteOrder: isBuyer && order.status === 'delivered',
        canCancel: isBuyer && ['pending_payment', 'paid'].includes(order.status),
        canDownloadFiles: isBuyer && ['delivered', 'completed', 'in_revision'].includes(order.status),
        canContactSeller: isBuyer,
        canLeaveReview: isBuyer && order.status === 'completed',
        canViewDeliveryHistory: isBuyer || isSeller,
        canStartProcessing: isSeller && order.status === 'paid',
        canStartWork: isSeller && ['processing', 'paid'].includes(order.status),
        canDeliver: isSeller && order.status === 'in_progress',
        canCompleteRevision: isSeller && order.status === 'in_revision'
      },
      orderSummary: {
        totalAmount: order.amount,
        platformFee: order.platformFee || calculatePlatformFee(order.amount),
        netAmount: order.amount - (order.platformFee || calculatePlatformFee(order.amount)),
        revisionsUsed: order.revisions || 0,
        revisionsLeft: order.maxRevisions - (order.revisions || 0),
        expectedDelivery: order.expectedDelivery,
        daysRemaining: order.expectedDelivery 
          ? Math.ceil((new Date(order.expectedDelivery) - new Date()) / (1000 * 60 * 60 * 24))
          : null
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

// Helper function for timeline
function getOrderTimeline(order) {
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

  return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ========== BUYER ORDER TIMELINE ========== //
router.get("/:orderId/timeline", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    validateUserAccess(order, userId);

    const timeline = getOrderTimeline(order);

    res.status(200).json({
      success: true,
      timeline,
      currentStatus: order.status,
      nextSteps: getNextSteps(order, 'buyer')
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

// Helper function for next steps
function getNextSteps(order, userRole) {
  if (userRole === 'buyer') {
    switch (order.status) {
      case 'pending_payment':
        return ['Complete payment to start order'];
      case 'paid':
        return ['Wait for seller to start processing'];
      case 'processing':
        return ['Seller is preparing your order'];
      case 'in_progress':
        return ['Seller is working on your order'];
      case 'delivered':
        if (order.revisions < order.maxRevisions) {
          return ['Review the delivery', 'Request revisions if needed', 'Complete order if satisfied'];
        } else {
          return ['Review the delivery', 'Complete order if satisfied'];
        }
      case 'in_revision':
        return ['Wait for seller to complete revisions'];
      case 'completed':
        return ['Leave a review for the seller'];
      default:
        return [];
    }
  }
  return [];
}

// ========== BUYER DELIVERY MANAGEMENT ========== //
router.get("/:orderId/deliveries", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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
      revisionsLeft: order.maxRevisions - (order.revisions || 0),
      canRequestRevision: order.status === 'delivered' && order.revisions < order.maxRevisions
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

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid delivery ID' 
      });
    }

    const delivery = await Delivery.findById(deliveryId)
      .populate('sellerId', 'username avatar firstName lastName')
      .populate('buyerId', 'username avatar firstName lastName')
      .populate({
        path: 'orderId',
        select: 'status amount revisions maxRevisions orderNumber listingId buyerId sellerId',
        populate: [
          { path: 'listingId', select: 'title' },
          { path: 'buyerId', select: 'username' },
          { path: 'sellerId', select: 'username' }
        ]
      })
      .lean();

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    validateUserAccess(delivery.orderId, userId);

    // Check if user can download files
    const canDownload = delivery.orderId.status === 'delivered' || 
                       delivery.orderId.status === 'completed' || 
                       delivery.orderId.status === 'in_revision';

    res.status(200).json({
      success: true,
      delivery,
      userRole: delivery.buyerId._id.toString() === userId.toString() ? 'buyer' : 'seller',
      permissions: {
        canDownloadFiles: canDownload,
        canRequestRevision: delivery.orderId.status === 'delivered' && 
                          delivery.orderId.revisions < delivery.orderId.maxRevisions
      }
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

// ========== BUYER ORDER ACTIONS ========== //
router.put("/:orderId/request-revision", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { revisionNotes } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    console.log('📝 Buyer requesting revision for order:', orderId, { userId });

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'delivered'
    }).populate('sellerId', 'username email firstName lastName')
      .populate('buyerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found, not delivered, or you are not the buyer' 
      });
    }

    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ 
        success: false,
        error: 'Maximum revisions reached',
        maxRevisions: order.maxRevisions,
        revisionsUsed: order.revisions
      });
    }

    if (!revisionNotes || revisionNotes.trim().length < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide detailed revision notes (minimum 10 characters)' 
      });
    }

    // Update order status and revision info
    order.status = 'in_revision';
    order.revisions += 1;
    order.revisionNotes = order.revisionNotes || [];
    order.revisionNotes.push({ 
      notes: revisionNotes.trim(), 
      requestedAt: new Date(),
      requestedBy: 'buyer'
    });
    
    await order.save();

    // Send notification email to seller
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
      const orderLink = `${siteUrl}/seller/orders/${orderId}`;

      await emailService.sendRevisionRequestNotification(
        order.sellerId.email,
        order.buyerId.email,
        {
          buyerName: order.buyerId.firstName || order.buyerId.username,
          sellerName: order.sellerId.firstName || order.sellerId.username,
          orderTitle: order.listingId?.title || 'Order',
          orderLink,
          revisionNotes: revisionNotes.trim(),
          revisionsUsed: order.revisions,
          maxRevisions: order.maxRevisions,
          orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
        }
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar')
      .populate('sellerId', 'username avatar')
      .populate('listingId', 'title')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Revision requested successfully', 
      order: updatedOrder,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions,
      nextSteps: 'Wait for seller to complete the revisions'
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    console.log('✅ Buyer completing order:', orderId);

    // Find order - allow completion from multiple statuses
    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: { $in: ['pending', 'processing', 'shipped', 'delivered'] }
    })
    .populate('sellerId', 'username email firstName lastName stripeAccountId stripeAccountStatus')
    .populate('buyerId', 'username email firstName lastName')
    .populate('listingId', 'title price');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or you are not authorized to complete it' 
      });
    }

    let paymentSuccess = false;
    let transferError = null;
    let transferId = null;
    let sellerAmount = 0;
    let platformFee = 0;

    // ✅ Process payment to seller if applicable
    if (order.stripePaymentIntentId && !order.paymentReleased && order.sellerId.stripeAccountId) {
      try {
        console.log('💰 Processing payment release for order:', orderId);
        
        // Calculate amounts
        const platformFeePercent = 0.15; // 15% platform fee
        platformFee = order.amount * platformFeePercent;
        sellerAmount = order.amount - platformFee;

        // 1. Check seller's Stripe account status
        let sellerAccount;
        try {
          sellerAccount = await stripe.accounts.retrieve(order.sellerId.stripeAccountId);
          console.log('Seller Stripe Account:', {
            id: sellerAccount.id,
            charges_enabled: sellerAccount.charges_enabled,
            payouts_enabled: sellerAccount.payouts_enabled,
            capabilities: sellerAccount.capabilities
          });

          // Check transfer capabilities
          const hasTransferCapability = 
            sellerAccount.capabilities?.transfers === 'active' ||
            sellerAccount.capabilities?.crypto_transfers === 'active' ||
            sellerAccount.capabilities?.legacy_payments === 'active';

          if (!hasTransferCapability) {
            console.log('⚠️ Seller account missing transfer capability');
            
            // Try to request transfer capability
            try {
              await stripe.accounts.update(order.sellerId.stripeAccountId, {
                capabilities: {
                  transfers: { requested: true }
                }
              });
              console.log('✅ Requested transfers capability');
            } catch (updateError) {
              console.error('❌ Could not request capability:', updateError.message);
            }
            
            throw new Error('SELLER_ACCOUNT_NEEDS_SETUP');
          }

          // Check if account is fully ready
          if (!sellerAccount.charges_enabled || !sellerAccount.payouts_enabled) {
            console.log('⚠️ Seller account not fully enabled');
            throw new Error('SELLER_ACCOUNT_INCOMPLETE');
          }

        } catch (accountError) {
          console.error('Account check failed:', accountError.message);
          if (accountError.message === 'SELLER_ACCOUNT_NEEDS_SETUP' || 
              accountError.message === 'SELLER_ACCOUNT_INCOMPLETE') {
            throw accountError;
          }
          throw new Error('SELLER_ACCOUNT_UNREACHABLE');
        }

        // 2. Check payment intent status
        let paymentIntent;
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
          
          if (paymentIntent.status !== 'succeeded') {
            await stripe.paymentIntents.capture(order.stripePaymentIntentId);
            console.log('✅ Payment intent captured');
          } else {
            console.log('✅ Payment intent already captured');
          }
        } catch (piError) {
          console.error('Payment intent error:', piError.message);
          throw new Error('PAYMENT_INTENT_ERROR');
        }

        // 3. Create transfer to seller
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(sellerAmount * 100), // Convert to cents
            currency: 'usd',
            destination: order.sellerId.stripeAccountId,
            transfer_group: `ORDER_${orderId}`,
            metadata: {
              orderId: orderId,
              buyerId: order.buyerId._id.toString(),
              sellerId: order.sellerId._id.toString(),
              listingId: order.listingId?._id.toString(),
              amount: order.amount
            }
          });

          paymentSuccess = true;
          transferId = transfer.id;
          console.log('💵 Transfer created:', transfer.id);

        } catch (transferErr) {
          console.error('Transfer creation failed:', transferErr.message);
          transferError = transferErr.message;
          
          // Check specific error types
          if (transferErr.code === 'insufficient_capabilities_for_transfer') {
            throw new Error('SELLER_ACCOUNT_NEEDS_SETUP');
          } else if (transferErr.code === 'account_invalid') {
            throw new Error('SELLER_ACCOUNT_INVALID');
          }
          throw new Error('TRANSFER_FAILED');
        }

      } catch (stripeError) {
        console.error('Payment processing error:', stripeError.message);
        transferError = stripeError.message;
        
        // Update seller status based on error
        if (stripeError.message.includes('SELLER_ACCOUNT')) {
          await User.findByIdAndUpdate(order.sellerId._id, {
            stripeAccountStatus: 'needs_setup',
            lastStripeError: stripeError.message
          });
        }
      }
    } else {
      console.log('ℹ️ Payment processing skipped:', {
        hasPaymentIntent: !!order.stripePaymentIntentId,
        paymentReleased: order.paymentReleased,
        hasStripeAccount: !!order.sellerId.stripeAccountId
      });
    }

    // ✅ Update order with payment results
    order.status = 'completed';
    order.completedAt = new Date();
    
    if (paymentSuccess) {
      order.paymentReleased = true;
      order.releaseDate = new Date();
      order.stripeTransferId = transferId;
      order.platformFee = platformFee;
      order.sellerAmount = sellerAmount;
      order.paymentStatus = 'released';
    } else if (transferError) {
      order.paymentStatus = 'failed';
      order.paymentError = transferError;
    } else {
      order.paymentStatus = 'not_applicable';
    }

    await order.save();

    // ✅ Update seller stats if payment succeeded
    if (paymentSuccess) {
      await User.findByIdAndUpdate(order.sellerId._id, {
        $inc: {
          completedOrders: 1,
          totalEarnings: sellerAmount,
          totalSales: order.amount
        },
        lastPaymentDate: new Date()
      });
    }

    // ✅ Send notifications
    try {
      await sendOrderCompletionNotifications(order, paymentSuccess, transferError);
    } catch (emailError) {
      console.error('Email notification failed:', emailError.message);
    }

    // ✅ Prepare response
    const response = {
      success: true,
      message: paymentSuccess 
        ? 'Order completed! Payment released to seller.' 
        : transferError 
          ? 'Order completed. Payment release failed: ' + transferError
          : 'Order completed successfully.',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
        status: order.status,
        amount: order.amount,
        completedAt: order.completedAt
      },
      payment: {
        released: paymentSuccess,
        success: paymentSuccess,
        error: transferError,
        sellerAmount: sellerAmount,
        platformFee: platformFee
      },
      nextSteps: paymentSuccess 
        ? 'Consider leaving a review for the seller'
        : 'The seller needs to complete their Stripe setup to receive payments'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error completing order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete order',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ Check Seller's Stripe Account Status
router.get("/seller/account-status", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe account connected',
        setupRequired: true
      });
    }

    // Retrieve Stripe account
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    
    // Analyze account status
    const capabilities = account.capabilities || {};
    const requirements = account.requirements || {};
    
    const hasTransferCapability = 
      capabilities.transfers === 'active' ||
      capabilities.crypto_transfers === 'active' ||
      capabilities.legacy_payments === 'active';
    
    const isFullyEnabled = account.charges_enabled && account.payouts_enabled && hasTransferCapability;
    
    const missingRequirements = [
      ...(requirements.currently_due || []),
      ...(requirements.past_due || [])
    ];

    // Generate setup link if needed
    let setupLink = null;
    if (!isFullyEnabled) {
      try {
        const accountLink = await stripe.accountLinks.create({
          account: user.stripeAccountId,
          refresh_url: `${process.env.FRONTEND_URL}/seller/settings/stripe?refresh=true`,
          return_url: `${process.env.FRONTEND_URL}/seller/settings/stripe?success=true`,
          type: 'account_onboarding'
        });
        setupLink = accountLink.url;
      } catch (linkError) {
        console.error('Failed to create account link:', linkError);
      }
    }

    // Update user status
    user.stripeAccountStatus = isFullyEnabled ? 'active' : 'needs_setup';
    await user.save();

    const response = {
      success: true,
      account: {
        id: account.id,
        business_type: account.business_type,
        business_profile: account.business_profile,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        capabilities: capabilities,
        requirements: {
          currently_due: requirements.currently_due || [],
          eventually_due: requirements.eventually_due || [],
          past_due: requirements.past_due || [],
          disabled_reason: requirements.disabled_reason
        }
      },
      status: {
        canReceivePayments: isFullyEnabled,
        missingRequirements: missingRequirements,
        needsAction: missingRequirements.length > 0 || !isFullyEnabled,
        isActive: isFullyEnabled
      },
      setupLink: setupLink,
      message: isFullyEnabled 
        ? 'Your account is ready to receive payments'
        : 'Complete your Stripe account setup to receive payments'
    };

    res.json(response);

  } catch (error) {
    console.error('Error checking Stripe account:', error);
    
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      // Account doesn't exist or was deleted
      await User.findByIdAndUpdate(req.user.id, {
        stripeAccountId: null,
        stripeAccountStatus: 'disconnected'
      });
      
      return res.status(404).json({
        success: false,
        error: 'Stripe account not found. Please reconnect.',
        reconnectRequired: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to check Stripe account status',
      details: error.message
    });
  }
});
router.put("/:orderId/cancel-by-buyer", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    console.log('❌ Buyer cancelling order:', orderId);

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: { $in: ['pending_payment', 'paid'] }
    }).populate('sellerId', 'username email firstName lastName')
      .populate('buyerId', 'username email firstName lastName');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or cannot be cancelled at this stage' 
      });
    }

    // Process refund if payment was made
    if (order.stripePaymentIntentId && order.status === 'paid') {
      try {
        console.log('💸 Processing refund for order:', orderId);
        const refund = await stripe.refunds.create({ 
          payment_intent: order.stripePaymentIntentId,
          reason: 'requested_by_customer'
        });
        console.log('✅ Refund processed:', refund.id);
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        // Continue with cancellation even if refund fails
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.buyerNotes = cancelReason ? `Cancelled by buyer: ${cancelReason}` : 'Cancelled by buyer';
    order.cancelReason = cancelReason;
    order.cancelledBy = 'buyer';
    await order.save();

    // Update related offer if exists
    if (order.offerId) {
      await Offer.findByIdAndUpdate(order.offerId, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'buyer'
      });
    }

    // Send cancellation email to seller
    try {
      const siteName = process.env.SITE_NAME || 'WeCinema';
      const siteUrl = process.env.SITE_URL || 'http://localhost:5173';

      await emailService.sendOrderCancellationNotification(
        order.sellerId.email,
        order.buyerId.email,
        {
          buyerName: order.buyerId.firstName || order.buyerId.username,
          sellerName: order.sellerId.firstName || order.sellerId.username,
          orderTitle: order.listingId?.title || 'Order',
          orderAmount: order.amount,
          cancelReason: cancelReason || 'No reason provided',
          cancelledBy: 'buyer',
          orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
        }
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
    }

    const updatedOrder = await Order.findById(orderId)
      .populate('buyerId', 'username avatar')
      .populate('sellerId', 'username avatar')
      .lean();

    res.status(200).json({ 
      success: true,
      message: 'Order cancelled successfully', 
      order: updatedOrder,
      refundProcessed: order.status === 'paid',
      nextSteps: 'Consider browsing other listings'
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

// ========== BUYER FILE DOWNLOAD ========== //
router.get("/:orderId/download-files", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: { $in: ['delivered', 'completed', 'in_revision'] }
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found or files not available for download' 
      });
    }

    // Get all deliveries for this order
    const deliveries = await Delivery.find({ orderId: order._id })
      .sort({ revisionNumber: 1 });

    // Collect all files from deliveries
    const allFiles = deliveries.flatMap(delivery => 
      delivery.attachments?.map(att => ({
        ...att.toObject(),
        deliveryId: delivery._id,
        revisionNumber: delivery.revisionNumber,
        deliveredAt: delivery.createdAt,
        isFinalDelivery: delivery.isFinalDelivery
      })) || []
    );

    // Add direct delivery files from order
    if (order.deliveryFiles && order.deliveryFiles.length > 0) {
      order.deliveryFiles.forEach(file => {
        allFiles.push({
          filename: file,
          originalName: file,
          mimeType: 'application/octet-stream',
          size: 0,
          url: `${process.env.SITE_URL || 'http://localhost:3000'}/marketplace/orders/upload/delivery/${file}`,
          deliveryId: order._id,
          revisionNumber: 0,
          deliveredAt: order.deliveredAt,
          isFinalDelivery: true
        });
      });
    }

    if (allFiles.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No files found for this order' 
      });
    }

    res.status(200).json({
      success: true,
      files: allFiles,
      count: allFiles.length,
      orderStatus: order.status,
      totalRevisions: deliveries.length,
      canRequestRevision: order.status === 'delivered' && order.revisions < order.maxRevisions
    });
  } catch (error) {
    console.error('Error fetching download files:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch download files',
      details: error.message 
    });
  }
});

// ========== BUYER ORDER SUMMARY ========== //
router.get("/:orderId/summary", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId
    }).populate('sellerId', 'username avatar sellerRating email firstName lastName')
      .populate('listingId', 'title mediaUrls price category type')
      .populate('offerId', 'amount message requirements expectedDelivery')
      .lean();

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Get deliveries count
    const deliveriesCount = await Delivery.countDocuments({ orderId: order._id });

    // Calculate time remaining
    let timeRemaining = null;
    let isOverdue = false;
    
    if (order.expectedDelivery) {
      const expectedDate = new Date(order.expectedDelivery);
      const currentDate = new Date();
      timeRemaining = Math.ceil((expectedDate - currentDate) / (1000 * 60 * 60 * 24));
      isOverdue = timeRemaining < 0;
    }

    const summary = {
      orderInfo: {
        id: order._id,
        orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
        status: order.status,
        createdAt: order.createdAt,
        orderType: order.orderType
      },
      financial: {
        totalAmount: order.amount,
        platformFee: order.platformFee || calculatePlatformFee(order.amount),
        netAmount: order.amount - (order.platformFee || calculatePlatformFee(order.amount)),
        paymentStatus: order.paymentReleased ? 'released_to_seller' : 'held_by_platform',
        paymentReleased: order.paymentReleased,
        releaseDate: order.releaseDate
      },
      timeline: {
        revisionsUsed: order.revisions || 0,
        revisionsLeft: order.maxRevisions - (order.revisions || 0),
        deliveriesCount: deliveriesCount,
        expectedDelivery: order.expectedDelivery,
        timeRemaining: timeRemaining,
        isOverdue: isOverdue,
        deliveredAt: order.deliveredAt,
        completedAt: order.completedAt
      },
      listing: order.listingId ? {
        title: order.listingId.title,
        category: order.listingId.category,
        type: order.listingId.type,
        price: order.listingId.price
      } : null,
      seller: order.sellerId ? {
        username: order.sellerId.username,
        rating: order.sellerId.sellerRating,
        name: order.sellerId.firstName ? `${order.sellerId.firstName} ${order.sellerId.lastName || ''}`.trim() : null
      } : null,
      offer: order.offerId ? {
        originalAmount: order.offerId.amount,
        message: order.offerId.message,
        expectedDelivery: order.offerId.expectedDelivery
      } : null
    };

    res.status(200).json({
      success: true,
      summary,
      nextActions: getBuyerNextActions(order.status, order.revisions || 0, order.maxRevisions)
    });
  } catch (error) {
    console.error('Error fetching order summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch order summary',
      details: error.message 
    });
  }
});

function getBuyerNextActions(status, revisionsUsed, maxRevisions) {
  const actions = [];
  
  switch (status) {
    case 'pending_payment':
      actions.push({ action: 'complete_payment', label: 'Complete Payment', priority: 'high' });
      actions.push({ action: 'cancel_order', label: 'Cancel Order', priority: 'low' });
      break;
    case 'paid':
      actions.push({ action: 'contact_seller', label: 'Contact Seller', priority: 'medium' });
      break;
    case 'processing':
    case 'in_progress':
      actions.push({ action: 'contact_seller', label: 'Contact Seller', priority: 'medium' });
      break;
    case 'delivered':
      if (revisionsUsed < maxRevisions) {
        actions.push({ action: 'request_revision', label: 'Request Revision', priority: 'high' });
      }
      actions.push({ action: 'complete_order', label: 'Complete Order', priority: 'high' });
      actions.push({ action: 'download_files', label: 'Download Files', priority: 'medium' });
      actions.push({ action: 'contact_seller', label: 'Contact Seller', priority: 'low' });
      break;
    case 'in_revision':
      actions.push({ action: 'contact_seller', label: 'Contact Seller', priority: 'medium' });
      actions.push({ action: 'download_files', label: 'Download Previous Files', priority: 'low' });
      break;
    case 'completed':
      actions.push({ action: 'leave_review', label: 'Leave Review', priority: 'high' });
      actions.push({ action: 'download_files', label: 'Download Files', priority: 'medium' });
      break;
    case 'cancelled':
      actions.push({ action: 'browse_listings', label: 'Browse Listings', priority: 'medium' });
      break;
  }
  
  return actions;
}

// ========== SELLER ORDER MANAGEMENT ========== //
router.put("/:orderId/start-processing", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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

// ========== DELIVERY SYSTEM ========== //
router.put("/:orderId/deliver-with-email", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles = [], attachments = [], isFinalDelivery = true } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    console.log('📤 Starting delivery for order:', orderId, {
      messageLength: deliveryMessage?.length,
      attachmentsCount: attachments?.length,
      filesCount: deliveryFiles?.length,
      userId
    });

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

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

    console.log('🔄 Completing revision for order:', orderId);

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

// Legacy delivery route
router.put("/:orderId/deliver", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { deliveryMessage, deliveryFiles } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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

// ========== SELLER STATISTICS ========== //
router.get("/stats/seller", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    // Define all possible order statuses
    const allStatuses = [
      'pending', 'paid', 'processing', 'in_progress', 
      'delivered', 'completed', 'cancelled', 'refunded',
      'in_revision', 'disputed'
    ];

    // Get counts and totals for each status
    const statsByStatus = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId) 
        } 
      },
      { 
        $group: { 
          _id: "$status", 
          count: { $sum: 1 }, 
          totalAmount: { $sum: "$amount" } 
        } 
      },
      {
        $sort: { count: -1 } // Sort by highest count first
      }
    ]);

    // Ensure all statuses are included (even with zero count)
    const completeStats = allStatuses.map(status => {
      const found = statsByStatus.find(s => s._id === status);
      return found || {
        _id: status,
        count: 0,
        totalAmount: 0
      };
    });

    // Calculate total statistics
    const totalStats = await Order.aggregate([
      { 
        $match: { 
          sellerId: mongoose.Types.ObjectId(userId) 
        } 
      },
      {
        $facet: {
          // Total summary
          totalSummary: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
                avgOrderValue: { $avg: "$amount" }
              }
            }
          ],
          // Revenue breakdown by status categories
          revenueBreakdown: [
            {
              $group: {
                _id: "$status",
                totalAmount: { $sum: "$amount" }
              }
            }
          ],
          // Completed orders revenue
          completedRevenue: [
            { 
              $match: { 
                status: 'completed' 
              } 
            },
            { 
              $group: { 
                _id: null, 
                total: { $sum: "$amount" },
                count: { $sum: 1 }
              } 
            }
          ],
          // Pending/active orders revenue (orders not completed/cancelled/refunded)
          pendingRevenue: [
            { 
              $match: { 
                status: { 
                  $in: ['pending', 'paid', 'processing', 'in_progress', 
                       'delivered', 'in_revision', 'disputed'] 
                }
              } 
            },
            { 
              $group: { 
                _id: null, 
                total: { $sum: "$amount" },
                count: { $sum: 1 }
              } 
            }
          ],
          // This month's revenue
          thisMonthRevenue: [
            { 
              $match: { 
                status: 'completed',
                createdAt: { 
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
              } 
            },
            { 
              $group: { 
                _id: null, 
                total: { $sum: "$amount" },
                count: { $sum: 1 }
              } 
            }
          ]
        }
      }
    ]);

    const summary = totalStats[0];
    
    // Prepare final response
    const response = {
      success: true,
      statsByStatus: completeStats,
      totals: {
        totalOrders: summary.totalSummary[0]?.totalOrders || 0,
        totalRevenue: summary.totalSummary[0]?.totalAmount || 0,
        averageOrderValue: summary.totalSummary[0]?.avgOrderValue || 0,
        completedOrders: {
          count: summary.completedRevenue[0]?.count || 0,
          revenue: summary.completedRevenue[0]?.total || 0
        },
        pendingOrders: {
          count: summary.pendingRevenue[0]?.count || 0,
          revenue: summary.pendingRevenue[0]?.total || 0
        },
        thisMonthRevenue: summary.thisMonthRevenue[0]?.total || 0
      },
      breakdown: summary.revenueBreakdown.reduce((acc, item) => {
        acc[item._id] = item.totalAmount;
        return acc;
      }, {})
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching seller stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// ======================================================
// ========== ADMIN/UTILITY ROUTES ==========
// ======================================================

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

router.put("/:orderId/status", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ FIXED: Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID' 
      });
    }

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
// Add these routes to routes/order.js - EARNINGS AND WITHDRAWAL ROUTES

// ======================================================
// ========== EARNINGS & WITHDRAWAL ROUTES ==========
// ======================================================

// ✅ GET EARNINGS SUMMARY
router.get("/earnings/summary", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    // Get all completed orders for this seller
    const completedOrders = await Order.find({
      sellerId: userId,
      status: 'completed',
      paymentReleased: true
    }).select('amount platformFee sellerAmount completedAt');

    // Calculate totals
    const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.sellerAmount || order.amount), 0);
    const totalWithdrawn = await Withdrawal.aggregate([
      { $match: { sellerId: mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);

    // Get pending orders (delivered but not completed)
    const pendingOrders = await Order.find({
      sellerId: userId,
      status: { $in: ['delivered', 'in_progress', 'in_revision'] }
    }).select('amount');

    const pendingBalance = pendingOrders.reduce((sum, order) => sum + order.amount, 0);
    const availableBalance = totalEarnings - totalWithdrawn;

    // Get this month's earnings
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthEarnings = completedOrders
      .filter(order => new Date(order.completedAt) >= startOfMonth)
      .reduce((sum, order) => sum + (order.sellerAmount || order.amount), 0);

    // Get last withdrawal
    const lastWithdrawal = await Withdrawal.findOne({ 
      sellerId: userId, 
      status: 'completed' 
    }).sort({ createdAt: -1 });

    // Calculate next payout date (assuming weekly payouts on Fridays)
    const today = new Date();
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
    nextFriday.setHours(0, 0, 0, 0);

    res.status(200).json({
      success: true,
      data: {
        availableBalance,
        pendingBalance,
        totalEarnings,
        totalWithdrawn,
        walletBalance: availableBalance,
        lastWithdrawal: lastWithdrawal ? {
          amount: lastWithdrawal.amount,
          date: lastWithdrawal.completedAt || lastWithdrawal.createdAt,
          status: lastWithdrawal.status
        } : null,
        nextPayoutDate: nextFriday.toISOString(),
        currency: 'inr',
        thisMonthEarnings,
        completedOrdersCount: completedOrders.length,
        pendingOrdersCount: pendingOrders.length
      }
    });
  } catch (error) {
    console.error('Error fetching earnings summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings summary',
      details: error.message
    });
  }
});

// ✅ GET EARNINGS BY PERIOD
router.get("/earnings/period/:period", authenticateMiddleware, async (req, res) => {
  try {
    const { period } = req.params; // month, week, year
    const userId = req.user.id || req.user._id || req.user.userId;

    let startDate;
    const endDate = new Date();
    
    switch (period) {
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        break;
      case 'week':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear() - 1, 0, 1);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid period. Use: month, week, or year'
        });
    }

    // Get earnings for the period
    const earnings = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          paymentReleased: true,
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$completedAt" },
            year: { $year: "$completedAt" }
          },
          earnings: { $sum: "$sellerAmount" },
          orders: { $sum: 1 },
          averageOrder: { $avg: "$sellerAmount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Format response
    const formattedEarnings = earnings.map(item => ({
      period: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
      earnings: item.earnings,
      orders: item.orders,
      averageOrder: item.averageOrder
    }));

    res.status(200).json({
      success: true,
      data: formattedEarnings,
      period,
      startDate,
      endDate,
      total: formattedEarnings.reduce((sum, item) => sum + item.earnings, 0),
      totalOrders: formattedEarnings.reduce((sum, item) => sum + item.orders, 0)
    });
  } catch (error) {
    console.error('Error fetching earnings by period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch earnings data',
      details: error.message
    });
  }
});

// ✅ GET AVAILABLE BALANCE
router.get("/earnings/available-balance", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    // Get completed orders total
    const completedEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$sellerAmount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

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
          total: { $sum: "$amount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

    // Get pending balance (from active orders)
    const pendingBalance = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: { $in: ['delivered', 'in_progress', 'in_revision'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

    const availableBalance = completedEarnings - totalWithdrawn;

    res.status(200).json({
      success: true,
      data: {
        availableBalance,
        pendingBalance,
        totalEarnings: completedEarnings,
        totalWithdrawn,
        currency: 'inr'
      }
    });
  } catch (error) {
    console.error('Error fetching available balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available balance',
      details: error.message
    });
  }
});

// ======================================================
// ========== WITHDRAWAL ROUTES ==========
// ======================================================

// ✅ GET WITHDRAWAL HISTORY
router.get("/payments/withdrawals", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { sellerId: userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get withdrawals with pagination
    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Withdrawal.countDocuments(query);

    // Get balance info
    const completedEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$sellerAmount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

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
          total: { $sum: "$amount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

    const availableBalance = completedEarnings - totalWithdrawn;

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
          pendingBalance: 0, // You might want to calculate this
          totalEarnings: completedEarnings,
          totalWithdrawn
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

// ✅ REQUEST WITHDRAWAL
router.post("/withdrawals", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid withdrawal amount is required'
      });
    }

    // Get user's stripe account
    const user = await User.findById(userId);
    if (!user || !user.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account not connected',
        stripeSetupRequired: true
      });
    }

    // Check if stripe account is active
    if (user.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Stripe account is not active. Please complete your setup.',
        stripeSetupRequired: true
      });
    }

    // Calculate available balance
    const completedEarnings = await Order.aggregate([
      {
        $match: {
          sellerId: mongoose.Types.ObjectId(userId),
          status: 'completed',
          paymentReleased: true
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$sellerAmount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

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
          total: { $sum: "$amount" }
        }
      }
    ]).then(result => result[0]?.total || 0);

    const availableBalance = completedEarnings - totalWithdrawn;

    // Check if sufficient balance
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance for withdrawal',
        availableBalance,
        requestedAmount: amount
      });
    }

    // Check minimum withdrawal amount (500 cents = $5.00)
    if (amount < 500) {
      return res.status(400).json({
        success: false,
        error: 'Minimum withdrawal amount is $5.00 (500 cents)',
        minimumAmount: 500
      });
    }

    // Check for pending withdrawals
    const pendingWithdrawals = await Withdrawal.countDocuments({
      sellerId: userId,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingWithdrawals > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have pending withdrawals. Please wait for them to process.',
        pendingCount: pendingWithdrawals
      });
    }

    // Create withdrawal record
    const withdrawal = new Withdrawal({
      sellerId: userId,
      amount,
      status: 'pending',
      stripeAccountId: user.stripeAccountId,
      currency: 'inr',
      description: `Withdrawal of ₹${(amount / 100).toFixed(2)}`
    });

    await withdrawal.save();

    // For development/testing, you might want to auto-complete
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      // Auto-complete for testing
      setTimeout(async () => {
        try {
          withdrawal.status = 'completed';
          withdrawal.completedAt = new Date();
          withdrawal.stripeTransferId = `tr_mock_${Date.now()}`;
          withdrawal.stripePayoutId = `po_mock_${Date.now()}`;
          await withdrawal.save();
        } catch (err) {
          console.error('Auto-complete error:', err);
        }
      }, 2000);
    }

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        description: withdrawal.description
      },
      newBalance: availableBalance - amount
    });

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal request',
      details: error.message
    });
  }
});

// ✅ GET SPECIFIC WITHDRAWAL
router.get("/withdrawals/:withdrawalId", authenticateMiddleware, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal ID'
      });
    }

    const withdrawal = await Withdrawal.findOne({
      _id: withdrawalId,
      sellerId: userId
    }).lean();

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
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal details',
      details: error.message
    });
  }
});

// ✅ CANCEL WITHDRAWAL
router.put("/withdrawals/:withdrawalId/cancel", authenticateMiddleware, async (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(withdrawalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal ID'
      });
    }

    const withdrawal = await Withdrawal.findOne({
      _id: withdrawalId,
      sellerId: userId,
      status: 'pending'
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal not found or cannot be cancelled'
      });
    }

    // Only allow cancellation if not already processing/completed
    if (!['pending', 'created'].includes(withdrawal.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel withdrawal in ${withdrawal.status} status`
      });
    }

    withdrawal.status = 'cancelled';
    withdrawal.cancelledAt = new Date();
    withdrawal.cancelledBy = 'seller';
    await withdrawal.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal cancelled successfully',
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        cancelledAt: withdrawal.cancelledAt
      }
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

// ======================================================
// ========== STRIPE ROUTES ==========
// ======================================================

// ✅ GET STRIPE STATUS
router.get("/stripe/status", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let stripeStatus = {
      connected: !!user.stripeAccountId,
      chargesEnabled: false,
      detailsSubmitted: false,
      status: 'not_connected',
      accountId: user.stripeAccountId,
      name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      email: user.email
    };

    // If stripe account exists, get details
    if (user.stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        
        stripeStatus = {
          ...stripeStatus,
          chargesEnabled: account.charges_enabled || false,
          detailsSubmitted: account.details_submitted || false,
          payoutsEnabled: account.payouts_enabled || false,
          status: account.charges_enabled && account.payouts_enabled ? 'active' : 'pending',
          country: account.country || 'US',
          capabilities: account.capabilities || {}
        };

        // Get balance if account is active
        if (account.charges_enabled && account.payouts_enabled) {
          try {
            const balance = await stripe.balance.retrieve({
              stripeAccount: user.stripeAccountId
            });

            const availableBalance = balance.available.reduce((sum, item) => sum + item.amount, 0);
            const pendingBalance = balance.pending.reduce((sum, item) => sum + item.amount, 0);

            stripeStatus.balance = availableBalance + pendingBalance;
            stripeStatus.availableBalance = availableBalance;
            stripeStatus.pendingBalance = pendingBalance;
          } catch (balanceError) {
            console.warn('Could not fetch balance:', balanceError.message);
          }
        }

      } catch (stripeError) {
        console.error('Stripe account retrieval error:', stripeError.message);
        
        // If account doesn't exist on Stripe, reset user's stripe info
        if (stripeError.code === 'resource_missing') {
          user.stripeAccountId = null;
          user.stripeAccountStatus = 'disconnected';
          await user.save();
          
          stripeStatus.connected = false;
          stripeStatus.status = 'not_connected';
        }
      }
    }

    // Update user's stripe status
    if (user.stripeAccountStatus !== stripeStatus.status) {
      user.stripeAccountStatus = stripeStatus.status;
      await user.save();
    }

    res.status(200).json({
      success: true,
      ...stripeStatus
    });

  } catch (error) {
    console.error('Error checking Stripe status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Stripe status',
      details: error.message
    });
  }
});

// ✅ CREATE STRIPE ACCOUNT LINK
router.post("/stripe/create-account-link", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let stripeAccountId = user.stripeAccountId;

    // Create new Stripe account if not exists
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: 'individual',
        individual: {
          email: user.email,
          first_name: user.firstName || user.username,
          last_name: user.lastName || '',
          phone: user.phone || '',
          address: {
            line1: user.address?.street || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            postal_code: user.address?.zipCode || '',
            country: 'US'
          }
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'manual'
            }
          }
        }
      });

      stripeAccountId = account.id;
      
      // Update user with new Stripe account ID
      user.stripeAccountId = stripeAccountId;
      user.stripeAccountStatus = 'pending';
      await user.save();
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/settings/stripe?refresh=true`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller/dashboard?stripe=success`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });

    res.status(200).json({
      success: true,
      url: accountLink.url,
      accountId: stripeAccountId,
      expires_at: accountLink.expires_at,
      message: 'Account link created successfully'
    });

  } catch (error) {
    console.error('Error creating Stripe account link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create Stripe account link',
      details: error.message
    });
  }
});

// ✅ GET STRIPE BALANCE
router.get("/stripe/balance", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;

    const user = await User.findById(userId);
    if (!user || !user.stripeAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Stripe account not connected',
        stripeSetupRequired: true
      });
    }

    // Check if account is active
    if (user.stripeAccountStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Stripe account is not active',
        stripeSetupRequired: true
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripeAccountId
    });

    // Calculate totals
    const available = balance.available.reduce((sum, item) => sum + item.amount, 0);
    const pending = balance.pending.reduce((sum, item) => sum + item.amount, 0);
    const total = available + pending;

    res.status(200).json({
      success: true,
      balance: {
        available,
        pending,
        total,
        currency: 'usd',
        breakdown: {
          available: balance.available,
          pending: balance.pending
        }
      },
      accountStatus: user.stripeAccountStatus
    });

  } catch (error) {
    console.error('Error fetching Stripe balance:', error);
    
    if (error.code === 'account_invalid') {
      return res.status(400).json({
        success: false,
        error: 'Stripe account is invalid. Please reconnect.',
        reconnectRequired: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stripe balance',
      details: error.message
    });
  }
});

// ======================================================
// ========== HELPER FUNCTIONS ==========
// ======================================================

// Helper function for order completion notifications
async function sendOrderCompletionNotifications(order, paymentSuccess, paymentError) {
  try {
    const siteName = process.env.SITE_NAME || 'WeCinema';
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
    const orderLink = `${siteUrl}/orders/${order._id}`;

    // Prepare email content for buyer
    const buyerEmailContent = {
      buyerName: order.buyerId.firstName || order.buyerId.username,
      sellerName: order.sellerId.firstName || order.sellerId.username,
      orderTitle: order.listingId?.title || 'Your Order',
      orderAmount: order.amount,
      orderLink,
      paymentStatus: paymentSuccess ? 'completed' : 'failed',
      paymentError: paymentError,
      orderNumber: order.orderNumber || order._id.toString().slice(-8).toUpperCase()
    };

    // Prepare email content for seller
    const sellerEmailContent = {
      ...buyerEmailContent,
      sellerPayout: paymentSuccess ? order.sellerAmount : 0,
      platformFee: order.platformFee || 0,
      netAmount: order.sellerAmount || 0
    };

    // Send emails
    await Promise.all([
      emailService.sendOrderCompletionNotification(
        order.buyerId.email,
        buyerEmailContent
      ),
      emailService.sendSellerPayoutNotification(
        order.sellerId.email,
        sellerEmailContent
      )
    ]);

    return true;
  } catch (error) {
    console.error('Order completion email error:', error);
    return false;
  }
}

// ======================================================
// ========== ADDITIONAL ROUTES FROM API ==========
// ======================================================

// ✅ TEST API CONNECTION
router.get("/test", async (req, res) => {
  try {
    const orderCount = await Order.countDocuments();
    const withdrawalCount = await Withdrawal.countDocuments();
    
    res.status(200).json({
      success: true,
      message: 'Marketplace API is working',
      timestamp: new Date().toISOString(),
      database: {
        orders: orderCount,
        withdrawals: withdrawalCount,
        connected: mongoose.connection.readyState === 1
      },
      endpoints: {
        earnings: ['/earnings/summary', '/earnings/period/:period', '/earnings/available-balance'],
        withdrawals: ['/payments/withdrawals', '/withdrawals', '/withdrawals/:id', '/withdrawals/:id/cancel'],
        stripe: ['/stripe/status', '/stripe/create-account-link', '/stripe/balance'],
        orders: ['/my-orders', '/my-sales', '/:id', '/:id/complete', '/:id/request-revision', '/:id/deliver']
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'API test failed',
      details: error.message
    });
  }
});

// ✅ CHECK AUTH STATUS (simplified)
router.get("/check-auth", authenticateMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.id || req.user._id || req.user.userId,
      role: req.user.role || 'user',
      email: req.user.email
    }
  });
});

// ======================================================
// ========== MARKETPLACE API ROUTES ==========
// ======================================================

// ✅ Get all listings (public)
router.get("/marketplace/listings", async (req, res) => {
  try {
    const { page = 1, limit = 20, category, status = 'active' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { status };
    if (category) query.category = category;

    const listings = await MarketplaceListing.find(query)
      .populate('sellerId', 'username avatar sellerRating totalOrders')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MarketplaceListing.countDocuments(query);

    res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings',
      details: error.message
    });
  }
});

// ✅ Get my listings (seller)
router.get("/marketplace/listings/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { sellerId: userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const listings = await MarketplaceListing.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MarketplaceListing.countDocuments(query);

    res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching my listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your listings',
      details: error.message
    });
  }
});

// Add this to the top of the file with other imports
// const Withdrawal = require("../../models/marketplace/Withdrawal");

module.exports = router;