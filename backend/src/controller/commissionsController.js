const Commission = require('../models/Commission');

exports.createCommission = async (req, res) => {
  try {
    const { requirements, budget, timeline, sellerId } = req.body;
    const commission = await Commission.create({
      buyerId: req.user.id,
      sellerId: sellerId || null,
      requirements,
      budget,
      timeline
    });
    res.status(201).json(commission);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const commission = await Commission.findById(id);
    if (!commission) return res.status(404).json({ message: 'Not found' });

    commission.messages.push({ senderId: req.user.id, text });
    await commission.save();
    res.json(commission);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getCommission = async (req, res) => {
  const commission = await Commission.findById(req.params.id);
  if (!commission) return res.status(404).json({ message: 'Not found' });
  res.json(commission);
};

exports.getUserCommissions = async (req, res) => {
  const commissions = await Commission.find({ $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }] }).sort({ createdAt: -1 });
  res.json(commissions);
};
