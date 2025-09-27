const Listing = require("../../models/Listing");

/**
 * ✅ Create a new listing
 */
exports.createListing = async (req, res) => {
  try {
    const { videoId, type, price } = req.body;

    if (!videoId || !type) {
      return res.status(400).json({ message: "videoId and type are required" });
    }

    const listing = new Listing({
      owner: req.user.id,
      video: videoId,
      type, // for_sale | licensing | adaptation | offer | commission
      price: price || null,
      status: "active",
    });

    await listing.save();
    res.status(201).json({ message: "Listing created successfully", listing });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Get all active listings
 */
exports.getListings = async (req, res) => {
  try {
    const listings = await Listing.find({ status: "active" })
      .populate("owner", "username email avatar")
      .populate("video", "title file");

    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Get single listing by ID
 */
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("owner", "username email avatar")
      .populate("video", "title file");

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Update listing (only by owner)
 */
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Prevent updating restricted fields like owner/status directly
    const allowedUpdates = ["type", "price", "status"];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();
    res.status(200).json({ message: "Listing updated", listing });
  } catch (error) {
    console.error("Error updating listing:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Delete listing (soft delete instead of permanent remove)
 */
exports.deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Instead of permanent delete, mark as inactive
    listing.status = "deleted";
    await listing.save();

    res.status(200).json({ message: "Listing deleted (soft)" });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ message: "Server error" });
  }
};
