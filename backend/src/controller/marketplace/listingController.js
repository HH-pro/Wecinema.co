const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ status: "active" })
      .populate("sellerId", "username avatar sellerRating");
    res.status(200).json(listings);
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ===================================================
// ✅ PROTECTED ROUTE — Get current user's listings
// ===================================================
router.get("/my-listings", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ sellerId: req.user._id });
    res.status(200).json(listings);
  } catch (error) {
    console.error("❌ Error fetching my listings:", error);
    res.status(500).json({ error: "Failed to fetch my listings" });
  }
});

// ===================================================
// ✅ CREATE LISTING (like your working video route)
// ===================================================
router.post("/create-listing", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Body received:", req.body);

    const { title, description, price, type, category, tags, mediaFiles, mediaUrls } = req.body;

    // 🔹 Validate required fields
    if (!title || !description || !price || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔹 Use authenticated user ID
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized — user not found" });
    }

    // 🔹 Normalize tags
    const tagsArray = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
      ? [tags]
      : [];

    // 🔹 Handle media (Cloudinary URLs or direct links)
    const mediaArray =
      Array.isArray(mediaFiles)
        ? mediaFiles
        : Array.isArray(mediaUrls)
        ? mediaUrls
        : typeof mediaFiles === "string"
        ? [mediaFiles]
        : [];

    // 🔹 Create listing
    const listing = new MarketplaceListing({
      sellerId: userId,
      title,
      description,
      price,
      type,
      category,
      tags: tagsArray,
      mediaUrls: mediaArray,
      status: "active",
    });

    await listing.save();

    console.log("✅ Listing created successfully");
    res.status(201).json(listing);
  } catch (error) {
    console.error("❌ Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/listing/:id", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: req.user._id,
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.status(200).json({ message: "Listing deleted successfully", listing });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

module.exports = router;
