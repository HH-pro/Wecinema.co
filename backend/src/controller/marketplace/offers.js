const express = require("express");
const router = express.Router();
const Offer = require("../../models/marketplace/offer");
const Listing = require("../../models/marketplace/listing");
const Order = require("../../models/marketplace/order");

// Make an offer
router.post("/make-offer", async (req, res) => {
  try {
    const { listingId, amount, message } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const offer = new Offer({
      buyerId: req.user.id,
      listingId,
      amount,
      message
    });

    await offer.save();
    res.status(201).json(offer);
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
      .populate('buyerId', 'username avatar')
      .populate('listingId', 'title price');
    
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
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

    offer.status = 'accepted';
    await offer.save();

    // Create order from accepted offer
    const order = new Order({
      buyerId: offer.buyerId,
      sellerId: req.user.id,
      listingId: offer.listingId._id,
      orderType: 'accepted_offer',
      amount: offer.amount,
      status: 'confirmed'
    });

    await order.save();

    // Mark listing as sold
    offer.listingId.status = 'sold';
    await offer.listingId.save();

    res.status(200).json({ offer, order });
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

    offer.status = 'rejected';
    await offer.save();

    res.status(200).json({ message: 'Offer rejected', offer });
  } catch (error) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
});

module.exports = router;