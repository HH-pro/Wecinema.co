const mongoose = require("mongoose");
const { Schema } = mongoose;

const commissionRequestSchema = new Schema(
  {
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true }, // e.g., "Custom Short Film Script"
    description: { type: String, required: true },
    proposedPrice: { type: Number, required: true },

    // Optional: link to listing if related
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "in-progress", "completed", "cancelled"],
      default: "pending",
    },

    deadline: { type: Date }, // optional deadline for commission
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const commissionRequestModel = mongoose.model("CommissionRequest", commissionRequestSchema);
module.exports = commissionRequestModel;
