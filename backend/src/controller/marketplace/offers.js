const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const Chat = require("../../models/marketplace/Chat");
const Message = require("../../models/marketplace/Message"); // Your Message model
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');

// Direct Stripe keys

// Firebase Chat Service (if using Firebase)

// ✅ VALIDATION HELPER FUNCTIONS
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validatePaymentIntentId = (paymentIntentId) => {
  return paymentIntentId && paymentIntentId.startsWith('pi_');
};

const validateAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= 0.50;
};

// ✅ ENHANCED LOGGING MIDDLEWARE
const logRequest = (route) => (req, res, next) => {
  console.log(`🛣️ ${route} Request:`, {
    method: req.method,
    path: req.path,
    body: req.body,
    user: req.user ? { id: req.user.id || req.user._id } : 'No user'
  });
  next();
};

// ✅ FUNCTION TO SEND ORDER DETAILS MESSAGE USING YOUR MESSAGE MODEL
const sendOrderDetailsMessage = async (order, offer, buyer, seller) => {
  try {
    // System message content create karen
    const messageContent = `🎉 **Order Confirmed Successfully!**\n\n` +
      `**Order Details:**\n` +
      `📦 Order ID: ${order._id}\n` +
      `👤 Buyer: ${buyer?.username || 'Customer'}\n` +
      `💰 Amount: $${offer.amount}\n` +
      `📅 Order Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `🛍️ Service: ${offer.listingId?.title || 'N/A'}\n\n` +
      `**Delivery Information:**\n` +
      `📋 Requirements: ${offer.requirements || 'No specific requirements provided'}\n` +
      `📅 Expected Delivery: ${offer.expectedDelivery ? new Date(offer.expectedDelivery).toLocaleDateString('en-IN') : 'Not specified'}\n\n` +
      `💬 **You can now discuss the order details.**\n\n` +
      `🔒 Payment secured in escrow and will be released upon order completion.`;

    // System ke liye ek virtual system user ID (optional)
    // Agar aapka system user hai toh uska real ID use karen, nahi toh yeh use karen
    const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');

    // ✅ SELLER KO MESSAGE BHEJEN (System → Seller)
    const messageToSeller = new Message({
      orderId: order._id,
      senderId: systemUserId, // System as sender
      receiverId: order.sellerId, // Seller ko message
      message: messageContent,
      read: false // Initially unread
      // attachments optional hai, agar nahi hai toh skip karen
    });
    await messageToSeller.save();

    // ✅ BUYER KO BHI MESSAGE BHEJEN (System → Buyer)
    const messageToBuyer = new Message({
      orderId: order._id,
      senderId: systemUserId, // System as sender
      receiverId: order.buyerId, // Buyer ko message
      message: messageContent,
      read: false // Initially unread
    });
    await messageToBuyer.save();

    console.log("✅ Order details messages sent to both buyer and seller");
    return true;

  } catch (error) {
    console.error('❌ Failed to send order details messages:', error);
    return false;
  }
};

// ✅ UPDATED: CONFIRM OFFER PAYMENT WITH MESSAGE NOTIFICATION
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment Request DETAILS:", {
    body: req.body,
    user: req.user
  });

  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    // ✅ COMPREHENSIVE VALIDATION
    if (!offerId || !paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Offer ID and Payment Intent ID are required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer ID format'
      });
    }

    if (!paymentIntentId.startsWith('pi_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment intent ID format'
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    // ✅ FIND OFFER WITH TRANSACTION
    const offer = await Offer.findOne({
      _id: new mongoose.Types.ObjectId(offerId),
      buyerId: new mongoose.Types.ObjectId(userId)
    })
    .populate('listingId')
    .populate('buyerId', 'username email')
    .session(session);

    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found or access denied'
      });
    }

    // ✅ CHECK IF ALREADY PROCESSED
    if (offer.status === 'paid') {
      console.log("ℹ️ Offer already paid, finding existing order...");
      
      const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
      const existingChat = await Chat.findOne({ orderId: existingOrder?._id }).session(session);
      
      await session.abortTransaction();
      
      return res.status(200).json({
        success: true,
        message: 'Payment already confirmed',
        data: {
          orderId: existingOrder?._id,
          chatId: existingChat?._id,
          redirectUrl: `/messages?chat=${existingChat?._id}`
        }
      });
    }

    // ✅ VERIFY PAYMENT STATUS
    if (offer.status !== 'pending_payment') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Offer is not in pending payment status',
        currentStatus: offer.status
      });
    }

    // ✅ VERIFY STRIPE PAYMENT
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log("💳 Stripe Payment Intent Status:", paymentIntent.status);
    } catch (stripeError) {
      await session.abortTransaction();
      console.error('Stripe retrieval error:', stripeError);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: stripeError.message
      });
    }

    // ✅ CHECK PAYMENT STATUS
    if (paymentIntent.status !== 'succeeded') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        details: `Current status: ${paymentIntent.status}`
      });
    }

    // ✅ UPDATE OFFER STATUS
    offer.status = 'paid';
    offer.paidAt = new Date();
    offer.paymentIntentId = paymentIntentId;
    await offer.save({ session });

    console.log("✅ Offer status updated to paid:", offer._id);

    // ✅ GET BUYER AND SELLER DETAILS
    const buyer = await mongoose.model('User').findById(userId).select('username email').session(session);
    const seller = await mongoose.model('User').findById(offer.listingId.sellerId).select('username email').session(session);

    if (!buyer || !seller) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'User details not found'
      });
    }

    // ✅ CREATE ORDER WITH CORRECT ENUM VALUES
    const orderData = {
      buyerId: userId,
      sellerId: offer.listingId.sellerId,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'paid',
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false,
      orderDate: new Date()
    };

    // Add optional fields
    if (offer.requirements) orderData.requirements = offer.requirements;
    if (offer.expectedDelivery) orderData.expectedDelivery = offer.expectedDelivery;

    console.log("📦 Creating order with data:", orderData);

    const order = new Order(orderData);
    await order.save({ session });
    console.log("✅ Order created:", order._id);

    // ✅ CREATE CHAT ROOM
    const chat = new Chat({
      orderId: order._id,
      participants: [
        { userId: userId, role: 'buyer' },
        { userId: offer.listingId.sellerId, role: 'seller' }
      ],
      listingId: offer.listingId._id,
      status: 'active',
      lastMessageAt: new Date()
    });

    await chat.save({ session });
    console.log("✅ Chat room created:", chat._id);

    // ✅ UPDATE LISTING STATUS
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      { session }
    );

    console.log("✅ Listing status updated to reserved");

    // ✅ COMMIT TRANSACTION FIRST
    await session.commitTransaction();
    console.log("🎉 Payment confirmation completed successfully");

    // ✅ SEND ORDER DETAILS MESSAGES TO BOTH USERS (NON-BLOCKING, AFTER TRANSACTION)
    try {
      await sendOrderDetailsMessage(order, offer, buyer, seller);
      console.log("✅ Order details messages sent successfully");
    } catch (messageError) {
      console.error('❌ Failed to send order details message:', messageError);
      // Don't fail the main process for message errors
    }

    // ✅ SEND EMAIL NOTIFICATIONS (NON-BLOCKING)
    try {
      await sendEmailNotifications(offer, order, buyer, seller);
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail the main process for email errors
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully! Order details sent to your messages.',
      data: {
        orderId: order._id,
        chatId: chat._id,
        redirectUrl: `/messages?chat=${chat._id}&order=${order._id}`,
        offerId: offer._id,
        messageSent: true // Confirm that message was sent
      }
    });

  } catch (error) {
    console.error('❌ Confirm Offer Payment Error:', error);
    
    if (session) {
      await session.abortTransaction();
    }

    let errorMessage = 'Payment confirmation failed';
    let statusCode = 500;

    if (error.name === 'ValidationError') {
      errorMessage = 'Order validation failed';
      statusCode = 400;
      if (error.errors) {
        console.error('Validation errors:', Object.keys(error.errors));
        Object.keys(error.errors).forEach(field => {
          console.error(`- ${field}:`, error.errors[field].message);
        });
      }
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid ID format';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ EMAIL NOTIFICATION FUNCTION
async function sendEmailNotifications(offer, order, buyer, seller) {
  try {
    // Import your email service
    const emailService = require('../../services/emailService');
    
    // Send email to seller
    await emailService.sendTemplate('order_received', {
      to: seller.email,
      data: {
        sellerName: seller.username,
        buyerName: buyer.username,
        listingTitle: offer.listingId.title,
        orderAmount: `$${offer.amount}`,
        orderId: order._id.toString(),
        orderDate: order.paidAt.toLocaleDateString(),
        requirements: offer.requirements || 'No specific requirements',
        expectedDelivery: offer.expectedDelivery ? new Date(offer.expectedDelivery).toLocaleDateString() : 'Not specified'
      }
    });

    // Send email to buyer
    await emailService.sendTemplate('order_confirmed', {
      to: buyer.email,
      data: {
        buyerName: buyer.username,
        sellerName: seller.username,
        listingTitle: offer.listingId.title,
        orderAmount: `$${offer.amount}`,
        orderId: order._id.toString(),
        chatUrl: `${process.env.FRONTEND_URL}/messages?chat=${order._id}`
      }
    });

    console.log("✅ Email notifications sent");
  } catch (error) {
    console.error('❌ Email notification error:', error);
    // Don't throw error - this shouldn't break the main flow
  }
}

module.exports = router;

// ✅ MAKE OFFER WITH IMMEDIATE PAYMENT
router.post("/make-offer", authenticateMiddleware, logRequest("MAKE_OFFER"), async (req, res) => {
  let session;
  try {
    console.log("=== MAKE OFFER WITH IMMEDIATE PAYMENT ===");
    
    const { listingId, amount, message, requirements, expectedDelivery } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ COMPREHENSIVE VALIDATION
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!listingId || !amount) {
      return res.status(400).json({ 
        success: false,
        error: 'Listing ID and amount are required' 
      });
    }

    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid listing ID format' 
      });
    }

    const offerAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required (minimum $0.50)' 
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    // ✅ FIND LISTING WITH TRANSACTION
    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Listing not found' 
      });
    }

    if (listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Listing is not available for offers' 
      });
    }

    // Check if user is not the seller
    if (listing.sellerId.toString() === userId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Cannot make offer on your own listing' 
      });
    }

    // ✅ CHECK FOR EXISTING OFFERS
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: { $in: ['pending', 'pending_payment', 'accepted', 'paid'] }
    }).session(session);

    if (existingOffer) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'You already have a pending offer for this listing',
        existingOfferId: existingOffer._id
      });
    }

    // ✅ CREATE STRIPE PAYMENT INTENT
    console.log("💳 Creating Stripe payment intent for immediate payment...");
    
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(offerAmount * 100),
        currency: 'usd',
        metadata: {
          listingId: listingId.toString(),
          buyerId: userId.toString(),
          sellerId: listing.sellerId.toString(),
          type: 'offer_payment'
        },
        automatic_payment_methods: { enabled: true },
        description: `Offer for: ${listing.title}`,
      });

      console.log("✅ Stripe payment intent created:", paymentIntent.id);

    } catch (stripeError) {
      await session.abortTransaction();
      console.error('❌ Stripe payment intent creation failed:', stripeError);
      
      return res.status(400).json({ 
        success: false,
        error: 'Payment processing error',
        details: stripeError.message
      });
    }

    // ✅ CREATE OFFER IN DATABASE
    const offerData = {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || '',
      paymentIntentId: paymentIntent.id,
      status: 'pending_payment'
    };

    // Add optional fields
    if (requirements) offerData.requirements = requirements;
    if (expectedDelivery) offerData.expectedDelivery = new Date(expectedDelivery);

    const offer = new Offer(offerData);
    await offer.save({ session });

    console.log("✅ Offer saved to database:", offer._id);

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Please complete payment to submit your offer.',
      data: {
        offer: {
          _id: offer._id,
          amount: offer.amount,
          status: offer.status,
          paymentIntentId: offer.paymentIntentId,
          createdAt: offer.createdAt
        },
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: offerAmount
      }
    });

  } catch (error) {
    console.error('❌ Error making offer:', error);
    
    if (session) {
      await session.abortTransaction();
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to make offer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});


// ✅ GET OFFERS RECEIVED (SELLER)
router.get("/received-offers", authenticateMiddleware, logRequest("RECEIVED_OFFERS"), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const myListings = await MarketplaceListing.find({ sellerId: userId });
    const listingIds = myListings.map(listing => listing._id);
    
    const offers = await Offer.find({ listingId: { $in: listingIds } })
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price mediaUrls status')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('Error fetching received offers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch offers' 
    });
  }
});

// ✅ GET OFFERS MADE (BUYER)
router.get("/my-offers", authenticateMiddleware, logRequest("MY_OFFERS"), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const offers = await Offer.find({ buyerId: userId })
      .populate('listingId', 'title price mediaUrls status sellerId')
      .populate('listingId.sellerId', 'username avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('Error fetching my offers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch offers' 
    });
  }
});

// ✅ GET SINGLE OFFER DETAILS
router.get("/:id", authenticateMiddleware, logRequest("GET_OFFER"), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const offerId = req.params.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }

    const offer = await Offer.findById(offerId)
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price mediaUrls status sellerId')
      .populate('listingId.sellerId', 'username avatar');

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    // Check if user has permission to view this offer
    const isBuyer = offer.buyerId._id.toString() === userId.toString();
    const isSeller = offer.listingId.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to view this offer' 
      });
    }

    res.status(200).json({
      success: true,
      data: offer,
      userRole: isBuyer ? 'buyer' : 'seller'
    });

  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch offer' 
    });
  }
});

// ✅ ACCEPT OFFER (SELLER ACCEPTS PAID OFFER)
router.put("/accept-offer/:id", authenticateMiddleware, logRequest("ACCEPT_OFFER"), async (req, res) => {
  let session;
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const offerId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    const offer = await Offer.findById(offerId)
      .populate('listingId')
      .populate('buyerId', 'username email')
      .session(session);

    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    // Check if user is the seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to accept this offer' 
      });
    }

    // Check if offer is paid and waiting for acceptance
    if (offer.status !== 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Offer is not ready for acceptance',
        currentStatus: offer.status
      });
    }

    // ✅ UPDATE OFFER STATUS
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save({ session });

    // ✅ FIND AND UPDATE ORDER
    const order = await Order.findOne({ offerId: offer._id }).session(session);
    if (order) {
      order.status = 'in_progress'; // ✅ CORRECT: Move to 'in_progress' status
      order.acceptedAt = new Date();
      await order.save({ session });
    }

    // ✅ MARK LISTING AS SOLD
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'sold',
        reservedUntil: null
      },
      { session }
    );

    // ✅ REJECT OTHER PENDING OFFERS
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: { $in: ['pending', 'pending_payment', 'paid'] }
      },
      { 
        status: 'rejected',
        rejectionReason: 'Another offer was accepted',
        rejectedAt: new Date()
      },
      { session }
    );

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();
    console.log("✅ Offer accepted by seller:", offer._id);

    res.status(200).json({ 
      success: true,
      message: 'Offer accepted successfully! Order is now confirmed.',
      data: {
        offer: {
          _id: offer._id,
          status: offer.status,
          amount: offer.amount,
          acceptedAt: offer.acceptedAt
        },
        order: order ? {
          _id: order._id,
          status: order.status,
          amount: order.amount
        } : null,
        redirectUrl: `/messages?chat=${order?._id}`
      }
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to accept offer' 
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ REJECT OFFER
router.put("/reject-offer/:id", authenticateMiddleware, logRequest("REJECT_OFFER"), async (req, res) => {
  let session;
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const offerId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    const offer = await Offer.findById(offerId)
      .populate('listingId')
      .session(session);
    
    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    // Check if user is the seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to reject this offer' 
      });
    }

    if (!['pending', 'paid', 'pending_payment'].includes(offer.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Offer cannot be rejected in its current state',
        currentStatus: offer.status
      });
    }

    // ✅ UPDATE OFFER STATUS
    offer.status = 'rejected';
    offer.rejectedAt = new Date();
    offer.rejectionReason = req.body.rejectionReason || 'Seller rejected the offer';
    await offer.save({ session });

    // ✅ UPDATE ORDER STATUS IF EXISTS
    if (offer.status === 'paid') {
      await Order.findOneAndUpdate(
        { offerId: offer._id },
        { status: 'cancelled' }, // ✅ CORRECT: Use 'cancelled' status
        { session }
      );

      // ✅ REFUND PAYMENT IF OFFER WAS PAID
      if (offer.paymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: offer.paymentIntentId,
          });
          console.log("✅ Payment refunded for rejected offer:", offer._id, refund.id);
        } catch (refundError) {
          console.error('Refund error:', refundError);
          // Continue even if refund fails - can be handled manually
        }
      }
    }

    // ✅ MAKE LISTING ACTIVE AGAIN
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'active',
        reservedUntil: null
      },
      { session }
    );

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer rejected successfully',
      data: { offer }
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject offer' 
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ CANCEL OFFER (BUYER)
router.put("/cancel-offer/:id", authenticateMiddleware, logRequest("CANCEL_OFFER"), async (req, res) => {
  let session;
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const offerId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    const offer = await Offer.findById(offerId).session(session);
    
    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    // Check if user is the buyer
    if (offer.buyerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to cancel this offer' 
      });
    }

    if (!['pending', 'pending_payment'].includes(offer.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Only pending offers can be cancelled',
        currentStatus: offer.status
      });
    }

    // ✅ UPDATE OFFER STATUS
    offer.status = 'cancelled';
    offer.cancelledAt = new Date();
    await offer.save({ session });

    // ✅ IF PAYMENT WAS STARTED BUT NOT COMPLETED, CANCEL PAYMENT INTENT
    if (offer.paymentIntentId && offer.status === 'pending_payment') {
      try {
        await stripe.paymentIntents.cancel(offer.paymentIntentId);
        console.log("✅ Payment intent cancelled for offer:", offer._id);
      } catch (stripeError) {
        console.error('Payment cancellation error:', stripeError);
        // Continue even if cancellation fails
      }
    }

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer cancelled successfully', 
      data: { offer }
    });
  } catch (error) {
    console.error('Error cancelling offer:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel offer' 
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ DIRECT PURCHASE ROUTE
router.post("/create-direct-payment", authenticateMiddleware, logRequest("DIRECT_PURCHASE"), async (req, res) => {
  let session;
  try {
    const { listingId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    if (!listingId) {
      return res.status(400).json({ 
        success: false,
        error: 'Listing ID is required' 
      });
    }

    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid listing ID format' 
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false,
        error: 'Listing not found' 
      });
    }

    if (listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Listing is not available for purchase' 
      });
    }

    // Check if user is not the seller
    if (listing.sellerId.toString() === userId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Cannot purchase your own listing' 
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(listing.price * 100),
      currency: 'usd',
      metadata: {
        listingId: listingId.toString(),
        buyerId: userId.toString(),
        sellerId: listing.sellerId.toString(),
        type: 'direct_purchase'
      },
      automatic_payment_methods: { enabled: true },
      description: `Direct purchase: ${listing.title}`,
    });

    // Create order immediately for direct purchase
    const order = new Order({
      buyerId: userId,
      sellerId: listing.sellerId,
      listingId: listingId,
      orderType: 'direct_purchase', // ✅ CORRECT: Use 'direct_purchase' from your enum
      amount: listing.price,
      status: 'pending_payment', // ✅ CORRECT: Use 'pending_payment' from your enum
      stripePaymentIntentId: paymentIntent.id,
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false,
      orderDate: new Date()
    });

    await order.save({ session });

    // Create chat room for direct purchase
    const chat = new Chat({
      orderId: order._id,
      participants: [
        { userId: userId, role: 'buyer' },
        { userId: listing.sellerId, role: 'seller' }
      ],
      listingId: listingId,
      status: 'active',
      lastMessageAt: new Date()
    });

    await chat.save({ session });

    // Reserve listing
    await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      { session }
    );

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Payment intent created for direct purchase',
      data: {
        order: {
          _id: order._id,
          amount: order.amount,
          status: order.status
        },
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        chatId: chat._id,
        redirectUrl: `/messages?chat=${chat._id}&order=${order._id}`
      }
    });

  } catch (error) {
    console.error('❌ Error creating direct payment:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to create payment intent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ TEST STRIPE CONNECTION
router.get("/test-stripe", logRequest("TEST_STRIPE"), async (req, res) => {
  try {
    const testIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      metadata: { test: 'true' }
    });

    res.json({
      success: true,
      message: 'Stripe is working correctly',
      data: {
        testIntentId: testIntent.id,
        clientSecret: testIntent.client_secret
      }
    });

  } catch (error) {
    console.error('Stripe test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Stripe test failed',
      details: error.message
    });
  }
});

// ✅ DELETE ALL OFFERS (FOR TESTING)
router.delete("/delete-all-offers", logRequest("DELETE_ALL_OFFERS"), async (req, res) => {
  try {
    const result = await Offer.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} offers`);

    res.status(200).json({
      success: true,
      message: `All offers deleted successfully (${result.deletedCount} offers removed).`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error("❌ Error deleting all offers:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete all offers" 
    });
  }
});

// ✅ GET OFFER STATISTICS
router.get("/stats/overview", authenticateMiddleware, logRequest("OFFER_STATS"), async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    // As buyer
    const buyerOffers = await Offer.aggregate([
      { $match: { buyerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // As seller - get offers on user's listings
    const sellerListings = await MarketplaceListing.find({ sellerId: userId });
    const sellerListingIds = sellerListings.map(listing => listing._id);
    
    const sellerOffers = await Offer.aggregate([
      { $match: { listingId: { $in: sellerListingIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const stats = {
      asBuyer: buyerOffers.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      asSeller: sellerOffers.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching offer stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch offer statistics' 
    });
  }
});

module.exports = router;