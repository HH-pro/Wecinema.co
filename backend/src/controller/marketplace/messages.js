const express = require("express");
const router = express.Router();
const Message = require("../../models/marketplace/message");
const Order = require("../../models/marketplace/order");

// Get messages for an order
router.get("/messages/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Verify user has access to this order
    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { buyerId: req.user.id },
        { sellerId: req.user.id }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const messages = await Message.find({ orderId })
      .populate('senderId', 'username avatar')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post("/send-message", async (req, res) => {
  try {
    const { orderId, message, receiverId } = req.body;

    // Verify user has access to this order
    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { buyerId: req.user.id },
        { sellerId: req.user.id }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const newMessage = new Message({
      orderId,
      senderId: req.user.id,
      receiverId,
      message,
      attachments: req.files ? req.files.map(file => file.path) : []
    });

    await newMessage.save();
    
    // Populate sender info for response
    await newMessage.populate('senderId', 'username avatar');

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.put("/message-read/:messageId", async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { 
        _id: req.params.messageId,
        receiverId: req.user.id 
      },
      { read: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(200).json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;