const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// Direct Stripe keys (replace with your actual keys)
const stripe = require('stripe')('sk_test_51SKw7ZHYamYyPYbD4KfVeIgt0svaqOxEsZV7q9yimnXamBHrNw3afZfDSdUlFlR3Yt9gKl5fF75J7nYtnXJEtjem001m4yyRKa');

// Make Offer Route with Stripe Payment
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== MAKE OFFER WITH PAYMENT REQUEST ===");
    console.log("Request body:", req.body);
    
    const { listingId, amount, message, requirements, expectedDelivery } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    // Validation
    if (!userId) {
      console.log("❌ No user ID found");
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!listingId || !amount) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: 'Listing ID and amount are required' });
    }

    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount <= 0) {
      console.log("❌ Invalid amount:", amount);
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Check minimum amount for Stripe
    if (offerAmount < 0.50) {
      console.log("❌ Amount too low for Stripe");
      return res.status(400).json({ error: 'Amount must be at least $0.50' });
    }

    console.log("🔍 Looking for listing:", listingId);
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      console.log("❌ Listing not found");
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      console.log("❌ Listing not active");
      return res.status(400).json({ error: 'Listing is not available for offers' });
    }

    // Check if user is not the seller
    if (listing.sellerId.toString() === userId.toString()) {
      console.log("❌ User is seller");
      return res.status(400).json({ error: 'Cannot make offer on your own listing' });
    }

    // Check for existing offers
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: { $in: ['pending', 'pending_payment'] }
    });

    if (existingOffer) {
      console.log("❌ Existing offer found");
      return res.status(400).json({ error: 'You already have a pending offer for this listing' });
    }

    // ✅ CREATE OFFER WITHOUT PAYMENT - Payment happens after acceptance
    console.log("💡 Creating offer without payment - payment will happen after acceptance");

    // Create offer in database with 'pending' status (not pending_payment)
    const offerData = {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || '',
      status: 'pending' // No payment required yet
    };

    // Add optional fields if they exist
    if (requirements) offerData.requirements = requirements;
    if (expectedDelivery) offerData.expectedDelivery = new Date(expectedDelivery);

    const offer = new Offer(offerData);
    await offer.save();

    console.log("✅ Offer saved to database (pending acceptance):", offer._id);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully! Seller will review your offer.',
      offer: {
        _id: offer._id,
        amount: offer.amount,
        status: offer.status,
        message: offer.message
      }
    });

  } catch (error) {
    console.error('❌ GENERAL ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to make offer',
      details: error.message
    });
  }
});

// ✅ UPDATED: Accept offer WITHOUT Stripe requirement
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

    // Check if user is the seller of the listing
    if (offer.listingId.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to accept this offer' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    // ✅ NO STRIPE CHECK - Accept offer immediately
    offer.status = 'accepted';
    await offer.save();

    // Create order with "payment_pending" status
    const order = new Order({
      buyerId: offer.buyerId,
      sellerId: userId,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'confirmed', // Order confirmed but payment pending
      paymentStatus: 'pending', // Payment not yet processed
      requirements: offer.requirements,
      expectedDelivery: offer.expectedDelivery,
      notes: 'Seller accepted offer. Buyer needs to complete payment.'
    });

    await order.save();

    // Mark listing as reserved instead of sold
    await MarketplaceListing.findByIdAndUpdate(offer.listingId._id, { 
      status: 'reserved', // Not sold yet, just reserved
      reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours reservation
    });

    // Reject other pending offers
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: 'pending' 
      },
      { 
        status: 'rejected',
        rejectionReason: 'Another offer was accepted'
      }
    );

    console.log("✅ Offer accepted successfully. Order created:", order._id);

    res.status(200).json({ 
      success: true,
      message: 'Offer accepted successfully! Buyer will now complete payment.',
      offer: {
        _id: offer._id,
        amount: offer.amount,
        status: offer.status
      },
      order: {
        _id: order._id,
        amount: order.amount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        nextStep: 'buyer_payment'
      }
    });

  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// ✅ NEW: Create payment for accepted offer
