// models/marketplace/order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  listingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MarketplaceListing', 
    required: true 
  },
  offerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offer' 
  },
  
  // Order Details
  orderType: {
    type: String,
    enum: ['direct_purchase', 'accepted_offer', 'commission'],
    default: 'accepted_offer' // Add default value
  },
  amount: { 
    type: Number, 
    required: true 
  },
  
  // Escrow Status Flow
  status: {
    type: String,
    enum: [
      'pending_payment',    // Order created, payment pending
      'paid',              // Payment received, funds in escrow
      'in_progress',       // Seller working on order
      'delivered',         // Seller delivered work
      'in_revision',       // Buyer requested revision
      'completed',         // Buyer accepted, funds released
      'cancelled',         // Order cancelled
      'disputed'           // Dispute raised
    ],
    default: 'pending_payment'
  },
  
  // Payment & Escrow
  stripePaymentIntentId: String,
  paymentReleased: { 
    type: Boolean, 
    default: false 
  },
  releaseDate: Date,
  platformFee: Number,
  sellerAmount: Number,
  
  // Payment Timeline
  paidAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  
  // Delivery & Revisions
  revisions: { 
    type: Number, 
    default: 0 
  },
  maxRevisions: { 
    type: Number, 
    default: 3 
  },
  revisionNotes: String,
  
  // Requirements & Delivery
  requirements: String,
  deliveryMessage: String,
  deliveryFiles: [String],
  
  // Timelines
  expectedDelivery: Date,
  
  // Order Communication
  buyerNotes: String,
  sellerNotes: String,

  // Shipping & Address Information (Add these fields)
  shippingAddress: String,
  paymentMethod: {
    type: String,
    default: 'card'
  },
  notes: String,
  orderDate: {
    type: Date,
    default: Date.now
  }

}, { 
  timestamps: true,
  // Add this to fix the population issue
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating days since order
orderSchema.virtual('daysSinceOrder').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for revision status
orderSchema.virtual('revisionsLeft').get(function() {
  return this.maxRevisions - this.revisions;
});

// Method to check if order can be revised
orderSchema.methods.canRequestRevision = function() {
  return this.status === 'delivered' && this.revisions < this.maxRevisions;
};

// Method to check if payment can be released
orderSchema.methods.canReleasePayment = function() {
  return this.status === 'delivered' && !this.paymentReleased;
};

// Add indexes for better performance
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);