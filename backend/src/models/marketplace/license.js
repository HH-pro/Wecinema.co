const mongoose = require("mongoose");
const { Schema } = mongoose;

const licenseSchema = new Schema(
  {
    listing: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
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

    // License details
    licenseType: {
      type: String,
      enum: ["standard", "exclusive", "adaptation"],
      default: "standard",
    },
    terms: {
      type: String, // custom text terms
    },

    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date }, // optional expiry

    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const licenseModel = mongoose.model("License", licenseSchema);
module.exports = licenseModel;
