const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const Listing = require("../../models/marketplace/listing");

// Create new order
router.post("/create-order", async (req, res) => {
  try {
    const { listingId, orderType, amount, buyerNotes } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const order = new Order({
      buyerId: req.user.id,
      sellerId: listing.sellerId,
      listingId,
      orderType,
      amount,
      buyerNotes,
      status: 'pending'
    });

    await order.save();
    
    if (orderType === 'buy_now') {
      listing.status = 'sold';
      await listing.save();
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get my orders (buyer)
router.get("/my-orders", async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user.id })
      .populate('sellerId', 'username avatar')
      .populate('listingId', 'title mediaUrls');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get seller orders
router.get("/seller-orders", async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user.id })
      .populate('buyerId', 'username avatar')
      .populate('listingId', 'title mediaUrls');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Failed to fetch seller orders' });
  }
});

// Update order status
router.put("/order/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOne({ 
      _id: req.params.id, 
      sellerId: req.user.id 
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;