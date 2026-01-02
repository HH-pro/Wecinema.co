// routes/offerRoutes.js - Listing Status Only Changes by Seller
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const Chat = require("../../models/marketplace/Chat");
const Message = require("../../models/marketplace/messages");
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');
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

// ✅ FORMAT RESPONSE MESSAGES
const formatMessage = (type, data = {}) => {
  const messages = {
    'offer_exists': {
      title: 'Offer Already Exists',
      message: `You already have an offer for "${data.listingTitle}"`,
      details: `Your offer of $${data.offerAmount} is currently ${data.offerStatus}.`,
      actions: ['View Offer', 'Cancel Offer']
    },
    
    'order_exists': {
      title: 'Order Already Exists',
      message: `You already have an order for "${data.listingTitle}"`,
      details: `Your order #${data.orderId?.slice(-8)?.toUpperCase()} is ${data.orderStatus}.`,
      actions: ['View Order', 'Go to Messages']
    },
    
    'listing_reserved': {
      title: 'Listing Currently Reserved',
      message: `"${data.listingTitle}" is currently reserved`,
      details: 'This listing has an active order. Please check back later or browse other listings.',
      actions: ['Browse Similar Listings', 'Save for Later']
    },
    
    'listing_sold': {
      title: 'Listing Sold',
      message: `"${data.listingTitle}" has been sold`,
      details: 'This item is no longer available.',
      actions: ['Browse Similar Listings', 'Contact Seller for Similar Items']
    },
    
    'listing_inactive': {
      title: 'Listing Not Available',
      message: `"${data.listingTitle}" is currently not available`,
      details: 'The seller has made this listing inactive.',
      actions: ['Browse Active Listings', 'Save for Later']
    },
    
    'own_listing': {
      title: 'Cannot Make Offer',
      message: 'This is your own listing',
      details: 'You cannot make an offer on your own listing.',
      actions: ['Edit Listing', 'View Offers Received']
    },
    
    'payment_pending': {
      title: 'Complete Your Payment',
      message: 'Complete payment to submit your offer',
      details: `Your offer of $${data.offerAmount} is waiting for payment.`,
      actions: ['Complete Payment', 'Cancel Offer']
    },
    
    'success_offer': {
      title: 'Offer Created Successfully!',
      message: 'Please complete payment to submit your offer',
      details: 'Your offer will be submitted to the seller once payment is completed.',
      actions: ['Complete Payment Now', 'View Offer Details']
    },
    
    'success_payment': {
      title: 'Payment Successful!',
      message: 'Your order has been created',
      details: 'The seller has been notified and will review your order.',
      actions: ['View Order', 'Message Seller']
    }
  };
  
  return messages[type] || { 
    title: 'Information', 
    message: 'Please check the listing details',
    actions: ['Continue']
  };
};

// ✅ CHECK FOR EXISTING ORDER
const checkExistingOrder = async (buyerId, listingId) => {
  try {
    const existingOrder = await Order.findOne({
      buyerId: new mongoose.Types.ObjectId(buyerId),
      listingId: new mongoose.Types.ObjectId(listingId),
      status: { $in: ['pending_payment', 'paid', 'in_progress', 'pending_delivery', 'completed'] }
    }).populate('listingId', 'title');
    
    return existingOrder;
  } catch (error) {
    console.error('Check existing order error:', error);
    return null;
  }
};

// ✅ CHECK FOR EXISTING OFFER
const checkExistingOffer = async (buyerId, listingId) => {
  try {
    const existingOffer = await Offer.findOne({
      buyerId: new mongoose.Types.ObjectId(buyerId),
      listingId: new mongoose.Types.ObjectId(listingId),
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    }).populate('listingId', 'title');
    
    return existingOffer;
  } catch (error) {
    console.error('Check existing offer error:', error);
    return null;
  }
};

