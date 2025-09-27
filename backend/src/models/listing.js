const mongoose = require("mongoose");
const { Schema } = mongoose;

const listingSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔹 Core Selling Options
    price: { type: Number, required: true }, // fixed price
    type: {
      type: String,
      enum: ["sale", "license", "adaptation", "offer", "commission"],
      required: true,
    },

    // Licensing / Adaptation flags
    allowLicense: { type: Boolean, default: false },
    allowAdaptation: { type: Boolean, default: false },

    // Relations
    offers: [{ type: Schema.Types.ObjectId, ref: "Offer" }],
    commissions: [{ type: Schema.Types.ObjectId, ref: "CommissionRequest" }],

    // Status tracking
    status: {
      type: String,
      enum: ["active", "pending", "sold", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const listingModel = mongoose.model("Listing", listingSchema);
module.exports = listingModel;
