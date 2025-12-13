// models/marketplace/Delivery.js
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  key: String // For cloud storage
});

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [attachmentSchema],
  isFinalDelivery: {
    type: Boolean,
    default: true
  },
  revisionNumber: {
    type: Number,
    default: 1
  },
  deliveredAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending_review', 'accepted', 'revision_requested', 'completed'],
    default: 'pending_review'
  }
}, {
  timestamps: true
});

// Indexes for performance
deliverySchema.index({ orderId: 1, revisionNumber: 1 }, { unique: true });
deliverySchema.index({ sellerId: 1, deliveredAt: -1 });
deliverySchema.index({ buyerId: 1, status: 1 });
deliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);