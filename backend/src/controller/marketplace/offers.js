// routes/offerRoutes.js - Complete Version with Duplicate Order Prevention
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

// Initialize Firebase
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
    console.log('Firebase init warning:', error.message);
  }
}

// ✅ HELPER FUNCTIONS
const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const validateAmount = (amount) => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= 0.50;
};

// ✅ CHECK FOR EXISTING ORDER ON LISTING
const checkExistingOrder = async (buyerId, listingId) => {
  try {
    const existingOrder = await Order.findOne({
      buyerId: new mongoose.Types.ObjectId(buyerId),
      listingId: new mongoose.Types.ObjectId(listingId),
      status: { $in: ['pending_payment', 'paid', 'in_progress', 'pending_delivery', 'completed'] }
    });
    
    return existingOrder;
  } catch (error) {
    console.error('Check existing order error:', error);
    return null;
  }
};

// ✅ CHECK FOR EXISTING OFFER ON LISTING
const checkExistingOffer = async (buyerId, listingId) => {
  try {
    const existingOffer = await Offer.findOne({
      buyerId: new mongoose.Types.ObjectId(buyerId),
      listingId: new mongoose.Types.ObjectId(listingId),
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    });
    
    return existingOffer;
  } catch (error) {
    console.error('Check existing offer error:', error);
    return null;
  }
};

// ✅ CREATE FIREBASE CHAT ROOM
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
    
    // Add welcome message
    await db.collection('chatRooms').doc(chatRoomId).collection('messages').add({
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      message: `🎉 **Order #${order._id.toString().slice(-8).toUpperCase()} has been placed!**\n\nBuyer: ${buyer.username}\nSeller: ${seller.username}\nAmount: $${order.amount}`,
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
    console.error('Firebase chat error:', error);
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
    
    // Save messages
    const messages = [
      new Message({
        orderId: order._id,
        senderId: systemUserId,
        receiverId: seller._id,
        message: `🎉 **NEW ORDER RECEIVED!**\n\nOrder ID: #${order._id.toString().slice(-8).toUpperCase()}\nBuyer: ${buyer.username}\nAmount: $${order.amount}`,
        read: false,
        messageType: 'new_order_notification',
        metadata: { chatLink, firebaseChatId }
      }),
      new Message({
        orderId: order._id,
        senderId: systemUserId,
        receiverId: buyer._id,
        message: `✅ **ORDER CONFIRMED!**\n\nOrder ID: #${order._id.toString().slice(-8).toUpperCase()}\nSeller: ${seller.username}\nAmount: $${order.amount}`,
        read: false,
        messageType: 'order_confirmation',
        metadata: { chatLink, firebaseChatId }
      })
    ];
    
    await Message.insertMany(messages);
    
    // Send emails if configured
    if (emailService) {
      try {
        await Promise.all([
          emailService.sendOrderConfirmationToSeller(order, buyer, seller, chatLink),
          emailService.sendOrderConfirmationToBuyer(order, buyer, seller, chatLink)
        ]);
      } catch (emailError) {
        console.error('Email error:', emailError.message);
      }
    }
    
    return { chatLink, firebaseChatId };
  } catch (error) {
    console.error('Notifications error:', error);
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
        } catch (stripeError) {}
      }
      await Offer.findByIdAndDelete(offer._id);
    }
    
    return expiredOffers.length;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
};

// ============================
// ✅ ROUTES
// ============================

// ✅ HEALTH CHECK
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Offer routes are healthy",
    timestamp: new Date().toISOString()
  });
});

// ✅ CHECK IF USER HAS PENDING ORDER/Offer ON LISTING
router.get("/check-listing-status/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    if (!userId || !listingId || !validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request' 
      });
    }

    // Check for existing order
    const existingOrder = await checkExistingOrder(userId, listingId);
    
    // Check for existing offer
    const existingOffer = await checkExistingOffer(userId, listingId);
    
    // Check listing status
    const listing = await MarketplaceListing.findById(listingId)
      .select('status sellerId title price');
    
    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Listing not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        listing: {
          _id: listing._id,
          title: listing.title,
          price: listing.price,
          status: listing.status,
          sellerId: listing.sellerId,
          isOwner: listing.sellerId.toString() === userId.toString()
        },
        existingOrder: existingOrder ? {
          _id: existingOrder._id,
          status: existingOrder.status,
          amount: existingOrder.amount,
          orderType: existingOrder.orderType,
          createdAt: existingOrder.createdAt
        } : null,
        existingOffer: existingOffer ? {
          _id: existingOffer._id,
          status: existingOffer.status,
          amount: existingOffer.amount,
          paymentIntentId: existingOffer.paymentIntentId,
          isTemporary: existingOffer.isTemporary,
          expiresAt: existingOffer.expiresAt
        } : null,
        canMakeOffer: !existingOrder && !existingOffer && listing.status === 'active',
        message: existingOrder ? 
          'You already have an order on this listing' : 
          existingOffer ? 
          'You already have an offer on this listing' : 
          'You can make an offer on this listing'
      }
    });
  } catch (error) {
    console.error('Check listing status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check listing status' 
    });
  }
});

