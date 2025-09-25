const Listing = require('../models/Listing');

exports.createListing = async (req, res) => {
  try {
    const data = {
      ...req.body,
      owner: req.user.id
    };
    const listing = await Listing.create(data);
    res.status(201).json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const listing = req.listing || await Listing.findById(req.params.id);
    Object.assign(listing, req.body);
    await listing.save();
    res.json(listing);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getListing = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('owner','email name');
  if (!listing) return res.status(404).json({ message: 'Not found' });
  res.json(listing);
};

exports.getListings = async (req, res) => {
  // support filter by owner/status if query provided
  const q = {};
  if (req.query.owner) q.owner = req.query.owner;
  if (req.query.status) q.status = req.query.status;
  const listings = await Listing.find(q).sort({ createdAt: -1 }).limit(200);
  res.json(listings);
};

exports.publishListing = async (req, res) => {
  try {
    const listing = req.listing || await Listing.findById(req.params.id);
    if (!listing.price) return res.status(400).json({ message: 'Set price before publishing' });
    listing.status = 'active';
    await listing.save();
    res.json(listing);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
