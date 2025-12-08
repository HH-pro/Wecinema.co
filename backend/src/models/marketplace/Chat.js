// models/marketplace/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  firebaseChatId: {
    type: String,
    unique: true,
    sparse: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      required: true
    },
    firebaseId: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked', 'completed'],
    default: 'active'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for faster queries
chatSchema.index({ orderId: 1 });
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ status: 1, lastMessageAt: -1 });
chatSchema.index({ firebaseChatId: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;