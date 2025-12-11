const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const MarketplaceListing = require("../../models/marketplace/listing");
const User = require("../../models/user");
const { authenticateMiddleware } = require("../../utils");

// ===================================================
// ✅ PUBLIC: Get all *active* listings
// ===================================================
router.get("/listings", async (req, res) => {
  try {
    const listings = await MarketplaceListing.find({ status: "active" })
      .populate("sellerId", "username avatar sellerRating email");

    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ===================================================
// ✅ AUTH: Get My Listings (with pagination + filters)
// ===================================================
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { sellerId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const listings = await MarketplaceListing.find(filter)
      .select("title price status mediaUrls description category tags createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments(filter);

    res.status(200).json({
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ===================================================
// ✅ CREATE LISTING
// ===================================================
router.post("/create-listing", authenticateMiddleware, async (req, res) => {
  try {
    const { title, description, price, type, category, tags, mediaUrls } = req.body;
    const sellerId = req.user._id;

    if (!title || !description || !price || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const listing = await MarketplaceListing.create({
      sellerId,
      sellerEmail: req.user.email || null,
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      type,
      category: category || "uncategorized",
      tags: Array.isArray(tags) ? tags : [],
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      message: "Listing created successfully",
      listing
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// ===================================================
// ✅ UPDATE LISTING
// ===================================================
router.put("/update-listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user._id;
    const updateData = req.body;

    const listing = await MarketplaceListing.findOne({
      _id: listingId,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({
        error: "Listing not found or unauthorized"
      });
    }

    Object.keys(updateData).forEach(key => {
      listing[key] = updateData[key];
    });

    listing.updatedAt = new Date();
    await listing.save();

    res.status(200).json({
      message: "Listing updated successfully",
      listing
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// ===================================================
// ✅ ACTIVATE / DEACTIVATE LISTING
// ===================================================
router.put("/listing-status/:id", authenticateMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const listing = await MarketplaceListing.findOneAndUpdate(
      { _id: req.params.id, sellerId: userId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!listing) {
      return res.status(404).json({
        error: "Listing not found or unauthorized"
      });
    }

    res.status(200).json({
      message: `Listing ${status}`,
      listing
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ===================================================
// ✅ DELETE LISTING
// ===================================================
router.delete("/listing/:id", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({
        error: "Listing not found or unauthorized"
      });
    }

    res.status(200).json({
      message: "Listing deleted successfully",
      listing
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// ===================================================
// ✅ GET LISTINGS OF ANY USER (PUBLIC)
// ===================================================
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("username avatar");
    if (!user) return res.status(404).json({ error: "User not found" });

    const listings = await MarketplaceListing.find({
      sellerId: userId,
      status: "active"
    })
      .populate("sellerId", "username avatar")
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MarketplaceListing.countDocuments({
      sellerId: userId,
      status: "active"
    });

    res.status(200).json({
      listings,
      user,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
});

module.exports = router;
