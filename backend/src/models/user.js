const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: function() {
            return this.authProvider === 'email'; // Password only required for email auth
        }
    },
    status: {
        type: Boolean,
        default: true,
    },
    bio: {
        type: String,
        default: "",
        maxlength: 500
    },
    avatar: {
        type: String,
        default: "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg"
    },
    coverImage: {
        type: String,
        default: ""
    },
    dob: {
        type: String,
        required: true,
    },
   
    hasPaid: { 
        type: Boolean, 
        default: false 
    },
    lastPayment: { 
        type: Date 
    },
    subscriptionType: { 
        type: String,
        enum: ['monthly', 'yearly', 'lifetime', null],
        default: null
    },

    bookmarks: [
        { type: Schema.Types.ObjectId, ref: "Video" }
    ],
    followers: [
        { type: Schema.Types.ObjectId, ref: "User" }
    ],
    followings: [
        { type: Schema.Types.ObjectId, ref: "User" }
    ],

    isAdmin: { 
        type: Boolean, 
        default: false 
    },
    isSubAdmin: { 
        type: Boolean, 
        default: false 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    
    // Email Verification Fields
    verificationToken: {
        type: String,
        index: true,
        sparse: true
    },
    verificationTokenExpiry: {
        type: Date,
        index: true,
        sparse: true
    },
    emailVerifiedAt: {
        type: Date
    },
    
    // Password Reset Fields
    resetPasswordToken: {
        type: String,
        index: true,
        sparse: true
    },
    resetPasswordExpiry: {
        type: Date,
        index: true,
        sparse: true
    },

    isHypeModeUser: {
        type: Boolean,
        default: false
    },
    stripeCustomerId: String,
    stripeAccountId: String,
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
    },

    // UserType field for HypeMode Signup
    userType: {
        type: String,
        enum: ['buyer', 'seller'],
        default: 'buyer'
    },
    
    // Authentication provider tracking
    authProvider: {
        type: String,
        enum: ['email', 'google', 'facebook'],
        default: 'email'
    },

    // Social Login IDs
    googleId: String,
    facebookId: String,

    // Account security
    loginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    lockUntil: {
        type: Date,
        select: false
    },
    
    // Account status tracking
    isActive: {
        type: Boolean,
        default: true
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: String,
    bannedAt: Date,
    
    // Profile tracking
    lastLogin: Date,
    lastSeen: Date,
    ipAddress: String,
    userAgent: String,

    // Preferences
    emailNotifications: {
        type: Boolean,
        default: true
    },
    pushNotifications: {
        type: Boolean,
        default: true
    },
    language: {
        type: String,
        default: 'en'
    },
    theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
    },

    // Statistics
    totalVideos: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    totalComments: {
        type: Number,
        default: 0
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

    // GDPR compliance
    termsAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedAt: Date,
    marketingConsent: {
        type: Boolean,
        default: false
    },
    dataProcessingConsent: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true, // This adds createdAt and updatedAt automatically
    toJSON: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.verificationToken;
            delete ret.resetPasswordToken;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.verificationToken;
            delete ret.resetPasswordToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Utility method: calculate age
userSchema.methods.calculateAge = function () {
    const birthDate = new Date(this.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Virtual for age
userSchema.virtual('age').get(function() {
    return this.calculateAge();
});

// Virtual for display name (username or email)
userSchema.virtual('displayName').get(function() {
    return this.username || this.email.split('@')[0];
});

// Virtual for profile completeness
userSchema.virtual('profileComplete').get(function() {
    let score = 0;
    const total = 5; // username, email, avatar, bio, dob
    
    if (this.username) score++;
    if (this.email) score++;
    if (this.avatar && this.avatar !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg") score++;
    if (this.bio) score++;
    if (this.dob) score++;
    
    return Math.round((score / total) * 100);
});

// Virtual for follower count
userSchema.virtual('followerCount').get(function() {
    return this.followers ? this.followers.length : 0;
});

// Virtual for following count
userSchema.virtual('followingCount').get(function() {
    return this.followings ? this.followings.length : 0;
});

// Method to check if user can watch age-restricted content
userSchema.methods.canWatchContent = function(rating) {
    const age = this.calculateAge();
    
    switch(rating) {
        case 'G':
        case 'PG':
            return true;
        case 'PG-13':
            return age >= 13;
        case 'R':
            return age >= 17;
        case 'NC-17':
        case 'X':
            return age >= 18;
        default:
            return age >= 18;
    }
};

// Method to generate verification token
userSchema.methods.generateVerificationToken = function() {
    const crypto = require('crypto');
    this.verificationToken = crypto.randomBytes(32).toString('hex');
    this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return this.verificationToken;
};

// Method to verify email
userSchema.methods.verifyEmail = function(token) {
    if (this.verificationToken === token && 
        this.verificationTokenExpiry > Date.now()) {
        this.isVerified = true;
        this.emailVerifiedAt = new Date();
        this.verificationToken = undefined;
        this.verificationTokenExpiry = undefined;
        return true;
    }
    return false;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpiry = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
    return this.resetPasswordToken;
};

// Method to reset password
userSchema.methods.resetPassword = function(token, newPassword) {
    if (this.resetPasswordToken === token && 
        this.resetPasswordExpiry > Date.now()) {
        const argon2 = require('argon2');
        this.password = argon2.hash(newPassword);
        this.resetPasswordToken = undefined;
        this.resetPasswordExpiry = undefined;
        return true;
    }
    return false;
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        this.loginAttempts = 1;
        this.lockUntil = undefined;
    } else {
        this.loginAttempts += 1;
    }
    
    if (this.loginAttempts >= 5) {
        this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
    }
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
};

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        try {
            const argon2 = require('argon2');
            this.password = await argon2.hash(this.password);
        } catch (error) {
            return next(error);
        }
    }
    
    if (this.isModified('email')) {
        this.isVerified = false;
        this.emailVerifiedAt = undefined;
    }
    
    this.updatedAt = Date.now();
    next();
});