// ✅ CHECK LISTING AVAILABILITY - LISTING STATUS NEVER AUTO-CHANGES
const checkListingAvailability = async (listingId, userId) => {
  try {
    const listing = await MarketplaceListing.findById(listingId)
      .populate('sellerId', 'username');
    
    if (!listing) {
      return {
        available: false,
        status: 'not_found',
        message: 'Listing not found',
        userFriendlyMessage: 'Sorry, this listing could not be found.',
        actions: ['Browse Listings', 'Go Home']
      };
    }

    // Check if user is seller
    const isOwner = listing.sellerId._id.toString() === userId.toString();
    
    // Check listing status - NO AUTO-RENEW, status only changes when seller updates
    let available = false;
    let message = '';
    let userFriendlyMessage = '';
    let actions = [];
    
    switch (listing.status) {
      case 'active':
        available = !isOwner; // Can make offer if not owner
        message = 'Listing is active and available';
        userFriendlyMessage = isOwner 
          ? 'This is your own listing. You cannot make offers on your own listings.'
          : 'This listing is available for offers!';
        actions = isOwner 
          ? ['Edit Listing', 'View Analytics'] 
          : ['Make Offer', 'Message Seller', 'Save Listing'];
        break;
        
      case 'reserved':
        // ❌ NO AUTO-RENEW - Status stays reserved until seller changes it
        available = false;
        message = 'Listing is currently reserved';
        userFriendlyMessage = 'This listing is currently reserved for another order. Please check back later.';
        actions = ['Browse Similar Listings', 'Save for Notifications'];
        break;
        
      case 'sold':
        available = false;
        message = 'Listing has been sold';
        userFriendlyMessage = 'This item has been sold. Check out similar listings!';
        actions = ['Browse Similar Listings', 'Contact Seller'];
        break;
        
      case 'inactive':
        available = false;
        message = 'Listing is inactive';
        userFriendlyMessage = 'This listing is currently not available.';
        actions = ['Browse Active Listings'];
        break;
        
      case 'draft':
        available = false;
        message = 'Listing is in draft mode';
        userFriendlyMessage = 'This listing is not yet published.';
        actions = isOwner ? ['Edit Listing', 'Publish Now'] : ['Browse Listings'];
        break;
        
      default:
        available = false;
        message = 'Listing status unknown';
        userFriendlyMessage = 'This listing is not available at the moment.';
        actions = ['Browse Listings'];
    }
    
    // If listing is deleted
    if (listing.deleted) {
      available = false;
      message = 'Listing has been deleted';
      userFriendlyMessage = 'This listing is no longer available.';
      actions = ['Browse Listings'];
    }
    
    return {
      available,
      status: listing.status,
      message,
      userFriendlyMessage,
      actions,
      isOwner,
      listing: {
        _id: listing._id,
        title: listing.title,
        price: listing.price,
        sellerName: listing.sellerId.username
      },
      isReserved: listing.status === 'reserved'
    };
  } catch (error) {
    console.error('Check listing availability error:', error);
    return {
      available: false,
      status: 'error',
      message: 'Error checking listing availability',
      userFriendlyMessage: 'Sorry, we encountered an error. Please try again.',
      actions: ['Try Again', 'Contact Support']
    };
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
    
    const messages = [
      new Message({
        orderId: order._id,
        senderId: systemUserId,
        receiverId: seller._id,
        message: `🎉 **NEW ORDER RECEIVED!**\n\nOrder ID: #${order._id.toString().slice(-8).toUpperCase()}\nBuyer: ${buyer.username}\nAmount: $${order.amount}\nListing: ${offer.listingId?.title}`,
        read: false,
        messageType: 'new_order_notification',
        metadata: { chatLink, firebaseChatId }
      }),
      new Message({
        orderId: order._id,
        senderId: systemUserId,
        receiverId: buyer._id,
        message: `✅ **ORDER CONFIRMED!**\n\nOrder ID: #${order._id.toString().slice(-8).toUpperCase()}\nSeller: ${seller.username}\nAmount: $${order.amount}\nListing: ${offer.listingId?.title}`,
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

// ✅ CHECK LISTING STATUS - NO AUTO STATUS CHANGES
router.get("/check-listing-status/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    if (!userId || !listingId || !validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request',
        userMessage: 'Please provide valid information.'
      });
    }

    // Check listing availability (NO AUTO-RENEW)
    const availability = await checkListingAvailability(listingId, userId);
    
    // Check for existing order
    const existingOrder = await checkExistingOrder(userId, listingId);
    
    // Check for existing offer
    const existingOffer = await checkExistingOffer(userId, listingId);
    
    // Determine user status
    const hasOrder = !!existingOrder;
    const hasOffer = !!existingOffer;
    const canMakeOffer = availability.available && !hasOrder && !hasOffer && !availability.isOwner;
    
    // Format user-friendly response
    let mainMessage = formatMessage('success_offer');
    let statusCode = 200;
    
    if (hasOrder) {
      mainMessage = formatMessage('order_exists', {
        listingTitle: existingOrder.listingId?.title || 'Listing',
        orderId: existingOrder._id,
        orderStatus: existingOrder.status
      });
      statusCode = 200;
    } else if (hasOffer) {
      mainMessage = formatMessage('offer_exists', {
        listingTitle: existingOffer.listingId?.title || 'Listing',
        offerAmount: existingOffer.amount,
        offerStatus: existingOffer.status
      });
      statusCode = 200;
    } else if (!availability.available) {
      switch (availability.status) {
        case 'reserved':
          mainMessage = formatMessage('listing_reserved', {
            listingTitle: availability.listing.title
          });
          statusCode = 200;
          break;
        case 'sold':
          mainMessage = formatMessage('listing_sold', {
            listingTitle: availability.listing.title
          });
          statusCode = 200;
          break;
        case 'inactive':
          mainMessage = formatMessage('listing_inactive', {
            listingTitle: availability.listing.title
          });
          statusCode = 200;
          break;
        case 'draft':
          if (availability.isOwner) {
            mainMessage = formatMessage('own_listing');
          }
          statusCode = 200;
          break;
      }
    } else if (availability.isOwner) {
      mainMessage = formatMessage('own_listing');
      statusCode = 200;
    }

    res.status(statusCode).json({
      success: canMakeOffer,
      data: {
        listing: availability.listing,
        availability: {
          ...availability,
          userFriendlyMessage: mainMessage.message,
          detailedMessage: mainMessage.details
        },
        userStatus: {
          hasOrder,
          hasOffer,
          isOwner: availability.isOwner,
          canMakeOffer
        },
        existingOrder: existingOrder ? {
          _id: existingOrder._id,
          status: existingOrder.status,
          amount: existingOrder.amount,
          createdAt: existingOrder.createdAt,
          redirectUrl: `/myorder/${existingOrder._id}`
        } : null,
        existingOffer: existingOffer ? {
          _id: existingOffer._id,
          status: existingOffer.status,
          amount: existingOffer.amount,
          paymentIntentId: existingOffer.paymentIntentId,
          isTemporary: existingOffer.isTemporary,
          expiresAt: existingOffer.expiresAt,
          canCompletePayment: existingOffer.status === 'pending_payment'
        } : null
      },
      message: mainMessage,
      actions: mainMessage.actions
    });
  } catch (error) {
    console.error('Check listing status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check listing status',
      userMessage: 'Sorry, we encountered an error. Please try again.',
      actions: ['Try Again', 'Contact Support']
    });
  }
});

