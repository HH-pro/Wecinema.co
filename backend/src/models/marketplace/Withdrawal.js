const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 500 // Minimum 500 cents ($5.00)
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  stripeTransferId: String,
  stripePayoutId: String,
  stripeAccountId: String,
  currency: {
    type: String,
    default: 'inr'
  },
  description: String,
  failureReason: String,
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date,
  cancelledBy: {
    type: String,
    enum: ['seller', 'admin', 'system']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);