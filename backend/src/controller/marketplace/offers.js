// routes/offerRoutes.js - Updated Version with Payment Validation
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const Chat = require("../../models/marketplace/Chat");
const Message = require("../../models/marketplace/messages");
const { authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');
const emailService = require('../../../services/emailService');
const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
} catch (error) {
  console.log('Firebase initialization warning:', error.message);
}

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

// ✅ FIREBASE CHAT ROOM CREATION
const createFirebaseChatRoom = async (order, buyer, seller) => {
  try {
    console.log("🔥 Creating Firebase chat room for order:", order._id);
    
    if (!admin.apps.length) {
      console.log("❌ Firebase not initialized, skipping chat room creation");
      return null;
    }
    
    const db = admin.firestore();
    
    // Create chat room ID
    const chatRoomId = `order_${order._id}_${Date.now()}`;
    
    const chatRoomRef = db.collection('chatRooms').doc(chatRoomId);
    
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
    
    await chatRoomRef.set(chatRoomData);
    
    // Add initial system message
    const welcomeMessage = {
      senderId: 'system',
      senderName: 'System',
      senderRole: 'system',
      message: `🎉 **Order #${order._id.toString().slice(-8).toUpperCase()} has been placed!**\n\nBuyer: ${buyer.username}\nSeller: ${seller.username}\nAmount: $${order.amount}\n\nPlease discuss order details here.`,
      timestamp: new Date().toISOString(),
      type: 'system',
      readBy: [],
      metadata: {
        orderId: order._id.toString(),
        isSystemMessage: true
      }
    };
    
    await chatRoomRef.collection('messages').add(welcomeMessage);
    
    console.log("✅ Firebase chat room created:", chatRoomId);
    
    // Also create a local Chat record in MongoDB
    try {
      const localChat = new Chat({
        firebaseChatId: chatRoomId,
        orderId: order._id,
        participants: [
          { userId: buyer._id, role: 'buyer', firebaseId: buyer._id.toString() },
          { userId: seller._id, role: 'seller', firebaseId: seller._id.toString() }
        ],
        listingId: order.listingId,
        status: 'active',
        lastMessageAt: new Date(),
        metadata: {
          firebaseChatId: chatRoomId,
          createdFrom: 'offer_payment'
        }
      });
      
      await localChat.save();
      console.log("✅ Local Chat record created");
    } catch (localChatError) {
      console.error("❌ Local Chat creation failed:", localChatError.message);
    }
    
    return chatRoomId;
    
  } catch (error) {
    console.error('❌ Firebase chat room creation error:', error);
    return null;
  }
};

