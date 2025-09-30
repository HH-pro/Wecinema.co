const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  
  // Order Details
  orderType: {
    type: String,
    enum: ['buy_now', 'accepted_offer', 'commission'],
    required: true
  },
  amount: { type: Number, required: true },
  
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
  
  // Payment & Escrow (Updated)
  stripePaymentIntentId: String,
  paymentReleased: { type: Boolean, default: false },
  releaseDate: Date,
  platformFee: Number,           // 🆕 Platform commission
  sellerAmount: Number,          // 🆕 Seller payout amount
  
  // Payment Timeline (Updated)
  paidAt: Date,                  // 🆕 When payment was received
  deliveredAt: Date,             // 🆕 When seller delivered work
  completedAt: Date,             // 🆕 When order was completed
  
  // Delivery & Revisions
  revisions: { type: Number, default: 0 },
  maxRevisions: { type: Number, default: 3 },
  revisionNotes: String,         // 🆕 Revision request notes
  
  // Requirements & Delivery
  requirements: String,          // Buyer requirements
  deliveryMessage: String,       // Seller delivery message
  deliveryFiles: [String],       // Delivered files URLs
  
  // Timelines
  expectedDelivery: Date,        // Expected delivery date
  
  // Order Communication
  buyerNotes: String,            // 🆕 Initial buyer notes
  sellerNotes: String,           // 🆕 Seller internal notes

}, { timestamps: true });

// 🆕 Virtual for calculating days since order
orderSchema.virtual('daysSinceOrder').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// 🆕 Virtual for revision status
orderSchema.virtual('revisionsLeft').get(function() {
  return this.maxRevisions - this.revisions;
});

// 🆕 Method to check if order can be revised
orderSchema.methods.canRequestRevision = function() {
  return this.status === 'delivered' && this.revisions < this.maxRevisions;
};

// 🆕 Method to check if payment can be released
orderSchema.methods.canReleasePayment = function() {
  return this.status === 'delivered' && !this.paymentReleased;
};

module.exports = mongoose.model('Order', orderSchema);