const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const Listing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// backend/src/controller/marketplace/offers.js
router.post("/make-offer", authenticateMiddleware, async (req, res) => {
  try {
    console.log("Received offer request body:", req.body);
    console.log("User from request:", req.user); // Debug log
    
    const { listingId, amount, message } = req.body;


    // Validate required fields
    if (!listingId || !amount) {
      return res.status(400).json({ error: 'Listing ID and amount are required' });
    }

    // Ensure amount is a number
    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if listing is available for offers
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available for offers' });
    }

    // Check if user is not the seller - use req.user.id
    if (listing.sellerId.toString() === req.user.id) {
      return res.status(400).json({ error: 'Cannot make offer on your own listing' });
    }

    // Check for existing pending offer from same user
    const existingOffer = await Offer.findOne({
      listingId,
      buyerId: req.user.id, // Use req.user.id
      status: 'pending'
    });

    if (existingOffer) {
      return res.status(400).json({ error: 'You already have a pending offer for this listing' });
    }

    const offer = new Offer({
      buyerId: req.user.id, // Use req.user.id
      listingId,
      amount: offerAmount,
      message: message || ''
    });

    await offer.save();
    
    // Populate the offer with buyer info for response
    await offer.populate('buyerId', 'username avatar');
    await offer.populate('listingId', 'title price');

    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      offer
    });
  } catch (error) {
    console.error('Error making offer:', error);
    res.status(500).json({ error: 'Failed to make offer' });
  }
});
// Get offers received (seller)
router.get("/received-offers", async (req, res) => {
  try {
    const myListings = await Listing.find({ sellerId: req.user.id });
    const listingIds = myListings.map(listing => listing._id);
    
    const offers = await Offer.find({ listingId: { $in: listingIds } })
      .populate('buyerId', 'username avatar email')
      .populate('listingId', 'title price images status')
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get offers made (buyer)
router.get("/my-offers", async (req, res) => {
  try {
    const offers = await Offer.find({ buyerId: req.user.id })
      .populate('listingId', 'title price images status sellerId')
      .populate('listingId.sellerId', 'username avatar')
      .sort({ createdAt: -1 });
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching my offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Accept offer
router.put("/accept-offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('listingId');
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.listingId.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    offer.status = 'accepted';
    offer.updatedAt = new Date();
    await offer.save();

    // Create order from accepted offer
    const order = new Order({
      buyerId: offer.buyerId,
      sellerId: req.user.id,
      listingId: offer.listingId._id,
      offerId: offer._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'confirmed'
    });

    await order.save();

    // Mark listing as sold and reject other pending offers
    await Listing.findByIdAndUpdate(offer.listingId._id, { status: 'sold' });
    await Offer.updateMany(
      { 
        listingId: offer.listingId._id, 
        _id: { $ne: offer._id },
        status: 'pending' 
      },
      { 
        status: 'rejected',
        updatedAt: new Date()
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

// Reject offer
router.put("/reject-offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('listingId');
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.listingId.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Offer is not pending' });
    }

    offer.status = 'rejected';
    offer.updatedAt = new Date();
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

// Cancel offer (buyer)
router.put("/cancel-offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (offer.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (offer.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending offers can be cancelled' });
    }

    offer.status = 'cancelled';
    offer.updatedAt = new Date();
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