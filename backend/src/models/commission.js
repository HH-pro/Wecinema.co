const mongoose = require('mongoose');

const MessageSub = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const CommissionSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional / assignable
  requirements: { type: String, required: true },
  budget: { type: Number },
  timeline: { type: String },
  status: { type: String, enum: ['open','in-progress','completed','cancelled'], default: 'open' },
  messages: [MessageSub],
}, { timestamps: true });

module.exports = mongoose.model('Commission', CommissionSchema);