// ✅ MAKE OFFER - DOES NOT CHANGE LISTING STATUS
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  let session;
  let stripePaymentIntent = null;
  let temporaryOffer = null;
  
  try {
    const { listingId, amount, requirements, expectedDelivery } = req.body;
    const userId = req.user.id;

    // Validation with friendly messages
    if (!userId || !listingId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing information',
        userMessage: 'Please provide all required information.',
        actions: ['Fill Required Fields']
      });
    }

    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid listing ID',
        userMessage: 'The listing information is invalid.',
        actions: ['Browse Listings', 'Try Again']
      });
    }

    const offerAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount',
        userMessage: 'Please enter a valid amount (minimum $0.50).',
        actions: ['Enter Valid Amount']
      });
    }

    // ✅ CHECK LISTING AVAILABILITY - NO AUTO-RENEW
    const availability = await checkListingAvailability(listingId, userId);
    
    if (!availability.available) {
      return res.status(400).json({
        success: false,
        error: availability.message,
        userMessage: availability.userFriendlyMessage,
        actions: availability.actions,
        listingStatus: availability.status
      });
    }

    if (availability.isOwner) {
      return res.status(400).json({
        success: false,
        error: 'Cannot make offer on own listing',
        userMessage: 'You cannot make an offer on your own listing.',
        actions: ['Edit Listing', 'View Offers Received'],
        isOwner: true
      });
    }

    // ✅ CHECK FOR EXISTING ORDER
    const existingOrder = await checkExistingOrder(userId, listingId);
    if (existingOrder) {
      return res.status(200).json({
        success: false,
        error: 'Order already exists',
        userMessage: `You already have an order for "${existingOrder.listingId?.title}"`,
        detailedMessage: `Your order #${existingOrder._id.toString().slice(-8).toUpperCase()} is currently ${existingOrder.status}.`,
        data: {
          orderId: existingOrder._id,
          status: existingOrder.status,
          redirectUrl: `/myorder/${existingOrder._id}`,
          chatUrl: `/messages?order=${existingOrder._id}`
        },
        actions: ['View Order', 'Message Seller', 'Browse Other Listings']
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
              userMessage: 'You have an offer waiting for payment.',
              detailedMessage: `Complete payment to submit your $${existingOffer.amount} offer for "${existingOffer.listingId?.title}".`,
              data: {
                offer: existingOffer,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                isExistingOffer: true,
                expiresAt: existingOffer.expiresAt,
                timeLeft: Math.max(0, Math.floor((new Date(existingOffer.expiresAt) - new Date()) / 60000))
              },
              actions: ['Complete Payment Now', 'View Offer Details', 'Cancel Offer']
            });
          }
        } catch (stripeError) {
          console.error('Stripe error:', stripeError.message);
        }
      }
      
      return res.status(200).json({
        success: false,
        error: 'Offer already exists',
        userMessage: `You already have an offer for "${existingOffer.listingId?.title}"`,
        detailedMessage: `Your offer of $${existingOffer.amount} is currently ${existingOffer.status}.`,
        data: {
          existingOfferId: existingOffer._id,
          existingOfferStatus: existingOffer.status,
          offerAmount: existingOffer.amount
        },
        actions: ['View Offer', 'Cancel Offer', 'Make New Offer']
      });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find listing
    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        error: 'Listing not found',
        userMessage: 'Sorry, this listing could not be found.',
        actions: ['Browse Listings', 'Go Home']
      });
    }

    // Double-check listing status - NO AUTO STATUS CHANGES
    if (listing.status !== 'active') {
      await session.abortTransaction();
      let userMessage = 'This listing is not available for offers.';
      let actions = ['Browse Listings'];
      
      if (listing.status === 'reserved') {
        userMessage = 'This listing is currently reserved. Only the seller can change this status.';
        actions = ['Browse Similar Listings', 'Save for Notifications'];
      } else if (listing.status === 'sold') {
        userMessage = 'This item has been sold.';
        actions = ['Browse Similar Listings', 'Contact Seller'];
      } else if (listing.status === 'inactive') {
        userMessage = 'This listing is currently inactive.';
        actions = ['Browse Active Listings'];
      }
      
      return res.status(400).json({ 
        success: false, 
        error: `Listing is ${listing.status}`,
        userMessage,
        actions,
        listingStatus: listing.status
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
        listingTitle: listing.title
      },
      automatic_payment_methods: { enabled: true },
      description: `Offer for: ${listing.title}`,
      shipping: {
        name: req.user.username,
        address: {
          line1: 'Not provided',
          city: 'Not provided',
          country: 'US'
        }
      }
    });

    // Create temporary offer
    temporaryOffer = new Offer({
      buyerId: userId,
      listingId,
      amount: offerAmount,
      paymentIntentId: stripePaymentIntent.id,
      status: 'pending_payment',
      requirements: requirements || '',
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      isTemporary: true,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    await temporaryOffer.save({ session });
    await session.commitTransaction();

    // Success response with friendly messages
    const successMessage = formatMessage('success_offer', {
      offerAmount: offerAmount,
      listingTitle: listing.title
    });

    res.status(201).json({
      success: true,
      message: successMessage.title,
      userMessage: successMessage.message,
      detailedMessage: successMessage.details,
      data: {
        offer: {
          _id: temporaryOffer._id,
          amount: temporaryOffer.amount,
          status: temporaryOffer.status,
          paymentIntentId: temporaryOffer.paymentIntentId,
          createdAt: temporaryOffer.createdAt,
          expiresAt: temporaryOffer.expiresAt,
          isTemporary: true,
          timeLeft: 30 // minutes
        },
        clientSecret: stripePaymentIntent.client_secret,
        paymentIntentId: stripePaymentIntent.id,
        amount: offerAmount,
        listingTitle: listing.title,
        sellerName: listing.sellerId.username,
        expiresIn: '30 minutes'
      },
      actions: successMessage.actions
    });

  } catch (error) {
    console.error('Make offer error:', error);
    
    // User-friendly error messages
    let userMessage = 'Sorry, we couldn\'t process your offer. Please try again.';
    let actions = ['Try Again', 'Contact Support'];
    
    if (error.code === 'resource_missing') {
      userMessage = 'The listing could not be found.';
      actions = ['Browse Listings'];
    } else if (error.type === 'StripeCardError') {
      userMessage = 'There was an issue with your payment method. Please try a different card.';
      actions = ['Try Different Card', 'Contact Support'];
    }
    
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
      userMessage,
      detailedMessage: process.env.NODE_ENV === 'development' ? error.message : 'Please try again or contact support.',
      actions
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ CONFIRM OFFER PAYMENT - DOES NOT CHANGE LISTING STATUS
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment:", req.body);
  
  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!offerId || !paymentIntentId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing information',
        userMessage: 'Please provide all required information.',
        actions: ['Try Again']
      });
    }

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID',
        userMessage: 'The offer information is invalid.',
        actions: ['View Your Offers', 'Try Again']
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
        error: 'Offer not found',
        userMessage: 'Sorry, we couldn\'t find your offer.',
        actions: ['View Your Offers', 'Browse Listings']
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
      
      return res.status(200).json({
        success: false,
        error: 'Order already exists',
        userMessage: `You already have an order for "${existingOrder.listingId?.title}"`,
        detailedMessage: `Your order #${existingOrder._id.toString().slice(-8).toUpperCase()} is currently ${existingOrder.status}.`,
        data: {
          orderId: existingOrder._id,
          orderStatus: existingOrder.status,
          redirectUrl: `/myorder/${existingOrder._id}`,
          chatUrl: `/messages?order=${existingOrder._id}`
        },
        actions: ['View Order', 'Message Seller']
      });
    }

    // Check if already processed
    if (offer.status === 'paid') {
      const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
      await session.abortTransaction();
      
      const successMessage = formatMessage('success_payment');
      
      return res.status(200).json({
        success: true,
        message: successMessage.title,
        userMessage: 'Payment already confirmed',
        detailedMessage: 'Your payment has already been processed.',
        data: {
          orderId: existingOrder?._id,
          redirectUrl: `/myorder/${existingOrder?._id}`,
          chatUrl: `/chat/order_${existingOrder?._id}`,
          isAlreadyProcessed: true
        },
        actions: successMessage.actions
      });
    }

    // Check offer status
    if (offer.status !== 'pending_payment') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'Offer not in payment pending status',
        userMessage: 'This offer cannot be paid at the moment.',
        detailedMessage: `The offer status is "${offer.status}". Please contact support if you believe this is an error.`,
        actions: ['Contact Support', 'View Offer Details']
      });
    }

    // Check if offer expired
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Offer expired',
        userMessage: 'This offer has expired.',
        detailedMessage: 'Offers expire after 30 minutes if payment is not completed. Please make a new offer.',
        actions: ['Make New Offer', 'Browse Listings']
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
          userMessage: 'Payment not completed',
          detailedMessage: `Payment status: ${paymentIntent.status}. Please complete the payment first.`,
          actions: ['Complete Payment', 'Try Different Method']
        });
      }
    } catch (stripeError) {
      await session.abortTransaction();
      console.error('Stripe error:', stripeError);
      
      let userMessage = 'Payment verification failed';
      let detailedMessage = 'There was an issue verifying your payment.';
      
      if (stripeError.type === 'StripeCardError') {
        userMessage = 'Card declined';
        detailedMessage = stripeError.message || 'Your card was declined. Please try a different payment method.';
      } else if (stripeError.code === 'resource_missing') {
        userMessage = 'Payment not found';
        detailedMessage = 'The payment information could not be found.';
      }
      
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed',
        userMessage,
        detailedMessage,
        stripeCode: stripeError.code,
        actions: ['Try Again', 'Contact Support', 'Try Different Payment Method']
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
        error: 'User details not found',
        userMessage: 'Sorry, we couldn\'t process your order.',
        detailedMessage: 'User information could not be found.',
        actions: ['Contact Support']
      });
    }

    // ✅ CREATE ORDER - LISTING STATUS REMAINS UNCHANGED
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
        offerAmount: offer.amount,
        listingTitle: offer.listingId.title,
        buyerNote: offer.message || '',
        requirements: offer.requirements || ''
      }
    };

    if (offer.requirements) orderData.requirements = offer.requirements;
    if (offer.expectedDelivery) orderData.expectedDelivery = offer.expectedDelivery;
    if (offer.message) orderData.buyerNote = offer.message;

    const order = new Order(orderData);
    await order.save({ session });

    // ✅ IMPORTANT: LISTING STATUS DOES NOT CHANGE AUTOMATICALLY
    // Only increase order count, status remains as is
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
        // ❌ NO status change here - seller must manually update status
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    console.log("✅ Order created successfully:", order._id);
    console.log("ℹ️ Listing status remains unchanged:", offer.listingId.status);

    // Send notifications (async)
    sendOrderNotifications(order, offer, buyer, seller).catch(console.error);

    // ✅ SUCCESS RESPONSE - MENTION LISTING STATUS UNCHANGED
    const successMessage = formatMessage('success_payment');
    
    res.status(200).json({
      success: true,
      message: successMessage.title,
      userMessage: 'Payment confirmed successfully!',
      detailedMessage: 'Your order has been created and the seller has been notified. Note: The listing status remains unchanged until the seller updates it.',
      data: {
        orderId: order._id,
        redirectUrl: `/myorder/${order._id}`,
        chatUrl: `/chat/order_${order._id}`,
        paymentStatus: paymentIntent.status,
        listingStatus: offer.listingId.status, // Current listing status
        listingId: offer.listingId._id,
        orderDetails: {
          amount: order.amount,
          sellerName: seller.username,
          buyerName: buyer.username,
          listingTitle: offer.listingId?.title,
          orderDate: order.orderDate,
          orderNumber: `ORD-${order._id.toString().slice(-8).toUpperCase()}`
        }
      },
      actions: successMessage.actions,
      nextSteps: [
        'You will receive an email confirmation shortly',
        'The seller will contact you to discuss details',
        'Use the chat to communicate with the seller',
        'Track your order status in "My Orders"',
        'Note: Listing status update is handled by seller'
      ]
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    
    let userMessage = 'Payment confirmation failed';
    let detailedMessage = 'Sorry, we couldn\'t process your payment.';
    let actions = ['Try Again', 'Contact Support'];
    
    if (error.name === 'ValidationError') {
      userMessage = 'Validation error';
      detailedMessage = 'Please check your information and try again.';
    }
    
    if (session) await session.abortTransaction();
    
    res.status(500).json({
      success: false,
      error: 'Payment confirmation failed',
      userMessage,
      detailedMessage,
      actions
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ ACCEPT OFFER (SELLER) - ONLY SELLER CAN CHANGE STATUS
router.put("/accept-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID',
        userMessage: 'The offer information is invalid.',
        actions: ['View Your Offers', 'Try Again']
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
        error: 'Offer not found',
        userMessage: 'Sorry, we couldn\'t find this offer.',
        actions: ['View Offers', 'Browse Listings']
      });
    }

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized',
        userMessage: 'You are not authorized to accept this offer.',
        actions: ['View Your Listings']
      });
    }

    // Check if offer is paid
    if (offer.status !== 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Offer must be paid before acceptance',
        userMessage: 'This offer has not been paid yet.',
        actions: ['View Offer Details']
      });
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
    if (existingOrder) {
      // Update existing order
      existingOrder.status = 'in_progress';
      existingOrder.acceptedAt = new Date();
      await existingOrder.save({ session });
      
      // ✅ OPTIONAL: SELLER CAN CHOOSE TO UPDATE LISTING STATUS HERE
      // This is optional - seller decides
      const shouldUpdateListing = req.body.updateListingStatus === true;
      
      if (shouldUpdateListing) {
        await MarketplaceListing.findByIdAndUpdate(
          offer.listingId._id,
          { 
            status: 'reserved',
            reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            currentOrderId: existingOrder._id,
            lastOrderAt: new Date()
          },
          { session }
        );
      }
      
      await session.commitTransaction();
      
      return res.status(200).json({
        success: true,
        message: 'Offer accepted!',
        userMessage: 'Offer accepted successfully!',
        detailedMessage: shouldUpdateListing 
          ? 'Order updated and listing status changed to reserved.' 
          : 'Order updated. Listing status remains unchanged.',
        data: {
          orderId: existingOrder._id,
          redirectUrl: `/myorder/${existingOrder._id}`,
          listingStatus: shouldUpdateListing ? 'reserved' : offer.listingId.status,
          listingUpdated: shouldUpdateListing
        },
        actions: ['View Order', 'Message Buyer']
      });
    }

    // Update offer
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save({ session });

    // Create order
    const order = new Order({
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
      orderDate: new Date(),
      requirements: offer.requirements,
      expectedDelivery: offer.expectedDelivery
    });
    
    await order.save({ session });

    // ✅ OPTIONAL: SELLER CAN CHOOSE TO UPDATE LISTING STATUS
    const shouldUpdateListing = req.body.updateListingStatus === true;
    
    if (shouldUpdateListing) {
      await MarketplaceListing.findByIdAndUpdate(
        offer.listingId._id,
        { 
          status: 'reserved',
          reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          currentOrderId: order._id,
          lastOrderAt: new Date()
        },
        { session }
      );
    }

    // Reject other offers on same listing
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
      userMessage: 'Offer accepted successfully!',
      detailedMessage: shouldUpdateListing 
        ? 'Order created and listing status changed to reserved.' 
        : 'Order created. Listing status remains unchanged.',
      data: {
        offerId: offer._id,
        orderId: order._id,
        redirectUrl: `/myorder/${order._id}`,
        listingStatus: shouldUpdateListing ? 'reserved' : offer.listingId.status,
        listingUpdated: shouldUpdateListing
      },
      actions: ['View Order', 'Message Buyer']
    });

  } catch (error) {
    console.error('Accept offer error:', error);
    if (session) await session.abortTransaction();
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept offer',
      userMessage: 'Sorry, we couldn\'t process your request.',
      detailedMessage: 'Please try again or contact support.',
      actions: ['Try Again', 'Contact Support']
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ REJECT OFFER - DOES NOT AUTO CHANGE LISTING STATUS
router.put("/reject-offer/:id", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const userId = req.user.id;
    const offerId = req.params.id;
    const { rejectionReason } = req.body;
    
    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid offer ID',
        userMessage: 'The offer information is invalid.',
        actions: ['View Your Offers']
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
        error: 'Offer not found',
        userMessage: 'We couldn\'t find this offer.',
        actions: ['View Offers', 'Browse Listings']
      });
    }

    // Check if user is seller
    if (offer.listingId.sellerId.toString() !== userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized',
        userMessage: 'You are not authorized to reject this offer.',
        actions: ['View Your Listings']
      });
    }

    if (!['pending', 'paid', 'pending_payment'].includes(offer.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot reject offer in current state',
        userMessage: 'This offer cannot be rejected in its current state.',
        actions: ['View Offer Details']
      });
    }

    // Update offer
    offer.status = 'rejected';
    offer.rejectedAt = new Date();
    offer.rejectionReason = rejectionReason || 'Seller rejected offer';
    await offer.save({ session });

    // Refund if paid
    if (offer.status === 'paid' && offer.paymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: offer.paymentIntentId });
      } catch (refundError) {
        console.error('Refund error:', refundError.message);
      }
    }

    // ✅ OPTIONAL: SELLER CAN CHOOSE TO UPDATE LISTING STATUS
    const shouldUpdateListing = req.body.updateListingStatus === true;
    
    if (shouldUpdateListing) {
      // Check if there are other active orders
      const activeOrder = await Order.findOne({
        listingId: offer.listingId._id,
        status: { $in: ['pending_payment', 'paid', 'in_progress', 'pending_delivery'] }
      }).session(session);

      if (!activeOrder) {
        await MarketplaceListing.findByIdAndUpdate(
          offer.listingId._id,
          { status: 'active' },
          { session }
        );
      }
    }

    await session.commitTransaction();

    res.status(200).json({ 
      success: true,
      message: 'Offer rejected',
      userMessage: 'Offer rejected successfully.',
      detailedMessage: shouldUpdateListing 
        ? 'Offer rejected and listing status updated.' 
        : 'Offer rejected. Listing status remains unchanged.',
      data: {
        listingStatus: shouldUpdateListing ? 'active' : offer.listingId.status,
        listingUpdated: shouldUpdateListing,
        refundInitiated: offer.status === 'paid' && offer.paymentIntentId
      },
      actions: ['View Other Offers', 'Browse Listings']
    });
  } catch (error) {
    console.error('Reject offer error:', error);
    if (session) await session.abortTransaction();
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject offer',
      userMessage: 'Sorry, we couldn\'t process your request.',
      detailedMessage: 'Please try again or contact support.',
      actions: ['Try Again', 'Contact Support']
    });
  } finally {
    if (session) session.endSession();
  }
});

