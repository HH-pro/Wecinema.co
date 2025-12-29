const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const User = require("../../models/user");
const mongoose = require('mongoose');
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// ===================================================
// 🔍 DEBUG MIDDLEWARE - Log all incoming requests
// ===================================================
router.use((req, res, next) => {
  console.log('\n📥 MARKETPLACE REQUEST:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
    user: req.user ? req.user._id : 'No user'
  });
  next();
});

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    console.log("📋 Fetching all active listings");
    
    const listings = await MarketplaceListing.find({ status: "active" })
      .populate("sellerId", "username avatar sellerRating email")
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${listings.length} active listings`);
    
    res.status(200).json({
      success: true,
      count: listings.length,
      listings
    });
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings",
      details: error.message 
    });
  }
});

// ===================================================
// ✅ GET USER'S LISTINGS (My Listings)
// ===================================================
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { status, page = 1, limit = 10, search } = req.query;
    
    console.log("📝 Fetching my listings for seller:", sellerId, {
      status,
      page,
      limit,
      search
    });
    
    // Build filter
    const filter = { sellerId };
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get listings with pagination
    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt views")
      .populate("sellerId", "username avatar sellerRating")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);
    
    // Prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`✅ Found ${listings.length} of ${total} total listings`);
    
    res.status(200).json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: (skip + listings.length) < total
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error("❌ Error fetching my listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch my listings",
      details: error.message
    });
  }
});

// ===================================================
// ✅ CREATE LISTING
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🎯 CREATE LISTING REQUEST");
    console.log("Authenticated User:", req.user._id);
    console.log("Request Body:", req.body);

    // Validate authentication
    if (!req.user || !req.user._id) {
      console.error("❌ User not authenticated");
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please log in."
      });
    }

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    // Enhanced validation
    const requiredFields = { title, description, price, type };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value || (typeof value === 'string' && value.trim() === ''))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missing: missingFields,
        received: Object.keys(requiredFields).reduce((acc, key) => ({
          ...acc,
          [key]: !!requiredFields[key]
        }), {})
      });
    }

    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be a positive number",
        received: price
      });
    }

    // Normalize data
    const tagsArray = Array.isArray(tags) 
      ? tags.filter(tag => tag && tag.trim())
      : (tags && typeof tags === 'string' ? [tags.trim()] : []);
    
    const mediaArray = Array.isArray(mediaUrls) 
      ? mediaUrls.filter(url => url && url.trim())
      : (mediaUrls && typeof mediaUrls === 'string' ? [mediaUrls.trim()] : []);
    
    const actualCategory = (category && category.trim()) || 'uncategorized';

    // Get seller info
    let seller = null;
    try {
      seller = await User.findById(sellerId).select('email username sellerRating').exec();
      if (!seller) {
        return res.status(404).json({
          success: false,
          error: "User account not found"
        });
      }
    } catch (error) {
      console.error("❌ Error fetching seller:", error);
      return res.status(500).json({
        success: false,
        error: "Could not retrieve user information"
      });
    }

    // Validate email if exists
    if (seller.email && !isValidEmail(seller.email)) {
      console.warn("⚠️ Invalid email format for user:", sellerId);
    }

    // Create listing data
    const listingData = {
      sellerId: sellerId,
      sellerEmail: seller.email || null,
      title: title.trim(),
      description: description.trim(),
      price: priceNum.toFixed(2),
      type: type.trim().toLowerCase(),
      category: actualCategory.trim().toLowerCase(),
      tags: tagsArray.map(tag => tag.trim().toLowerCase()),
      mediaUrls: mediaArray,
      status: "active",
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("📝 Creating listing with data:", listingData);

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
        createdAt: listing.createdAt,
        seller: {
          id: seller._id,
          username: seller.username,
          email: seller.email ? 'available' : 'not_provided'
        }
      }
    });

  } catch (error) {
    console.error("❌ Error creating listing:", error);
    
    // Handle specific errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Duplicate listing detected",
        details: error.keyValue
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => ({
        ...acc,
        [key]: error.errors[key].message
      }), {});
      
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create listing",
      details: error.message
    });
  }
});

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ===================================================
// ✅ EDIT/UPDATE LISTING
// ===================================================
router.put("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("✏️ EDIT LISTING REQUEST");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);
    console.log("Update Data:", req.body);

    const listingId = req.params.id;
    const sellerId = req.user._id;
    const { title, description, price, type, category, tags, mediaUrls } = req.body;

    // Validate ObjectId
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
      console.log("❌ Listing not found or unauthorized:", { listingId, sellerId });
      return res.status(404).json({
        success: false,
        error: "Listing not found or you don't have permission to edit"
      });
    }

    console.log("✅ Listing found, proceeding with update");

    // Build update object
    const updateData = {};
    const errors = [];

    // Validate and add fields
    if (title !== undefined) {
      if (!title || title.trim() === '') {
        errors.push("Title is required");
      } else {
        updateData.title = title.trim();
      }
    }

    if (description !== undefined) {
      if (!description || description.trim() === '') {
        errors.push("Description is required");
      } else {
        updateData.description = description.trim();
      }
    }

    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push("Price must be a positive number");
      } else {
        updateData.price = priceNum.toFixed(2);
      }
    }

    if (type !== undefined) {
      if (!type || type.trim() === '') {
        errors.push("Type is required");
      } else {
        updateData.type = type.trim().toLowerCase();
      }
    }

    if (category !== undefined) {
      updateData.category = (category && category.trim()) || 'uncategorized';
    }

    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags)
        ? tags.filter(tag => tag && tag.trim())
        : (tags && typeof tags === 'string' ? [tags.trim()] : []);
      updateData.tags = tagsArray.map(tag => tag.trim().toLowerCase());
    }

    if (mediaUrls !== undefined) {
      const mediaArray = Array.isArray(mediaUrls)
        ? mediaUrls.filter(url => url && url.trim())
        : (mediaUrls && typeof mediaUrls === 'string' ? [mediaUrls.trim()] : []);
      updateData.mediaUrls = mediaArray;
    }

    // Check for errors
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation errors",
        details: errors
      });
    }

    // Add update timestamp
    updateData.updatedAt = new Date();

    // Update the listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-__v")
      .populate("sellerId", "username avatar sellerRating");

    if (!updatedListing) {
      return res.status(500).json({
        success: false,
        error: "Failed to update listing"
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
    
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => ({
        ...acc,
        [key]: error.errors[key].message
      }), {});
      
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
// ✅ TOGGLE LISTING STATUS (Active/Inactive)
// ===================================================
router.patch("/listing/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🔄 TOGGLE LISTING STATUS REQUEST");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID format"
      });
    }

    // Check if listing exists and user owns it
    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      console.log("❌ Listing not found or unauthorized:", { listingId, sellerId });
      return res.status(404).json({
        success: false,
        error: "Listing not found or you don't have permission to modify"
      });
    }

    console.log(`✅ Listing found, current status: ${listing.status}`);

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

    console.log(`✅ Status changed from ${listing.status} to ${newStatus}`);

    res.status(200).json({
      success: true,
      message: `Listing ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      listing: updatedListing,
      previousStatus: listing.status,
      newStatus: newStatus
    });

  } catch (error) {
    console.error("❌ Error toggling listing status:", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to toggle listing status",
      details: error.message
    });
  }
});

