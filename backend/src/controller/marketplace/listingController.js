const express = require("express");
const router = express.Router();
const MarketplaceListing = require("../../models/marketplace/listing");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC ROUTE — Get all active listings with filters
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    const {
      type,
      category,
      minPrice,
      maxPrice,
      tags,
      status = "active",
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagsArray };
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log("📝 Fetching listings with filter:", filter);

    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "username avatar sellerRating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

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
    console.error("❌ Error fetching listings:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ===================================================
// ✅ GET SINGLE LISTING BY ID
// ===================================================
router.get("/listings/:id", async (req, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id)
      .populate("sellerId", "username avatar sellerRating createdAt");

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("❌ Error fetching listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// ===================================================
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

    if (!title || !description || !price || !type || !category) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["title", "description", "price", "type", "category"]
      });
    }

    // Normalize tags and media URLs
    const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
    const mediaArray = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);

    console.log("Creating listing for seller:", sellerId);

    const listing = await MarketplaceListing.create({
      sellerId: sellerId,
      title,
      description,
      price: parseFloat(price),
      type,
      category,
      tags: tagsArray,
      mediaUrls: mediaArray,
      status: "active",
    });

    // Populate the created listing
    const populatedListing = await MarketplaceListing.findById(listing._id)
      .populate("sellerId", "username avatar sellerRating");

    res.status(201).json({ 
      message: "Listing created successfully", 
      listing: populatedListing 
    });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: "Failed to create listing", details: error.message });
  }
});

// ===================================================
// ✅ UPDATE LISTING
// ===================================================
router.put("/listings/:id", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const sellerId = req.user._id;
    const updateData = req.body;

    console.log("=== UPDATE LISTING REQUEST ===");
    console.log("Listing ID:", listingId);
    console.log("Update data:", updateData);

    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: sellerId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to update this listing" 
      });
    }

    // Update listing fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        listing[key] = updateData[key];
      }
    });

    await listing.save();

    // Populate the updated listing
    const updatedListing = await MarketplaceListing.findById(listingId)
      .populate("sellerId", "username avatar sellerRating");

    res.status(200).json({ 
      message: "Listing updated successfully", 
      listing: updatedListing 
    });
  } catch (error) {
    console.error("❌ Error updating listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/listings/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DELETE LISTING REQUEST ===");
    console.log("Listing ID to delete:", req.params.id);
    console.log("User making request:", req.user);

    const sellerId = req.user._id;
    
    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: sellerId,
    });

    if (!listing) {
      console.log("❌ Listing not found or user not authorized:", {
        listingId: req.params.id,
        sellerId: sellerId
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
// ✅ GET LISTINGS BY SELLER ID
// ===================================================
router.get("/seller/:sellerId/listings", async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { status = "active", page = 1, limit = 20 } = req.query;

    const filter = { sellerId, status };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "username avatar sellerRating")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

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
    console.error("❌ Error fetching seller listings:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid seller ID format" });
    }
    
    res.status(500).json({ error: "Failed to fetch seller listings" });
  }
});

// ===================================================
// ✅ DELETE ALL LISTINGS (⚠️ Use with caution - irreversible!)
// ===================================================
router.delete("/admin/delete-all-listings", authenticateMiddleware, async (req, res) => {
  try {
    // Check if user is admin (you can add admin check logic here)
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