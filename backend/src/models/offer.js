const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proposedPrice: { type: Number, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending','accepted','rejected','countered'], default: 'pending' },
  counterPrice: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);
