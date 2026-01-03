const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const User = require("../../models/user");
const mongoose = require('mongoose');
const { authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings (USD Only)
// ===================================================
router.get("/", async (req, res) => {
  try {
    console.log('📡 GET /marketplace/listings called with params:', req.query);
    
    const { 
      category = 'all', 
      minPrice, 
      maxPrice, 
      type = 'all', 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'active'
    } = req.query;
    
    // Build filter
    const filter = { status: status };
    
    // Apply filters
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (minPrice) {
      filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    }
    
    if (maxPrice) {
      filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    }
    
    // Search filter
    if (search && search.trim() !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    // Sort options
    let sortOptions = {};
    if (sortBy === 'price_low') {
      sortOptions.price = 1;
    } else if (sortBy === 'price_high') {
      sortOptions.price = -1;
    } else if (sortBy === 'newest' || sortBy === 'createdAt') {
      sortOptions.createdAt = -1;
    } else if (sortBy === 'oldest') {
      sortOptions.createdAt = 1;
    } else if (sortBy === 'updatedAt') {
      sortOptions.updatedAt = -1;
    } else {
      sortOptions.createdAt = -1; // Default
    }

    console.log('🔍 Filter criteria:', filter);
    console.log('📊 Sorting:', sortOptions);
    
    // Get listings with seller population
    const listings = await MarketplaceListing.find(filter)
      .populate({
        path: "sellerId",
        select: "username avatar sellerRating email phoneNumber"
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await MarketplaceListing.countDocuments(filter);
    
    console.log(`✅ Found ${listings.length} listings out of ${total} total`);
    
    // ✅ Format listings properly
    const formattedListings = listings.map(listing => {
      // Ensure arrays
      const mediaUrls = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
      const tags = Array.isArray(listing.tags) ? listing.tags : [];
      
      // Get seller info
      let sellerInfo = {
        _id: listing.sellerId?._id || listing.sellerId || null,
        username: listing.sellerId?.username || 'Unknown Seller',
        avatar: listing.sellerId?.avatar || null,
        sellerRating: listing.sellerId?.sellerRating || 0,
        email: listing.sellerEmail || listing.sellerId?.email || null
      };
      
      return {
        _id: listing._id.toString(),
        sellerId: sellerInfo,
        title: listing.title || 'Untitled',
        description: listing.description || '',
        price: listing.price || 0,
        formattedPrice: `$${(listing.price || 0).toFixed(2)}`,
        currency: listing.currency || 'USD',
        type: listing.type || 'for_sale',
        category: listing.category || 'Uncategorized',
        mediaUrls: mediaUrls,
        thumbnail: mediaUrls.length > 0 ? mediaUrls[0] : null,
        status: listing.status || 'active',
        tags: tags,
        sellerEmail: listing.sellerEmail || sellerInfo.email,
        views: listing.viewCount || 0,
        favoriteCount: listing.favoriteCount || 0,
        purchaseCount: listing.purchaseCount || 0,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        createdAtFormatted: new Date(listing.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        statusColor: listing.status === 'active' ? 'green' : 
                    listing.status === 'sold' ? 'blue' : 
                    listing.status === 'pending' ? 'orange' : 'gray',
        isDigital: listing.isDigital !== false, // Default to true
        // Frontend specific fields
        seller: sellerInfo
      };
    });

    res.status(200).json({
      success: true,
      listings: formattedListings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        category: category,
        type: type,
        minPrice: minPrice || '',
        maxPrice: maxPrice || '',
        search: search || '',
        sortBy,
        sortOrder,
        status
      },
      currency: "USD",
      timestamp: new Date().getTime(),
      message: `Found ${total} listing${total !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings",
      message: error.message
    });
  }
});

// ===================================================
// ✅ GET SINGLE LISTING DETAILS
// ===================================================
router.get("/:id", async (req, res) => {
  try {
    const listingId = req.params.id;
    
    console.log('📡 GET /marketplace/listings/:id called with ID:', listingId);
    
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid listing ID format" 
      });
    }
    
    const listing = await MarketplaceListing.findById(listingId)
      .populate({
        path: "sellerId",
        select: "username avatar sellerRating email phoneNumber"
      })
      .lean();

    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found" 
      });
    }
    
    // Increment view count
    await MarketplaceListing.findByIdAndUpdate(listingId, {
      $inc: { viewCount: 1 }
    });
    
    // Format response
    const mediaUrls = Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [];
    const tags = Array.isArray(listing.tags) ? listing.tags : [];
    
    const formattedListing = {
      _id: listing._id.toString(),
      sellerId: listing.sellerId || null,
      title: listing.title || 'Untitled',
      description: listing.description || '',
      price: listing.price || 0,
      formattedPrice: `$${(listing.price || 0).toFixed(2)}`,
      currency: listing.currency || 'USD',
      type: listing.type || 'for_sale',
      category: listing.category || 'Uncategorized',
      mediaUrls: mediaUrls,
      thumbnail: mediaUrls.length > 0 ? mediaUrls[0] : null,
      status: listing.status || 'active',
      tags: tags,
      sellerEmail: listing.sellerEmail || listing.sellerId?.email,
      views: (listing.viewCount || 0) + 1, // Include the increment
      favoriteCount: listing.favoriteCount || 0,
      purchaseCount: listing.purchaseCount || 0,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      createdAtFormatted: new Date(listing.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      statusColor: listing.status === 'active' ? 'green' : 
                  listing.status === 'sold' ? 'blue' : 
                  listing.status === 'pending' ? 'orange' : 'gray',
      isDigital: listing.isDigital !== false,
      seller: listing.sellerId ? {
        _id: listing.sellerId._id,
        username: listing.sellerId.username,
        avatar: listing.sellerId.avatar,
        sellerRating: listing.sellerId.sellerRating,
        email: listing.sellerId.email
      } : null
    };
    
    console.log('✅ Returning listing details for:', listing.title);
    
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
      error: "Failed to fetch listing details",
      message: error.message 
    });
  }
});


// Get listing by ID
router.get("/listings/:id", async (req, res) => {
  try {
    // Your existing code...
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ✅ ORDERS ROUTES
// ============================================

router.get("/orders/my-sales", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🎯 GET /marketplace/orders/my-sales");
    
    const sellerId = req.user._id;
    
    // Your orders logic here...
    
    res.status(200).json({
      success: true,
      data: {
        sales: orders,
        stats: stats
      },
      message: `Found ${orders.length} sales`
    });
    
  } catch (error) {
    console.error("❌ Error in /orders/my-sales:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch sales",
      message: error.message
    });
  }
});

// ============================================
// ✅ OFFERS ROUTES
// ============================================

router.get("/offers/received-offers", authenticateMiddleware, async (req, res) => {
  try {
    console.log("🎯 GET /marketplace/offers/received-offers");
    
    const sellerId = req.user._id;
    
    // Your offers logic here...
    
    res.status(200).json({
      success: true,
      data: {
        offers: offers
      },
      message: `Found ${offers.length} offers`
    });
    
  } catch (error) {
    console.error("❌ Error in /offers/received-offers:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch offers",
      message: error.message
    });
  }
});

// ===================================================
// ✅ CREATE LISTING
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== CREATE LISTING REQUEST ===");
    console.log("User:", req.user._id);
    console.log("Body:", req.body);

    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    // Validation
    if (!title || !description || !price || !type) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields: title, description, price, type"
      });
    }

    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be a positive number"
      });
    }

    // Get seller info
    const seller = await User.findById(sellerId).select('email username').exec();
    if (!seller) {
      return res.status(404).json({
        success: false,
        error: "User account not found"
      });
    }

    // Prepare listing data
    const listingData = {
      sellerId: sellerId,
      sellerEmail: seller.email,
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(priceNumber.toFixed(2)),
      currency: 'USD',
      type: type,
      category: (category || 'uncategorized').trim(),
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()).filter(tag => tag) : [],
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []),
      status: "active",
      isDigital: true
    };

    console.log("📝 Creating listing:", listingData.title);

    // Create the listing
    const listing = await MarketplaceListing.create(listingData);

    // Format response
    const response = {
      success: true,
      message: "Listing created successfully", 
      listing: {
        _id: listing._id,
        title: listing.title,
        price: listing.price,
        formattedPrice: `$${listing.price.toFixed(2)}`,
        currency: listing.currency,
        type: listing.type,
        category: listing.category,
        status: listing.status,
        mediaUrls: listing.mediaUrls,
        createdAt: listing.createdAt,
        seller: {
          _id: seller._id,
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
// ✅ UPDATE LISTING
// ===================================================
router.put("/:id", authenticateMiddleware, async (req, res) => {
  try {
    const { title, description, price, type, category, tags, mediaUrls, status } = req.body;
    const listingId = req.params.id;
    const sellerId = req.user._id;

    // Check ownership
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

    // Build update
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be a valid positive number"
        });
      }
      updateData.price = parseFloat(priceNum.toFixed(2));
    }
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category.trim();
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (mediaUrls !== undefined) updateData.mediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];
    if (status !== undefined) updateData.status = status;
    
    updateData.updatedAt = new Date();

    // Update
    const updatedListing = await MarketplaceListing.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('sellerId', 'username avatar');

    res.status(200).json({
      success: true,
      message: "Listing updated successfully", 
      listing: {
        ...updatedListing.toObject(),
        formattedPrice: `$${updatedListing.price.toFixed(2)}`
      }
    });

  } catch (error) {
    console.error("❌ Error updating listing:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update listing",
      details: error.message 
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
    
    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: userId
    });
    
    if (!listing) {
      return res.status(404).json({ 
        success: false,
        error: "Listing not found or no permission"
      });
    }
    
    await MarketplaceListing.findByIdAndDelete(listingId);
    
    res.status(200).json({ 
      success: true,
      message: "Listing deleted successfully", 
      deletedListing: {
        _id: listing._id,
        title: listing.title,
        formattedPrice: `$${listing.price.toFixed(2)}`
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

// ===================================================
// ✅ TOGGLE STATUS
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
      { status: newStatus, updatedAt: new Date() },
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
    res.status(500).json({ 
      success: false,
      error: "Failed to toggle listing status" 
    });
  }
});

// ===================================================
// ✅ GET LISTINGS BY USER
// ===================================================
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { status = 'active', page = 1, limit = 20 } = req.query;
    
    // Verify user exists
    const user = await User.findById(userId).select('username avatar sellerRating');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const filter = { sellerId: userId, status: status };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const listings = await MarketplaceListing.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MarketplaceListing.countDocuments(filter);

    // Format listings
    const formattedListings = listings.map(listing => ({
      ...listing,
      _id: listing._id.toString(),
      formattedPrice: `$${listing.price.toFixed(2)}`,
      mediaUrls: Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [],
      thumbnail: listing.mediaUrls?.[0] || null
    }));

    res.status(200).json({
      success: true,
      listings: formattedListings,
      user: {
        _id: user._id,
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
// ✅ SEARCH LISTINGS
// ===================================================
router.get("/search", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: "Search query is required"
      });
    }
    
    const filter = { 
      status: 'active',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ]
    };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "username avatar sellerRating email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MarketplaceListing.countDocuments(filter);
    
    // Format listings
    const formattedListings = listings.map(listing => ({
      ...listing,
      _id: listing._id.toString(),
      formattedPrice: `$${listing.price.toFixed(2)}`,
      mediaUrls: Array.isArray(listing.mediaUrls) ? listing.mediaUrls : [],
      thumbnail: listing.mediaUrls?.[0] || null,
      seller: listing.sellerId ? {
        _id: listing.sellerId._id,
        username: listing.sellerId.username,
        avatar: listing.sellerId.avatar,
        sellerRating: listing.sellerId.sellerRating
      } : null
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
      search: {
        query: q,
        results: total
      }
    });
  } catch (error) {
    console.error("❌ Error searching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to search listings" 
    });
  }
});

// ===================================================
// ✅ HEALTH CHECK
// ===================================================
router.get("/health", async (req, res) => {
  try {
    const count = await MarketplaceListing.countDocuments({ status: 'active' });
    res.status(200).json({
      success: true,
      message: "Marketplace API is healthy",
      stats: {
        activeListings: count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Marketplace API is unhealthy"
    });
  }
});

module.exports = router;