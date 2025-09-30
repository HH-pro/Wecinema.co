// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const messageSchema = new Schema({
//   senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   content: { type: String, required: true },
//   timestamp: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('Message', messageSchema);
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: String,
  attachments: [String],
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);