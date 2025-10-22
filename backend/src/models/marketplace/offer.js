const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing',
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
  requirements: {
    type: String,
    default: ''
  },
  expectedDelivery: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered', 'cancelled', 'pending_payment', 'payment_failed'],
    default: 'pending'
  },
  // Payment fields
  paymentIntentId: {
    type: String,
    sparse: true // Allows null values but ensures uniqueness for non-null values
  },
  paidAt: {
    type: Date
  },
  // Additional fields for better tracking
  sellerViewed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Offers expire after 7 days if not responded to
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },
  counterOffer: {
    amount: Number,
    message: String,
    createdAt: Date
  }
}, {
  timestamps: true
});

// Add index for better query performance
offerSchema.index({ listingId: 1, buyerId: 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ paymentIntentId: 1 }, { sparse: true });
offerSchema.index({ expiresAt: 1 });
offerSchema.index({ createdAt: -1 });

// Virtual for checking if offer is expired
offerSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Method to check if offer can be accepted
offerSchema.methods.canBeAccepted = function() {
  return this.status === 'pending' && !this.isExpired;
};

// Method to check if offer can be paid
offerSchema.methods.canBePaid = function() {
  return this.status === 'pending_payment' && this.paymentIntentId;
};

// Static method to find expired offers
offerSchema.statics.findExpiredOffers = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('Offer', offerSchema);