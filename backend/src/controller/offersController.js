const Offer = require("../../models/Offer");
const Listing = require("../../models/Listing");

/**
 * ✅ Create a new offer on a listing
 */
exports.createOffer = async (req, res) => {
  try {
    const { listingId, proposedPrice, message } = req.body;

    if (!listingId || !proposedPrice) {
      return res.status(400).json({ message: "listingId and proposedPrice are required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing || listing.status !== "active") {
      return res.status(404).json({ message: "Listing not found or not active" });
    }

    // Prevent owner from making offer on their own listing
    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot make an offer on your own listing" });
    }

    // Prevent duplicate offers from the same buyer
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
};

/**
 * ✅ Get all offers for a listing (owner only)
 */
exports.getOffersForListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const offers = await Offer.find({ listing: listingId })
      .populate("buyer", "username email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Accept or reject an offer (owner only)
 */
exports.respondToOffer = async (req, res) => {
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
      return res.status(403).json({ message: "Unauthorized" });
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
};
