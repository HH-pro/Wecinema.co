const mongoose = require('mongoose');

const marketplaceTransactionSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  stripePayoutId: String,
  payoutDate: Date
}, { timestamps: true });

const MarketplaceTransaction = mongoose.model('MarketplaceTransaction', marketplaceTransactionSchema);
module.exports = MarketplaceTransaction;