// ✅ SELLER MANUAL LISTING STATUS UPDATE
router.put("/update-listing-status/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;
    const { status, currentOrderId } = req.body;
    
    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid listing ID',
        userMessage: 'The listing information is invalid.',
        actions: ['View Your Listings']
      });
    }

    // Allowed status changes
    const allowedStatuses = ['active', 'reserved', 'sold', 'inactive', 'draft'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status',
        userMessage: 'Please provide a valid listing status.',
        actions: ['Try Again']
      });
    }

    // Find listing
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Listing not found',
        userMessage: 'We couldn\'t find this listing.',
        actions: ['View Your Listings']
      });
    }

    // Check if user is seller
    if (listing.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized',
        userMessage: 'You are not authorized to update this listing.',
        actions: ['View Your Listings']
      });
    }

    // Prepare update data
    const updateData = { status };
    
    if (status === 'reserved') {
      updateData.reservedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      updateData.currentOrderId = currentOrderId || listing.currentOrderId;
      updateData.lastOrderAt = new Date();
    } else if (status === 'active') {
      updateData.reservedUntil = null;
      updateData.currentOrderId = null;
    } else if (status === 'sold') {
      updateData.reservedUntil = null;
      updateData.currentOrderId = currentOrderId || listing.currentOrderId;
      updateData.soldAt = new Date();
    }

    // Update listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Listing status updated',
      userMessage: 'Listing status updated successfully!',
      data: {
        listing: {
          _id: updatedListing._id,
          title: updatedListing.title,
          status: updatedListing.status,
          currentOrderId: updatedListing.currentOrderId,
          reservedUntil: updatedListing.reservedUntil,
          soldAt: updatedListing.soldAt
        }
      },
      actions: ['View Listing', 'Edit Listing']
    });
  } catch (error) {
    console.error('Update listing status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update listing status',
      userMessage: 'Sorry, we couldn\'t update the listing status.',
      detailedMessage: 'Please try again or contact support.',
      actions: ['Try Again', 'Contact Support']
    });
  }
});

