const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
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

    proposedPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },

    message: { type: String }, // optional buyer message
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const offerModel = mongoose.model("Offer", offerSchema);
module.exports = offerModel;
