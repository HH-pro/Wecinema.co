const Listing = require('../../models/marketplace/Listing');
const User = require('../../models/User');

// Create new listing
const createListing = async (req, res) => {
  try {
    const { title, description, price, type, category, tags } = req.body;
    
    const listing = new Listing({
      sellerId: req.user.id,
      title,
      description,
      price,
      type,
      category,
      tags,
      mediaUrls: req.files ? req.files.map(file => file.path) : []
    });

    await listing.save();
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all listings
const getAllListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'active' })
      .populate('sellerId', 'username avatar sellerRating');
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get seller's own listings
const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ sellerId: req.user.id });
    res.json({ success: true, data: listings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update listing
const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });
    
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    Object.assign(listing, req.body);
    await listing.save();
    res.json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete listing
const deleteListing = async (req, res) => {
  try {
    await Listing.findOneAndDelete({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createListing,
  getAllListings,
  getMyListings,
  updateListing,
  deleteListing
};