// services/chatService.js
const Message = require('../models/marketplace/Message');

class ChatService {
  // ✅ Send order confirmation message to both users' personal inbox
  async sendOrderConfirmationMessage(order, offer, buyer, seller, chat) {
    try {
      console.log("💬 Sending order confirmation messages to personal inbox...");
      
      const messageContent = `🎉 **Order Confirmed Successfully!**\n\n` +
        `**Order Details:**\n` +
        `📦 Order ID: ${order._id}\n` +
        `👤 ${buyer?._id.toString() === order.buyerId.toString() ? 'You' : buyer?.username} ordered from ${seller?._id.toString() === order.sellerId.toString() ? 'you' : seller?.username}\n` +
        `💰 Amount: $${offer.amount}\n` +
        `📅 Order Date: ${new Date().toLocaleDateString('en-IN')}\n` +
        `🛍️ Service: ${offer.listingId?.title || 'N/A'}\n\n` +
        `**Delivery Information:**\n` +
        `📋 Requirements: ${offer.requirements || 'No specific requirements provided'}\n` +
        `📅 Expected Delivery: ${offer.expectedDelivery ? new Date(offer.expectedDelivery).toLocaleDateString('en-IN') : 'Not specified'}\n\n` +
        `💬 **Click here to discuss order details**\n\n` +
        `🔒 Payment secured in escrow and will be released upon order completion.`;

      // System user ID (you can create a system user in your database)
      const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');

      // ✅ Message to SELLER (from System)
      const messageToSeller = new Message({
        orderId: order._id,
        chatId: chat._id, // Link to chat room
        senderId: systemUserId,
        receiverId: order.sellerId, // Seller will see this in their inbox
        message: messageContent,
        messageType: 'order',
        read: false
      });
      await messageToSeller.save();

      // ✅ Message to BUYER (from System)
      const messageToBuyer = new Message({
        orderId: order._id,
        chatId: chat._id, // Link to chat room
        senderId: systemUserId,
        receiverId: order.buyerId, // Buyer will see this in their inbox
        message: messageContent,
        messageType: 'order',
        read: false
      });
      await messageToBuyer.save();

      console.log("✅ Order confirmation messages sent to both users' personal inbox");
      return true;

    } catch (error) {
      console.error('❌ Error sending order confirmation messages:', error);
      return false;
    }
  }

  // ✅ Create chat room and send initial messages
  async createOrderChat(order, offer, buyer, seller) {
    try {
      const Chat = require('../models/marketplace/Chat');
      
      // Create chat room
      const chat = new Chat({
        orderId: order._id,
        participants: [
          { userId: order.buyerId, role: 'buyer' },
          { userId: order.sellerId, role: 'seller' }
        ],
        listingId: offer.listingId._id,
        status: 'active',
        lastMessageAt: new Date()
      });

      await chat.save();
      console.log("✅ Chat room created:", chat._id);

      // Send messages to personal inbox
      await this.sendOrderConfirmationMessage(order, offer, buyer, seller, chat);

      return chat;

    } catch (error) {
      console.error('❌ Error creating order chat:', error);
      throw error;
    }
  }

  // ✅ Get user's inbox messages
  async getUserInbox(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const messages = await Message.find({
        receiverId: userId
      })
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar')
      .populate('orderId')
      .populate('chatId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      // Get total count for pagination
      const total = await Message.countDocuments({ receiverId: userId });

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('❌ Error getting user inbox:', error);
      throw error;
    }
  }

  // ✅ Mark message as read
  async markAsRead(messageId, userId) {
    try {
      const message = await Message.findOneAndUpdate(
        { 
          _id: messageId, 
          receiverId: userId 
        },
        { 
          read: true 
        },
        { 
          new: true 
        }
      );

      if (!message) {
        throw new Error('Message not found or access denied');
      }

      return message;
    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      throw error;
    }
  }

  // ✅ Get conversation between two users
  async getConversation(user1Id, user2Id, orderId = null, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      
      let query = {
        $or: [
          { senderId: user1Id, receiverId: user2Id },
          { senderId: user2Id, receiverId: user1Id }
        ]
      };

      if (orderId) {
        query.orderId = orderId;
      }

      const messages = await Message.find(query)
        .populate('senderId', 'username avatar')
        .populate('receiverId', 'username avatar')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return messages;
    } catch (error) {
      console.error('❌ Error getting conversation:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();