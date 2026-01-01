const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const User = require("../../models/user");
const mongoose = require('mongoose');
const { authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings (USD Only)
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    const { category, minPrice, maxPrice, type, search, page = 1, limit = 12 } = req.query;
    
    const filter = { status: "active" };
    
    // Apply filters
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    
    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "username avatar sellerRating email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);
    
    // ✅ Simple formatting - just add $ sign
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}` // Add $ sign
    }));

    res.status(200).json({
      success: true,
      listings: formattedListings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      currency: "USD" // Confirm everything is in USD
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
// ✅ GET USER'S LISTINGS (My Listings) - USD Only
// ===================================================
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const sellerId = req.user._id;
    
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { sellerId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get listings with pagination
    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt views sellerId")
      .populate("sellerId", "username avatar sellerRating")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // ✅ Add $ sign to prices
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`
    }));

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.status(200).json({
      success: true,
      listings: formattedListings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      timestamp: new Date().getTime(),
      currency: "USD"
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
// ✅ CREATE LISTING (USD Only - Simple)
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("Body:", req.body);

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    // Enhanced validation
    if (!title || !description || !price || !type) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields",
        required: ["title", "description", "price", "type"]
      });
    }

    // Validate price
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
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

    // Get seller info
    let sellerEmail = null;
    let seller = null;
    
    try {
      seller = await User.findById(sellerId).select('email username').exec();
      if (seller) {
        sellerEmail = seller.email;
      } else {
        return res.status(404).json({
          success: false,
          error: "User account not found"
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
      return res.status(400).json({
        success: false,
        error: "Invalid email format in user account"
      });
    }

    // ✅ Simple listing data - price in USD
    const listingData = {
      sellerId: sellerId,
      sellerEmail: sellerEmail,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(priceNumber.toFixed(2)), // Store in USD
      currency: 'USD', // Explicitly set currency
      type: type,
      category: actualCategory.trim(),
      tags: tagsArray.map(tag => tag.trim()).filter(tag => tag),
      mediaUrls: mediaArray,
      status: "active"
    };

    console.log("📝 Creating listing in USD:", {
      title: listingData.title,
      price: `$${listingData.price}`
    });

    // Create the listing
    const listing = await MarketplaceListing.create(listingData);

    // Prepare response
    const response = {
      success: true,
      message: "Listing created successfully", 
      listing: {
        id: listing._id,
        title: listing.title,
        price: listing.price, // USD amount
        formattedPrice: `$${listing.price.toFixed(2)}`, // With $ sign
        currency: listing.currency, // USD
        type: listing.type,
        category: listing.category,
        status: listing.status,
        createdAt: listing.createdAt,
        seller: {
          id: seller._id,
          username: seller.username
        }
      }
    };

    res.status(201).json(response);

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

    res.status(500).json({ 
      success: false,
      error: "Failed to create listing",
      details: error.message 
    });
  }
});

