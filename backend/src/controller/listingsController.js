const express = require("express");
const router = express.Router();
const Listing = require("../models/Listing");
const auth = require("../middleware/auth");

/**
 * @route POST /listings
 * @desc Create a new listing
 */
router.post("/listings", auth, async (req, res) => {
  try {
    const { videoId, type, price } = req.body;

    if (!videoId || !type) {
      return res.status(400).json({ message: "videoId and type are required" });
    }

    const listing = new Listing({
      owner: req.user.id,
      video: videoId,
      type, // for_sale | licensing | adaptation | offer | commission
      price: price || null,
      status: "active",
    });

    await listing.save();
    res.status(201).json({ message: "Listing created successfully", listing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route GET /listings
 * @desc Get all active listings
 */
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find({ status: "active" })
      .populate("owner", "username email avatar")
      .populate("video", "title file");

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route GET /listings/:id
 * @desc Get single listing by ID
 */
router.get("/listings/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("owner", "username email avatar")
      .populate("video", "title file");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route PUT /listings/:id
 * @desc Update listing (only by owner)
 */
router.put("/listings/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const allowedUpdates = ["type", "price", "status"];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();
    res.status(200).json({ message: "Listing updated", listing });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route DELETE /listings/:id
 * @desc Soft delete listing (mark as deleted)
 */
router.delete("/listings/:id", auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    listing.status = "deleted";
    await listing.save();

    res.status(200).json({ message: "Listing deleted (soft)" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
