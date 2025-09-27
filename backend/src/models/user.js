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

    // 🔹 Hype Mode specific relations
    listings: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    offers: [{ type: Schema.Types.ObjectId, ref: "Offer" }],
    commissions: [{ type: Schema.Types.ObjectId, ref: "CommissionRequest" }],
    messages: [{ type: Schema.Types.ObjectId, ref: "Message" }]
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
