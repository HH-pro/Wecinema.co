const express = require("express");
const router = express.Router();
const Offer = require("../models/offer");

const { Listing, protect } = require("../utils");

/**
 * @route POST /offers
 * @description Create an offer
 */
router.post("/offers", protect, async (req, res) => {
  try {
    const { listingId, proposedPrice, message } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot offer on your own listing" });
    }

    const offer = await Offer.create({
      listingId,
      buyerId: req.user.id,
      sellerId: listing.owner,
      proposedPrice,
      message,
    });
    res.status(201).json(offer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route POST /offers/:id/:action
 * @description Respond to an offer (accept/reject/counter)
 */
router.post("/offers/:id/:action(accept|reject|counter)", protect, async (req, res) => {
  try {
    const { id, action } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    if (offer.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not seller" });
    }

    if (action === "accept") {
      offer.status = "accepted";
    } else if (action === "reject") {
      offer.status = "rejected";
    } else if (action === "counter") {
      if (!req.body.counterPrice) {
        return res.status(400).json({ message: "counterPrice required" });
      }
      offer.status = "countered";
      offer.counterPrice = req.body.counterPrice;
    }
    await offer.save();
    res.json(offer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route GET /offers/listing/:listingId
 * @description Get offers for a listing
 */
router.get("/offers/listing/:listingId", protect, async (req, res) => {
  try {
    const offers = await Offer.find({ listingId: req.params.listingId }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /offers/me
 * @description Get offers where user is buyer or seller
 */
router.get("/offers/me", protect, async (req, res) => {
  try {
    const offers = await Offer.find({
      $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
    }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
