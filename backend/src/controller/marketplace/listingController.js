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
    
    // Format prices to show USD
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`,
      priceWithOriginal: listing.priceWithOriginal
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
      currency: "USD"
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
// ✅ GET USER'S LISTINGS (My Listings) - UPDATED FOR USD
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
      .select("title price status mediaUrls description category tags createdAt updatedAt views sellerId originalPrice originalCurrency exchangeRate convertedAt")
      .populate("sellerId", "username avatar sellerRating")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // Format listings with USD prices
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`,
      priceWithOriginal: listing.priceWithOriginal
    }));

    // Cache control headers
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
      displayCurrency: "USD"
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
// ✅ CREATE LISTING - UPDATED FOR USD
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

    const { title, description, price, type, category, tags, mediaUrls, currency = 'USD' } = req.body;
    const sellerId = req.user._id;

    console.log("💰 Currency received:", currency, "Price:", price);

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

    // 🆕 Currency validation and conversion
    let priceInUSD = priceNumber;
    let originalPrice = null;
    let originalCurrency = null;
    let exchangeRate = 83; // Default exchange rate INR to USD

    if (currency.toUpperCase() === 'INR' || currency === '₹') {
      console.log("🔄 Converting INR to USD...");
      originalPrice = priceNumber;
      originalCurrency = 'INR';
      priceInUSD = parseFloat((priceNumber / exchangeRate).toFixed(2));
      console.log(`💰 Converted: ₹${originalPrice} → $${priceInUSD} (Rate: ${exchangeRate})`);
    } else if (currency.toUpperCase() === 'USD' || currency === '$') {
      console.log("✅ Price already in USD");
      priceInUSD = parseFloat(priceNumber.toFixed(2));
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported currency. Use USD or INR",
        received: currency,
        supported: ["USD", "INR"]
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

    // Create listing data with USD
    const listingData = {
      sellerId: sellerId,
      sellerEmail: sellerEmail,
      title: title.trim(),
      description: description.trim(),
      price: priceInUSD, // Always store in USD
      originalPrice: originalCurrency ? originalPrice : null,
      originalCurrency: originalCurrency,
      exchangeRate: originalCurrency ? exchangeRate : null,
      convertedAt: originalCurrency ? new Date() : null,
      type: type,
      category: actualCategory.trim(),
      tags: tagsArray.map(tag => tag.trim()).filter(tag => tag),
      mediaUrls: mediaArray,
      status: "active"
    };

    console.log("📝 Creating listing with USD:", {
      price: `$${priceInUSD}`,
      original: originalPrice ? `₹${originalPrice}` : null
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
        price: listing.price,
        formattedPrice: `$${listing.price.toFixed(2)}`,
        originalPrice: listing.originalPrice,
        originalCurrency: listing.originalCurrency,
        exchangeRate: listing.exchangeRate,
        type: listing.type,
        category: listing.category,
        status: listing.status,
        createdAt: listing.createdAt,
        seller: {
          id: seller._id,
          username: seller.username
        }
      },
      currencyInfo: {
        displayCurrency: "USD",
        originalCurrency: listing.originalCurrency
      }
    };

    // Add conversion details if applicable
    if (listing.originalCurrency === 'INR') {
      response.conversionDetails = {
        originalAmount: `₹${listing.originalPrice}`,
        convertedAmount: `$${listing.price}`,
        exchangeRate: listing.exchangeRate
      };
    }

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

    if (error.name === 'MongooseError') {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable"
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
// ✅ EDIT/UPDATE LISTING - UPDATED FOR USD
// ===================================================
router.put("/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== EDIT LISTING REQUEST ===");
    console.log("Update data:", req.body);

    const { title, description, price, type, category, tags, mediaUrls, currency = 'USD' } = req.body;
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
    
    // Handle price update with currency conversion
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

      let priceInUSD = priceNum;
      let originalPrice = null;
      let originalCurrency = null;
      let exchangeRate = 83;

      if (currency.toUpperCase() === 'INR' || currency === '₹') {
        originalPrice = priceNum;
        originalCurrency = 'INR';
        priceInUSD = parseFloat((priceNum / exchangeRate).toFixed(2));
        
        updateData.price = priceInUSD;
        updateData.originalPrice = originalPrice;
        updateData.originalCurrency = originalCurrency;
        updateData.exchangeRate = exchangeRate;
        updateData.convertedAt = new Date();
        
        console.log(`💰 Price updated with conversion: ₹${originalPrice} → $${priceInUSD}`);
      } else {
        // If updating in USD, clear original currency fields
        updateData.price = parseFloat(priceNum.toFixed(2));
        updateData.originalPrice = null;
        updateData.originalCurrency = null;
        updateData.exchangeRate = null;
        updateData.convertedAt = null;
      }
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
    ).select("title price type category tags description mediaUrls status updatedAt sellerId originalPrice originalCurrency exchangeRate");

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
        formattedPrice: `$${updatedListing.price.toFixed(2)}`,
        priceWithOriginal: updatedListing.priceWithOriginal
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
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Listing with similar details already exists"
      });
    }

    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({
        success: false,
        error: "Database temporarily unavailable"
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
router.patch("/:id/toggle-status", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Check if listing exists and user owns it
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

    // Toggle status
    const newStatus = listing.status === "active" ? "inactive" : "active";
    
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { 
        status: newStatus,
        updatedAt: new Date()
      },
      { new: true }
    ).select("title status updatedAt price formattedPrice");

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
// ✅ GET SINGLE LISTING DETAILS - UPDATED FOR USD
// ===================================================
router.get("/listing/:id", async (req, res) => {
  try {
    const listingId = req.params.id;
    
    const listing = await MarketplaceListing.findById(listingId)
      .populate("sellerId", "username avatar sellerRating email phone")
      .select("title description price type category tags mediaUrls status sellerId createdAt updatedAt views originalPrice originalCurrency exchangeRate");
    
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
      formattedPrice: `$${listing.price.toFixed(2)}`,
      priceWithOriginal: listing.priceWithOriginal
    };
    
    res.status(200).json({ 
      success: true,
      listing: formattedListing,
      displayCurrency: "USD"
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
      .select("title price status mediaUrls description category tags createdAt updatedAt originalPrice originalCurrency")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    // Format listings
    const formattedListings = listings.map(listing => ({
      ...listing.toObject(),
      formattedPrice: `$${listing.price.toFixed(2)}`,
      priceWithOriginal: listing.priceWithOriginal
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
      },
      displayCurrency: "USD"
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
// ✅ DELETE LISTING
// ===================================================
router.delete("/:id", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user._id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    // Find listing
    const listing = await MarketplaceListing.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found"
      });
    }
    
    // Check ownership
    if (!listing.sellerId.equals(userId)) {
      return res.status(403).json({ 
        success: false,
        error: "No permission to delete this listing" 
      });
    }
    
    // Delete the listing
    await MarketplaceListing.findByIdAndDelete(listingId);
    
    res.status(200).json({ 
      success: true,
      message: "Listing deleted successfully", 
      deletedListing: {
        _id: listing._id,
        title: listing.title,
        price: `$${listing.price}`,
        status: listing.status
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
      error: "Failed to delete listing"
    });
  }
});

// ===================================================
// ✅ ADMIN: Delete ALL listings (⚠️ Use with caution)
// ===================================================
router.delete("/admin/delete-all-listings", authenticateMiddleware, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });
    
    const beforeCount = await MarketplaceListing.countDocuments();
    
    if (beforeCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: "No listings found to delete",
        deletedCount: 0
      });
    }

    const result = await MarketplaceListing.deleteMany({});
    
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
// ✅ BULK CONVERT EXISTING LISTINGS TO USD
// ===================================================
router.post("/admin/convert-to-usd", authenticateMiddleware, async (req, res) => {
  try {
    const { exchangeRate = 83 } = req.body;
    
    console.log("🔄 Starting bulk conversion to USD with rate:", exchangeRate);
    
    // Find all listings without originalCurrency (assuming they're in INR)
    const listingsToConvert = await MarketplaceListing.find({
      $or: [
        { originalCurrency: { $exists: false } },
        { originalCurrency: null }
      ]
    });
    
    console.log(`📊 Found ${listingsToConvert.length} listings to convert`);
    
    const conversionResults = {
      converted: 0,
      skipped: 0,
      errors: [],
      details: []
    };
    
    // Convert each listing
    for (const listing of listingsToConvert) {
      try {
        // Check if price looks like INR (large numbers)
        const originalPrice = listing.price;
        
        // Convert to USD
        const priceInUSD = parseFloat((originalPrice / exchangeRate).toFixed(2));
        
        // Update listing
        listing.originalPrice = originalPrice;
        listing.originalCurrency = 'INR';
        listing.price = priceInUSD;
        listing.exchangeRate = exchangeRate;
        listing.convertedAt = new Date();
        
        await listing.save();
        
        conversionResults.converted++;
        conversionResults.details.push({
          id: listing._id,
          title: listing.title,
          original: originalPrice,
          converted: priceInUSD,
          rate: exchangeRate
        });
        
        console.log(`✅ Converted: ${listing.title} - ₹${originalPrice} → $${priceInUSD}`);
        
      } catch (convError) {
        conversionResults.skipped++;
        conversionResults.errors.push({
          id: listing._id,
          title: listing.title,
          error: convError.message
        });
        console.error(`❌ Failed to convert ${listing.title}:`, convError.message);
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Bulk conversion completed. Converted: ${conversionResults.converted}, Skipped: ${conversionResults.skipped}`,
      results: conversionResults,
      exchangeRate: exchangeRate
    });
    
  } catch (error) {
    console.error("❌ Error in bulk conversion:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to perform bulk conversion" 
    });
  }
});

// ===================================================
// ✅ GET CURRENCY STATS
// ===================================================
router.get("/stats/currency", authenticateMiddleware, async (req, res) => {
  try {
    // Get currency distribution
    const currencyStats = await MarketplaceListing.aggregate([
      {
        $group: {
          _id: "$originalCurrency",
          count: { $sum: 1 },
          avgOriginalPrice: { $avg: "$originalPrice" },
          avgUSDPrice: { $avg: "$price" },
          totalUSDValue: { $sum: "$price" }
        }
      },
      {
        $project: {
          currency: {
            $ifNull: ["$_id", "USD"]
          },
          count: 1,
          avgOriginalPrice: { $round: ["$avgOriginalPrice", 2] },
          avgUSDPrice: { $round: ["$avgUSDPrice", 2] },
          totalUSDValue: { $round: ["$totalUSDValue", 2] }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get conversion stats
    const conversionStats = await MarketplaceListing.aggregate([
      {
        $match: {
          originalCurrency: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$originalCurrency",
          count: { $sum: 1 },
          avgExchangeRate: { $avg: "$exchangeRate" }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      currencyStats,
      conversionStats,
      displayCurrency: "USD",
      defaultExchangeRate: 83
    });
    
  } catch (error) {
    console.error("❌ Error fetching currency stats:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch currency statistics" 
    });
  }
});

// Email validation helper function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = router;