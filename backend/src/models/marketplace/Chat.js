// models/marketplace/Chat.js (Simplified for Firebase)
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  firebaseChatId: String, // Firebase chat ID store karega
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
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
      enum: ['buyer', 'seller'],
      required: true
    },
    firebaseUid: String // Firebase user ID
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);