// ✅ FUNCTION TO SEND ORDER DETAILS WITH CHAT LINK
const sendOrderDetailsWithChatLink = async (order, offer, buyer, seller) => {
  try {
    console.log("📨 Preparing professional messages with chat links...");
    
    // Create Firebase chat room
    const firebaseChatId = await createFirebaseChatRoom(order, buyer, seller);
    
    // Generate chat links
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let chatLink = `${frontendUrl}/messages`;
    
    if (firebaseChatId) {
      chatLink = `${frontendUrl}/chat/${firebaseChatId}?order=${order._id}`;
    } else {
      // Fallback to order-based messaging
      chatLink = `${frontendUrl}/messages?order=${order._id}`;
    }
    
    // Format dates
    const orderDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const expectedDelivery = offer.expectedDelivery ? 
      new Date(offer.expectedDelivery).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'Not specified';
    
    // ✅ SELLER MESSAGE
    const sellerMessageContent = `🎉 **NEW ORDER RECEIVED!**\n\n` +
      `**Order Details:**\n` +
      `📦 **Order ID:** ${order._id.toString().slice(-8).toUpperCase()}\n` +
      `👤 **Buyer:** ${buyer?.username || 'Customer'}\n` +
      `💰 **Amount:** $${offer.amount}\n` +
      `📅 **Order Date:** ${orderDate}\n` +
      `🛍️ **Service:** ${offer.listingId?.title || 'N/A'}\n\n` +
      `**Requirements:**\n` +
      `${offer.requirements || 'No specific requirements provided'}\n\n` +
      `**Expected Delivery:** ${expectedDelivery}\n\n` +
      `**Next Steps:**\n` +
      `1. Review the order requirements\n` +
      `2. Contact the buyer to confirm details\n` +
      `3. Start working on the order\n` +
      `4. Deliver through the platform\n\n` +
      `💬 **[OPEN CHAT WITH BUYER](${chatLink})**\n\n` +
      `🔒 **Payment Status:** Secured in escrow\n` +
      `💵 **Release Condition:** Upon order completion`;
    
    // ✅ BUYER MESSAGE
    const buyerMessageContent = `✅ **ORDER CONFIRMED!**\n\n` +
      `**Order Details:**\n` +
      `📦 **Order ID:** ${order._id.toString().slice(-8).toUpperCase()}\n` +
      `👤 **Seller:** ${seller.username}\n` +
      `💰 **Amount:** $${offer.amount}\n` +
      `📅 **Order Date:** ${orderDate}\n` +
      `🛍️ **Service:** ${offer.listingId?.title || 'N/A'}\n\n` +
      `**Your Requirements:**\n` +
      `${offer.requirements || 'No specific requirements provided'}\n\n` +
      `**Expected Delivery:** ${expectedDelivery}\n\n` +
      `**Next Steps:**\n` +
      `1. Communicate requirements to seller\n` +
      `2. Track progress in messages\n` +
      `3. Approve delivery when complete\n` +
      `4. Release payment after satisfaction\n\n` +
      `💬 **[OPEN CHAT WITH SELLER](${chatLink})**\n\n` +
      `🔒 **Payment Status:** Secured in escrow\n` +
      `📞 **Need Help?** Contact ${process.env.SUPPORT_EMAIL || 'support@yourwebsite.com'}`;
    
    // System user ID for system messages
    const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
    
    // ✅ SAVE SELLER MESSAGE
    const messageToSeller = new Message({
      orderId: order._id,
      senderId: systemUserId,
      receiverId: order.sellerId,
      message: sellerMessageContent,
      read: false,
      messageType: 'new_order_notification',
      metadata: {
        orderId: order._id.toString(),
        buyerId: buyer._id.toString(),
        buyerName: buyer.username,
        amount: offer.amount,
        chatLink: chatLink,
        firebaseChatId: firebaseChatId,
        listingTitle: offer.listingId?.title,
        isClickable: true,
        isSystemMessage: true,
        notificationType: 'new_order'
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    await messageToSeller.save();
    
    // ✅ SAVE BUYER MESSAGE
    const messageToBuyer = new Message({
      orderId: order._id,
      senderId: systemUserId,
      receiverId: order.buyerId,
      message: buyerMessageContent,
      read: false,
      messageType: 'order_confirmation',
      metadata: {
        orderId: order._id.toString(),
        sellerId: seller._id.toString(),
        sellerName: seller.username,
        amount: offer.amount,
        chatLink: chatLink,
        firebaseChatId: firebaseChatId,
        listingTitle: offer.listingId?.title,
        isClickable: true,
        isSystemMessage: true,
        notificationType: 'order_confirmed'
      },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    await messageToBuyer.save();
    
    console.log("✅ Professional messages sent to both users with chat links");
    
    // Also add messages to Firebase chat for better UX
    if (firebaseChatId && admin.apps.length) {
      try {
        const db = admin.firestore();
        const chatRoomRef = db.collection('chatRooms').doc(firebaseChatId);
        
        // Add system notification to Firebase chat
        const systemNotification = {
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          message: `💌 **Professional emails have been sent to both parties.**\n\nCheck your email for detailed order confirmation.`,
          timestamp: new Date().toISOString(),
          type: 'system_info',
          readBy: []
        };
        
        await chatRoomRef.collection('messages').add(systemNotification);
        console.log("✅ System notification added to Firebase chat");
      } catch (firebaseError) {
        console.error("❌ Failed to add to Firebase chat:", firebaseError.message);
      }
    }
    
    return {
      success: true,
      firebaseChatId: firebaseChatId,
      chatLink: chatLink,
      sellerMessageId: messageToSeller._id,
      buyerMessageId: messageToBuyer._id
    };
    
  } catch (error) {
    console.error('❌ Error sending messages with chat links:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// ============================
// ROUTES START HERE
// ============================

// ✅ NEW: CHECK IF USER HAS PENDING OFFER
router.get("/check-pending-offer/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { listingId } = req.params;

    if (!userId || !listingId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Listing ID are required'
      });
    }

    if (!validateObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid listing ID format'
      });
    }

    // Check for any pending offer (including pending_payment)
    const pendingOffer = await Offer.findOne({
      listingId: new mongoose.Types.ObjectId(listingId),
      buyerId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    })
    .select('_id status amount createdAt paymentIntentId')
    .lean();

    if (pendingOffer) {
      return res.status(200).json({
        success: true,
        hasPendingOffer: true,
        data: pendingOffer,
        message: 'You already have a pending offer for this listing'
      });
    }

    res.status(200).json({
      success: true,
      hasPendingOffer: false,
      message: 'No pending offer found'
    });

  } catch (error) {
    console.error('Error checking pending offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check pending offer'
    });
  }
});

// ✅ CONFIRM OFFER PAYMENT WITH PROFESSIONAL EMAILS
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment Request DETAILS:", {
    body: req.body,
    user: req.user
  });

  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    // ✅ VALIDATION
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

    if (!validateObjectId(offerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Offer ID format'
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    console.log("🔍 Searching for offer:", offerId, "for user:", userId);

    // ✅ FIND OFFER
    const offer = await Offer.findOne({
      _id: new mongoose.Types.ObjectId(offerId),
      buyerId: new mongoose.Types.ObjectId(userId)
    })
    .populate('listingId')
    .populate('buyerId', 'username email avatar')
    .session(session);

    if (!offer) {
      await session.abortTransaction();
      console.log("❌ Offer not found or access denied");
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found or access denied'
      });
    }

    console.log("✅ Offer found:", offer._id, "Status:", offer.status);

    // ✅ CHECK IF ALREADY PROCESSED
    if (offer.status === 'paid') {
      console.log("ℹ️ Offer already paid, finding existing order...");
      
      const existingOrder = await Order.findOne({ offerId: offer._id }).session(session);
      await session.abortTransaction();
      
      return res.status(200).json({
        success: true,
        message: 'Payment already confirmed',
        data: {
          orderId: existingOrder?._id,
          redirectUrl: `/orders/${existingOrder?._id}`
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
    const buyer = await mongoose.model('User').findById(userId).select('username email avatar').session(session);
    const seller = await mongoose.model('User').findById(offer.listingId.sellerId).select('username email avatar').session(session);

    if (!buyer || !seller) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'User details not found'
      });
    }

    console.log("✅ Buyer:", buyer.username, "Seller:", seller.username);

    // ✅ CREATE ORDER
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
      orderDate: new Date(),
      metadata: {
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        offerAmount: offer.amount,
        buyerNote: offer.message || ''
      }
    };

    // Add optional fields
    if (offer.requirements) orderData.requirements = offer.requirements;
    if (offer.expectedDelivery) orderData.expectedDelivery = offer.expectedDelivery;
    if (offer.message) orderData.buyerNote = offer.message;

    console.log("📦 Creating order with data:", orderData);

    const order = new Order(orderData);
    await order.save({ session });
    console.log("✅ Order created:", order._id);

    // ✅ UPDATE LISTING - KEEP ACTIVE, ONLY UPDATE ORDER COUNT
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        // DO NOT change status - keep it active
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
        // Do NOT set reservedUntil or change status
      },
      { session }
    );

    console.log("✅ Listing order count updated, listing remains active");

    // ✅ COMMIT TRANSACTION FIRST
    await session.commitTransaction();
    console.log("🎉 Database transaction completed successfully");

    // ✅ NOW SEND PROFESSIONAL MESSAGES WITH CHAT LINKS
    let notificationResults = {};
    let chatLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/messages?order=${order._id}`;
    
    try {
      // Send professional messages with chat links
      const messageResult = await sendOrderDetailsWithChatLink(order, offer, buyer, seller);
      notificationResults.messages = messageResult;
      
      if (messageResult.chatLink) {
        chatLink = messageResult.chatLink;
      }
      
      console.log("✅ Order notification messages sent");
      
      // ✅ SEND PROFESSIONAL GMAIL EMAILS
      try {
        console.log("📧 Starting professional email notifications...");
        
        // Send email to seller
        console.log(`📧 Sending email to seller: ${seller.email}`);
        await emailService.sendOrderConfirmationToSeller(order, buyer, seller, chatLink);
        console.log("✅ Professional email sent to seller:", seller.email);
        
        // Send email to buyer
        console.log(`📧 Sending email to buyer: ${buyer.email}`);
        await emailService.sendOrderConfirmationToBuyer(order, buyer, seller, chatLink);
        console.log("✅ Professional email sent to buyer:", buyer.email);
        
        console.log("✅ Professional email notifications sent successfully to BOTH parties");
        notificationResults.emails = {
          seller: true,
          buyer: true,
          status: 'sent'
        };
        
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
        notificationResults.emails = {
          seller: false,
          buyer: false,
          status: 'failed',
          error: emailError.message
        };
      }
      
    } catch (notificationError) {
      console.error('❌ Notification sending failed:', notificationError);
      notificationResults.error = notificationError.message;
    }

    // ✅ SUCCESS RESPONSE WITH ALL DETAILS
    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully! Check your email for professional order details.',
      data: {
        orderId: order._id,
        redirectUrl: `/orders/${order._id}`,
        chatUrl: chatLink,
        offerId: offer._id,
        notifications: {
          messagesSent: notificationResults.messages?.success || false,
          firebaseChatId: notificationResults.messages?.firebaseChatId,
          chatLink: chatLink,
          emailsSent: notificationResults.emails?.status === 'sent',
          buyerEmail: buyer.email,
          sellerEmail: seller.email,
          emailStatus: notificationResults.emails?.status === 'sent' ? 
            'Professional emails sent to both buyer and seller' : 
            'Email sending failed - check logs'
        },
        orderDetails: {
          amount: order.amount,
          sellerName: seller.username,
          buyerName: buyer.username,
          listingTitle: offer.listingId?.title,
          orderDate: order.orderDate,
          requirements: order.requirements || 'None specified'
        }
      }
    });

  } catch (error) {
    console.error('❌ Confirm Offer Payment Error:', error);
    
    if (session) {
      await session.abortTransaction();
    }

    res.status(500).json({
      success: false,
      error: 'Payment confirmation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code || 'INTERNAL_ERROR'
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ MAKE OFFER WITH TEMPORARY PAYMENT SESSION (UPDATED)
router.post("/make-offer", authenticateMiddleware, logRequest("MAKE_OFFER"), async (req, res) => {
  let session;
  let stripePaymentIntent = null;
  let temporaryOffer = null;
  
  try {
    console.log("=== MAKE OFFER WITH TEMPORARY SESSION ===");
    
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

    // ✅ CRITICAL FIX: Check for existing offers BEFORE creating anything
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: { $in: ['pending', 'pending_payment', 'paid', 'accepted'] }
    }).session(session);

    if (existingOffer) {
      await session.abortTransaction();
      
      // Check if existing offer has a payment intent that needs to be completed
      if (existingOffer.status === 'pending_payment' && existingOffer.paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(existingOffer.paymentIntentId);
          if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_confirmation') {
            // Payment intent exists but not completed - return it for completion
            return res.status(200).json({
              success: true,
              message: 'You have an existing offer that needs payment completion',
              data: {
                offer: {
                  _id: existingOffer._id,
                  amount: existingOffer.amount,
                  status: existingOffer.status,
                  paymentIntentId: existingOffer.paymentIntentId,
                  createdAt: existingOffer.createdAt
                },
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                isExistingOffer: true,
                nextSteps: 'Complete payment for your existing offer'
              }
            });
          }
        } catch (stripeError) {
          console.error('Error retrieving existing payment intent:', stripeError);
        }
      }
      
      return res.status(400).json({ 
        success: false,
        error: 'You already have a pending offer for this listing',
        existingOfferId: existingOffer._id,
        existingOfferStatus: existingOffer.status
      });
    }

    // ✅ CREATE STRIPE PAYMENT INTENT FIRST (BEFORE CREATING OFFER)
    console.log("💳 Creating Stripe payment intent...");
    
    try {
      stripePaymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(offerAmount * 100),
        currency: 'usd',
        metadata: {
          listingId: listingId.toString(),
          buyerId: userId.toString(),
          sellerId: listing.sellerId.toString(),
          type: 'offer_payment',
          temporary: 'true' // Mark as temporary until payment confirmed
        },
        automatic_payment_methods: { enabled: true },
        description: `Offer for: ${listing.title}`,
        payment_method_options: {
          card: {
            capture_method: 'manual', // Don't capture until confirmed
          }
        }
      });

      console.log("✅ Stripe payment intent created:", stripePaymentIntent.id);

    } catch (stripeError) {
      await session.abortTransaction();
      console.error('❌ Stripe payment intent creation failed:', stripeError);
      
      return res.status(400).json({ 
        success: false,
        error: 'Payment processing error',
        details: stripeError.message
      });
    }

    // ✅ CREATE TEMPORARY OFFER IN DATABASE
    const offerData = {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || '',
      paymentIntentId: stripePaymentIntent.id,
      status: 'pending_payment',
      requirements: requirements || '',
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      isTemporary: true, // Mark as temporary
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expires in 30 minutes if not paid
    };

    temporaryOffer = new Offer(offerData);
    await temporaryOffer.save({ session });

    console.log("✅ Temporary offer saved to database:", temporaryOffer._id);

    // ✅ COMMIT TRANSACTION
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Please complete payment to submit your offer. Offer will expire in 30 minutes if not paid.',
      data: {
        offer: {
          _id: temporaryOffer._id,
          amount: temporaryOffer.amount,
          status: temporaryOffer.status,
          paymentIntentId: temporaryOffer.paymentIntentId,
          createdAt: temporaryOffer.createdAt,
          expiresAt: temporaryOffer.expiresAt,
          isTemporary: true
        },
        clientSecret: stripePaymentIntent.client_secret,
        paymentIntentId: stripePaymentIntent.id,
        amount: offerAmount,
        nextSteps: 'Complete payment to submit your offer. If payment is not completed within 30 minutes, this offer will be automatically cancelled.'
      }
    });

  } catch (error) {
    console.error('❌ Error making offer:', error);
    
    // ✅ IMPORTANT: Cleanup if error occurs
    try {
      // Cancel Stripe payment intent if created
      if (stripePaymentIntent && stripePaymentIntent.id) {
        await stripe.paymentIntents.cancel(stripePaymentIntent.id);
        console.log("✅ Cleaned up Stripe payment intent:", stripePaymentIntent.id);
      }
      
      // Delete temporary offer if created
      if (temporaryOffer && temporaryOffer._id) {
        await Offer.findByIdAndDelete(temporaryOffer._id);
        console.log("✅ Cleaned up temporary offer:", temporaryOffer._id);
      }
    } catch (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
    }
    
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

// ✅ NEW: CLEANUP EXPIRED TEMPORARY OFFERS
const cleanupExpiredOffers = async () => {
  try {
    const expiredOffers = await Offer.find({
      status: 'pending_payment',
      expiresAt: { $lt: new Date() }
    });

    for (const offer of expiredOffers) {
      try {
        console.log(`🗑️ Cleaning up expired offer: ${offer._id}`);
        
        // Cancel Stripe payment intent if exists
        if (offer.paymentIntentId) {
          try {
            await stripe.paymentIntents.cancel(offer.paymentIntentId);
            console.log(`✅ Cancelled Stripe payment intent: ${offer.paymentIntentId}`);
          } catch (stripeError) {
            console.error(`❌ Failed to cancel payment intent: ${offer.paymentIntentId}`, stripeError);
          }
        }
        
        // Delete the expired offer
        await Offer.findByIdAndDelete(offer._id);
        console.log(`✅ Deleted expired offer: ${offer._id}`);
        
      } catch (offerError) {
        console.error(`❌ Error cleaning up offer ${offer._id}:`, offerError);
      }
    }
    
    console.log(`✅ Cleaned up ${expiredOffers.length} expired offers`);
  } catch (error) {
    console.error('❌ Error in cleanupExpiredOffers:', error);
  }
};

// ✅ NEW: CANCEL TEMPORARY OFFER (for when user goes back without paying)
router.post("/cancel-temporary-offer/:offerId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { offerId } = req.params;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
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
        console.log(`✅ Cancelled payment intent: ${offer.paymentIntentId}`);
      } catch (stripeError) {
        console.error('Error cancelling payment intent:', stripeError);
      }
    }

    // Delete the temporary offer
    await Offer.findByIdAndDelete(offerId);
    console.log(`✅ Deleted temporary offer: ${offerId}`);

    res.status(200).json({
      success: true,
      message: 'Temporary offer cancelled successfully',
      data: {
        offerId: offerId,
        cancelledAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error cancelling temporary offer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cancel temporary offer' 
    });
  }
});

// ✅ NEW: GET OFFER PAYMENT STATUS
router.get("/payment-status/:offerId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { offerId } = req.params;

    if (!validateObjectId(offerId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid offer ID format' 
      });
    }

    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId
    }).select('status paymentIntentId isTemporary expiresAt');

    if (!offer) {
      return res.status(404).json({ 
        success: false,
        error: 'Offer not found' 
      });
    }

    let stripeStatus = null;
    if (offer.paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(offer.paymentIntentId);
        stripeStatus = paymentIntent.status;
      } catch (stripeError) {
        console.error('Error retrieving Stripe status:', stripeError);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        offerId: offer._id,
        status: offer.status,
        stripeStatus: stripeStatus,
        isTemporary: offer.isTemporary,
        expiresAt: offer.expiresAt,
        isExpired: offer.expiresAt && offer.expiresAt < new Date(),
        paymentIntentId: offer.paymentIntentId
      }
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get payment status' 
    });
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

    // Prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());

    const offers = await Offer.find({ 
      buyerId: userId,
      status: { $ne: 'pending_payment' } // Don't show temporary unpaid offers
    })
      .populate({
        path: 'listingId',
        select: 'title price mediaUrls status sellerId category condition',
        populate: {
          path: 'sellerId',
          select: 'username avatar rating email'
        }
      })
      .populate('buyerId', 'username avatar email')
      .sort({ createdAt: -1 })
      .lean();

    // Transform the data for better frontend consumption
    const transformedOffers = offers.map(offer => ({
      ...offer,
      listing: offer.listingId,
      buyer: offer.buyerId,
      listingId: offer.listingId?._id,
      buyerId: offer.buyerId?._id
    }));

    res.status(200).json({
      success: true,
      data: {
        offers: transformedOffers,
        count: transformedOffers.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching my offers:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to fetch offers';
    let statusCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = 'Invalid user ID format';
      statusCode = 400;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Data validation error';
      statusCode = 400;
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      .populate('buyerId', 'username avatar email rating')
      .populate('listingId', 'title price mediaUrls status sellerId description')
      .populate('listingId.sellerId', 'username avatar rating');

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

    // Check if there's an associated order
    const order = await Order.findOne({ offerId: offer._id })
      .select('status paidAt acceptedAt completedAt');
    
    // Check if there's a chat room
    const chat = await Chat.findOne({ 
      $or: [
        { orderId: order?._id },
        { firebaseChatId: { $regex: `order_${order?._id}` } }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        ...offer.toObject(),
        associatedOrder: order,
        chatRoom: chat ? {
          _id: chat._id,
          firebaseChatId: chat.firebaseChatId,
          status: chat.status
        } : null,
        chatLink: chat?.firebaseChatId ? 
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/chat/${chat.firebaseChatId}` : null
      },
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
      order.status = 'in_progress';
      order.acceptedAt = new Date();
      await order.save({ session });
      
      // Send acceptance notification to buyer
      const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
      const acceptanceMessage = new Message({
        orderId: order._id,
        senderId: systemUserId,
        receiverId: order.buyerId,
        message: `✅ **Offer Accepted!**\n\n${offer.listingId.sellerId.username} has accepted your offer for "${offer.listingId.title}".\n\n**Order Status:** In Progress\n**Amount:** $${offer.amount}\n\nYou can now discuss the project details in the chat.`,
        read: false,
        messageType: 'offer_accepted'
      });
      
      await acceptanceMessage.save();
    }

    // ✅ MARK LISTING AS RESERVED WHEN SELLER ACCEPTS
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'reserved',  // Only reserve when seller accepts
        reservedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        soldAt: new Date()
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

    // ✅ NOTIFY BUYER
    const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
    const rejectionMessage = new Message({
      orderId: offer._id,
      senderId: systemUserId,
      receiverId: offer.buyerId._id,
      message: `❌ **Offer Rejected**\n\nYour offer for "${offer.listingId.title}" has been rejected by the seller.\n\n**Reason:** ${offer.rejectionReason}\n**Amount:** $${offer.amount}\n\nYou can make another offer or browse other listings.`,
      read: false,
      messageType: 'offer_rejected'
    });
    
    await rejectionMessage.save();

    // ✅ UPDATE ORDER STATUS IF EXISTS
    if (offer.status === 'paid') {
      await Order.findOneAndUpdate(
        { offerId: offer._id },
        { status: 'cancelled' },
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
        }
      }
    }

    // ✅ MAKE LISTING ACTIVE AGAIN IF IT WAS RESERVED
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
      data: { 
        offer,
        buyerNotified: true 
      }
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

    // ✅ NOTIFY SELLER
    const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
    const cancellationMessage = new Message({
      orderId: offer._id,
      senderId: systemUserId,
      receiverId: offer.listingId.sellerId,
      message: `❌ **Offer Cancelled**\n\n${offer.buyerId.username} has cancelled their offer for "${offer.listingId.title}".\n\n**Amount:** $${offer.amount}\n**Reason:** Buyer cancelled the offer`,
      read: false,
      messageType: 'offer_cancelled'
    });
    
    await cancellationMessage.save();

    // ✅ IF PAYMENT WAS STARTED BUT NOT COMPLETED, CANCEL PAYMENT INTENT
    if (offer.paymentIntentId && offer.status === 'pending_payment') {
      try {
        await stripe.paymentIntents.cancel(offer.paymentIntentId);
        console.log("✅ Payment intent cancelled for offer:", offer._id);
      } catch (stripeError) {
        console.error('Payment cancellation error:', stripeError);
      }
    }

    // ✅ MAKE LISTING ACTIVE AGAIN IF IT WAS RESERVED
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
      message: 'Offer cancelled successfully', 
      data: { 
        offer,
        sellerNotified: true 
      }
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
    const { listingId, requirements } = req.body;
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
      orderType: 'direct_purchase',
      amount: listing.price,
      status: 'pending_payment',
      stripePaymentIntentId: paymentIntent.id,
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false,
      orderDate: new Date(),
      requirements: requirements || ''
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

    // ✅ DO NOT RESERVE LISTING - KEEP IT ACTIVE
    // Listing remains active even after direct purchase initiation
    // Only update order count
    await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        // status: 'active' remains unchanged
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
        // Do NOT set reservedUntil
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

