const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  orderType: {
    type: String,
    enum: ['buy_now', 'accepted_offer', 'commission'],
    required: true
  },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'delivered', 'accepted', 'disputed', 'cancelled', 'completed'],
    default: 'pending'
  },
  stripePaymentIntentId: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);