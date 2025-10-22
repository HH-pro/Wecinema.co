const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use environment variable
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== MAKE OFFER WITH PAYMENT REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", req.user?.id || req.user?._id);
    
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

    // ✅ CREATE STRIPE PAYMENT INTENT WITH ERROR HANDLING
    console.log("💳 Creating Stripe payment intent...");
    console.log("Amount:", offerAmount);
    console.log("Amount in cents:", Math.round(offerAmount * 100));
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(offerAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          listingId: listingId.toString(),
          buyerId: userId.toString(),
          sellerId: listing.sellerId.toString(),
          type: 'offer_payment'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Offer for: ${listing.title.substring(0, 22)}...`,
      });

      console.log("✅ Stripe payment intent created successfully");
      console.log("Payment Intent ID:", paymentIntent.id);
      console.log("Client Secret exists:", !!paymentIntent.client_secret);

      // Create offer in database
      const offerData = {
        buyerId: userId,
        listingId,
        amount: offerAmount,
        message: message || '',
        paymentIntentId: paymentIntent.id,
        status: 'pending_payment'
      };

      // Add optional fields if they exist
      if (requirements) offerData.requirements = requirements;
      if (expectedDelivery) offerData.expectedDelivery = new Date(expectedDelivery);

      const offer = new Offer(offerData);
      await offer.save();

      console.log("✅ Offer saved to database:", offer._id);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Offer submitted. Please complete payment.',
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

    } catch (stripeError) {
      console.error('❌ STRIPE ERROR DETAILS:');
      console.error('Error Type:', stripeError.type);
      console.error('Error Code:', stripeError.code);
      console.error('Error Message:', stripeError.message);
      console.error('Stripe Request ID:', stripeError.requestId);
      console.error('Raw Error:', JSON.stringify(stripeError, null, 2));
      
      return res.status(500).json({ 
        error: 'Payment processing failed',
        details: stripeError.message,
        code: stripeError.code
      });
    }

  } catch (error) {
    console.error('❌ GENERAL ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to make offer',
      details: error.message
    });
  }
});

// Add this new route for direct purchases (Buy Now)
router.post("/create-direct-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { listingId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }

    console.log("🔍 Looking for listing for direct purchase:", listingId);
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if listing is available
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available for purchase' });
    }

    // Check if user is not the seller
    const sellerId = listing.sellerId.toString();
    if (userId.toString() === sellerId) {
      return res.status(400).json({ error: 'Cannot purchase your own listing' });
    }

    // ✅ CREATE STRIPE PAYMENT INTENT FOR DIRECT PURCHASE
    console.log("💳 Creating direct purchase payment intent for amount:", listing.price);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(listing.price * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        listingId: listingId.toString(),
        buyerId: userId.toString(),
        sellerId: sellerId,
        type: 'direct_purchase',
        amount: listing.price.toString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Direct purchase: ${listing.title}`,
    });

    console.log("✅ Direct purchase payment intent created:", paymentIntent.id);

    // Create order for direct purchase
    const order = new Order({
      buyerId: userId,
      sellerId: sellerId,
      listingId: listingId,
      orderType: 'direct_purchase',
      amount: listing.price,
      status: 'pending_payment',
      stripePaymentIntentId: paymentIntent.id
    });

    await order.save();

    console.log("✅ Direct purchase order created:", order._id);

    res.status(201).json({
      success: true,
      message: 'Payment intent created for direct purchase',
      order: {
        _id: order._id,
        amount: order.amount,
        status: order.status
      },
      clientSecret: paymentIntent.client_secret, // ✅ CLIENT SECRET
      paymentIntentId: paymentIntent.id,
      amount: listing.price
    });

  } catch (error) {
    console.error('❌ Error creating direct payment:', error);
    res.status(500).json({ 
      error: 'Failed to create payment intent',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm payment for offers
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log("🔍 Confirming offer payment:", { offerId, paymentIntentId });

    // Find the offer
    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      paymentIntentId: paymentIntentId
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not completed', 
        paymentStatus: paymentIntent.status 
      });
    }

    // Update offer status
    offer.status = 'pending'; // Now waiting for seller acceptance
    offer.paidAt = new Date();
    await offer.save();

    console.log("✅ Offer payment confirmed:", offer._id);

    res.status(200).json({
      success: true,
      message: 'Offer payment confirmed successfully. Waiting for seller acceptance.',
      offer: {
        _id: offer._id,
        status: offer.status,
        amount: offer.amount,
        paidAt: offer.paidAt
      }
    });

  } catch (error) {
    console.error('❌ Error confirming offer payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Confirm payment for offers
router.post("/confirm-offer-payment", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId, paymentIntentId } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log("🔍 Confirming offer payment:", { offerId, paymentIntentId });

    // Find the offer
    const offer = await Offer.findOne({
      _id: offerId,
      buyerId: userId,
      paymentIntentId: paymentIntentId
    });

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or access denied' });
    }

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: 'Payment not completed', 
        paymentStatus: paymentIntent.status 
      });
    }

    // Update offer status
    offer.status = 'pending'; // Now waiting for seller acceptance
    offer.paidAt = new Date();
    await offer.save();

    console.log("✅ Offer payment confirmed:", offer._id);

    res.status(200).json({
      success: true,
      message: 'Offer payment confirmed successfully. Waiting for seller acceptance.',
      offer: {
        _id: offer._id,
        status: offer.status,
        amount: offer.amount,
        paidAt: offer.paidAt
      }
    });

  } catch (error) {
    console.error('❌ Error confirming offer payment:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// Accept offer - Add authentication middleware
router.put("/accept-offer/:id", authenticateMiddleware, async (req, res) => {
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
      return res.status(403).json({ error: 'Not authorized to accept this offer' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    offer.status = 'accepted';
    await offer.save();

    // Create order from accepted offer
    const order = new Order({
      buyerId: offer.buyerId,
      sellerId: userId,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'confirmed'
    });

    await order.save();

    // Mark listing as sold and reject other pending offers
    await MarketplaceListing.findByIdAndUpdate(offer.listingId._id, { status: 'sold' });
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: 'pending' 
      },
      { 
        status: 'rejected'
      }
    );

    res.status(200).json({ 
      message: 'Offer accepted successfully',
      offer,
      order 
    });
  } catch (error) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: 'Failed to accept offer' });
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