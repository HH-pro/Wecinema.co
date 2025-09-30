const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  raisedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  status: {
    type: String,
    enum: ['open', 'resolved'],
    default: 'open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema);