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
const mongoose = require('mongoose');

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

    // Validate sellerId format
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({
        error: "Invalid seller ID format",
        received: sellerId
      });
    }

    // Normalize data with defaults
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
    const actualCategory = category || 'uncategorized';

    console.log("Creating listing for seller:", sellerId);

    // Get seller email from User model with timeout and connection check
    let sellerEmail = null;
    let sellerExists = false;
    
    try {
      // Check database connection first
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) { // 1 = connected
        console.warn(`⚠️ Database not connected (state: ${dbState}), skipping email fetch`);
        throw new Error('Database not connected');
      }

      // Use Promise.race to implement timeout
      const User = mongoose.model('User');
      const emailFetchPromise = User.findById(sellerId).select('email').exec();
      
      // 5 second timeout for email fetch (instead of default 10s)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email fetch timeout')), 5000)
      );

      const seller = await Promise.race([emailFetchPromise, timeoutPromise]);
      
      if (seller) {
        sellerEmail = seller.email;
        sellerExists = true;
        console.log("✅ Seller email found:", sellerEmail);
      } else {
        console.warn("⚠️ Seller not found in database");
        // Don't fail here - continue without email
      }
    } catch (emailError) {
      console.error("❌ Error fetching seller email:", emailError.message);
      // Continue without email - don't block listing creation
      sellerExists = true; // Assume seller exists to continue
    }

    // If we couldn't verify the seller exists, fail the request
    if (!sellerExists) {
      return res.status(404).json({
        error: "Seller not found",
        sellerId: sellerId
      });
    }

    // Create the listing (proceed even without email)
    const listing = await MarketplaceListing.create({
      sellerId: sellerId,
      sellerEmail: sellerEmail, // Will be null if fetch failed
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price).toFixed(2),
      type: type,
      category: actualCategory.trim(),
      tags: tagsArray.map(tag => tag.trim()).filter(tag => tag),
      mediaUrls: mediaArray,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("✅ Listing created successfully:", listing._id);
    if (!sellerEmail) {
      console.warn("⚠️ Listing created without seller email");
    }

    res.status(201).json({ 
      message: "Listing created successfully", 
      listing: {
        id: listing._id,
        title: listing.title,
        price: listing.price,
        type: listing.type,
        category: listing.category,
        status: listing.status,
        createdAt: listing.createdAt,
        hasSellerEmail: !!sellerEmail // Indicate if email was captured
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

    // Handle database connection errors
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({
        error: "Database temporarily unavailable",
        details: "Please try again in a moment"
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
