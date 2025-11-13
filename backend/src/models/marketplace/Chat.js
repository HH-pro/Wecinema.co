// models/marketplace/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'order_update', 'offer'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  fileSize: {
    type: Number,
    required: false
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
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
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketplaceListing',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'closed', 'disputed'],
    default: 'active'
  },
  messages: [messageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  lastMessage: {
    type: String
  },
  unreadCount: {
    buyer: { type: Number, default: 0 },
    seller: { type: Number, default: 0 }
  },
  // Chat settings
  settings: {
    allowAttachments: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 } // 10MB
  }
}, {
  timestamps: true
});

// Virtual for getting unread messages count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) return 0;
  
  return participant.role === 'buyer' ? this.unreadCount.buyer : this.unreadCount.seller;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.lastSeen = new Date();
    
    // Reset unread count for this user
    if (participant.role === 'buyer') {
      this.unreadCount.buyer = 0;
    } else {
      this.unreadCount.seller = 0;
    }
  }
  return this.save();
};

// Method to add message and update unread counts
chatSchema.methods.addMessage = async function(messageData) {
  this.messages.push(messageData);
  this.lastMessageAt = new Date();
  this.lastMessage = messageData.content.substring(0, 100); // Truncate long messages
  
  // Increment unread count for the other participant
  const senderRole = this.participants.find(p => p.userId.toString() === messageData.senderId.toString())?.role;
  if (senderRole === 'buyer') {
    this.unreadCount.seller += 1;
  } else if (senderRole === 'seller') {
    this.unreadCount.buyer += 1;
  }
  
  return this.save();
};

// Indexes for better performance
chatSchema.index({ orderId: 1 });
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ status: 1 });

module.exports = mongoose.model('Chat', chatSchema);