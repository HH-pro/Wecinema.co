const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  saleType: { type: String, enum: ['for_sale','licensing','adaptation','commission'], default: 'for_sale' },
  mediaUrls: [String],
  thumbnailUrl: String,
  status: { type: String, enum: ['draft','published','archived'], default: 'draft' },
  hypeMode: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);
