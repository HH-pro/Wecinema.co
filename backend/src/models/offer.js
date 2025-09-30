const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  amount: { type: Number, required: true },
  message: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);