// ✅ GET LISTING STATUS (FOR SELLER TO MANAGE)
router.get("/seller-listing-status/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;

    if (!validateObjectId(listingId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid listing ID',
        userMessage: 'The listing information is invalid.'
      });
    }

    // Get listing with active orders
    const listing = await MarketplaceListing.findById(listingId)
      .populate('sellerId', 'username');
    
    if (!listing) {
      return res.status(404).json({ 
        success: false, 
        error: 'Listing not found',
        userMessage: 'We couldn\'t find this listing.'
      });
    }

    // Check if user is seller
    if (listing.sellerId._id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized',
        userMessage: 'You are not authorized to view this listing.'
      });
    }

    // Get active orders for this listing
    const activeOrders = await Order.find({
      listingId: listingId,
      status: { $in: ['pending_payment', 'paid', 'in_progress', 'pending_delivery'] }
    }).select('_id status amount buyerId createdAt')
      .populate('buyerId', 'username');

    // Get offers for this listing
    const offers = await Offer.find({
      listingId: listingId,
      status: { $in: ['pending', 'pending_payment', 'paid'] }
    }).select('_id status amount buyerId createdAt')
      .populate('buyerId', 'username');

    res.status(200).json({
      success: true,
      data: {
        listing: {
          _id: listing._id,
          title: listing.title,
          status: listing.status,
          currentOrderId: listing.currentOrderId,
          reservedUntil: listing.reservedUntil,
          soldAt: listing.soldAt,
          totalOrders: listing.totalOrders,
          lastOrderAt: listing.lastOrderAt
        },
        activeOrders,
        offers,
        canChangeStatus: true,
        availableStatuses: ['active', 'reserved', 'sold', 'inactive']
      },
      message: 'Listing status information',
      userMessage: 'Here is the current status of your listing.',
      actions: ['Update Status', 'View Orders', 'View Offers']
    });
  } catch (error) {
    console.error('Get seller listing status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get listing status',
      userMessage: 'Sorry, we couldn\'t retrieve the listing status.',
      actions: ['Try Again', 'Contact Support']
    });
  }
});

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

// ✅ SCHEDULED CLEANUP (NO AUTO-RENEW)
setInterval(() => {
  console.log("🕐 Running scheduled cleanup...");
  cleanupExpiredOffers().catch(console.error);
  // ❌ NO auto-renew of listings - seller must manually update
}, 30 * 60 * 1000);

module.exports = router;