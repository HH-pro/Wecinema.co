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
    default: 'accepted_offer'
  },
  amount: { 
    type: Number, 
    required: true 
  },
  
  // Order Status Flow
  status: {
    type: String,
    enum: [
      'pending_payment',    // Order created, payment pending
      'paid',               // Payment received
      'processing',         // Seller preparing order
      'in_progress',        // Seller started working
      'delivered',          // Seller delivered work
      'in_revision',        // Buyer requested revision
      'completed',          // Buyer accepted, funds released
      'cancelled',          // Order cancelled
      'disputed'            // Dispute raised
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
  
  // Order Timeline
  orderDate: {
    type: Date,
    default: Date.now
  },
  paidAt: Date,
  processingAt: Date,
  startedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  
  // Delivery & Revisions
  revisions: { 
    type: Number, 
    default: 0 
  },
  maxRevisions: { 
    type: Number, 
    default: 3 
  },
  revisionNotes: [{
    notes: String,
    requestedAt: Date,
    completedAt: Date,
    files: [String]
  }],
  
  // Requirements & Delivery
  requirements: String,
  deliveryMessage: String,
  deliveryFiles: [String],
  
  // Shipping & Address Information
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    contactNumber: String
  },
  billingAddress: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'wallet', 'cash'],
    default: 'card'
  },
  notes: String,
  
  // Work deliverables
  workFiles: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
    uploadedBy: {
      type: String,
      enum: ['seller', 'buyer']
    }
  }],
  
  // Order Communication
  buyerNotes: String,
  sellerNotes: String,
  
  // Expected timelines
  expectedDelivery: Date,
  
  // Order metadata
  orderNumber: {
    type: String,
    unique: true
  },
  currency: {
    type: String,
    default: 'USD'
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
orderSchema.virtual('daysSinceOrder').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

orderSchema.virtual('revisionsLeft').get(function() {
  return this.maxRevisions - this.revisions;
});

orderSchema.virtual('isActive').get(function() {
  return ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(this.status);
});

orderSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

orderSchema.virtual('isCancellable').get(function() {
  return ['pending_payment', 'paid', 'processing'].includes(this.status);
});

// Methods
orderSchema.methods.canRequestRevision = function() {
  return this.status === 'delivered' && this.revisions < this.maxRevisions;
};

orderSchema.methods.canReleasePayment = function() {
  return this.status === 'delivered' && !this.paymentReleased;
};

orderSchema.methods.canStartProcessing = function() {
  return this.status === 'paid';
};

orderSchema.methods.canStartWork = function() {
  return this.status === 'processing' || this.status === 'paid';
};

orderSchema.methods.canDeliver = function() {
  return this.status === 'in_progress';
};

orderSchema.methods.canCancel = function(userId) {
  const isBuyer = this.buyerId.toString() === userId.toString();
  const isSeller = this.sellerId.toString() === userId.toString();
  
  if (isBuyer) {
    return ['pending_payment', 'paid'].includes(this.status);
  }
  
  if (isSeller) {
    return ['paid', 'processing'].includes(this.status);
  }
  
  return false;
};

// Pre-save hook to generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime();
    const randomNum = Math.floor(Math.random() * 1000);
    this.orderNumber = `ORD-${timestamp}-${randomNum}`;
  }
  next();
});

// Indexes
orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);