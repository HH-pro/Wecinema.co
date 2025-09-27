const mongoose = require("mongoose");
const { Schema } = mongoose;

const videoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    isForSale: { type: Boolean, default: false },

    description: {
      type: String,
    },
    slug: {
      type: String,
    },
    genre: {
      type: Schema.Types.Mixed,
      required: true,
    },
    genreCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    theme: {
      type: Schema.Types.Mixed,
      required: true,
    },
    themeCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    rating: {
      type: String,
      required: true,
    },
    ratingCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    published: { type: Boolean, default: true },
    recommended: { type: Boolean, default: false },

    file: { type: String, required: true },
    red_carpet: { type: Boolean, default: true },

    totalLikes: { type: Number, default: 0 },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    hasPaid: { type: Boolean, default: false },

    hidden: { type: Boolean, default: false },

    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    globalLikes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    dislikes: [{ type: Schema.Types.ObjectId, ref: "User" }],

    status: { type: Boolean, default: true },

    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        replies: [
          {
            avatar: { type: String },
            username: { type: String },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    bookmarks: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // 🔹 Hype Mode relations
    listing: { type: Schema.Types.ObjectId, ref: "Listing" },
    licenses: [{ type: Schema.Types.ObjectId, ref: "License" }],
    adaptations: [{ type: Schema.Types.ObjectId, ref: "Video" }],
  },
  {
    timestamps: true, // Add createdAt and updatedAt fields
  }
);

const videoModel = mongoose.model("Video", videoSchema);
module.exports = videoModel;
