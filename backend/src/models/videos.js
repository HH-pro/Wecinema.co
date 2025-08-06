const mongoose = require("mongoose");

const { Schema } = mongoose;

const videoSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
		},
		isForSale:{ type: Boolean, default: false },
		description: {
			type: String,
			// required: true,
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
			default: {}
		},
		
		theme: {
			type: Schema.Types.Mixed,
			required: true,
		},
		themeCounts: {
			type: Map,
			of: Number,
			default: {}
		},
		rating: {
			type: String,
			required: true,
		},
		ratingCounts: {
			type: Map,
			of: Number,
			default: {}
		},
		published: {
			type: Boolean,
			default: true,
		},
		recommended: {
			type: Boolean,
			default: false,
		},
		file: {
			type: String,
			required: true,
		},
		red_carpet: {
			type: Boolean,
			default: true,
		},
		totalLikes: { type: Number, default: 0 },
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		hasPaid: { type: Boolean, default: false },

		hidden: {
			type: Boolean,
			default: false,
		},
		likes: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		globalLikes: { type: Number, default: 0 }, // Use Number instead of ObjectId
		views: { type: Number, default: 0 }, // Use Number instead of ObjectId
		
		dislikes: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		status: {
			type: Boolean,
			default: true,
		},
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
		bookmarks: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
	},
	{
		timestamps: true, // Add createdAt and updatedAt fields
	}
);

const videoModel = mongoose.model("Video", videoSchema);
module.exports = videoModel;

