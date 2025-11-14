const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const User = require("../../models/user");
const mongoose = require('mongoose');
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ status: "active" })
      .populate("sellerId", "username avatar sellerRating email");
    res.status(200).json(listings);
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

/// ===================================================
// ✅ GET USER'S LISTINGS (My Listings)
// ===================================================
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { sellerId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log("📝 Fetching my listings for seller:", sellerId);

    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // Cache headers
    const lastModified = listings[0]?.updatedAt || new Date();
    const etag = `"${lastModified.getTime()}"`;
    
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('ETag', etag);
    
    // Conditional request check
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).send();
    }
    
    res.status(200).json({
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching my listings:", error);
    res.status(500).json({ error: "Failed to fetch my listings" });
  }
});
// ===================================================
router.post("/create-listing", async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Body received:", req.body);

    const { title, description, price, type, category, tags, mediaUrls, sellerId } = req.body;

    // Enhanced validation with specific checks
    if (!title || !description || !price || !type || !sellerId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["title", "description", "price", "type", "sellerId"],
        received: {
          title: !!title,
          description: !!description,
          price: !!price,
          type: !!type,
          sellerId: !!sellerId,
          category: !!category
        }
      });
    }

    // Validate price is a positive number
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        error: "Price must be a positive number",
        received: price
      });
    }

    // Validate sellerId format using mongoose
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        error: "Invalid seller ID format",
        received: sellerId
      });
    }

    // Normalize data with defaults
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
    const actualCategory = category || 'uncategorized'; // Default category

    console.log("Creating listing for seller:", sellerId);

    // Get seller email from User model
    let sellerEmail = null;
    try {
      const User = mongoose.model('User');
      const seller = await User.findById(sellerId).select('email');
      if (seller) {
        sellerEmail = seller.email;
        console.log("✅ Seller email found:", sellerEmail);
      } else {
        return res.status(404).json({
          error: "Seller not found",
          sellerId: sellerId
        });
      }
    } catch (emailError) {
      console.error("❌ Error fetching seller email:", emailError);
      return res.status(500).json({
        error: "Failed to verify seller",
        details: emailError.message
      });
    }

    // Create the listing
    const listing = await MarketplaceListing.create({
      sellerId: sellerId,
      sellerEmail: sellerEmail,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price).toFixed(2), // Ensure 2 decimal places
      type: type,
      category: actualCategory.trim(),
      tags: tagsArray.map(tag => tag.trim()).filter(tag => tag), // Clean tags
      mediaUrls: mediaArray,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("✅ Listing created successfully:", listing._id);

    res.status(201).json({ 
      message: "Listing created successfully", 
      listing: {
        id: listing._id,
        title: listing.title,
        price: listing.price,
        type: listing.type,
        category: listing.category,
        status: listing.status,
        createdAt: listing.createdAt
      }
    });

  } catch (error) {
    console.error("❌ Error creating listing:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Listing with similar details already exists",
        details: error.keyValue
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation failed",
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({ 
      error: "Failed to create listing", 
      details: error.message 
    });
  }
});
// ===================================================
// Get listings by specific user ID (Public route)
// ===================================================
router.get("/user/:userId/listings", authenticateMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { sellerId: userId, status: 'active' }; // Only show active listings
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log("📝 Fetching listings for user:", userId);

    // Verify user exists
    const user = await User.findById(userId).select('username');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt sellerId")
      .populate('sellerId', 'username avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    res.status(200).json({
      success: true,
      listings,
      user: {
        id: user._id,
        username: user.username
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    res.status(500).json({ error: "Failed to fetch user listings" });
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

// Delete ALL listings (⚠️ Use with caution - irreversible!)
router.delete("/admin/delete-all-listings", async (req, res) => {
  try {
    console.log("🚨 ATTEMPTING TO DELETE ALL LISTINGS");
    
    // First, get count of listings before deletion
    const beforeCount = await MarketplaceListing.countDocuments();
    console.log(`Listings before deletion: ${beforeCount}`);
    
    if (beforeCount === 0) {
      return res.status(404).json({ 
        message: "No listings found to delete",
        deletedCount: 0
      });
    }

    // Delete all listings
    const result = await MarketplaceListing.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} listings`);
    
    res.status(200).json({ 
      success: true,
      message: `All listings deleted successfully`,
      deletedCount: result.deletedCount,
      beforeCount: beforeCount,
      warning: "This action is irreversible!"
    });
    
  } catch (error) {
    console.error("❌ Error deleting all listings:", error);
    res.status(500).json({ 
      error: "Failed to delete listings",
      details: error.message 
    });
  }
});
module.exports = router;
