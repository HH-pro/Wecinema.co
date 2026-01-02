// routes/offerRoutes.js - Optimized Version with Payment Confirmation Redirect
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const Chat = require("../../models/marketplace/Chat");
const Message = require("../../models/marketplace/messages");
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../../../services/emailService');
const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  } catch (error) {
    console.log('Firebase initialization warning:', error.message);
  }
}

// ✅ HELPER FUNCTIONS
const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const validateAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= 0.50;
};

// ✅ FIREBASE CHAT ROOM CREATION
const createFirebaseChatRoom = async (order, buyer, seller) => {
  try {
    if (!admin.apps.length) return null;
    
    const db = admin.firestore();
    const chatRoomId = `order_${order._id}_${Date.now()}`;
    
    const chatRoomData = {
      orderId: order._id.toString(),
      participants: {
        [buyer._id.toString()]: {
          id: buyer._id.toString(),
          name: buyer.username,
          email: buyer.email,
          role: 'buyer',
          avatar: buyer.avatar || null
        },
        [seller._id.toString()]: {
          id: seller._id.toString(),
          name: seller.username,
          email: seller.email,
          role: 'seller',
          avatar: seller.avatar || null
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      status: 'active',
      orderDetails: {
        orderId: order._id.toString(),
        amount: order.amount,
        listingTitle: order.listingId?.title || 'Order',
        listingId: order.listingId?._id?.toString(),
        requirements: order.requirements || ''
      }
    };
    
    await db.collection('chatRooms').doc(chatRoomId).set(chatRoomData);
    
    // Add initial system message
    await db.collection('chatRooms').doc(chatRoomId).collection('messages').add({
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      message: `🎉 **Order #${order._id.toString().slice(-8).toUpperCase()} has been placed!**`,
      timestamp: new Date().toISOString(),
      type: 'system',
      readBy: []
    });
    
    // Create local Chat record
    const localChat = new Chat({
      firebaseChatId: chatRoomId,
      orderId: order._id,
      participants: [
        { userId: buyer._id, role: 'buyer', firebaseId: buyer._id.toString() },
        { userId: seller._id, role: 'seller', firebaseId: seller._id.toString() }
      ],
      listingId: order.listingId,
      status: 'active',
      lastMessageAt: new Date()
    });
    
    await localChat.save();
    return chatRoomId;
  } catch (error) {
    console.error('Firebase chat room creation error:', error);
    return null;
  }
};

// ✅ SEND ORDER NOTIFICATIONS
const sendOrderNotifications = async (order, offer, buyer, seller) => {
  try {
    const firebaseChatId = await createFirebaseChatRoom(order, buyer, seller);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const chatLink = firebaseChatId ? 
      `${frontendUrl}/chat/${firebaseChatId}?order=${order._id}` : 
      `${frontendUrl}/messages?order=${order._id}`;
    
    const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
    
    // Seller notification
    const sellerMessage = new Message({
      orderId: order._id,
      senderId: systemUserId,
      receiverId: order.sellerId,
      message: `🎉 **NEW ORDER RECEIVED!**\nOrder ID: ${order._id.toString().slice(-8).toUpperCase()}`,
      read: false,
      messageType: 'new_order_notification',
      metadata: { chatLink, firebaseChatId }
    });
    
    // Buyer notification
    const buyerMessage = new Message({
      orderId: order._id,
      senderId: systemUserId,
      receiverId: order.buyerId,
      message: `✅ **ORDER CONFIRMED!**\nOrder ID: ${order._id.toString().slice(-8).toUpperCase()}`,
      read: false,
      messageType: 'order_confirmation',
      metadata: { chatLink, firebaseChatId }
    });
    
    await Promise.all([sellerMessage.save(), buyerMessage.save()]);
    
    // Send emails if configured
    if (emailService) {
      try {
        await Promise.all([
          emailService.sendOrderConfirmationToSeller(order, buyer, seller, chatLink),
          emailService.sendOrderConfirmationToBuyer(order, buyer, seller, chatLink)
        ]);
      } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
      }
    }
    
    return { chatLink, firebaseChatId };
  } catch (error) {
    console.error('Order notifications error:', error);
    return null;
  }
};

// ✅ CLEANUP EXPIRED OFFERS
const cleanupExpiredOffers = async () => {
  try {
    const expiredOffers = await Offer.find({
      status: 'pending_payment',
      expiresAt: { $lt: new Date() },
      isTemporary: true
    });

    for (const offer of expiredOffers) {
      if (offer.paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(offer.paymentIntentId);
        } catch (stripeError) {
          // Payment intent might already be cancelled
        }
      }
      await Offer.findByIdAndDelete(offer._id);
    }
    
    return expiredOffers.length;
  } catch (error) {
    console.error('Cleanup expired offers error:', error);
    return 0;
  }
};

