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
// ✅ CREATE LISTING
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Body received:", req.body);

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    // Enhanced validation with specific checks
    if (!title || !description || !price || !type) {
      return res.status(400).json({ 
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

    // Validate price is a positive number
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        error: "Price must be a positive number",
        received: price
      });
    }

    // Normalize data with defaults
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
    const actualCategory = category || 'uncategorized';

    console.log("Creating listing for seller:", sellerId);

    // Get seller email from User model
    let sellerEmail = null;
    try {
      const seller = await User.findById(sellerId).select('email').exec();
      if (seller) {
        sellerEmail = seller.email;
        console.log("✅ Seller email found:", sellerEmail);
      }
    } catch (emailError) {
      console.error("❌ Error fetching seller email:", emailError.message);
      // Continue without email
    }

    // Create the listing
    const listing = await MarketplaceListing.create({
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
        createdAt: listing.createdAt,
        hasSellerEmail: !!sellerEmail
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

    // Build update object with only provided fields
    const updateData = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) {
      if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
          error: "Price must be a positive number",
          received: price
        });
      }
      updateData.price = parseFloat(price).toFixed(2);
    }
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category.trim() || 'uncategorized';
    
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
      message: "Listing updated successfully", 
      listing: updatedListing 
    });

  } catch (error) {
    console.error("❌ Error updating listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation failed",
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ error: "Failed to update listing" });
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