const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils"); // 🆕 AUTH IMPORT

// ✅ PUBLIC ROUTE - No auth required
router.get("/listings", async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ status: 'active' })
      .populate('sellerId', 'username avatar sellerRating');
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// ✅ PROTECTED ROUTES - HypeMode + Seller only
router.get("/my-listings", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ sellerId: req.user.id });
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error fetching my listings:', error);
    res.status(500).json({ error: 'Failed to fetch my listings' });
  }
});
// Create new listing
// Make sure you're importing the correct model

/// ✅ Make sure protect comes BEFORE isSeller
router.post("/create-listing", async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");

  const { title, description, price, type, category, tags } = req.body;
const media = req.body.mediaUrls || req.files;


    // The authenticated user's ID (from token)
    const userId = req.user?._id;

    console.log("User ID:", userId);

    // Basic validation
    if (!title || !description || !price || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Handle tags safely
    const tagsArray = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(",").map((t) => t.trim())
      : [];

    // Handle media URLs (Cloudinary or uploaded)
    const mediaUrls = [];

    // Case 1: Cloudinary URL in `file`
    if (file && typeof file === "string" && file.startsWith("http")) {
      mediaUrls.push(file);
    }

    // Case 2: Files uploaded with multer (optional)
    if (req.files && req.files.length > 0) {
      mediaUrls.push(...req.files.map((f) => f.path));
    }

    const listing = new MarketplaceListing({
      sellerId: userId,
      title,
      description,
      price,
      type,
      category,
      tags: tagsArray,
      mediaUrls,
    });

    await listing.save();

    console.log("✅ Listing created successfully");
    res.status(201).json({ success: true, listing });
  } catch (error) {
    console.error("❌ Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing" });
  }
});
// Delete listing
router.delete("/listing/:id", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listing = await MarketplaceListing.findOneAndDelete({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json({ message: 'Listing deleted successfully', listing });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;