// ============================
// ✅ ROUTES START HERE
// ============================

// ✅ HEALTH CHECK
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Offer routes are healthy",
    timestamp: new Date().toISOString()
  });
});

// ✅ CHECK PENDING OFFER
router.get("/check-pending-offer/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    if (!userId || !listingId || !validateObjectId(listingId)) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const pendingOffer = await Offer.findOne({
      listingId: new mongoose.Types.ObjectId(listingId),
      buyerId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    }).select('_id status amount paymentIntentId isTemporary expiresAt').lean();

    res.status(200).json({
      success: true,
      hasPendingOffer: !!pendingOffer,
      data: pendingOffer || null
    });
  } catch (error) {
    console.error('Check pending offer error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ✅ MAKE OFFER (TEMPORARY - REQUIRES PAYMENT)
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  let session;
  let stripePaymentIntent = null;
  let temporaryOffer = null;
  
  try {
    const { listingId, amount, requirements } = req.body;
    const userId = req.user.id;

    // Validation
    if (!userId || !listingId || !amount || !validateObjectId(listingId)) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    const offerAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      return res.status(400).json({ success: false, error: 'Minimum amount is $0.50' });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find listing
    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing || listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Listing not available' });
    }

    // Check if user is seller
    if (listing.sellerId.toString() === userId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Cannot make offer on your own listing' });
    }

    // Check for existing offers
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    }).session(session);

    if (existingOffer) {
      await session.abortTransaction();
      
      if (existingOffer.status === 'pending_payment' && existingOffer.paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(existingOffer.paymentIntentId);
          if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(paymentIntent.status)) {
            return res.status(200).json({
              success: true,
              message: 'Complete payment for existing offer',
              data: {
                offer: existingOffer,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                isExistingOffer: true
              }
            });
          }
        } catch (stripeError) {
          console.error('Stripe retrieval error:', stripeError.message);
        }
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'You already have a pending offer',
        existingOfferId: existingOffer._id
      });
    }

    // Create Stripe payment intent
    stripePaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(offerAmount * 100),
      currency: 'usd',
      metadata: {
        listingId: listingId.toString(),
        buyerId: userId.toString(),
        sellerId: listing.sellerId.toString(),
        type: 'offer_payment',
        temporary: 'true'
      },
      automatic_payment_methods: { enabled: true },
      description: `Offer for: ${listing.title}`
    });

    // Create temporary offer
    temporaryOffer = new Offer({
      buyerId: userId,
      listingId,
      amount: offerAmount,
      paymentIntentId: stripePaymentIntent.id,
      status: 'pending_payment',
      requirements: requirements || '',
      isTemporary: true,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    await temporaryOffer.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Complete payment to submit offer',
      data: {
        offer: temporaryOffer,
        clientSecret: stripePaymentIntent.client_secret,
        paymentIntentId: stripePaymentIntent.id,
        amount: offerAmount
      }
    });

  } catch (error) {
    console.error('Make offer error:', error);
    
    // Cleanup on error
    if (stripePaymentIntent?.id) {
      try { await stripe.paymentIntents.cancel(stripePaymentIntent.id); } catch {}
    }
    if (temporaryOffer?._id) {
      try { await Offer.findByIdAndDelete(temporaryOffer._id); } catch {}
    }
    if (session) await session.abortTransaction();
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to make offer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ CONFIRM OFFER PAYMENT (REDIRECT TO MYORDER PAGE)
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment Request:", req.body);
  
  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!offerId || !paymentIntentId || !userId || !validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid request' });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find offer
    const offer = await Offer.findOne({
      _id: new mongoose.Types.ObjectId(offerId),
      buyerId: new mongoose.Types.ObjectId(userId)
    })
    .populate('listingId')
    .populate('buyerId', 'username email avatar')
    .session(session);

    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    // Check if already processed
    if (offer.status === 'paid') {
      const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
      await session.abortTransaction();
      return res.status(200).json({
        success: true,
        message: 'Payment already confirmed',
        data: {
          orderId: existingOrder?._id,
          redirectUrl: `/orders/${existingOrder?._id}`,
          chatUrl: `/chat/order_${existingOrder?._id}`
        }
      });
    }

    // Check offer status
    if (offer.status !== 'pending_payment') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Offer not in payment pending status' 
      });
    }

    // Verify Stripe payment
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Handle requires_capture status
      if (paymentIntent.status === 'requires_capture') {
        paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
      }
      
      if (!['succeeded', 'requires_capture'].includes(paymentIntent.status)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Payment not completed',
          currentStatus: paymentIntent.status
        });
      }
    } catch (stripeError) {
      await session.abortTransaction();
      console.error('Stripe error:', stripeError);
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed' 
      });
    }

    // Update offer status
    offer.status = 'paid';
    offer.paidAt = new Date();
    offer.isTemporary = false;
    offer.expiresAt = null;
    await offer.save({ session });

    // Get buyer and seller details
    const buyer = await mongoose.model('User').findById(userId).select('username email avatar').session(session);
    const seller = await mongoose.model('User').findById(offer.listingId.sellerId).select('username email avatar').session(session);

    if (!buyer || !seller) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'User details not found' });
    }

    // Create order
    const orderData = {
      buyerId: userId,
      sellerId: offer.listingId.sellerId,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: paymentIntent.status === 'requires_capture' ? 'pending_capture' : 'paid',
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false,
      orderDate: new Date(),
      metadata: { paymentStatus: paymentIntent.status }
    };

    if (offer.requirements) orderData.requirements = offer.requirements;
    if (offer.message) orderData.buyerNote = offer.message;

    const order = new Order(orderData);
    await order.save({ session });

    // Update listing
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    console.log("✅ Order created successfully:", order._id);

    // Send notifications (async, don't wait for completion)
    sendOrderNotifications(order, offer, buyer, seller).catch(console.error);

    // ✅ SUCCESS RESPONSE WITH REDIRECT TO MYORDER PAGE
    res.status(200).json({
      success: true,
      message: 'Payment confirmed! Redirecting to your order...',
      data: {
        orderId: order._id,
        // ✅ REDIRECT TO MYORDER PAGE
        redirectUrl: `/myorder/${order._id}`,
        // Alternative: redirectUrl: `/orders/${order._id}`,
        chatUrl: `/chat/order_${order._id}`,
        paymentStatus: paymentIntent.status,
        orderDetails: {
          amount: order.amount,
          sellerName: seller.username,
          buyerName: buyer.username,
          listingTitle: offer.listingId?.title
        }
      }
    });

  } catch (error) {
    console.error('Confirm offer payment error:', error);
    
    if (session) await session.abortTransaction();
    
    res.status(500).json({
      success: false,
      error: 'Payment confirmation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ CANCEL TEMPORARY OFFER
router.post("/cancel-temporary-offer/:offerId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerId } = req.params;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid offer ID' });
    }

    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      status: 'pending_payment',
      isTemporary: true
    });

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Temporary offer not found' });
    }

    // Cancel Stripe payment intent
    if (offer.paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(offer.paymentIntentId);
      } catch (stripeError) {
        console.error('Cancel payment intent error:', stripeError.message);
      }
    }

    // Delete offer
    await Offer.findByIdAndDelete(offerId);

    res.status(200).json({
      success: true,
      message: 'Temporary offer cancelled'
    });
  } catch (error) {
    console.error('Cancel temporary offer error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel offer' });
  }
});

