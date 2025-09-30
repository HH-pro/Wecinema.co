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
  
  // Payment & Escrow
  stripePaymentIntentId: String,
  paymentReleased: { type: Boolean, default: false },
  releaseDate: Date,
  
  // Delivery & Revisions
  deliveryDate: Date,
  revisions: { type: Number, default: 0 },
  maxRevisions: { type: Number, default: 3 },
  
  // Requirements & Delivery
  requirements: String,     // Buyer requirements
  deliveryMessage: String,  // Seller delivery message
  deliveryFiles: [String],  // Delivered files URLs
  
  // Timelines
  expectedDelivery: Date,   // Expected delivery date
  deliveredAt: Date,        // Actual delivery date
  completedAt: Date,        // Completion date
  
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);