// models/marketplace/offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing', // CHANGED FROM 'Listing' to 'MarketplaceListing'
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Add index for better query performance
offerSchema.index({ listingId: 1, buyerId: 1 });
offerSchema.index({ status: 1 });

module.exports = mongoose.model('Offer', offerSchema);