// ✅ GET OFFER PAYMENT STATUS
router.get("/payment-status/:offerId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { offerId } = req.params;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid offer ID' });
    }

    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId
    }).select('status paymentIntentId isTemporary expiresAt amount');

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    let stripeStatus = null;
    if (offer.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(offer.paymentIntentId);
        stripeStatus = paymentIntent.status;
      } catch (stripeError) {
        console.error('Stripe status error:', stripeError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        offerId: offer._id,
        status: offer.status,
        stripeStatus,
        isTemporary: offer.isTemporary,
        isExpired: offer.expiresAt && offer.expiresAt < new Date(),
        amount: offer.amount,
        canContinuePayment: ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(stripeStatus),
        requiresCapture: stripeStatus === 'requires_capture'
      }
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment status' });
  }
});

// ✅ GET MY OFFERS (BUYER)
router.get("/my-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const offers = await Offer.find({ 
      buyerId: userId,
      status: { $ne: 'pending_payment' } // Don't show temporary unpaid offers
    })
    .populate({
      path: 'listingId',
      select: 'title price mediaUrls status sellerId',
      populate: { path: 'sellerId', select: 'username avatar rating' }
    })
    .sort({ createdAt: -1 })
    .lean();

    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('My offers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
});

// ✅ GET OFFERS RECEIVED (SELLER)
router.get("/received-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const myListings = await MarketplaceListing.find({ sellerId: userId });
    const listingIds = myListings.map(listing => listing._id);
    
    const offers = await Offer.find({ 
      listingId: { $in: listingIds },
      status: { $ne: 'pending_payment' } // Don't show temporary unpaid offers
    })
    .populate('buyerId', 'username avatar email rating')
    .populate('listingId', 'title price mediaUrls status')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: offers,
      count: offers.length
    });
  } catch (error) {
    console.error('Received offers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
});

