const express = require("express");
const router = express.Router();

const { Commission, protect } = require("../utils");
/**
 * @route POST /commissions
 * @description Create commission request
 */
router.post("/commissions", protect, async (req, res) => {
  try {
    const { requirements, budget, timeline, sellerId } = req.body;
    const commission = await Commission.create({
      buyerId: req.user.id,
      sellerId: sellerId || null,
      requirements,
      budget,
      timeline,
    });
    res.status(201).json(commission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route POST /commissions/:id/message
 * @description Add message to commission
 */
router.post("/commissions/:id/message", protect, async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ message: "Not found" });

    commission.messages.push({ senderId: req.user.id, text: req.body.text });
    await commission.save();
    res.json(commission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @route GET /commissions/:id
 * @description Get commission by ID
 */
router.get("/commissions/:id", protect, async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ message: "Not found" });
    res.json(commission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /commissions/me
 * @description Get commissions of user (buyer or seller)
 */
router.get("/commissions/me", protect, async (req, res) => {
  try {
    const commissions = await Commission.find({
      $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }],
    }).sort({ createdAt: -1 });
    res.json(commissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
