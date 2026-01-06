// Transaction Model (transaction.js)
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  payerId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  subscriptionType: {
    type: String,
    required: true,
    enum: ['user', 'studio'] // ya jo bhi aapke subscription types hain
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    default: 'completed',
    enum: ['pending', 'completed', 'failed']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);