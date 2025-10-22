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
  // NEW FIELDS FOR PAYMENT FLOW
  requirements: {
    type: String,
    default: ''
  },
  expectedDelivery: {
    type: Date
  },
  status: {
    type: String,
    enum: [
      'pending', 
      'accepted', 
      'rejected', 
      'countered', 
      'cancelled',
      'pending_payment',  // NEW: Waiting for payment
      'payment_failed',   // NEW: Payment failed
      'paid'              // NEW: Payment completed
    ],
    default: 'pending'
  },
  // PAYMENT FIELDS
  paymentIntentId: {
    type: String,
    sparse: true
  },
  paidAt: {
    type: Date
  },
  // ADDITIONAL TRACKING FIELDS
  sellerViewed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
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

// Indexes for better performance
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

// Check if model already exists to prevent OverwriteModelError
module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);