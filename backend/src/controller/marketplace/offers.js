const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const Chat = require("../../models/marketplace/Chat"); // Add Chat model
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// Direct Stripe keys
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');

// ✅ UPDATED: Make Offer with Immediate Payment
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== MAKE OFFER WITH IMMEDIATE PAYMENT ===");
    
    const { listingId, amount, message, requirements, expectedDelivery } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // Validation
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!listingId || !amount) {
      return res.status(400).json({ error: 'Listing ID and amount are required' });
    }

    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (offerAmount < 0.50) {
      return res.status(400).json({ error: 'Amount must be at least $0.50' });
    }

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available for offers' });
    }

    // Check if user is not the seller
    if (listing.sellerId.toString() === userId.toString()) {
      return res.status(400).json({ error: 'Cannot make offer on your own listing' });
    }

    // Check for existing offers
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: { $in: ['pending', 'pending_payment', 'accepted'] }
    });

    if (existingOffer) {
      return res.status(400).json({ error: 'You already have a pending offer for this listing' });
    }

    // ✅ CREATE STRIPE PAYMENT INTENT (Immediate payment)
    console.log("💳 Creating Stripe payment intent for immediate payment...");
    
    const paymentIntent = await stripe.paymentIntents.create({
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

    // Create offer in database with payment details
    const offerData = {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || '',
      paymentIntentId: paymentIntent.id,
      status: 'pending_payment' // Waiting for payment completion
    };

    // Add optional fields
    if (requirements) offerData.requirements = requirements;
    if (expectedDelivery) offerData.expectedDelivery = new Date(expectedDelivery);

    const offer = new Offer(offerData);
    await offer.save();

    console.log("✅ Offer saved to database:", offer._id);

    res.status(201).json({
      success: true,
      message: 'Please complete payment to submit your offer.',
      offer: {
        _id: offer._id,
        amount: offer.amount,
        status: offer.status,
        paymentIntentId: offer.paymentIntentId
      },
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: offerAmount
    });

  } catch (error) {
    console.error('❌ Error making offer:', error);
    res.status(500).json({ 
      error: 'Failed to make offer',
      details: error.message
    });
  }
});
// ✅ UPDATED: Confirm Offer Payment and Create Order Immediately
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  let session;
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    if (!offerId || !paymentIntentId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Offer ID and Payment Intent ID are required'
      });
    }

    console.log("🔍 Confirming offer payment and creating order:", { 
      offerId, 
      paymentIntentId,
      userId 
    });

    // Start MongoDB session for transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find the offer with populated listing
    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      paymentIntentId: paymentIntentId
    })
    .populate('listingId')
    .populate('buyerId', 'username email')
    .session(session);

    if (!offer) {
      await session.abortTransaction();
      return res.status(404).json({ 
        error: 'Offer not found or access denied',
        details: 'Please check the offer ID and try again'
      });
    }

    // Check if offer is already paid
    if (offer.status === 'paid') {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Offer already paid',
        details: 'This offer has already been processed'
      });
    }

    // Verify payment intent with Stripe
    console.log("💳 Verifying payment intent with Stripe...");
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Payment not completed', 
        paymentStatus: paymentIntent.status,
        details: `Payment status: ${paymentIntent.status}. Please try again.`
      });
    }

    // ✅ UPDATE OFFER STATUS
    console.log("✅ Updating offer status to paid...");
    offer.status = 'paid';
    offer.paidAt = new Date();
    offer.paymentStatus = 'completed';
    await offer.save({ session });

    console.log("✅ Offer payment confirmed:", offer._id);

    // ✅ CREATE ORDER IMMEDIATELY (Not waiting for seller acceptance)
    console.log("🛒 Creating order immediately after payment...");
    const orderData = {
      buyerId: userId,
      sellerId: offer.listingId.sellerId,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'paid_offer',
      amount: offer.amount,
      status: 'pending_acceptance', // Waiting for seller to accept
      paymentStatus: 'paid', // Payment is already done
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
      requirements: offer.requirements,
      expectedDelivery: offer.expectedDelivery,
      revisions: 0,
      maxRevisions: offer.listingId.revisions || 3,
      paymentReleased: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const order = new Order(orderData);
    await order.save({ session });
    console.log("✅ Order created immediately:", order._id);

    // ✅ CREATE FIREBASE CHAT ROOM
    console.log("💬 Creating chat room...");
    const chatData = {
      orderId: order._id,
      participants: [
        { 
          userId: userId, 
          role: 'buyer',
          joinedAt: new Date()
        },
        { 
          userId: offer.listingId.sellerId, 
          role: 'seller',
          joinedAt: new Date()
        }
      ],
      listingId: offer.listingId._id,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: null,
      unreadCount: {
        [userId]: 0,
        [offer.listingId.sellerId]: 0
      }
    };

    const chat = new Chat(chatData);
    await chat.save({ session });
    console.log("✅ Chat room created:", chat._id);

    // Mark listing as reserved
    console.log("📦 Updating listing status to reserved...");
    await MarketplaceListing.findByIdAndUpdate(
      offer.listingId._id, 
      { 
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        updatedAt: new Date()
      },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    console.log("✅ Database transaction committed successfully");

    // Send notifications (outside transaction)
    try {
      // Notify seller about new order
      await sendNotification({
        userId: offer.listingId.sellerId,
        title: 'New Order Received!',
        message: `You have a new order for your listing "${offer.listingId.title}"`,
        type: 'new_order',
        relatedId: order._id
      });

      // Notify buyer about successful payment
      await sendNotification({
        userId: userId,
        title: 'Payment Successful!',
        message: `Your payment for "${offer.listingId.title}" has been confirmed`,
        type: 'payment_success',
        relatedId: order._id
      });

      console.log("📧 Notifications sent successfully");
    } catch (notifError) {
      console.warn('⚠️ Notification sending failed:', notifError);
      // Don't fail the whole request if notifications fail
    }

    // Prepare response
    const response = {
      success: true,
      message: 'Payment confirmed! Offer submitted to seller. You can now chat with the seller.',
      data: {
        offer: {
          _id: offer._id,
          status: offer.status,
          amount: offer.amount,
          paidAt: offer.paidAt,
          listingTitle: offer.listingId.title
        },
        order: {
          _id: order._id,
          status: order.status,
          amount: order.amount,
          paymentStatus: order.paymentStatus,
          expectedDelivery: order.expectedDelivery
        },
        chat: {
          _id: chat._id,
          orderId: chat.orderId
        },
        redirectUrl: `/messages?chat=${chat._id}&order=${order._id}`
      }
    };

    res.status(200).json(response);

  } catch (error) {
    // Abort transaction on error
    if (session) {
      await session.abortTransaction();
    }
    
    console.error('❌ Error confirming offer payment:', {
      message: error.message,
      stack: error.stack,
      offerId: req.body?.offerId,
      paymentIntentId: req.body?.paymentIntentId
    });

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to confirm payment';
    let errorDetails = error.message;

    if (error.name === 'StripeError') {
      statusCode = 400;
      errorMessage = 'Payment processing error';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Validation error';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorMessage = 'Invalid ID format';
    }

    res.status(statusCode).json({ 
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: error.code || 'PROCESSING_ERROR'
    });
  } finally {
    // End session
    if (session) {
      session.endSession();
    }
  }
});

