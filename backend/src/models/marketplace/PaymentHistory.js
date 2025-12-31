const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'withdrawal', 'refund', 'commission', 'bonus', 'adjustment'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'processing', 'cancelled'],
    default: 'pending'
  },
  description: String,
  transactionId: String,
  paymentMethod: {
    type: String,
    enum: ['stripe', 'bank_transfer', 'easypaisa', 'jazzcash', 'paypal', 'system']
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);