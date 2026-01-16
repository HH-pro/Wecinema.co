const mongoose = require('mongoose');

const userLikedVideoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    action: {
        type: String,
        enum: ['like', 'dislike', 'bookmark'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure unique user-video-action combinations
userLikedVideoSchema.index({ userId: 1, videoId: 1, action: 1 }, { unique: true });

// Index for faster queries
userLikedVideoSchema.index({ userId: 1, action: 1 });
userLikedVideoSchema.index({ videoId: 1, action: 1 });
userLikedVideoSchema.index({ userId: 1, createdAt: -1 });

const UserLikedVideo = mongoose.model('UserLikedVideo', userLikedVideoSchema);

module.exports = UserLikedVideo;