const Offer = require('../../models/Offer');
const Listing = require('../../models/Listing');

exports.createOffer = async (req, res) => {
  try {
    const { listingId, proposedPrice, message } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.owner.toString() === req.user.id) return res.status(400).json({ message: 'Cannot offer on your own listing' });

    const offer = await Offer.create({
      listingId,
      buyerId: req.user.id,
      sellerId: listing.owner,
      proposedPrice,
      message
    });
    res.status(201).json(offer);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.respondOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.params; // accept|reject|counter
    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    if (offer.sellerId.toString() !== req.user.id) return res.status(403).json({ message: 'Not seller' });

    if (action === 'accept') {
      offer.status = 'accepted';
      // optional: set listing.status = 'pending' or 'archived' depending on workflow
    } else if (action === 'reject') {
      offer.status = 'rejected';
    } else if (action === 'counter') {
      const { counterPrice } = req.body;
      if (!counterPrice) return res.status(400).json({ message: 'counterPrice required' });
      offer.status = 'countered';
      offer.counterPrice = counterPrice;
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }
    await offer.save();
    res.json(offer);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getOffersForListing = async (req, res) => {
  const offers = await Offer.find({ listingId: req.params.listingId }).sort({ createdAt: -1 });
  res.json(offers);
};

exports.getUserOffers = async (req, res) => {
  const offers = await Offer.find({ $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }] }).sort({ createdAt: -1 });
  res.json(offers);
};
