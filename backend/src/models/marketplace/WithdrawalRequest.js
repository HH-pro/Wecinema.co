const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [100, 'Minimum withdrawal amount is 100']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'bank_transfer', 'easypaisa', 'jazzcash', 'paypal']
  },
  accountDetails: {
    accountNumber: String,
    accountTitle: String,
    bankName: String,
    iban: String,
    phoneNumber: String,
    email: String,
    stripeAccountId: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  adminNotes: String,
  processedAt: Date,
  transactionId: String,
  failureReason: String
}, { timestamps: true });

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);