// ✅ GET CHAT LINK FOR ORDER
router.get("/chat-link/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { orderId } = req.params;
    
    if (!validateObjectId(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID format' 
      });
    }
    
    const order = await Order.findById(orderId)
      .select('buyerId sellerId listingId');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    // Check if user is part of this order
    if (order.buyerId.toString() !== userId.toString() && 
        order.sellerId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized to access this chat' 
      });
    }
    
    // Find chat
    const chat = await Chat.findOne({ 
      orderId: order._id 
    }).select('firebaseChatId status');
    
    if (!chat) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat not found for this order' 
      });
    }
    
    const chatLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat/${chat.firebaseChatId}?order=${orderId}`;
    
    res.status(200).json({
      success: true,
      data: {
        chatLink: chatLink,
        firebaseChatId: chat.firebaseChatId,
        orderId: order._id,
        directLink: `/chat/${chat.firebaseChatId}`
      }
    });
    
  } catch (error) {
    console.error('Error getting chat link:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get chat link' 
    });
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

// ✅ GET MESSAGES FOR ORDER
router.get("/messages/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { orderId } = req.params;
    
    if (!validateObjectId(orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID format' 
      });
    }
    
    // Check if user has access to this order
    const order = await Order.findById(orderId)
      .select('buyerId sellerId');
    
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
        error: 'Not authorized to view these messages' 
      });
    }
    
    // Get messages for this order
    const messages = await Message.find({
      orderId: orderId,
      $or: [
        { receiverId: userId },
        { senderId: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
      orderId: orderId
    });
    
  } catch (error) {
    console.error('Error fetching order messages:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch messages' 
    });
  }
});

// ✅ DELETE ALL OFFERS (TESTING ONLY)
router.delete("/delete-all-offers", async (req, res) => {
  try {
    const result = await Offer.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} offers from the database.`);

    res.status(200).json({
      success: true,
      message: `All offers deleted successfully (${result.deletedCount} offers removed).`
    });
  } catch (error) {
    console.error("❌ Error deleting all offers:", error);
    res.status(500).json({ error: "Failed to delete all offers" });
  }
});

// ✅ NEW: CLEANUP EXPIRED OFFERS CRON JOB ENDPOINT
router.post("/cleanup-expired-offers", async (req, res) => {
  try {
    await cleanupExpiredOffers();
    res.status(200).json({
      success: true,
      message: "Expired offers cleanup completed"
    });
  } catch (error) {
    console.error("Error in cleanup endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Cleanup failed"
    });
  }
});

// ✅ HEALTH CHECK ENDPOINT
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Offer routes are healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      stripe: "configured",
      firebase: admin.apps.length > 0 ? "initialized" : "not_initialized",
      emailService: process.env.GMAIL_USER ? "configured" : "not_configured"
    }
  });
});

// ✅ SCHEDULE CLEANUP JOB (RUN EVERY HOUR)
setInterval(() => {
  console.log("🕐 Running scheduled cleanup of expired offers...");
  cleanupExpiredOffers();
}, 60 * 60 * 1000); // Run every hour

module.exports = router;