// Alternative POST route for toggle (for frontend compatibility)
router.post("/listing/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🔄 POST TOGGLE LISTING STATUS REQUEST");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const listingId = req.params.id;
    const sellerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID format"
      });
    }

    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found or unauthorized"
      });
    }

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

    res.status(200).json({
      success: true,
      message: `Listing ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      listing: updatedListing,
      previousStatus: listing.status,
      newStatus: newStatus
    });

  } catch (error) {
    console.error("❌ Error in POST toggle:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle status",
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
    
    console.log("🔍 Fetching listing details for:", listingId);

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID format"
      });
    }

    const listing = await MarketplaceListing.findById(listingId)
      .populate("sellerId", "username avatar sellerRating email phone createdAt")
      .select("-__v -sellerEmail");

    if (!listing) {
      console.log("❌ Listing not found:", listingId);
      return res.status(404).json({
        success: false,
        error: "Listing not found"
      });
    }

    console.log(`✅ Listing found: ${listing.title}`);

    // Increment view count (async, don't wait for it)
    listing.views = (listing.views || 0) + 1;
    listing.save().catch(err => 
      console.error("❌ Failed to increment views:", err)
    );

    res.status(200).json({
      success: true,
      listing
    });

  } catch (error) {
    console.error("❌ Error fetching listing details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch listing details",
      details: error.message
    });
  }
});

// ===================================================
// ✅ GET LISTINGS BY USER ID (Public)
// ===================================================
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status = 'active', page = 1, limit = 20, exclude } = req.query;
    
    console.log("👤 Fetching listings for user:", userId, { status, page, limit });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format"
      });
    }

    // Verify user exists
    const user = await User.findById(userId).select('username avatar sellerRating createdAt');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    // Build filter
    const filter = { sellerId: userId };
    if (status && status !== 'all') filter.status = status;
    if (exclude) {
      filter._id = { $ne: exclude };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt views")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sellerId", "username avatar sellerRating");

    const total = await MarketplaceListing.countDocuments(filter);

    res.status(200).json({
      success: true,
      listings,
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        sellerRating: user.sellerRating,
        memberSince: user.createdAt
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: (skip + listings.length) < total
      }
    });

  } catch (error) {
    console.error("❌ Error fetching user listings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user listings",
      details: error.message
    });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🗑️ DELETE LISTING REQUEST");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const listingId = req.params.id;
    const userId = req.user._id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID format"
      });
    }

    // Find and delete with ownership check
    const listing = await MarketplaceListing.findOneAndDelete({
      _id: listingId,
      sellerId: userId
    });

    if (!listing) {
      console.log("❌ Delete failed - Listing not found or unauthorized:", {
        listingId,
        userId
      });
      return res.status(404).json({
        success: false,
        error: "Listing not found or you don't have permission to delete"
      });
    }

    console.log("✅ Listing deleted successfully:", {
      id: listing._id,
      title: listing.title,
      status: listing.status
    });

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
      listing: {
        _id: listing._id,
        title: listing.title,
        status: listing.status,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete listing",
      details: error.message
    });
  }
});

// Alternative DELETE route for compatibility
router.delete("/listings/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🗑️ COMPATIBILITY DELETE ROUTE (/listings/:id)");
    console.log("Listing ID:", req.params.id);
    console.log("User ID:", req.user._id);

    const listingId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid listing ID format"
      });
    }

    const listing = await MarketplaceListing.findOneAndDelete({
      _id: listingId,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found or unauthorized"
      });
    }

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
      listing: {
        _id: listing._id,
        title: listing.title,
        status: listing.status
      }
    });

  } catch (error) {
    console.error("❌ Error in compatibility delete:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete listing",
      details: error.message
    });
  }
});

// ===================================================
// ✅ ADMIN: Delete ALL listings (⚠️ Use with caution)
// ===================================================
router.delete("/admin/delete-all-listings", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🚨 ADMIN: DELETE ALL LISTINGS REQUEST");
    console.log("Requester:", req.user._id, req.user.email);

    // Optional admin check - uncomment if you have admin system
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Admin access required"
    //   });
    // }

    const beforeCount = await MarketplaceListing.countDocuments();
    console.log(`Listings before deletion: ${beforeCount}`);

    if (beforeCount === 0) {
      return res.status(200).json({
        success: true,
        message: "No listings found to delete",
        deletedCount: 0
      });
    }

    const result = await MarketplaceListing.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} listings`);

    res.status(200).json({
      success: true,
      message: "All listings deleted successfully",
      stats: {
        deletedCount: result.deletedCount,
        beforeCount: beforeCount,
        afterCount: 0
      },
      warning: "⚠️ This action is irreversible!",
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ Error deleting all listings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete listings",
      details: error.message
    });
  }
});