router.post("/create-payment-for-order/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id; // Buyer's ID

    console.log("💳 Creating payment for accepted order:", orderId);

    const order = await Order.findById(orderId)
      .populate('listingId')
      .populate('buyerId', 'username email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is the buyer
    if (order.buyerId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to pay for this order' });
    }

    // Check if order is ready for payment
    if (order.status !== 'confirmed' || order.paymentStatus !== 'pending') {
      return res.status(400).json({ error: 'Order is not ready for payment' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: orderId.toString(),
        buyerId: userId.toString(),
        sellerId: order.sellerId.toString(),
        type: 'accepted_offer_payment'
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Payment for accepted offer - Order: ${orderId}`,
    });

    console.log("✅ Payment intent created for order:", paymentIntent.id);

    // Update order with payment intent ID
    order.stripePaymentIntentId = paymentIntent.id;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.amount,
      order: {
        _id: order._id,
        amount: order.amount,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error creating payment for order:', error);
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error.message
    });
  }
});

// ✅ NEW: Confirm order payment
router.post("/confirm-order-payment/:orderId", authenticateMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user.id; // Buyer's ID

    console.log("🔍 Confirming order payment:", { orderId, paymentIntentId });

    const order = await Order.findById(orderId)
      .populate('listingId');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is the buyer
    if (order.buyerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to confirm this payment' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not completed', 
        paymentStatus: paymentIntent.status 
      });
    }

    // Update order status
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.stripePaymentIntentId = paymentIntentId;
    await order.save();

    // Update listing to sold
    await MarketplaceListing.findByIdAndUpdate(order.listingId._id, { 
      status: 'sold'
    });

    console.log("✅ Order payment confirmed and marked as paid:", orderId);

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully! Order is now active.',
      order: {
        _id: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        amount: order.amount,
        paidAt: order.paidAt
      }
    });

  } catch (error) {
    console.error('Error confirming order payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: error.message
    });
  }
});

// In your offerRoutes.js - Update create-direct-payment route
router.post("/create-direct-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    console.log("🔍 Creating direct payment for listing:", listingId, "user:", userId);

    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    console.log("📋 Listing found:", {
      id: listing._id,
      title: listing.title,
      sellerId: listing.sellerId,
      price: listing.price
    });

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

    console.log("✅ Payment intent created:", paymentIntent.id);

    // Create order immediately for direct purchase
    const order = new Order({
      buyerId: userId,
      sellerId: listing.sellerId,
      listingId: listingId,
      orderType: 'direct_purchase',
      amount: listing.price,
      status: 'pending_payment', // Will be updated to 'paid' after payment confirmation
      stripePaymentIntentId: paymentIntent.id,
      revisions: 0,
      maxRevisions: 3,
      paymentReleased: false
    });

    await order.save();
    console.log("✅ Order created for direct purchase:", order._id);

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
      amount: listing.price
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
    console.log("🧪 Testing Stripe connection...");
    
    // Test Stripe connection
    const testIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
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

// Get offers received (seller) - Add authentication middleware
router.get("/received-offers",authenticateMiddleware, async (req, res) => {
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

// Get offers made (buyer) - Add authentication middleware
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

// Reject offer - Add authentication middleware
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

    // Check if user is the seller of the listing
    if (offer.listingId.sellerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to reject this offer' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    offer.status = 'rejected';
    await offer.save();

    res.status(200).json({ 
      message: 'Offer rejected successfully', 
      offer 
    });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

// Cancel offer (buyer) - Add authentication middleware
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

    // Check if user is the buyer who made the offer
    if (offer.buyerId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this offer' });
    }

    if (offer.status !== 'pending') {
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

// ⚠️ Delete all offers (No Auth) — use only for testing or local cleanup
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

module.exports = router;