// ✅ MAKE OFFER WITH PAYMENT
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  let session;
  let stripePaymentIntent = null;
  let temporaryOffer = null;
  
  try {
    const { listingId, amount, requirements } = req.body;
    const userId = req.user.id;

    // Validation
    if (!userId || !listingId || !amount || !validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request parameters' 
      });
    }

    const offerAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Minimum amount is $0.50' 
      });
    }

    // ✅ CHECK FOR EXISTING ORDER FIRST
    const existingOrder = await checkExistingOrder(userId, listingId);
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        error: 'You already have an order on this listing',
        data: {
          orderId: existingOrder._id,
          status: existingOrder.status,
          redirectUrl: `/myorder/${existingOrder._id}`
        }
      });
    }

    // ✅ CHECK FOR EXISTING OFFER
    const existingOffer = await checkExistingOffer(userId, listingId);
    if (existingOffer) {
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
          console.error('Stripe error:', stripeError.message);
        }
      }
      
      return res.status(400).json({
        success: false,
        error: 'You already have an offer on this listing',
        existingOfferId: existingOffer._id,
        existingOfferStatus: existingOffer.status
      });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find listing
    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing || listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Listing not available for offers' 
      });
    }

    // Check if user is seller
    if (listing.sellerId.toString() === userId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot make offer on your own listing' 
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
        type: 'offer_payment'
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

// ✅ CONFIRM OFFER PAYMENT & CREATE ORDER
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment:", req.body);
  
  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!offerId || !paymentIntentId || !userId || !validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request parameters' 
      });
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
      return res.status(404).json({ 
        success: false, 
        error: 'Offer not found or access denied' 
      });
    }

    // ✅ CHECK IF USER ALREADY HAS ORDER ON THIS LISTING
    const existingOrder = await checkExistingOrder(userId, offer.listingId._id);
    if (existingOrder) {
      await session.abortTransaction();
      
      // Update offer status to cancelled
      await Offer.findByIdAndUpdate(offerId, { 
        status: 'cancelled',
        cancellationReason: 'User already has an order on this listing'
      });
      
      // Refund payment if made
      if (offer.paymentIntentId) {
        try {
          await stripe.paymentIntents.cancel(offer.paymentIntentId);
        } catch (stripeError) {
          console.error('Refund error:', stripeError.message);
        }
      }
      
      return res.status(400).json({
        success: false,
        error: 'You already have an order on this listing',
        data: {
          orderId: existingOrder._id,
          orderStatus: existingOrder.status,
          redirectUrl: `/myorder/${existingOrder._id}`
        }
      });
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
          redirectUrl: `/myorder/${existingOrder?._id}`,
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

    // Get user details
    const buyer = await mongoose.model('User').findById(userId)
      .select('username email avatar')
      .session(session);
    
    const seller = await mongoose.model('User').findById(offer.listingId.sellerId)
      .select('username email avatar')
      .session(session);

    if (!buyer || !seller) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        error: 'User details not found' 
      });
    }

    // ✅ CREATE ORDER
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
      metadata: {
        paymentStatus: paymentIntent.status,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        offerAmount: offer.amount
      }
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
        $inc: { totalOrders: 1 },
        status: 'reserved'
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    console.log("✅ Order created successfully:", order._id);

    // Send notifications (async)
    sendOrderNotifications(order, offer, buyer, seller).catch(console.error);

    // ✅ SUCCESS RESPONSE WITH REDIRECT
    res.status(200).json({
      success: true,
      message: 'Payment confirmed! Redirecting to your order...',
      data: {
        orderId: order._id,
        redirectUrl: `/myorder/${order._id}`,
        chatUrl: `/chat/order_${order._id}`,
        paymentStatus: paymentIntent.status,
        orderDetails: {
          amount: order.amount,
          sellerName: seller.username,
          buyerName: buyer.username,
          listingTitle: offer.listingId?.title,
          orderDate: order.orderDate
        }
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    
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
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID' 
      });
    }

    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      status: 'pending_payment',
      isTemporary: true
    });

    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Temporary offer not found' 
      });
    }

    // Cancel Stripe payment intent
    if (offer.paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(offer.paymentIntentId);
      } catch (stripeError) {
        console.error('Cancel payment error:', stripeError.message);
      }
    }

    // Delete offer
    await Offer.findByIdAndDelete(offerId);

    res.status(200).json({
      success: true,
      message: 'Temporary offer cancelled'
    });
  } catch (error) {
    console.error('Cancel offer error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel offer' 
    });
  }
});