// ✅ UPDATED: Accept Offer (Seller accepts paid offer)
router.put("/accept-offer/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offer = await Offer.findById(req.params.id)
      .populate('listingId')
      .populate('buyerId', 'username email');

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if user is the seller
    if (offer.listingId.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this offer' });
    }

    // Check if offer is paid and waiting for acceptance
    if (offer.status !== 'paid') {
      return res.status(400).json({ error: 'Offer is not ready for acceptance' });
    }

    // ✅ UPDATE OFFER STATUS
    offer.status = 'accepted';
    offer.acceptedAt = new Date();
    await offer.save();

    // ✅ FIND AND UPDATE ORDER
    const order = await Order.findOne({ offerId: offer._id });
    if (order) {
      order.status = 'confirmed'; // Move to confirmed status
      order.acceptedAt = new Date();
      await order.save();
    }

    // Mark listing as sold
    await MarketplaceListing.findByIdAndUpdate(offer.listingId._id, { 
      status: 'sold'
    });

    // Reject other pending offers
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: { $in: ['pending', 'paid'] }
      },
      { 
        status: 'rejected',
        rejectionReason: 'Another offer was accepted'
      }
    );

    console.log("✅ Offer accepted by seller:", offer._id);

    res.status(200).json({ 
      success: true,
      message: 'Offer accepted successfully! Order is now confirmed.',
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
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// Get offers received (seller)
router.get("/received-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const myListings = await MarketplaceListing.find({ sellerId: userId });
    const listingIds = myListings.map(listing => listing._id);
    
    const offers = await Offer.find({ listingId: { $in: listingIds } })
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price mediaUrls status')
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching received offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offers made (buyer)
router.get("/my-offers", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offers = await Offer.find({ buyerId: userId })
      .populate('listingId', 'title price mediaUrls status sellerId')
      .populate('listingId.sellerId', 'username avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching my offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Reject offer
router.put("/reject-offer/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offer = await Offer.findById(req.params.id)
      .populate('listingId');
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if user is the seller
    if (offer.listingId.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this offer' });
    }

    if (!['pending', 'paid'].includes(offer.status)) {
      return res.status(400).json({ error: 'Offer cannot be rejected' });
    }

    offer.status = 'rejected';
    await offer.save();

    // Update order status if exists
    await Order.findOneAndUpdate(
      { offerId: offer._id },
      { status: 'cancelled' }
    );

    // Refund payment if offer was paid
    if (offer.status === 'paid' && offer.paymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: offer.paymentIntentId,
        });
        console.log("✅ Payment refunded for rejected offer:", offer._id);
      } catch (refundError) {
        console.error('Refund error:', refundError);
      }
    }

    // Make listing active again
    await MarketplaceListing.findByIdAndUpdate(offer.listingId._id, { 
      status: 'active',
      reservedUntil: null
    });

    res.status(200).json({ 
      message: 'Offer rejected successfully', 
      offer 
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// Cancel offer (buyer)
router.put("/cancel-offer/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Check if user is the buyer
    if (offer.buyerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this offer' });
    }

    if (!['pending', 'pending_payment'].includes(offer.status)) {
      return res.status(400).json({ error: 'Only pending offers can be cancelled' });
    }

    offer.status = 'cancelled';
    await offer.save();

    res.status(200).json({ 
      message: 'Offer cancelled successfully', 
      offer 
    });
  } catch (error) {
    console.error('Error cancelling offer:', error);
    res.status(500).json({ error: 'Failed to cancel offer' });
  }
});

// Direct purchase route
router.post("/create-direct-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
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
      paymentReleased: false
    });

    await order.save();

    // Create chat room for direct purchase
    const chat = new Chat({
      orderId: order._id,
      participants: [
        { userId: userId, role: 'buyer' },
        { userId: listing.sellerId, role: 'seller' }
      ],
      listingId: listingId,
      status: 'active'
    });

    await chat.save();

    res.status(201).json({
      success: true,
      message: 'Payment intent created for direct purchase',
      order: {
        _id: order._id,
        amount: order.amount,
        status: order.status
      },
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      chatId: chat._id,
      redirectUrl: `/messages?chat=${chat._id}&order=${order._id}`
    });

  } catch (error) {
    console.error('❌ Error creating direct payment:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: error.message 
    });
  }
});

// Test Stripe Connection
router.get("/test-stripe", async (req, res) => {
  try {
    const testIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      metadata: { test: 'true' }
    });

    res.json({
      success: true,
      message: 'Stripe is working correctly',
      testIntentId: testIntent.id,
      clientSecret: testIntent.client_secret
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

// Delete all offers (for testing)
router.delete("/delete-all-offers", async (req, res) => {
  try {
    const result = await Offer.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} offers`);

    res.status(200).json({
      success: true,
      message: `All offers deleted successfully (${result.deletedCount} offers removed).`
    });
  } catch (error) {
    console.error("❌ Error deleting all offers:", error);
    res.status(500).json({ error: "Failed to delete all offers" });
  }
});

module.exports = router;