const express = require("express");
const router = express.Router();
const Listing = require("../../models/marketplace/listing");
const { protect, isHypeModeUser, isSeller, authenticateMiddleware } = require("../../utils"); // 🆕 AUTH IMPORT

// ✅ PUBLIC ROUTE - No auth required
router.get("/listings", async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' })
      .populate('sellerId', 'username avatar sellerRating');
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// ✅ PROTECTED ROUTES - HypeMode + Seller only
router.get("/my-listings", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listings = await Listing.find({ sellerId: req.user.id });
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error fetching my listings:', error);
    res.status(500).json({ error: 'Failed to fetch my listings' });
  }
});
// Create new listing
router.post("/create-listing", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const { title, description, price, type, category, tags } = req.body;
    
    // Get user ID from req.user (set by protect middleware) instead of req.params
    const id =   req.params.id;  // or req.user.id depending on your user object structure
    
    // Validate required fields
    if (!title || !description || !price || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const listing = new Listing({
      sellerId: id,
      title,
      description,
      price,
      type,
      category,
      tags: tags || [], // default to empty array if not provided
      mediaUrls: req.files ? req.files.map(file => file.path) : []
    });

    await listing.save();
    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    
    // More specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Update listing
router.put("/listing/:id", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listing = await Listing.findOne({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    Object.assign(listing, req.body);
    await listing.save();
    res.status(200).json(listing);
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Delete listing
router.delete("/listing/:id", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const listing = await Listing.findOneAndDelete({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(200).json({ message: 'Listing deleted successfully', listing });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;