// models/Seller.js (or add to existing)
const sellerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // ... existing fields ...
  
  // Earnings fields
  stripeAccountId: String,
  stripeStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'active', 'restricted'],
    default: 'not_connected'
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  lastWithdrawal: Date,
  nextPayoutDate: Date
});