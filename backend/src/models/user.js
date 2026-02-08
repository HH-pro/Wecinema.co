/**
 * User Model - Production Hardened
 * @module models/User
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { Schema, Types } = mongoose;

// ==========================================
// Constants & Enums
// ==========================================

const USER_TYPES = Object.freeze({
  BUYER: 'buyer',
  SELLER: 'seller',
  NORMAL: 'normalUser'
});

const AUTH_PROVIDERS = Object.freeze({
  EMAIL: 'email',
  GOOGLE: 'google'
});

const SUBSCRIPTION_TYPES = Object.freeze({
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
});

const SALT_ROUNDS = 12;

// ==========================================
// Sub-Schemas for Better Organization
// ==========================================

const PaymentInfoSchema = new Schema({
  hasPaid: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  lastPayment: { 
    type: Date,
    index: true 
  },
  subscriptionType: { 
    type: String, 
    enum: Object.values(SUBSCRIPTION_TYPES),
    default: SUBSCRIPTION_TYPES.FREE,
    index: true 
  },
  stripeCustomerId: { 
    type: String, 
    sparse: true,
    index: true 
  },
  stripeAccountId: { 
    type: String, 
    sparse: true 
  }
}, { _id: false });

const SellerStatsSchema = new Schema({
  balance: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  sellerRating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5 
  },
  totalSales: { 
    type: Number, 
    default: 0,
    min: 0 
  }
}, { _id: false });

const VerificationSchema = new Schema({
  token: { type: String },
  expiresAt: { type: Date },
  lastSentAt: { type: Date },
  verifiedAt: { type: Date }
}, { _id: false });

// ==========================================
// Main User Schema
// ==========================================

const UserSchema = new Schema(
  {
    // Core Identity
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true
    },

    password: {
      type: String,
      required: function() {
        // Password required only for email auth
        return this.authProvider === AUTH_PROVIDERS.EMAIL;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Never include password in queries by default
    },

    // Profile Information
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true,
      default: ''
    },

    avatar: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Avatar must be a valid URL'
      }
    },

    coverImage: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Cover image must be a valid URL'
      }
    },

    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function(v) {
          return v && v < new Date();
        },
        message: 'Date of birth must be in the past'
      }
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },

    // Roles & Permissions
    role: {
      type: String,
      enum: ['user', 'subadmin', 'admin'],
      default: 'user',
      index: true
    },

    // User Type & Auth
    userType: {
      type: String,
      enum: Object.values(USER_TYPES),
      default: USER_TYPES.NORMAL,
      index: true
    },

    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.EMAIL,
      required: true
    },

    isHypeModeUser: {
      type: Boolean,
      default: false,
      index: true
    },

    // Embedded Sub-documents
    paymentInfo: {
      type: PaymentInfoSchema,
      default: () => ({})
    },

    sellerStats: {
      type: SellerStatsSchema,
      default: () => ({})
    },

    verification: {
      type: VerificationSchema,
      default: () => ({})
    },

    // Relationships (Stored as ObjectIds for scalability)
    bookmarks: [{
      type: Types.ObjectId,
      ref: 'Video',
      index: true
    }],

    scriptBookmarks: [{
      type: Types.ObjectId,
      ref: 'Script',
      index: true
    }],

    followers: [{
      type: Types.ObjectId,
      ref: 'User',
      index: true
    }],

    following: [{
      type: Types.ObjectId,
      ref: 'User',
      index: true
    }]

  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true, transform: sanitizeOutput },
    toObject: { virtuals: true, transform: sanitizeOutput }
  }
);

// ==========================================
// Indexes for Performance
// ==========================================

// Compound indexes for common query patterns
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ username: 1, isActive: 1 });
UserSchema.index({ userType: 1, isHypeModeUser: 1 });
UserSchema.index({ 'paymentInfo.subscriptionType': 1, 'paymentInfo.hasPaid': 1 });
UserSchema.index({ createdAt: -1 }); // For sorting by newest
UserSchema.index({ role: 1, isActive: 1 });

// Text index for search functionality
UserSchema.index({ username: 'text', email: 'text', bio: 'text' });

// ==========================================
// Virtuals
// ==========================================

UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

UserSchema.virtual('followersCount').get(function() {
  return this.followers?.length || 0;
});

UserSchema.virtual('followingCount').get(function() {
  return this.following?.length || 0;
});

UserSchema.virtual('isSeller').get(function() {
  return this.userType === USER_TYPES.SELLER;
});

UserSchema.virtual('fullProfile').get(function() {
  return {
    ...this.toObject(),
    age: this.age,
    followersCount: this.followersCount,
    followingCount: this.followingCount
  };
});

// ==========================================
// Middleware (Hooks)
// ==========================================

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash if password is modified and exists
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamps on specific field changes
UserSchema.pre('save', function(next) {
  if (this.isModified('isVerified') && this.isVerified && !this.verification.verifiedAt) {
    this.verification.verifiedAt = new Date();
  }
  next();
});

// Clean up sensitive data before updating
UserSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate();
  
  // Prevent direct password updates through update operations
  if (update && update.password) {
    return next(new Error('Use save() method to update password securely'));
  }
  
  // Prevent role escalation through updates
  if (update && update.role === 'admin') {
    return next(new Error('Admin role cannot be assigned through update operations'));
  }
  
  next();
});

// ==========================================
// Instance Methods
// ==========================================

/**
 * Compare password with stored hash
 * @param {string} candidatePassword - Plain text password to check
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate verification token
 * @returns {string} Generated token
 */
UserSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.verification = {
    token: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    lastSentAt: new Date()
  };
  
  return token; // Return unhashed token for email
};

/**
 * Check if verification token is valid
 * @param {string} token - Token to verify
 * @returns {boolean}
 */
UserSchema.methods.verifyToken = function(token) {
  if (!this.verification.token || !this.verification.expiresAt) return false;
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return (
    hashedToken === this.verification.token &&
    this.verification.expiresAt > new Date()
  );
};

/**
 * Check if user can send verification email (rate limiting)
 * @returns {boolean}
 */
UserSchema.methods.canSendVerification = function() {
  if (!this.verification.lastSentAt) return true;
  
  const COOLDOWN_MINUTES = 5;
  const cooldownTime = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
  
  return this.verification.lastSentAt < cooldownTime;
};

/**
 * Update seller rating safely
 * @param {number} newRating - New rating value (0-5)
 */
UserSchema.methods.updateSellerRating = function(newRating) {
  if (newRating < 0 || newRating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }
  
  const { sellerStats } = this;
  const currentTotal = sellerStats.sellerRating * sellerStats.totalSales;
  sellerStats.totalSales += 1;
  sellerStats.sellerRating = (currentTotal + newRating) / sellerStats.totalSales;
  
  return this.save();
};

/**
 * Safe profile export (removes sensitive fields)
 * @returns {Object}
 */
UserSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    bio: this.bio,
    avatar: this.avatar,
    coverImage: this.coverImage,
    age: this.age,
    userType: this.userType,
    isVerified: this.isVerified,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    sellerStats: this.isSeller ? this.sellerStats : undefined,
    createdAt: this.createdAt
  };
};

// ==========================================
// Static Methods
// ==========================================

/**
 * Find user by email with password selected
 * @param {string} email 
 * @returns {Promise<User|null>}
 */
UserSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() })
    .select('+password')
    .lean();
};

/**
 * Find active user by ID
 * @param {string} id 
 * @returns {Promise<User|null>}
 */
UserSchema.statics.findActiveById = function(id) {
  return this.findOne({ _id: id, isActive: true });
};

/**
 * Search users with pagination
 * @param {string} query - Search query
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>}
 */
UserSchema.statics.search = async function(query, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    this.find(
      { $text: { $search: query }, isActive: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean(),
    
    this.countDocuments({ $text: { $search: query }, isActive: true })
  ]);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: skip + users.length < total
    }
  };
};

/**
 * Get followers with pagination (optimized)
 * @param {string} userId 
 * @param {Object} options 
 */
UserSchema.statics.getFollowers = async function(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  
  const result = await this.findById(userId)
    .populate({
      path: 'followers',
      select: 'username avatar bio isVerified',
      options: { skip, limit, sort: { createdAt: -1 } }
    })
    .lean();
  
  if (!result) return null;
  
  // Get total count efficiently
  const total = await this.countDocuments({ following: userId });
  
  return {
    followers: result.followers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Sanitize output - remove sensitive fields
 */
function sanitizeOutput(doc, ret) {
  // Remove sensitive fields
  delete ret.password;
  delete ret.__v;
  delete ret.verification;
  delete ret.paymentInfo?.stripeCustomerId;
  delete ret.paymentInfo?.stripeAccountId;
  
  // Convert _id to id for frontend consistency
  if (ret._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
  
  return ret;
}

// ==========================================
// Export
// ==========================================

const User = mongoose.model('User', UserSchema);

module.exports = {
  User,
  USER_TYPES,
  AUTH_PROVIDERS,
  SUBSCRIPTION_TYPES
};