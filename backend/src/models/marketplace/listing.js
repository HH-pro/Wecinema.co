const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  type: {
    type: String,
    enum: ['for_sale', 'licensing', 'adaptation_rights', 'commission'],
    required: true
  },
  category: String,
  mediaUrls: [String],
  status: {
    type: String,
    enum: ['draft', 'active', 'sold', 'inactive'],
    default: 'active'
  },
  tags: [String]
}, { timestamps: true });

// 🆕 NAME CHANGE: MarketplaceListing
const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);
module.exports = MarketplaceListing;