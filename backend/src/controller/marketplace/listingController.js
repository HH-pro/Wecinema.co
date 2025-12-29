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
    res.status(200).json({
      success: true,
      listings
    });
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings" 
    });
  }
});

// ===================================================
// ✅ GET USER'S LISTINGS (My Listings)
// ===================================================
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { sellerId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log("📝 Fetching my listings for seller:", sellerId);

    // Get listings with pagination
    const listings = await MarketplaceListing.find(filter)
      .select("_id title price status mediaUrls description category tags createdAt updatedAt views sellerId")
      .populate("sellerId", "username avatar sellerRating")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      timestamp: new Date().getTime()
    });
    
  } catch (error) {
    console.error("❌ Error fetching my listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch my listings" 
    });
  }
});

// ===================================================
// ✅ CREATE LISTING
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("User ID:", req.user._id);

    if (!req.user || !req.user._id) {
      console.error("❌ User not authenticated. req.user:", req.user);
      return res.status(401).json({
        success: false,
        error: "User not authenticated. Please log in again."
      });
    }

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    // Enhanced validation
    if (!title || !description || !price || !type) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields: title, description, price, type",
        required: ["title", "description", "price", "type"]
      });
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be a positive number"
      });
    }

    // Normalize data
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
    const actualCategory = category || 'uncategorized';

    // Get seller email
    let sellerEmail = null;
    let seller = null;
    
    try {
      seller = await User.findById(sellerId).select('email username').exec();
      if (seller) {
        sellerEmail = seller.email;
        console.log("✅ Seller found:", seller.username);
      } else {
        console.error("❌ Seller not found in database for ID:", sellerId);
        return res.status(404).json({
          success: false,
          error: "User account not found. Please contact support."
        });
      }
    } catch (emailError) {
      console.error("❌ Error fetching seller:", emailError.message);
      return res.status(500).json({
        success: false,
        error: "Could not retrieve user information"
      });
    }

    // Validate email format
    if (sellerEmail && !isValidEmail(sellerEmail)) {
      console.error("❌ Invalid seller email format:", sellerEmail);
      return res.status(400).json({
        success: false,
        error: "Invalid email format in user account"
      });
    }

    // Create listing data
    const listingData = {
      sellerId: sellerId,
      sellerEmail: sellerEmail,
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
    };

    console.log("📝 Creating listing:", listingData.title);

    // Create the listing
    const listing = await MarketplaceListing.create(listingData);

    console.log("✅ Listing created successfully:", listing._id);

    res.status(201).json({ 
      success: true,
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
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Listing with similar details already exists"
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors
      });
    }

    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable"
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Failed to create listing"
    });
  }
});

// Email validation helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ===================================================
// ✅ SIMPLE EDIT LISTING (Only title, description, price)
// ===================================================
router.put("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== ✏️ EDIT LISTING REQUEST ===");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);
    console.log("Update data:", req.body);

    const { title, description, price } = req.body;
    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Validate listing ID
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }

    // Check if listing exists and user owns it
    const existingListing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!existingListing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found or you don't have permission to edit this listing" 
      });
    }

    // Build update object
    const updateData = {
      updatedAt: new Date()
    };
    
    // Update title if provided
    if (title !== undefined && title !== null) {
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          error: "Title cannot be empty"
        });
      }
      updateData.title = title.trim();
    } else {
      updateData.title = existingListing.title;
    }
    
    // Update description if provided
    if (description !== undefined && description !== null) {
      if (!description || description.trim() === '') {
        return res.status(400).json({
          success: false,
          error: "Description cannot be empty"
        });
      }
      updateData.description = description.trim();
    } else {
      updateData.description = existingListing.description;
    }
    
    // Update price if provided
    if (price !== undefined && price !== null) {
      if (!price) {
        return res.status(400).json({
          success: false,
          error: "Price is required"
        });
      }
      if (isNaN(price) || parseFloat(price) <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be a positive number"
        });
      }
      updateData.price = parseFloat(price).toFixed(2);
    } else {
      updateData.price = existingListing.price;
    }
    
    console.log("🔄 Update data:", updateData);

    // Update the listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { 
        new: true,
        runValidators: true 
      }
    ).select("_id title description price type category tags mediaUrls status updatedAt createdAt views sellerId");

    if (!updatedListing) {
      console.error("❌ Failed to update listing in database");
      return res.status(500).json({
        success: false,
        error: "Failed to update listing in database"
      });
    }

    console.log("✅ Listing updated successfully:", updatedListing._id);

    res.status(200).json({ 
      success: true,
      message: "Listing updated successfully", 
      listing: updatedListing 
    });

  } catch (error) {
    console.error("❌ Error updating listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to update listing",
      details: error.message 
    });
  }
});

