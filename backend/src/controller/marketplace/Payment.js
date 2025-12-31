// backend/src/models/marketplace/Payment.js (Simple Version)

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  type: {
    type: String,
    enum: ['earning', 'withdrawal', 'refund'],
    required: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'usd'
  },
  
  paymentMethod: {
    type: String,
    enum: ['stripe', 'bank_transfer', 'paypal'],
    default: 'stripe'
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  payoutStatus: {
    type: String,
    enum: ['available', 'withdrawn', 'processing'],
    default: 'available'
  },
  
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  stripePaymentId: String,
  stripePayoutId: String,
  
  description: String,
  
  metadata: mongoose.Schema.Types.Mixed,
  
  linkedTransactions: [{
    type: String,
    transactionId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    date: Date
  }],
  
  failureMessage: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: Date,
  
  processedAt: Date
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, type: 1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ stripePaymentId: 1 });
paymentSchema.index({ stripePayoutId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;