// ===================================================
// ✅ EDIT/UPDATE LISTING (USD Only)
// ===================================================
router.put("/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== EDIT LISTING REQUEST ===");

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
        success: false,
        error: "Listing not found or no permission" 
      });
    }

    // Build update object
    const updateData = {};
    let hasUpdates = false;
    
    // Handle price update
    if (price !== undefined) {
      hasUpdates = true;
      
      if (price === null || price === '') {
        return res.status(400).json({
          success: false,
          error: "Price is required",
          field: "price"
        });
      }
      
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be a valid positive number",
          field: "price"
        });
      }

      // ✅ Store price in USD
      updateData.price = parseFloat(priceNum.toFixed(2));
    }
    
    // Other fields
    if (title !== undefined && title.trim() !== existingListing.title) {
      hasUpdates = true;
      updateData.title = title.trim();
    }
    
    if (description !== undefined && description.trim() !== existingListing.description) {
      hasUpdates = true;
      updateData.description = description.trim();
    }
    
    if (type !== undefined && type !== existingListing.type) {
      hasUpdates = true;
      updateData.type = type;
    }
    
    if (category !== undefined && category?.trim() !== existingListing.category) {
      hasUpdates = true;
      updateData.category = category?.trim() || 'uncategorized';
    }
    
    if (tags !== undefined) {
      hasUpdates = true;
      const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
      updateData.tags = tagsArray.map(tag => tag?.trim()).filter(tag => tag);
    }
    
    if (mediaUrls !== undefined) {
      hasUpdates = true;
      const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);
      updateData.mediaUrls = mediaArray;
    }
    
    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        error: "No changes provided for update"
      });
    }
    
    updateData.updatedAt = new Date();

    // Update the listing
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { 
        new: true, 
        runValidators: true
      }
    );

    if (!updatedListing) {
      return res.status(404).json({ 
        success: false,
        error: "Failed to update listing" 
      });
    }

    // Prepare response
    const response = {
      success: true,
      message: "Listing updated successfully", 
      listing: {
        ...updatedListing.toObject(),
        formattedPrice: `$${updatedListing.price.toFixed(2)}`, // Add $ sign
        currency: 'USD'
      }
    };

    res.status(200).json(response);

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
// ✅ GET SINGLE LISTING DETAILS (USD Only)
// ===================================================
router.get("/listing/:id", async (req, res) => {
  try {
    const listingId = req.params.id;
    
    const listing = await MarketplaceListing.findById(listingId)
      .populate("sellerId", "username avatar sellerRating email phone")
      .select("title description price type category tags mediaUrls status sellerId createdAt updatedAt views currency");
    
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found" 
      });
    }
    
    // Increment view count
    listing.views = (listing.views || 0) + 1;
    await listing.save();
    
    // Format response
    const formattedListing = {
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`, // Add $ sign
      currency: 'USD'
    };
    
    res.status(200).json({ 
      success: true,
      listing: formattedListing
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
// ✅ Get listings by specific user ID (USD Only)
// ===================================================
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    
    const filter = { sellerId: userId };
    if (status) filter.status = status;
    else filter.status = 'active';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verify user exists
    const user = await User.findById(userId).select('username avatar sellerRating');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt currency")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // Format listings - add $ sign
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`, // Add $ sign
      currency: 'USD'
    }));

    res.status(200).json({
      success: true,
      listings: formattedListings,
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
// ✅ TOGGLE LISTING STATUS
// ===================================================
router.patch("/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const sellerId = req.user._id;

    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found or no permission" 
      });
    }

    const newStatus = listing.status === "active" ? "inactive" : "active";
    
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        status: newStatus,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({ 
      success: true,
      message: `Listing ${newStatus === "active" ? "activated" : "deactivated"} successfully`,
      listing: {
        ...updatedListing.toObject(),
        formattedPrice: `$${updatedListing.price.toFixed(2)}`
      }
    });

  } catch (error) {
    console.error("❌ Error toggling listing status:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to toggle listing status" 
    });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/:id", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    const listing = await MarketplaceListing.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found"
      });
    }
    
    if (!listing.sellerId.equals(userId)) {
      return res.status(403).json({ 
        success: false,
        error: "No permission to delete this listing" 
      });
    }
    
    await MarketplaceListing.findByIdAndDelete(listingId);
    
    res.status(200).json({ 
      success: true,
      message: "Listing deleted successfully", 
      deletedListing: {
        _id: listing._id,
        title: listing.title,
        formattedPrice: `$${listing.price.toFixed(2)}`,
        status: listing.status
      }
    });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete listing"
    });
  }
});

// Email validation helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ===================================================
// ✅ BULK UPDATE EXISTING PRICES TO USD (Migration)
// ===================================================
router.post("/admin/migrate-to-usd", authenticateMiddleware, async (req, res) => {
  try {
    const { exchangeRate = 83 } = req.body; // If existing prices are in INR
    
    console.log("🔄 Starting migration to USD");
    
    // Get all listings
    const allListings = await MarketplaceListing.find({});
    
    console.log(`📊 Found ${allListings.length} listings to migrate`);
    
    let migratedCount = 0;
    let unchangedCount = 0;
    
    for (const listing of allListings) {
      try {
        // If listing doesn't have currency field, assume it's INR and convert
        if (!listing.currency || listing.currency !== 'USD') {
          // Convert from INR to USD if needed
          const priceInUSD = parseFloat((listing.price / exchangeRate).toFixed(2));
          
          listing.price = priceInUSD;
          listing.currency = 'USD';
          await listing.save();
          
          migratedCount++;
          console.log(`✅ Migrated: ${listing.title} - New price: $${priceInUSD}`);
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(`❌ Error migrating listing ${listing._id}:`, error.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Migration to USD completed",
      stats: {
        total: allListings.length,
        migrated: migratedCount,
        unchanged: unchangedCount,
        exchangeRate: exchangeRate
      }
    });
    
  } catch (error) {
    console.error("❌ Error in migration:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to migrate to USD" 
    });
  }
});

module.exports = router;