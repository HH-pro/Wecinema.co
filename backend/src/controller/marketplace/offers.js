const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const MarketplaceListing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// Make Offer Route
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== MAKE OFFER REQUEST ===");
    console.log("Received offer request body:", req.body);
    console.log("Full req.user object:", req.user);
    
    const { listingId, amount, message } = req.body;

    // Enhanced user authentication validation with better debugging
    if (!req.user) {
      console.log("❌ No user object found in request");
      return res.status(401).json({ error: 'Authentication required - no user data' });
    }

    // Extract user ID from multiple possible fields
    const userId = req.user.id || req.user._id || req.user.userId;
    console.log("Extracted user ID:", userId);
    console.log("Available req.user fields:", Object.keys(req.user));

    if (!userId) {
      console.log("❌ No user ID found in req.user. Full req.user:", JSON.stringify(req.user, null, 2));
      return res.status(401).json({ 
        error: 'Authentication required - invalid user data',
        details: 'User ID not found in token payload'
      });
    }

    // Validate required fields
    if (!listingId || !amount) {
      return res.status(400).json({ error: 'Listing ID and amount are required' });
    }

    // Ensure amount is a number
    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    console.log("🔍 Looking for listing:", listingId);
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      console.log("❌ Listing not found:", listingId);
      return res.status(404).json({ error: 'Listing not found' });
    }

    console.log("📋 Listing found:", {
      id: listing._id,
      title: listing.title,
      sellerId: listing.sellerId,
      status: listing.status
    });

    // Check if listing is available for offers
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available for offers' });
    }

    // Check if user is not the seller
    const sellerId = listing.sellerId.toString();
    console.log("👤 User comparison:", {
      userId: userId.toString(),
      sellerId: sellerId,
      isOwnListing: userId.toString() === sellerId
    });

    if (userId.toString() === sellerId) {
      return res.status(400).json({ error: 'Cannot make offer on your own listing' });
    }

    // Check for existing pending offer from same user
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: userId,
      status: 'pending'
    });

    if (existingOffer) {
      return res.status(400).json({ error: 'You already have a pending offer for this listing' });
    }

    console.log("✅ Creating new offer with data:", {
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || ''
    });

    const offer = new Offer({
      buyerId: userId,
      listingId,
      amount: offerAmount,
      message: message || ''
    });

    await offer.save();
    
    // Populate the offer with buyer info for response
    await offer.populate('buyerId', 'username avatar email');
    await offer.populate('listingId', 'title price sellerId');

    console.log("✅ Offer created successfully:", {
      offerId: offer._id,
      buyer: offer.buyerId,
      listing: offer.listingId
    });

    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      offer: {
        _id: offer._id,
        buyerId: offer.buyerId,
        listingId: offer.listingId,
        amount: offer.amount,
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error making offer:', error);
    
    // More specific error handling
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid listing ID format' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Invalid offer data', details: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to make offer',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get offers received (seller) - Add authentication middleware
router.get("/received-offers", async (req, res) => {
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

module.exports = router;