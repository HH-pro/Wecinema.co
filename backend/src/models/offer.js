const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  message: String,
  status: { type: String, enum: ['pending','accepted','rejected','withdrawn'], default: 'pending' },
  expiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);
