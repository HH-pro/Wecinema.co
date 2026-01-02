// routes/offerRoutes.js - Updated Version
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

// ✅ CONFIRM OFFER PAYMENT AND CREATE OFFER + ORDER
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  console.log("🔍 Confirm Offer Payment Request DETAILS:", {
    body: req.body,
    user: req.user
  });

  let session;
  try {
    const { paymentIntentId, listingId, amount, requirements, expectedDelivery, message } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    // ✅ VALIDATION
    if (!paymentIntentId || !listingId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment Intent ID, Listing ID, and amount are required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!validateObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Listing ID format'
      });
    }

    const offerAmount = parseFloat(amount);
    if (!validateAmount(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required (minimum $0.50)'
      });
    }

    // ✅ VERIFY STRIPE PAYMENT FIRST
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log("💳 Stripe Payment Intent Status:", paymentIntent.status);
    } catch (stripeError) {
      console.error('Stripe retrieval error:', stripeError);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed',
        details: stripeError.message
      });
    }

    // ✅ CHECK PAYMENT STATUS
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        details: `Current status: ${paymentIntent.status}`
      });
    }

    // ✅ CHECK IF PAYMENT IS FOR THIS USER AND LISTING
    if (paymentIntent.metadata.buyerId !== userId.toString() || 
        paymentIntent.metadata.listingId !== listingId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed - mismatch in payment details'
      });
    }

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    console.log("🔍 Starting transaction for offer creation...");

    // ✅ FIND LISTING
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
      status: { $in: ['paid', 'accepted', 'pending_payment'] }
    }).session(session);

    if (existingOffer) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        error: 'You already have an active offer for this listing',
        existingOfferId: existingOffer._id
      });
    }

    // ✅ CREATE OFFER IN DATABASE
    const offerData = {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || '',
      paymentIntentId: paymentIntent.id,
      status: 'paid', // Directly set as paid since payment is confirmed
      requirements: requirements || '',
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      paidAt: new Date()
    };

    const offer = new Offer(offerData);
    await offer.save({ session });

    console.log("✅ Offer created in database:", offer._id, "Status:", offer.status);

    // ✅ GET BUYER AND SELLER DETAILS
    const buyer = await mongoose.model('User').findById(userId).select('username email avatar').session(session);
    const seller = await mongoose.model('User').findById(listing.sellerId).select('username email avatar').session(session);

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
      sellerId: listing.sellerId,
      listingId: listing._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'paid',
      stripePaymentIntentId: paymentIntent.id,
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
      listing._id, 
      { 
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
      },
      { session }
    );

    console.log("✅ Listing order count updated, listing remains active");

    // ✅ COMMIT TRANSACTION
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
      message: 'Payment confirmed and offer created successfully! Check your email for professional order details.',
      data: {
        offer: {
          _id: offer._id,
          amount: offer.amount,
          status: offer.status,
          createdAt: offer.createdAt
        },
        orderId: order._id,
        redirectUrl: `/orders/${order._id}`,
        chatUrl: chatLink,
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
          listingTitle: listing.title,
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
// ✅ MAKE OFFER WITH PAYMENT REQUIRED FIRST - FIXED VERSION
router.post("/make-offer", authenticateMiddleware, logRequest("MAKE_OFFER"), async (req, res) => {
  console.log("🔍 MAKE OFFER REQUEST RECEIVED ====================");
  
  try {
    // Log complete request details
    console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
    console.log("👤 User from auth:", {
      id: req.user.id,
      _id: req.user._id,
      userId: req.user.userId,
      email: req.user.email
    });
    
    const { listingId, amount, message, requirements, expectedDelivery } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // ✅ COMPREHENSIVE VALIDATION WITH BETTER LOGGING
    if (!userId) {
      console.error("❌ AUTH ERROR: No user ID found in request");
      console.error("User object:", req.user);
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required. Please login again.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!listingId || !amount) {
      console.error("❌ VALIDATION ERROR: Missing required fields");
      console.error("Received:", { listingId, amount });
      return res.status(400).json({ 
        success: false,
        error: 'Listing ID and amount are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (!validateObjectId(listingId)) {
      console.error("❌ VALIDATION ERROR: Invalid listing ID format");
      console.error("Listing ID:", listingId);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid listing ID format',
        code: 'INVALID_LISTING_ID'
      });
    }

    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount < 0.5) {
      console.error("❌ VALIDATION ERROR: Invalid amount");
      console.error("Amount:", amount, "Parsed:", offerAmount);
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required (minimum $0.50)',
        code: 'INVALID_AMOUNT',
        minAmount: 0.5
      });
    }

    console.log("✅ Basic validation passed");

    // ✅ FIND LISTING WITH ERROR HANDLING
    console.log("🔍 Looking for listing:", listingId);
    let listing;
    try {
      listing = await MarketplaceListing.findById(listingId).lean();
      if (!listing) {
        console.error("❌ LISTING NOT FOUND:", listingId);
        return res.status(404).json({ 
          success: false,
          error: 'Listing not found',
          code: 'LISTING_NOT_FOUND'
        });
      }
      console.log("✅ Listing found:", listing.title);
    } catch (dbError) {
      console.error("❌ DATABASE ERROR finding listing:", dbError.message);
      return res.status(500).json({ 
        success: false,
        error: 'Database error',
        code: 'DB_ERROR'
      });
    }

    if (listing.status !== 'active') {
      console.error("❌ LISTING NOT ACTIVE:", listing.status);
      return res.status(400).json({ 
        success: false,
        error: 'Listing is not available for offers',
        code: 'LISTING_INACTIVE',
        currentStatus: listing.status
      });
    }

    // Check if user is not the seller
    if (listing.sellerId.toString() === userId.toString()) {
      console.error("❌ USER IS SELLER:", userId);
      return res.status(400).json({ 
        success: false,
        error: 'Cannot make offer on your own listing',
        code: 'OWN_LISTING'
      });
    }

    console.log("✅ Listing validation passed");

    // ✅ CHECK FOR EXISTING OFFERS
    console.log("🔍 Checking for existing offers...");
    try {
      const existingOffer = await Offer.findOne({
        listingId,
        buyerId: userId,
        status: { $in: ['paid', 'accepted', 'pending_payment'] }
      }).lean();

      if (existingOffer) {
        console.error("❌ EXISTING OFFER FOUND:", existingOffer._id);
        return res.status(400).json({ 
          success: false,
          error: 'You already have an active offer for this listing',
          code: 'DUPLICATE_OFFER',
          existingOfferId: existingOffer._id,
          existingStatus: existingOffer.status
        });
      }
      console.log("✅ No existing offers found");
    } catch (dbError) {
      console.error("❌ DATABASE ERROR checking offers:", dbError.message);
      return res.status(500).json({ 
        success: false,
        error: 'Database error checking offers',
        code: 'DB_ERROR_OFFERS'
      });
    }

    console.log("✅ All validations passed successfully");

    // ✅ CREATE STRIPE PAYMENT INTENT
    console.log("💳 Creating Stripe payment intent...");
    console.log("Stripe Secret Key available:", process.env.STRIPE_SECRET_KEY ? "YES" : "NO");
    console.log("Amount in cents:", Math.round(offerAmount * 100));
    
    let paymentIntent;
    try {
      // IMPORTANT: Make sure Stripe is properly initialized
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      // Create payment intent with minimal required params first
      const createParams = {
        amount: Math.round(offerAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          listingId: listingId.toString(),
          buyerId: userId.toString(),
          sellerId: listing.sellerId.toString(),
          type: 'offer_payment',
          offerAmount: offerAmount.toString(),
          listingTitle: listing.title || 'Untitled Listing'
        },
        automatic_payment_methods: {
          enabled: true
        },
        description: `Offer for: ${listing.title || 'Listing'}`
      };

      // Add optional fields if they exist
      if (requirements) createParams.metadata.requirements = requirements;
      if (expectedDelivery) createParams.metadata.expectedDelivery = expectedDelivery;
      if (message) createParams.metadata.message = message;

      console.log("📋 Stripe create params:", JSON.stringify(createParams, null, 2));

      paymentIntent = await stripe.paymentIntents.create(createParams);
      
      console.log("✅ STRIPE PAYMENT INTENT CREATED SUCCESSFULLY!");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Client Secret Present:", !!paymentIntent.client_secret);
      console.log("Status:", paymentIntent.status);
      console.log("Amount (cents):", paymentIntent.amount);
      console.log("Amount (dollars):", paymentIntent.amount / 100);

    } catch (stripeError) {
      console.error("❌ STRIPE ERROR DETAILS:");
      console.error("Type:", stripeError.type);
      console.error("Code:", stripeError.code);
      console.error("Message:", stripeError.message);
      console.error("Stack:", stripeError.stack);
      
      // Check for specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        console.error("Stripe Invalid Request - check API key and parameters");
      }
      
      if (stripeError.code === 'resource_missing') {
        console.error("Stripe resource missing - check API key");
      }

      return res.status(500).json({ 
        success: false,
        error: 'Payment system error',
        details: stripeError.message,
        code: stripeError.code || 'STRIPE_ERROR',
        stripeErrorType: stripeError.type
      });
    }

    // ✅ VERIFY CLIENT SECRET IS PRESENT
    if (!paymentIntent.client_secret) {
      console.error("❌ CRITICAL: No client secret in payment intent response!");
      console.error("Payment Intent Object:", paymentIntent);
      
      // Try to debug why client_secret might be missing
      console.error("Check if payment intent is in correct status:", paymentIntent.status);
      console.error("Payment intent created_at:", paymentIntent.created);
      
      return res.status(500).json({ 
        success: false,
        error: 'Payment setup failed - no client secret returned',
        code: 'NO_CLIENT_SECRET',
        paymentIntentId: paymentIntent.id,
        paymentIntentStatus: paymentIntent.status,
        note: 'Please check Stripe configuration and webhook settings'
      });
    }

    console.log("🎉 SUCCESS: Payment intent created with client secret");

    // ✅ CREATE RESPONSE
    const responseData = {
      success: true,
      message: 'Payment intent created successfully. Please complete payment to submit your offer.',
      data: {
        payment: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          amount: offerAmount,
          currency: 'usd',
          status: paymentIntent.status
        },
        offerDetails: {
          listingId: listingId,
          listingTitle: listing.title,
          amount: offerAmount,
          requirements: requirements || '',
          expectedDelivery: expectedDelivery || '',
          message: message || ''
        },
        nextSteps: [
          'Complete payment using the client secret above',
          'Once payment is successful, offer will be automatically created',
          'Seller will be notified immediately'
        ]
      }
    };

    console.log("📤 Sending response with client secret...");
    console.log("Response contains clientSecret:", !!responseData.data.payment.clientSecret);

    res.status(200).json(responseData);

  } catch (error) {
    console.error("❌ UNEXPECTED ERROR IN MAKE OFFER ENDPOINT:");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("Full Error Object:", error);

    res.status(500).json({ 
      success: false,
      error: 'Internal server error processing offer',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
      timestamp: new Date().toISOString()
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
    
    const offers = await Offer.find({ listingId: { $in: listingIds } })
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

    const offers = await Offer.find({ buyerId: userId })
      .populate('listingId', 'title price mediaUrls status sellerId')
      .populate('listingId.sellerId', 'username avatar rating')
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
// ✅ STRIPE WEBHOOK FOR OFFER PAYMENTS
router.post("/stripe-webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulOfferPayment(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      console.log('❌ Payment failed:', event.data.object.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// ✅ HANDLE SUCCESSFUL OFFER PAYMENT
const handleSuccessfulOfferPayment = async (paymentIntent) => {
  let session;
  try {
    const metadata = paymentIntent.metadata;
    
    // Check if this is an offer payment
    if (metadata.type !== 'offer_payment') {
      console.log('Not an offer payment, skipping');
      return;
    }

    const { listingId, buyerId, sellerId } = metadata;
    
    if (!listingId || !buyerId) {
      console.error('Missing metadata in payment intent');
      return;
    }

    console.log(`🎯 Processing successful offer payment: ${paymentIntent.id}`);

    // ✅ START TRANSACTION
    session = await mongoose.startSession();
    session.startTransaction();

    // Check if offer already exists
    const existingOffer = await Offer.findOne({
      paymentIntentId: paymentIntent.id,
      status: 'paid'
    }).session(session);

    if (existingOffer) {
      console.log('✅ Offer already exists, skipping:', existingOffer._id);
      await session.abortTransaction();
      return;
    }

    // ✅ CREATE OFFER
    const offerData = {
      buyerId: buyerId,
      listingId: listingId,
      amount: parseFloat(paymentIntent.amount) / 100,
      message: metadata.message || '',
      paymentIntentId: paymentIntent.id,
      status: 'paid',
      requirements: metadata.requirements || '',
      expectedDelivery: metadata.expectedDelivery ? new Date(metadata.expectedDelivery) : null,
      paidAt: new Date()
    };

    const offer = new Offer(offerData);
    await offer.save({ session });

    // ✅ CREATE ORDER
    const order = new Order({
      buyerId: buyerId,
      sellerId: sellerId,
      listingId: listingId,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'paid',
      stripePaymentIntentId: paymentIntent.id,
      paidAt: new Date(),
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false,
      orderDate: new Date(),
      requirements: offer.requirements,
      metadata: {
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        offerAmount: offer.amount,
        buyerNote: offer.message || ''
      }
    });

    await order.save({ session });

    // ✅ UPDATE LISTING
    await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        lastOrderAt: new Date(),
        $inc: { totalOrders: 1 }
      },
      { session }
    );

    await session.commitTransaction();
    console.log(`✅ Offer and order created via webhook: ${offer._id}, ${order._id}`);

    // ✅ NOTIFY USERS (You can trigger email notifications here)
    // This would be similar to the notification logic in confirm-offer-payment

  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    if (session) {
      await session.abortTransaction();
    }
  } finally {
    if (session) {
      session.endSession();
    }
  }
};
module.exports = router;