const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  thumbnailUrl: { type: String },
  mediaUrl: { type: String },
  price: { type: Number },                // fixed selling price
  currency: { type: String, default: 'USD' },
  licenseType: { type: String, enum: ['exclusive', 'non-exclusive'], default: 'non-exclusive' },
  adaptationRights: { type: Boolean, default: false },
  adaptationPrice: { type: Number },      // price for adaptation rights if enabled
  status: { type: String, enum: ['draft','pending','active','archived'], default: 'draft' },
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);