// Pre-validate middleware for dob validation
userSchema.pre('validate', function(next) {
    if (this.dob) {
        const dob = new Date(this.dob);
        const now = new Date();
        const minAge = 13; // Minimum age requirement
        const maxAge = 120; // Maximum age (reasonable limit)
        
        const age = now.getFullYear() - dob.getFullYear();
        const monthDiff = now.getMonth() - dob.getMonth();
        
        let calculatedAge = age;
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
            calculatedAge--;
        }
        
        if (calculatedAge < minAge) {
            this.invalidate('dob', `You must be at least ${minAge} years old to register`);
        }
        
        if (calculatedAge > maxAge) {
            this.invalidate('dob', `Please enter a valid date of birth`);
        }
        
        if (dob > now) {
            this.invalidate('dob', 'Date of birth cannot be in the future');
        }
    }
    next();
});

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { sparse: true });
userSchema.index({ isVerified: 1 });
userSchema.index({ isAdmin: 1 });
userSchema.index({ isSubAdmin: 1 });
userSchema.index({ hasPaid: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'followers': 1 });
userSchema.index({ 'followings': 1 });
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ stripeAccountId: 1 }, { sparse: true });

// Static method to find by email (case-insensitive)
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: new RegExp(`^${email}$`, 'i') });
};

// Static method to get user stats
userSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $facet: {
                totalUsers: [{ $count: "count" }],
                verifiedUsers: [
                    { $match: { isVerified: true } },
                    { $count: "count" }
                ],
                paidUsers: [
                    { $match: { hasPaid: true } },
                    { $count: "count" }
                ],
                adminUsers: [
                    { $match: { isAdmin: true } },
                    { $count: "count" }
                ],
                newUsersToday: [
                    { $match: { createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
                    { $count: "count" }
                ],
                usersByType: [
                    { $group: { _id: "$userType", count: { $sum: 1 } } }
                ]
            }
        }
    ]);
    
    return stats[0];
};

const userModel = mongoose.model("User", userSchema);
module.exports = userModel;