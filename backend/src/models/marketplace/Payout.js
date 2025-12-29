// models/Payout.js
const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stripeAccountId: {
    type: String,
    required: true
  },
  stripePayoutId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 100 // Minimum $1.00 in cents
  },
  currency: {
    type: String,
    default: 'usd',
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'paid', 'failed', 'canceled', 'processing'],
    default: 'pending'
  },
  method: {
    type: String,
    enum: ['standard', 'instant'],
    default: 'standard'
  },
  arrivalDate: {
    type: Date
  },
  failureCode: {
    type: String
  },
  failureMessage: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted amount
payoutSchema.virtual('formattedAmount').get(function() {
  return (this.amount / 100).toFixed(2);
});

// Virtual for status color
payoutSchema.virtual('statusColor').get(function() {
  const colors = {
    paid: 'success',
    pending: 'warning',
    processing: 'info',
    in_transit: 'info',
    failed: 'danger',
    canceled: 'secondary'
  };
  return colors[this.status] || 'secondary';
});

// Indexes
payoutSchema.index({ userId: 1, status: 1 });
payoutSchema.index({ stripePayoutId: 1 }, { unique: true });
payoutSchema.index({ createdAt: -1 });
payoutSchema.index({ arrivalDate: 1 });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;