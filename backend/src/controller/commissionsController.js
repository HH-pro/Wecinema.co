const Commission = require("../../models/Commission");
const User = require("../../models/User");

/**
 * Create a commission request
 */
exports.createCommission = async (req, res) => {
  try {
    const { creatorId, description, budget, deadline } = req.body;

    const creator = await User.findById(creatorId);
    if (!creator) {
      return res.status(404).json({ message: "Creator not found" });
    }

    // Prevent sending commission request to self
    if (creator._id.toString() === req.user.id) {
      return res.status(400).json({ message: "You cannot send a commission request to yourself" });
    }

    const commission = new Commission({
      buyer: req.user.id,
      creator: creatorId,
      description,
      budget,
      deadline,
    });

    await commission.save();
    res.status(201).json({ message: "Commission request sent", commission });
  } catch (error) {
    console.error("Error creating commission:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get commissions received by creator
 */
exports.getCommissionsForCreator = async (req, res) => {
  try {
    const commissions = await Commission.find({ creator: req.user.id })
      .populate("buyer", "username email avatar");

    res.status(200).json(commissions);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get commissions requested by buyer
 */
exports.getMyCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find({ buyer: req.user.id })
      .populate("creator", "username email avatar");

    res.status(200).json(commissions);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Respond to commission (creator only)
 */
exports.respondToCommission = async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { action } = req.body; // "accept" | "reject"

    const commission = await Commission.findById(commissionId);
    if (!commission) {
      return res.status(404).json({ message: "Commission not found" });
    }

    if (commission.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (action === "accept") {
      commission.status = "accepted";
    } else if (action === "reject") {
      commission.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await commission.save();
    res.status(200).json({ message: `Commission ${commission.status}`, commission });
  } catch (error) {
    console.error("Error responding to commission:", error);
    res.status(500).json({ message: "Server error" });
  }
};
