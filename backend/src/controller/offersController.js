const express = require("express");
const router = express.Router();
const Offer = require("../models/offer");
const Listing = require("../models/listing");
const { authenticateMiddleware } = require("../utils");

/**
 * @route POST /offers
 * @description Create a new offer on a listing
 */
router.post("/offers", authenticateMiddleware, async (req, res) => {
  try {
    const { listingId, proposedPrice, message } = req.body;

    if (!listingId || !proposedPrice) {
      return res.status(400).json({ message: "listingId and proposedPrice are required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Listing not found or not active" });
    }

    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot make an offer on your own listing" });
    }

    const existingOffer = await Offer.findOne({ listing: listingId, buyer: req.user.id });
    if (existingOffer) {
      return res.status(400).json({ message: "You already made an offer for this listing" });
    }

    const offer = new Offer({
      listing: listingId,
      buyer: req.user.id,
      proposedPrice,
      message: message || "",
      status: "pending",
    });

    await offer.save();
    res.status(201).json({ message: "Offer submitted successfully", offer });
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route GET /offers/listing/:listingId
 * @description Get all offers for a listing (owner only)
 */
router.get("/offers/listing/:listingId", authenticateMiddleware, async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "UnauthenticateMiddlewareorized" });
    }

    const offers = await Offer.find({ listing: listingId })
      .populate("buyer", "username email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route PUT /offers/:offerId/respond
 * @description Accept or reject an offer
 */
router.put("/offers/:offerId/respond", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { action } = req.body; // "accept" or "reject"

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action (must be accept/reject)" });
    }

    const offer = await Offer.findById(offerId).populate("listing");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "UnauthenticateMiddlewareorized" });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({ message: `This offer is already ${offer.status}` });
    }

    offer.status = action === "accept" ? "accepted" : "rejected";
    await offer.save();

    res.status(200).json({ message: `Offer ${offer.status}`, offer });
  } catch (error) {
    console.error("Error responding to offer:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route PUT /offers/:offerId/payment-pending
 * @description Mark offer as payment pending (buyer only)
 */
router.put("/offers/:offerId/payment-pending", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.buyer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the buyer can mark payment pending" });
    }

    if (offer.status !== "accepted") {
      return res.status(400).json({ message: "Offer must be accepted before payment" });
    }

    offer.status = "payment_pending";
    await offer.save();

    res.status(200).json({ message: "Offer marked as payment pending", offer });
  } catch (error) {
    console.error("Error marking payment pending:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route PUT /offers/:offerId/paid
 * @description Mark offer as paid (seller only)
 */
router.put("/offers/:offerId/paid", authenticateMiddleware, async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId).populate("listing");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the seller can confirm payment" });
    }

    if (offer.status !== "payment_pending") {
      return res.status(400).json({ message: "Offer must be payment_pending before marking as paid" });
    }

    offer.status = "paid";
    await offer.save();

    res.status(200).json({ message: "Offer marked as paid", offer });
  } catch (error) {
    console.error("Error marking offer paid:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
