const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * User Schema for Wecinema Video Marketplace
 * Handles authentication, social features, payments, and role management
 */

// Constants for validation
const USER_TYPES = ['buyer', 'seller', 'normalUser'];
const AUTH_PROVIDERS = ['email', 'google'];
const SUBSCRIPTION_TYPES = ['basic', 'premium', 'hypemode']; // Extend as needed

const userSchema = new Schema(
  {
    // Core Profile
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      select: false, // Never return password in queries by default
      minlength: [8, 'Password must be at least 8 characters'],
      // Required only for email auth (handled in pre-validate hook or controller)
    },
    status: {
      type: Boolean,
      default: true,
      index: true, // Index for filtering active users
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    dob: {
      type: Date, // Changed from String to Date for proper age calculation
      required: [true, 'Date of birth is required'],
    },

    // Payment & Subscription (Stripe Integration)
    hasPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastPayment: {
      type: Date,
      default: null,
    },
    subscriptionType: {
      type: String,
      enum: {
        values: SUBSCRIPTION_TYPES,
        message: 'Subscription type must be valid',
      },
      default: null,
    },
    stripeCustomerId: {
      type: String,
      select: false, // Sensitive payment data
      index: true, // Fast lookup for Stripe webhooks
      sparse: true, // Only index documents with this field
    },
    stripeAccountId: {
      type: String,
      select: false, // Sensitive seller data
      index: true,
      sparse: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    sellerRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    totalSales: {
      type: Number,
      default: 0,
      min: [0, 'Total sales cannot be negative'],
    },

    // Social Features
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Video',
        index: true,
      },
    ],
    scriptBookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Script',
        index: true,
      },
    ],
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    followings: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],

    // Role Management
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isSubAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // HypeMode Subscription (PayPal)
    isHypeModeUser: {
      type: Boolean,
      default: false,
      index: true,
    },

    // User Classification
    userType: {
      type: String,
      enum: {
        values: USER_TYPES,
        message: 'User type must be buyer, seller, or normalUser',
      },
      default: 'normalUser',
      index: true,
    },

    // Authentication
    authProvider: {
      type: String,
      enum: {
        values: AUTH_PROVIDERS,
        message: 'Auth provider must be email or google',
      },
      default: 'email',
    },

    // Email Verification
    verificationToken: {
      type: String,
      select: false, // Security: never expose tokens
    },
    verificationTokenExpiry: {
      type: Date,
      select: false,
    },
    lastVerificationSent: {
      type: Date,
      select: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.verificationToken;
        delete ret.verificationTokenExpiry;
        delete ret.lastVerificationSent;
        delete ret.stripeCustomerId;
        delete ret.stripeAccountId;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

/**
 * Virtuals
 */
// Calculate age dynamically without storing
userSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for follower count (avoids storing redundant data)
userSchema.virtual('followerCount').get(function () {
  return this.followers ? this.followers.length : 0;
});

// Virtual for following count
userSchema.virtual('followingCount').get(function () {
  return this.followings ? this.followings.length : 0;
});

/**
 * Indexes for Performance
 */
// Compound index for common queries
userSchema.index({ email: 1, status: 1 });
userSchema.index({ userType: 1, isVerified: 1, status: 1 });
userSchema.index({ isHypeModeUser: 1, lastPayment: -1 });

// Text index for search functionality
userSchema.index(
  { username: 'text', email: 'text', bio: 'text' },
  { 
    name: 'user_search_index',
    weights: {
      username: 10,
      email: 5,
      bio: 1,
    },
  }
);

/**
 * Instance Methods
 */
// Check if user is a seller
userSchema.methods.isSeller = function () {
  return this.userType === 'seller';
};

// Check if user can sell (verified seller)
userSchema.methods.canSell = function () {
  return this.userType === 'seller' && this.isVerified && this.status === true;
};

// Check if verification token is valid and not expired
userSchema.methods.isVerificationTokenValid = function (token) {
  if (this.verificationToken !== token) return false;
  if (!this.verificationTokenExpiry) return false;
  return new Date() < this.verificationTokenExpiry;
};

// Add bookmark with duplicate prevention
userSchema.methods.addBookmark = async function (videoId) {
  if (!this.bookmarks.includes(videoId)) {
    this.bookmarks.push(videoId);
    await this.save();
    return true;
  }
  return false; // Already bookmarked
};

// Remove bookmark
userSchema.methods.removeBookmark = async function (videoId) {
  const index = this.bookmarks.indexOf(videoId);
  if (index > -1) {
    this.bookmarks.splice(index, 1);
    await this.save();
    return true;
  }
  return false; // Not found
};

// Follow user with duplicate prevention
userSchema.methods.follow = async function (userId) {
  if (this._id.equals(userId)) {
    throw new Error('Cannot follow yourself');
  }
  
  if (!this.followings.includes(userId)) {
    this.followings.push(userId);
    await this.save();
    return true;
  }
  return false; // Already following
};

// Unfollow user
userSchema.methods.unfollow = async function (userId) {
  const index = this.followings.indexOf(userId);
  if (index > -1) {
    this.followings.splice(index, 1);
    await this.save();
    return true;
  }
  return false; // Not following
};

/**
 * Static Methods
 */
// Find active user by email (common operation)
userSchema.statics.findActiveByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase(), status: true });
};

// Find user with populated followers (optimized)
userSchema.statics.findWithFollowers = function (userId, limit = 20) {
  return this.findById(userId)
    .populate({
      path: 'followers',
      select: 'username avatar bio',
      options: { limit },
    })
    .lean(); // Use lean for read-only operations
};

// Search users with pagination
userSchema.statics.searchUsers = function (query, options = {}) {
  const { page = 1, limit = 10, userType } = options;
  
  const searchCriteria = {
    $text: { $search: query },
    status: true,
  };
  
  if (userType) {
    searchCriteria.userType = userType;
  }
  
  return this.find(searchCriteria)
    .select('username avatar bio userType sellerRating')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ score: { $meta: 'textScore' } })
    .lean();
};

// Get sellers with pagination (for marketplace)
userSchema.statics.getSellers = function (options = {}) {
  const { page = 1, limit = 20, minRating = 0 } = options;
  
  return this.find({
    userType: 'seller',
    isVerified: true,
    status: true,
    sellerRating: { $gte: minRating },
  })
    .select('username avatar bio sellerRating totalSales createdAt')
    .sort({ sellerRating: -1, totalSales: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();
};

/**
 * Pre-save Middleware
 */
// Ensure email is lowercase before saving
userSchema.pre('save', function (next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

// Update timestamps for verification
userSchema.pre('save', function (next) {
  if (this.isModified('isVerified') && this.isVerified && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;