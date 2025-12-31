const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Profile Information
  displayName: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profileImage: {
    type: String
  },
  bannerImage: {
    type: String
  },
  
  // Contact Information
  phoneNumber: {
    type: String
  },
  website: {
    type: String
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    youtube: String
  },
  
  // Business Information
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['individual', 'company', 'freelancer', 'agency'],
    default: 'individual'
  },
  businessAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  taxId: {
    type: String
  },
  
  // Stripe Integration for Payments
  stripeAccountId: {
    type: String,
    index: true
  },
  stripeCustomerId: {
    type: String
  },
  stripeStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'active', 'restricted', 'rejected'],
    default: 'not_connected'
  },
  stripeDetailsSubmitted: {
    type: Boolean,
    default: false
  },
  stripeChargesEnabled: {
    type: Boolean,
    default: false
  },
  stripePayoutsEnabled: {
    type: Boolean,
    default: false
  },
  stripeRequirements: {
    type: mongoose.Schema.Types.Mixed
  },
  stripeVerificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified'],
    default: 'unverified'
  },
  
  // Earnings & Financial Fields (all amounts in cents)
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  escrowBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  lastWithdrawal: {
    type: Date
  },
  nextPayoutDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  withdrawalSchedule: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly', 'manual'],
    default: 'manual'
  },
  withdrawalMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'crypto'],
    default: 'stripe'
  },
  bankAccountDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String,
    iban: String,
    swiftCode: String,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Performance Metrics
  totalSales: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  },
  cancelledOrders: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  responseRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  responseTime: {
    type: Number, // in hours
    default: 24
  },
  onTimeDeliveryRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Seller Level & Badges
  sellerLevel: {
    type: String,
    enum: ['new', 'bronze', 'silver', 'gold', 'platinum', 'top_rated'],
    default: 'new'
  },
  badges: [{
    name: String,
    icon: String,
    earnedAt: Date
  }],
  joinedDate: {
    type: Date,
    default: Date.now
  },
  
  // Categories & Skills
  categories: [{
    type: String
  }],
  skills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert']
    }
  }],
  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'fluent', 'native']
    }
  }],
  
  // Settings & Preferences
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    newOrderAlerts: {
      type: Boolean,
      default: true
    },
    newMessageAlerts: {
      type: Boolean,
      default: true
    },
    withdrawalAlerts: {
      type: Boolean,
      default: true
    },
    reviewAlerts: {
      type: Boolean,
      default: true
    }
  },
  privacySettings: {
    showEarnings: {
      type: Boolean,
      default: false
    },
    showRealName: {
      type: Boolean,
      default: false
    },
    showContactInfo: {
      type: Boolean,
      default: false
    }
  },
  vacationMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    startDate: Date,
    endDate: Date,
    autoReplyMessage: String
  },
  
  // Verification Status
  verified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: {
    idFront: String,
    idBack: String,
    addressProof: String,
    businessLicense: String,
    submittedAt: Date,
    reviewedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: String
  },
  
  // Statistics & Analytics
  monthlyStats: [{
    year: Number,
    month: Number,
    earnings: Number,
    orders: Number,
    completedOrders: Number,
    cancelledOrders: Number,
    newCustomers: Number
  }],
  
  // SEO & Visibility
  metaTitle: String,
  metaDescription: String,
  keywords: [String],
  
  // Commission & Fees
  commissionRate: {
    type: Number,
    default: 20, // 20% platform commission
    min: 0,
    max: 100
  },
  platformFeesPaid: {
    type: Number,
    default: 0
  },
  
  // Account Status
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated', 'under_review'],
    default: 'active'
  },
  suspensionReason: String,
  suspensionEndDate: Date,
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
sellerSchema.virtual('fullAddress').get(function() {
  if (!this.businessAddress) return '';
  const addr = this.businessAddress;
  return `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''}, ${addr.country || ''}, ${addr.zipCode || ''}`.trim();
});

// Virtual for calculated balance (available + pending)
sellerSchema.virtual('totalBalance').get(function() {
  return this.availableBalance + this.pendingBalance;
});

// Virtual for seller's age in months
sellerSchema.virtual('monthsActive').get(function() {
  const joined = this.joinedDate || this.createdAt;
  const diffMonths = (Date.now() - joined) / (1000 * 60 * 60 * 24 * 30);
  return Math.floor(diffMonths);
});

// Virtual for withdrawal eligibility
sellerSchema.virtual('canWithdraw').get(function() {
  const minWithdrawal = 500; // $5.00 minimum
  return this.availableBalance >= minWithdrawal && 
         this.stripePayoutsEnabled === true;
});

// Indexes for better query performance
sellerSchema.index({ userId: 1 });
sellerSchema.index({ stripeAccountId: 1 });
sellerSchema.index({ businessName: 1 });
sellerSchema.index({ categories: 1 });
sellerSchema.index({ sellerLevel: 1 });
sellerSchema.index({ averageRating: -1 });
sellerSchema.index({ totalEarnings: -1 });
sellerSchema.index({ accountStatus: 1 });
sellerSchema.index({ verified: 1 });
sellerSchema.index({ 'businessAddress.country': 1 });

// Pre-save middleware
sellerSchema.pre('save', function(next) {
  // Update seller level based on performance
  if (this.totalSales > 100 && this.averageRating >= 4.5) {
    this.sellerLevel = 'top_rated';
  } else if (this.totalSales > 50) {
    this.sellerLevel = 'platinum';
  } else if (this.totalSales > 20) {
    this.sellerLevel = 'gold';
  } else if (this.totalSales > 10) {
    this.sellerLevel = 'silver';
  } else if (this.totalSales > 0) {
    this.sellerLevel = 'bronze';
  }
  
  // Calculate next payout date for automatic withdrawals
  if (this.withdrawalSchedule !== 'manual') {
    const now = new Date();
    switch(this.withdrawalSchedule) {
      case 'daily':
        this.nextPayoutDate = new Date(now.setDate(now.getDate() + 1));
        break;
      case 'weekly':
        this.nextPayoutDate = new Date(now.setDate(now.getDate() + 7));
        break;
      case 'biweekly':
        this.nextPayoutDate = new Date(now.setDate(now.getDate() + 14));
        break;
      case 'monthly':
        this.nextPayoutDate = new Date(now.setMonth(now.getMonth() + 1));
        break;
    }
  }
  
  next();
});

// Instance methods
sellerSchema.methods.getFormattedBalance = function() {
  return {
    available: (this.availableBalance / 100).toFixed(2),
    pending: (this.pendingBalance / 100).toFixed(2),
    total: ((this.availableBalance + this.pendingBalance) / 100).toFixed(2),
    currency: 'USD'
  };
};

sellerSchema.methods.canAcceptPayment = function() {
  return this.stripeStatus === 'active' && 
         this.stripeChargesEnabled === true && 
         this.accountStatus === 'active';
};

sellerSchema.methods.getStripeDashboardUrl = function() {
  if (!this.stripeAccountId) return null;
  return `https://dashboard.stripe.com/connect/accounts/${this.stripeAccountId}`;
};

// Static methods
sellerSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'name email profileImage');
};

sellerSchema.statics.calculateAvailableBalance = async function(sellerId) {
  // This would calculate from orders and withdrawals
  // For now, returns the stored value
  const seller = await this.findById(sellerId);
  return seller ? seller.availableBalance : 0;
};

sellerSchema.statics.getTopSellers = function(limit = 10) {
  return this.find({ accountStatus: 'active' })
    .sort({ totalEarnings: -1 })
    .limit(limit)
    .populate('userId', 'name profileImage');
};

// Create the model
const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;