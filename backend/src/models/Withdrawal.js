// models/Withdrawal.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number, // stored in cents
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  stripeTransferId: String,
  stripePayoutId: String,
  description: String,
  destination: {
    type: String,
    default: 'Bank Account'
  },
  failureReason: String,
  requestDate: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date,
  estimatedArrival: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);