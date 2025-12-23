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
      .select("title price status mediaUrls description category tags createdAt updatedAt views sellerId")
      .populate("sellerId", "username avatar sellerRating")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // ✅ REMOVE or modify cache headers to prevent 304
    // Option 1: Remove cache headers entirely
    // Option 2: Add cache-busting headers
    
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
      timestamp: new Date().getTime() // Add timestamp to prevent caching
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
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Full request object:", {
      user: req.user,
      body: req.body,
      headers: req.headers
    });

    // Debug: Check if user is properly authenticated
    if (!req.user || !req.user._id) {
      console.error("❌ User not authenticated. req.user:", req.user);
      return res.status(401).json({
        success: false,
        error: "User not authenticated. Please log in again."
      });
    }

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    console.log("✅ Authenticated user ID:", sellerId);

    // Enhanced validation
    if (!title || !description || !price || !type) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields",
        required: ["title", "description", "price", "type"],
        received: {
          title: !!title,
          description: !!description,
          price: !!price,
          type: !!type,
          category: !!category
        }
      });
    }

    // Validate price
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be a positive number",
        received: price
      });
    }

    // Normalize data
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
    const actualCategory = category || 'uncategorized';

    // Get seller email with better error handling
    let sellerEmail = null;
    let seller = null;
    
    try {
      seller = await User.findById(sellerId).select('email username').exec();
      if (seller) {
        sellerEmail = seller.email;
        console.log("✅ Seller found:", {
          id: seller._id,
          email: seller.email,
          username: seller.username
        });
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
        error: "Could not retrieve user information",
        details: emailError.message
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

    console.log("📝 Creating listing with data:", listingData);

    // Create the listing
    const listing = await MarketplaceListing.create(listingData);

    console.log("✅ Listing created successfully:", {
      id: listing._id,
      title: listing.title,
      sellerId: listing.sellerId,
      sellerEmail: listing.sellerEmail
    });

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
        createdAt: listing.createdAt,
        seller: {
          id: seller._id,
          username: seller.username,
          email: sellerEmail ? 'email_provided' : 'no_email'
        }
      }
    });

  } catch (error) {
    console.error("❌ Error creating listing:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Listing with similar details already exists",
        details: error.keyValue
      });
    }
    
    // Handle validation errors
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

    // Handle database connection errors
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable",
        details: "Please try again in a moment"
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Failed to create listing", 
      details: error.message 
    });
  }
});

// Email validation helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ===================================================
// ✅ EDIT/UPDATE LISTING
// ===================================================
router.put("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== EDIT LISTING REQUEST ===");
    console.log("Listing ID:", req.params.id);
    console.log("Update data:", req.body);
    console.log("User ID:", req.user._id);

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Check if listing exists and user owns it
    const existingListing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!existingListing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to edit this listing" 
      });
    }

    // Build update object with validation (like create listing)
    const updateData = {};
    
    // Required fields validation (same as create listing)
    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json({
          error: "Title is required",
          received: title
        });
      }
      updateData.title = title.trim();
    } else {
      return res.status(400).json({ 
        error: "Title is required for update",
        required: ["title"]
      });
    }
    
    if (description !== undefined) {
      if (!description || description.trim() === '') {
        return res.status(400).json({
          error: "Description is required",
          received: description
        });
      }
      updateData.description = description.trim();
    } else {
      return res.status(400).json({ 
        error: "Description is required for update",
        required: ["description"]
      });
    }
    
    if (price !== undefined) {
      if (!price) {
        return res.status(400).json({
          error: "Price is required",
          received: price
        });
      }
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          error: "Price must be a positive number",
          received: price
        });
      }
      updateData.price = parseFloat(price).toFixed(2);
    } else {
      return res.status(400).json({ 
        error: "Price is required for update",
        required: ["price"]
      });
    }
    
    if (type !== undefined) {
      if (!type || type.trim() === '') {
        return res.status(400).json({
          error: "Type is required",
          received: type
        });
      }
      updateData.type = type;
    } else {
      return res.status(400).json({ 
        error: "Type is required for update",
        required: ["type"]
      });
    }
    
    // Optional fields
    if (category !== undefined) {
      updateData.category = category.trim() || 'uncategorized';
    }
    
    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
      updateData.tags = tagsArray.map(tag => tag.trim()).filter(tag => tag);
    }
    
    if (mediaUrls !== undefined) {
      const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
      updateData.mediaUrls = mediaArray;
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Update the listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("title price type category tags description mediaUrls status updatedAt");

    if (!updatedListing) {
      return res.status(404).json({ error: "Failed to update listing" });
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
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Listing with similar details already exists",
        details: error.keyValue
      });
    }

    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable",
        details: "Please try again in a moment"
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
// ✅ TOGGLE LISTING STATUS (Active/Inactive)
// ===================================================
router.patch("/listing/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== TOGGLE LISTING STATUS ===");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Check if listing exists and user owns it
    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to modify this listing" 
      });
    }

    // Toggle status
    const newStatus = listing.status === "active" ? "inactive" : "active";
    
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date()
        } 
      },
      { new: true }
    ).select("title status updatedAt");

    console.log(`✅ Listing status changed from ${listing.status} to ${newStatus}`);

    res.status(200).json({ 
      message: `Listing ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      listing: updatedListing,
      previousStatus: listing.status,
      newStatus: newStatus
    });

  } catch (error) {
    console.error("❌ Error toggling listing status:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to toggle listing status" });
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
      return res.status(404).json({ error: "Listing not found" });
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
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to fetch listing details" });
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
      return res.status(404).json({ error: "User not found" });
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
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DELETE LISTING REQUEST ===");
    console.log("Listing ID to delete:", req.params.id);
    console.log("User making request:", req.user._id);

    const userId = req.user._id;
    
    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: userId,
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

// ===================================================
// ✅ ADMIN: Delete ALL listings (⚠️ Use with caution)
// ===================================================
router.delete("/admin/delete-all-listings", authenticateMiddleware, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });
    
    console.log("🚨 ATTEMPTING TO DELETE ALL LISTINGS");
    
    const beforeCount = await MarketplaceListing.countDocuments();
    console.log(`Listings before deletion: ${beforeCount}`);
    
    if (beforeCount === 0) {
      return res.status(404).json({ 
        message: "No listings found to delete",
        deletedCount: 0
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
      error: "Failed to delete listings",
      details: error.message 
    });
  }
});

module.exports = router;