// ===================================================
// ✅ SEARCH LISTINGS
// ===================================================
router.get("/search", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, type, sort = 'newest', page = 1, limit = 20 } = req.query;
    
    console.log("🔍 Search request:", {
      query: q,
      category,
      minPrice,
      maxPrice,
      type,
      sort,
      page,
      limit
    });

    // Build search filter
    const filter = { status: "active" };
    
    // Text search
    if (q && q.trim()) {
      const searchRegex = { $regex: q.trim(), $options: 'i' };
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }
    
    // Category filter
    if (category && category !== 'all') {
      filter.category = category.toLowerCase();
    }
    
    // Type filter
    if (type && type !== 'all') {
      filter.type = type.toLowerCase();
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
      case 'popular':
        sortOption = { views: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search
    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "username avatar sellerRating")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    console.log(`✅ Search found ${listings.length} of ${total} listings`);

    res.status(200).json({
      success: true,
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: (skip + listings.length) < total
      },
      filters: {
        query: q,
        category,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        type,
        sort
      }
    });

  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
      details: error.message
    });
  }
});

// ===================================================
// ✅ GET LISTING STATISTICS
// ===================================================
router.get("/stats", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log("📊 Getting listing stats for user:", userId);

    const stats = await MarketplaceListing.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalViews: { $sum: "$views" },
          avgPrice: { $avg: "$price" },
          totalValue: { $sum: "$price" }
        }
      }
    ]);

    const totalListings = await MarketplaceListing.countDocuments({ sellerId: userId });
    const totalViews = await MarketplaceListing.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$views" } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalListings,
        totalViews: totalViews[0]?.total || 0,
        byStatus: stats.reduce((acc, stat) => ({
          ...acc,
          [stat._id]: {
            count: stat.count,
            avgPrice: stat.avgPrice?.toFixed(2) || "0.00",
            totalValue: stat.totalValue?.toFixed(2) || "0.00"
          }
        }), {})
      }
    });

  } catch (error) {
    console.error("❌ Error getting stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
      details: error.message
    });
  }
});

