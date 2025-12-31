const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
    },
    status: {
        type: Boolean,
        default: true,
    },
    bio: {
        type: String,
    },
    avatar: {
        type: String,
    },
    coverImage: {
        type: String,
    },
    dob: {
        type: String,
        required: true,
    },
   // In User model
stripeAccountId: String,
stripeAccountStatus: {
  type: String,
  enum: ['not_connected', 'pending', 'active', 'suspended', 'needs_setup', 'disconnected'],
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
completedOrders: {
  type: Number,
  default: 0
},
    hasPaid: { type: Boolean, default: false },
    lastPayment: { type: Date },
    subscriptionType: { type: String },

    bookmarks: [
        { type: Schema.Types.ObjectId, ref: "Video" }
    ],
    followers: [
        { type: Schema.Types.ObjectId, ref: "User" }
    ],
    followings: [
        { type: Schema.Types.ObjectId, ref: "User" }
    ],

    isAdmin: { type: Boolean, default: false },
    isSubAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

 
    isHypeModeUser: {
        type: Boolean,
        default: false
    },
    stripeCustomerId: String,
    stripeAccountId: String,
    balance: {
        type: Number,
        default: 0
    },
    sellerRating: {
        type: Number,
        default: 0
    },
    totalSales: {
        type: Number,
        default: 0
    },

    // 🆕 NEW: UserType field for HypeMode Signup
    userType: {
        type: String,
        enum: ['buyer', 'seller'],
        default: 'buyer'
    },
    
    // 🆕 NEW: Authentication provider tracking
    authProvider: {
        type: String,
        enum: ['email', 'google'],
        default: 'email'
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

const userModel = mongoose.model("User", userSchema);
module.exports = userModel;