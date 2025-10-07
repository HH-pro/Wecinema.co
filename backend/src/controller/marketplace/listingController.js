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
router.post("/create-listing", async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Body received:", req.body);

    const { title, description, price, type, category, tags, mediaUrls, sellerId } = req.body;

    if (!title || !description || !price || !type || !category || !sellerId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["title", "description", "price", "type", "category", "sellerId"]
      });
    }

    // Normalize tags and media URLs
    const tagsArray = Array.isArray(tags) ? tags : [tags];
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];

    console.log("Creating listing for seller:", sellerId);

    const listing = await MarketplaceListing.create({
      sellerId: sellerId,
      title,
      description,
      price,
      type,
      category,
      tags: tagsArray,
      mediaUrls: mediaArray,
      status: "active",
    });

    res.status(201).json({ message: "Listing created successfully", listing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing", details: error.message });
  }
});

// ===================================================
// ✅ DELETE LISTING
router.delete("/listing/:id", async (req, res) => {
  try {
    console.log("=== DELETE LISTING REQUEST ===");
    console.log("Listing ID to delete:", req.params.id);
    console.log("User making request:", req.user);

    // Extract user ID from multiple possible fields
    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      console.log("❌ No user ID found in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: userId, // Use the extracted userId
    });

    if (!listing) {
      console.log("❌ Listing not found or user not authorized:", {
        listingId: req.params.id,
        userId: userId
      });
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to delete this listing" 
      });
    }

    console.log("✅ Listing deleted successfully:", listing._id);
    res.status(200).json({ 
      message: "Listing deleted successfully", 
      listing: {
        _id: listing._id,
        title: listing.title,
        status: listing.status
      }
    });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// Temporary admin delete route (remove after use)
router.delete("/admin/listing/:id", async (req, res) => {
  try {
    const listing = await MarketplaceListing.findByIdAndDelete(req.params.id);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.status(200).json({ 
      message: "Listing deleted successfully", 
      listing: {
        _id: listing._id,
        title: listing.title
      }
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});
module.exports = router;
