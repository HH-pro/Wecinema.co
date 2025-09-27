const express = require("express");
const router = express.Router();
const Commission = require("../models/commissionRequest");
const User = require("../models/user");

// ✅ Create a commission request
router.post("/commissions", async (req, res) => {
  try {
    const { creatorId, description, budget, deadline } = req.body;
    if (!creatorId || !description || !budget)
      return res.status(400).json({ message: "creatorId, description and budget are required" });

    const creator = await User.findById(creatorId);
    if (!creator) return res.status(404).json({ message: "Creator not found" });

    if (creator._id.toString() === req.user.id)
      return res.status(400).json({ message: "You cannot send a commission request to yourself" });

    const existing = await Commission.findOne({
      buyer: req.user.id,
      creator: creatorId,
      description,
      status: "pending",
    });
    if (existing) return res.status(400).json({ message: "You already sent a similar commission request" });

    const commission = await Commission.create({
      buyer: req.user.id,
      creator: creatorId,
      description,
      budget,
      deadline,
      status: "pending",
    });

    res.status(201).json({ message: "Commission request sent", commission });
  } catch (error) {
    console.error("Error creating commission:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get commissions received by creator
router.get("/commissions/received", async (req, res) => {
  try {
    const commissions = await Commission.find({ creator: req.user.id })
      .populate("buyer", "username email avatar")
      .sort({ createdAt: -1 });
    res.status(200).json(commissions);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get commissions requested by buyer
router.get("/commissions/sent", async (req, res) => {
  try {
    const commissions = await Commission.find({ buyer: req.user.id })
      .populate("creator", "username email avatar")
      .sort({ createdAt: -1 });
    res.status(200).json(commissions);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Respond to commission (accept/reject)
router.post("/commissions/:commissionId/respond", async (req, res) => {
  try {
    const { commissionId } = req.params;
    const { action } = req.body;

    if (!["accept", "reject"].includes(action))
      return res.status(400).json({ message: "Invalid action (must be accept/reject)" });

    const commission = await Commission.findById(commissionId);
    if (!commission) return res.status(404).json({ message: "Commission not found" });
    if (commission.creator.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    if (commission.status !== "pending") return res.status(400).json({ message: `This commission is already ${commission.status}` });

    commission.status = action === "accept" ? "accepted" : "rejected";
    await commission.save();

    res.status(200).json({ message: `Commission ${commission.status}`, commission });
  } catch (error) {
    console.error("Error responding to commission:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