// ===================================================
// ✅ TOGGLE LISTING STATUS - FIXED WORKING VERSION
// ===================================================
router.post("/listing/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== 🟢 TOGGLE LISTING STATUS REQUEST ===");
    console.log("📦 Request Details:", {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      user: req.user ? req.user._id : 'No user',
      body: req.body
    });

    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Validate listing ID
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      console.log("❌ Invalid listing ID format:", listingId);
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }

    console.log("🔍 Finding listing:", listingId, "for user:", sellerId);

    // Check if listing exists and user owns it
    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      console.log("❌ Listing not found or user not authorized");
      return res.status(404).json({ 
        success: false,
        error: "Listing not found or you don't have permission to modify this listing" 
      });
    }

    console.log("✅ Listing found:", {
      id: listing._id,
      title: listing.title,
      currentStatus: listing.status
    });

    // Toggle status
    let newStatus;
    let message;
    
    if (listing.status === "active") {
      newStatus = "inactive";
      message = "Listing deactivated successfully";
    } else if (listing.status === "inactive") {
      newStatus = "active";
      message = "Listing activated successfully";
    } else if (listing.status === "draft") {
      newStatus = "active";
      message = "Listing published successfully";
    } else {
      console.log("⚠️ Cannot toggle from status:", listing.status);
      return res.status(400).json({
        success: false,
        error: `Cannot toggle status from ${listing.status}`,
        currentStatus: listing.status
      });
    }
    
    console.log(`🔄 Toggling from "${listing.status}" to "${newStatus}"`);
    
    // Update the listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        status: newStatus,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true 
      }
    ).select("_id title status updatedAt createdAt price description category tags mediaUrls sellerId views");

    if (!updatedListing) {
      console.error("❌ Database update failed");
      return res.status(500).json({
        success: false,
        error: "Failed to update listing in database"
      });
    }

    console.log("✅ Listing status updated successfully:", {
      id: updatedListing._id,
      newStatus: updatedListing.status,
      updatedAt: updatedListing.updatedAt
    });

    res.status(200).json({ 
      success: true,
      message: message,
      listing: updatedListing,
      previousStatus: listing.status,
      newStatus: newStatus
    });

  } catch (error) {
    console.error("❌ Error toggling listing status:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    if (error.name === 'MongoError' && error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Duplicate listing found"
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to toggle listing status",
      details: error.message 
    });
  }
});

// ===================================================
// ✅ DELETE LISTING - WORKING VERSION
// ===================================================
router.delete("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== 🔴 DELETE LISTING REQUEST ===");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const userId = req.user._id;
    const listingId = req.params.id;
    
    // Validate listing ID
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }

    console.log("🔍 Finding listing to delete:", listingId);

    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: userId,
    });

    if (!listing) {
      console.log("❌ Listing not found or user not authorized");
      return res.status(404).json({ 
        success: false,
        error: "Listing not found or you don't have permission to delete this listing" 
      });
    }

    console.log("✅ Listing found, deleting:", listing.title);

    // Delete the listing
    const deletedListing = await MarketplaceListing.findByIdAndDelete(listingId);

    if (!deletedListing) {
      console.error("❌ Failed to delete listing from database");
      return res.status(500).json({
        success: false,
        error: "Failed to delete listing from database"
      });
    }

    console.log("✅ Listing deleted successfully:", deletedListing._id);
    
    res.status(200).json({ 
      success: true,
      message: "Listing deleted successfully", 
      deletedListing: {
        _id: deletedListing._id,
        title: deletedListing.title,
        status: deletedListing.status
      }
    });
    
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to delete listing",
      details: error.message 
    });
  }
});

// ===================================================
// ✅ GET SINGLE LISTING DETAILS
// ===================================================
router.get("/listing/:id", async (req, res) => {
  try {
    const listingId = req.params.id;
    
    const listing = await MarketplaceListing.findById(listingId)
      .populate("sellerId", "username avatar sellerRating email phone")
      .select("title description price type category tags mediaUrls status sellerId createdAt updatedAt views");
    
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found" 
      });
    }
    
    // Increment view count
    listing.views = (listing.views || 0) + 1;
    await listing.save();
    
    res.status(200).json({ 
      success: true,
      listing 
    });
    
  } catch (error) {
    console.error("❌ Error fetching listing details:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listing details" 
    });
  }
});

// ===================================================
// ✅ Get listings by specific user ID (Public route)
// ===================================================
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { sellerId: userId };
    if (status) filter.status = status;
    else filter.status = 'active'; // Default to active listings

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log("📝 Fetching listings for user:", userId);

    // Verify user exists
    const user = await User.findById(userId).select('username avatar sellerRating');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    res.status(200).json({
      success: true,
      listings,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        sellerRating: user.sellerRating
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
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch user listings" 
    });
  }
});

// ===================================================
// ✅ ADMIN: Delete ALL listings (⚠️ Use with caution)
// ===================================================
router.delete("/admin/delete-all-listings", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🚨 ATTEMPTING TO DELETE ALL LISTINGS");
    
    const beforeCount = await MarketplaceListing.countDocuments();
    console.log(`Listings before deletion: ${beforeCount}`);
    
    if (beforeCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "No listings found to delete"
      });
    }

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
      success: false,
      error: "Failed to delete listings"
    });
  }
});

// ===================================================
// ✅ TEST ENDPOINT
// ===================================================
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Marketplace API is working!",
    endpoints: {
      "GET /listings": "Get all active listings",
      "GET /my-listings": "Get user's listings",
      "POST /create-listing": "Create new listing",
      "PUT /listing/:id": "Edit listing",
      "POST /listing/:id/toggle-status": "Toggle listing status",
      "DELETE /listing/:id": "Delete listing",
      "GET /listing/:id": "Get single listing"
    }
  });
});

module.exports = router;