// ✅ GET MY OFFERS
router.get("/my-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const offers = await Offer.find({ 
      buyerId: userId,
      status: { $ne: 'pending_payment' }
    })
    .populate({
      path: 'listingId',
      select: 'title price mediaUrls status sellerId',
      populate: { 
        path: 'sellerId', 
        select: 'username avatar rating' 
      }
    })
    .populate('buyerId', 'username avatar email')
    .sort({ createdAt: -1 })
    .lean();

    // Check if there are associated orders
    const offersWithOrderCheck = await Promise.all(
      offers.map(async (offer) => {
        const order = await Order.findOne({ offerId: offer._id })
          .select('status _id');
        return {
          ...offer,
          associatedOrder: order
        };
      })
    );

    res.status(200).json({
      success: true,
      data: offersWithOrderCheck,
      count: offersWithOrderCheck.length
    });
  } catch (error) {
    console.error('My offers error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch offers' 
    });
  }
});

// ✅ GET OFFERS RECEIVED
router.get("/received-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const myListings = await MarketplaceListing.find({ sellerId: userId });
    const listingIds = myListings.map(listing => listing._id);
    
    const offers = await Offer.find({ 
      listingId: { $in: listingIds },
      status: { $ne: 'pending_payment' }
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch offers' 
    });
  }
});

// ✅ GET SINGLE OFFER
router.get("/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const offerId = req.params.id;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID' 
      });
    }

    const offer = await Offer.findById(offerId)
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price sellerId')
      .populate('listingId.sellerId', 'username avatar');

    if (!offer) {
      return res.status(404).json({ 
        success: false, 
        error: 'Offer not found' 
      });
    }

    const isBuyer = offer.buyerId._id.toString() === userId.toString();
    const isSeller = offer.listingId.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    const order = await Order.findOne({ offerId: offer._id })
      .select('status paidAt amount orderDate');
    
    const chat = await Chat.findOne({ orderId: order?._id })
      .select('firebaseChatId status');

    res.status(200).json({
      success: true,
      data: {
        ...offer.toObject(),
        associatedOrder: order,
        chatRoom: chat,
        userRole: isBuyer ? 'buyer' : 'seller',
        hasExistingOrder: !!order
      }
    });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch offer' 
    });
  }
});

// ✅ ACCEPT OFFER (SELLER)
router.put("/accept-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID' 
      });
    }

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

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }

    // Check if offer is paid
    if (offer.status !== 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Offer must be paid before acceptance' 
      });
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
    if (existingOrder) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Order already exists for this offer',
        data: {
          orderId: existingOrder._id,
          redirectUrl: `/orders/${existingOrder._id}`
        }
      });
    }

    // Update offer
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save({ session });

    // Create or update order
    let order = existingOrder;
    if (!order) {
      order = new Order({
        buyerId: offer.buyerId._id,
        sellerId: offer.listingId.sellerId,
        listingId: offer.listingId._id,
        offerId: offer._id,
        orderType: 'accepted_offer',
        amount: offer.amount,
        status: 'in_progress',
        paidAt: offer.paidAt,
        acceptedAt: new Date(),
        revisions: 0,
        maxRevisions: 3,
        paymentReleased: false,
        orderDate: new Date()
      });
      await order.save({ session });
    } else {
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
        rejectedAt: new Date(),
        rejectionReason: 'Another offer was accepted'
      },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer accepted!',
      data: {
        offerId: offer._id,
        orderId: order._id,
        redirectUrl: `/myorder/${order._id}`
      }
    });

  } catch (error) {
    console.error('Accept offer error:', error);
    if (session) await session.abortTransaction();
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept offer' 
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ REJECT OFFER
router.put("/reject-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID' 
      });
    }

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

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject offer' 
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ GET ORDER STATUS
router.get("/order-status/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid listing ID' 
      });
    }

    const existingOrder = await Order.findOne({
      buyerId: userId,
      listingId: listingId,
      status: { $in: ['pending_payment', 'paid', 'in_progress', 'pending_delivery', 'completed'] }
    }).select('_id status amount orderDate');

    if (existingOrder) {
      return res.status(200).json({
        success: true,
        hasOrder: true,
        data: existingOrder,
        message: 'You already have an order on this listing',
        redirectUrl: `/myorder/${existingOrder._id}`
      });
    }

    res.status(200).json({
      success: true,
      hasOrder: false,
      message: 'No existing order found'
    });
  } catch (error) {
    console.error('Order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check order status' 
    });
  }
});

// ✅ CLEANUP EXPIRED OFFERS
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
    res.status(500).json({ 
      success: false, 
      error: "Cleanup failed" 
    });
  }
});

// ✅ SCHEDULED CLEANUP
setInterval(() => {
  console.log("🕐 Running scheduled cleanup...");
  cleanupExpiredOffers().catch(console.error);
}, 30 * 60 * 1000);

module.exports = router;