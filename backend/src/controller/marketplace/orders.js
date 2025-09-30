const express = require("express");
const router = express.Router();
const Order = require("../../models/marketplace/order");
const Listing = require("../../models/marketplace/listing");

// Create new order (Fiverr Style)
router.post("/create-order", async (req, res) => {
  try {
    const { listingId, orderType, amount, requirements, expectedDelivery } = req.body;

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
      requirements,
      expectedDelivery,
      status: 'pending_payment' // Start with pending payment
    });

    await order.save();
    
    // Mark listing as sold only when payment is completed
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

// Get order details
router.get("/order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'username avatar')
      .populate('sellerId', 'username avatar sellerRating')
      .populate('listingId', 'title mediaUrls');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    if (order.buyerId._id.toString() !== req.user.id && order.sellerId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get my orders (buyer)
router.get("/my-orders", async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user.id })
      .populate('sellerId', 'username avatar sellerRating')
      .populate('listingId', 'title mediaUrls price')
      .sort({ createdAt: -1 });
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
      .populate('listingId', 'title mediaUrls price')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'Failed to fetch seller orders' });
  }
});

// Update order status (seller - start working)
router.put("/order/:id/start-work", async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      sellerId: req.user.id,
      status: 'paid' // Only start work if paid
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not paid' });
    }

    order.status = 'in_progress';
    await order.save();
    
    res.status(200).json({ 
      message: 'Work started on order', 
      order 
    });
  } catch (error) {
    console.error('Error starting work:', error);
    res.status(500).json({ error: 'Failed to start work' });
  }
});

// Seller delivers work
router.put("/order/:id/deliver", async (req, res) => {
  try {
    const { deliveryMessage, deliveryFiles } = req.body;
    
    const order = await Order.findOne({ 
      _id: req.params.id, 
      sellerId: req.user.id,
      status: 'in_progress' // Only deliver if in progress
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not in progress' });
    }

    order.status = 'delivered';
    order.deliveryMessage = deliveryMessage;
    order.deliveryFiles = deliveryFiles || [];
    order.deliveredAt = new Date();
    
    await order.save();

    res.status(200).json({ 
      message: 'Order delivered successfully', 
      order 
    });
  } catch (error) {
    console.error('Error delivering order:', error);
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// Buyer requests revision
router.put("/order/:id/request-revision", async (req, res) => {
  try {
    const { revisionNotes } = req.body;

    const order = await Order.findOne({
      _id: req.params.id,
      buyerId: req.user.id,
      status: 'delivered' // Only request revision if delivered
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not delivered' });
    }

    // Check revision limit
    if (order.revisions >= order.maxRevisions) {
      return res.status(400).json({ error: 'Maximum revisions reached' });
    }

    order.status = 'in_revision';
    order.revisions += 1;
    order.revisionNotes = revisionNotes;
    
    await order.save();

    res.status(200).json({ 
      message: 'Revision requested successfully', 
      order,
      revisionsUsed: order.revisions,
      revisionsLeft: order.maxRevisions - order.revisions
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// Get order timeline/status history
router.get("/order/:id/timeline", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access
    if (order.buyerId.toString() !== req.user.id && order.sellerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeline = [
      { status: 'created', date: order.createdAt, description: 'Order created' },
      order.paidAt && { status: 'paid', date: order.paidAt, description: 'Payment received' },
      order.deliveredAt && { status: 'delivered', date: order.deliveredAt, description: 'Work delivered' },
      order.completedAt && { status: 'completed', date: order.completedAt, description: 'Order completed' }
    ].filter(Boolean);

    res.status(200).json(timeline);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;