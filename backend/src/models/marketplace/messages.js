// models/marketplace/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }, // ✅ New field
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String,
  attachments: [String],
  read: { type: Boolean, default: false },
  messageType: { type: String, default: 'text' } // 'text', 'system', 'order'
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);