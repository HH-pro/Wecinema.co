const express = require("express");
const router = express.Router();
const Listing = require("../models/Listing");
const protect = require("../middleware/protect");
const ensureOwner = require("../middleware/ownerCheck");

/**
 * @route GET /listings
 * @description Get all listings (filter by owner/status if provided)
 */
router.get("/listings", async (req, res) => {
  try {
    const q = {};
    if (req.query.owner) q.owner = req.query.owner;
    if (req.query.status) q.status = req.query.status;
    const listings = await Listing.find(q).sort({ createdAt: -1 }).limit(200);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /listings/:id
 * @description Get single listing by ID
 */
router.get("/listings/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "email name");
    if (!listing) return res.status(404).json({ message: "Not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route POST /listings
 * @description Create a new listing
 */
router.post("/listings", protect, async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user.id };
    const listing = await Listing.create(data);
    res.status(201).json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route PUT /listings/:id
 * @description Update listing (owner only)
 */
router.put("/listings/:id", protect, ensureOwner, async (req, res) => {
  try {
    Object.assign(req.listing, req.body);
    await req.listing.save();
    res.json(req.listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route POST /listings/:id/publish
 * @description Publish listing (set status active)
 */
router.post("/listings/:id/publish", protect, ensureOwner, async (req, res) => {
  try {
    if (!req.listing.price) {
      return res.status(400).json({ message: "Set price before publishing" });
    }
    req.listing.status = "active";
    await req.listing.save();
    res.json(req.listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