// ✅ GET SINGLE OFFER
router.get("/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const offerId = req.params.id;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid offer ID' });
    }

    const offer = await Offer.findById(offerId)
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price sellerId')
      .populate('listingId.sellerId', 'username avatar');

    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    const isBuyer = offer.buyerId._id.toString() === userId.toString();
    const isSeller = offer.listingId.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const order = await Order.findOne({ offerId: offer._id })
      .select('status paidAt');
    
    const chat = await Chat.findOne({ orderId: order?._id });

    res.status(200).json({
      success: true,
      data: {
        ...offer.toObject(),
        associatedOrder: order,
        chatRoom: chat,
        userRole: isBuyer ? 'buyer' : 'seller'
      }
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offer' });
  }
});

// ✅ ACCEPT OFFER (SELLER)
router.put("/accept-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid offer ID' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const offer = await Offer.findById(offerId)
      .populate('listingId')
      .populate('buyerId', 'username email')
      .session(session);

    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Check if offer is paid
    if (offer.status !== 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Offer not paid yet' 
      });
    }

    // Update offer
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save({ session });

    // Update order if exists
    const order = await Order.findOne({ offerId: offer._id }).session(session);
    if (order) {
      order.status = 'in_progress';
      order.acceptedAt = new Date();
      await order.save({ session });
    }

    // Update listing
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      { session }
    );

    // Reject other offers
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: { $in: ['pending', 'pending_payment', 'paid'] }
      },
      { 
        status: 'rejected',
        rejectedAt: new Date()
      },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer accepted!',
      data: {
        offerId: offer._id,
        orderId: order?._id
      }
    });

  } catch (error) {
    console.error('Accept offer error:', error);
    if (session) await session.abortTransaction();
    res.status(500).json({ success: false, error: 'Failed to accept offer' });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ REJECT OFFER (SELLER)
router.put("/reject-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ success: false, error: 'Invalid offer ID' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const offer = await Offer.findById(offerId)
      .populate('listingId')
      .session(session);
    
    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (!['pending', 'paid', 'pending_payment'].includes(offer.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot reject offer in current state' 
      });
    }

    // Update offer
    offer.status = 'rejected';
    offer.rejectedAt = new Date();
    offer.rejectionReason = req.body.rejectionReason || 'Seller rejected offer';
    await offer.save({ session });

    // Refund if paid
    if (offer.status === 'paid' && offer.paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: offer.paymentIntentId });
      } catch (refundError) {
        console.error('Refund error:', refundError.message);
      }
    }

    // Update listing
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { status: 'active' },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer rejected'
    });
  } catch (error) {
    console.error('Reject offer error:', error);
    if (session) await session.abortTransaction();
    res.status(500).json({ success: false, error: 'Failed to reject offer' });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ CAPTURE PAYMENT (for requires_capture)
router.post("/capture-payment/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      _id: orderId,
      buyerId: userId,
      status: 'pending_capture'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or not ready for capture'
      });
    }

    // Capture payment
    const paymentIntent = await stripe.paymentIntents.capture(order.stripePaymentIntentId);
    
    // Update order
    order.status = 'paid';
    order.metadata.captured = true;
    await order.save();

    // Update offer
    if (order.offerId) {
      await Offer.findByIdAndUpdate(order.offerId, { status: 'paid' });
    }

    res.status(200).json({
      success: true,
      message: 'Payment captured',
      data: { orderId: order._id, paymentStatus: paymentIntent.status }
    });

  } catch (error) {
    console.error('Capture payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to capture payment' });
  }
});

// ✅ CLEANUP EXPIRED OFFERS (CRON ENDPOINT)
router.post("/cleanup-expired-offers", async (req, res) => {
  try {
    const cleanedCount = await cleanupExpiredOffers();
    res.status(200).json({
      success: true,
      message: "Cleanup completed",
      cleanedCount
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ success: false, error: "Cleanup failed" });
  }
});

// ✅ SCHEDULED CLEANUP (every 30 minutes)
setInterval(() => {
  console.log("🕐 Running scheduled cleanup...");
  cleanupExpiredOffers().catch(console.error);
}, 30 * 60 * 1000);

module.exports = router;