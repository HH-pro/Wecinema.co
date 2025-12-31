const mongoose = require('mongoose');

const sellerEarningSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  lastPayoutDate: Date,
  nextPayoutDate: Date,
  stripeAccountId: String,
  payoutMethod: {
    type: String,
    enum: ['stripe', 'bank', 'paypal', 'none'],
    default: 'none'
  }
}, { timestamps: true });

module.exports = mongoose.model('SellerEarning', sellerEarningSchema);