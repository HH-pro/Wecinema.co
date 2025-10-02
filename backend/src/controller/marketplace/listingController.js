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
// Create new listing
router.post("/create-listing", protect, isHypeModeUser, isSeller, async (req, res) => {
  try {
    const { title, description, price, type, category, tags } = req.body;
    
    // Debug: Print all available user information
    console.log('=== USER DEBUG INFO ===');
    console.log('req.user:', req.user);
    console.log('req.user._id:', req.user?._id);
    console.log('req.user.id:', req.user?.id);
    console.log('req.user.userId:', req.user?.userId);
    console.log('req.params:', req.params);
    console.log('req.params.user:', req.params.user);
    console.log('req.body.userId:', req.body.userId);
    console.log('=== END DEBUG INFO ===');
    
    // Try different ways to get user ID
    const userId = req.user?._id || req.user?.id || req.params.user || req.body.userId;
    
    console.log('Final userId being used:', userId);
    
    if (!userId) {
      console.error('No user ID found in any of the expected locations');
      return res.status(400).json({ error: "User not found" });
    }

    // Validate required fields
    if (!title || !description || !price || !type || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const listing = new Listing({
      sellerId: userId,
      title,
      description,
      price,
      type,
      category,
      tags: tags || [],
      mediaUrls: req.files ? req.files.map(file => file.path) : []
    });

    await listing.save();
    console.log('Listing created successfully with ID:', listing._id);
    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    
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