// ===================================================
// 🐛 DEBUG ROUTE - List all registered routes
// ===================================================
router.get("/debug/routes", (req, res) => {
  const routes = [];
  
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .map(method => method.toUpperCase())
        .join(', ');
      routes.push({
        methods,
        path: layer.route.path,
        fullPath: `/marketplace${layer.route.path}`
      });
    }
  });

  console.log("🔍 Registered Marketplace Routes:");
  routes.forEach(route => {
    console.log(`${route.methods.padEnd(8)} ${route.fullPath}`);
  });

  res.status(200).json({
    success: true,
    routes: routes,
    total: routes.length,
    timestamp: new Date()
  });
});

// ===================================================
// 🎯 CATCH-ALL ROUTE FOR DEBUGGING
// ===================================================
router.use("*", (req, res) => {
  console.error("❌ MARKETPLACE ROUTE NOT FOUND:", {
    method: req.method,
    originalUrl: req.originalUrl,
    path: req.path,
    baseUrl: req.baseUrl,
    params: req.params,
    query: req.query,
    user: req.user ? req.user._id : 'No user'
  });

  // Get available routes for debugging
  const availableRoutes = [];
  router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .map(method => method.toUpperCase())
        .join(', ');
      availableRoutes.push(`${methods} ${layer.route.path}`);
    }
  });

  res.status(404).json({
    success: false,
    error: "Marketplace route not found",
    requested: {
      method: req.method,
      url: req.originalUrl,
      path: req.path
    },
    hint: "Routes are mounted at /marketplace",
    example: `Try ${req.method} /marketplace${req.path.replace('/marketplace', '')}`,
    availableRoutes: availableRoutes.slice(0, 20) // Show first 20 routes
  });
});

// ===================================================
// ✅ EXPORT ROUTER
// ===================================================
module.exports = router;