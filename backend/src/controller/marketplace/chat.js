// routes/chat.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Chat = require('../../models/marketplace/Chat');
const Order = require('../../models/marketplace/order');
const Message = require('../../models/marketplace/messages');
const { authenticateMiddleware } = require('../../utils');
const admin = require('firebase-admin');

// ✅ GET USER'S CHATS
router.get('/my-chats', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`🔍 Fetching chats for user: ${userId}`);

    // Find chats where user is a participant
    const chats = await Chat.find({
      'participants.userId': new mongoose.Types.ObjectId(userId),
      status: { $ne: 'archived' } // Exclude archived chats
    })
    .populate('participants.userId', 'username avatar email')
    .populate('listingId', 'title price mediaUrls')
    .populate('orderId', 'amount status orderType createdAt')
    .sort({ updatedAt: -1 });

    console.log(`✅ Found ${chats.length} chats for user ${userId}`);

    // Transform chats to frontend format
    const transformedChats = await Promise.all(chats.map(async (chat) => {
      // Find other user in the chat
      const otherParticipant = chat.participants.find(
        p => p.userId._id.toString() !== userId.toString()
      );

      // Get order details
      let orderDetails = null;
      if (chat.orderId) {
        orderDetails = {
          _id: chat.orderId._id,
          amount: chat.orderId.amount,
          status: chat.orderId.status,
          orderType: chat.orderId.orderType,
          createdAt: chat.orderId.createdAt
        };
      } else if (chat.listingId) {
        // If no order, create a placeholder from listing
        orderDetails = {
          _id: chat.listingId._id,
          amount: chat.listingId.price,
          status: 'active',
          orderType: 'listing_chat',
          createdAt: chat.createdAt
        };
      }

      // Get last message from Firebase or local messages
      let lastMessage = '';
      let lastMessageAt = chat.updatedAt;
      let unreadCount = 0;

      try {
        // Try to get from Firebase
        if (admin.apps.length && chat.firebaseChatId) {
          const db = admin.firestore();
          const chatRef = db.collection('chatRooms').doc(chat.firebaseChatId);
          const messagesRef = chatRef.collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(1);
          
          const snapshot = await messagesRef.get();
          if (!snapshot.empty) {
            const lastFirebaseMsg = snapshot.docs[0].data();
            lastMessage = lastFirebaseMsg.content || lastFirebaseMsg.message || '';
            lastMessageAt = lastFirebaseMsg.timestamp ? 
              new Date(lastFirebaseMsg.timestamp) : chat.updatedAt;
            
            // Count unread messages (simplified - you might want more logic)
            const unreadSnapshot = await chatRef.collection('messages')
              .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
              .where('senderId', '!=', userId.toString())
              .get();
            
            unreadCount = unreadSnapshot.size;
          }
        }

        // Fallback: Get from local messages
        if (!lastMessage && chat.orderId) {
          const lastLocalMessage = await Message.findOne({
            orderId: chat.orderId._id,
            $or: [
              { senderId: userId },
              { receiverId: userId }
            ]
          })
          .sort({ createdAt: -1 })
          .limit(1);
          
          if (lastLocalMessage) {
            lastMessage = lastLocalMessage.message;
            lastMessageAt = lastLocalMessage.createdAt;
          }
        }

      } catch (firebaseError) {
        console.error('Firebase chat fetch error:', firebaseError.message);
        // Continue with local data
      }

      return {
        _id: chat._id,
        firebaseChatId: chat.firebaseChatId || `chat_${chat._id}`,
        orderId: chat.orderId?._id,
        listing: {
          _id: chat.listingId?._id,
          title: chat.listingId?.title || 'Chat',
          mediaUrls: chat.listingId?.mediaUrls || [],
          price: chat.listingId?.price || 0
        },
        order: orderDetails,
        otherUser: {
          _id: otherParticipant?.userId?._id || 'unknown',
          username: otherParticipant?.userId?.username || 'Unknown User',
          avatar: otherParticipant?.userId?.avatar,
          email: otherParticipant?.userId?.email || ''
        },
        lastMessage: lastMessage.substring(0, 100), // Truncate
        lastMessageAt: lastMessageAt,
        unreadCount: unreadCount,
        status: chat.status || 'active',
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      };
    }));

    res.status(200).json({
      success: true,
      message: 'Chats fetched successfully',
      data: transformedChats,
      count: transformedChats.length
    });

  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ CREATE OR GET CHAT FOR ORDER
router.post('/create/:orderId', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID'
      });
    }

    // Get order details
    const order = await Order.findById(orderId)
      .populate('listingId', 'title sellerId')
      .populate('buyerId', 'username avatar email')
      .populate('sellerId', 'username avatar email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is part of this order
    const isBuyer = order.buyerId._id.toString() === userId.toString();
    const isSeller = order.sellerId._id.toString() === userId.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to chat for this order'
      });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({ orderId: order._id })
      .populate('participants.userId', 'username avatar email');

    if (chat) {
      console.log(`✅ Chat already exists for order ${orderId}: ${chat._id}`);
      
      // Return existing chat
      const otherParticipant = chat.participants.find(
        p => p.userId._id.toString() !== userId.toString()
      );

      return res.status(200).json({
        success: true,
        message: 'Chat already exists',
        data: {
          _id: chat._id,
          firebaseChatId: chat.firebaseChatId || `chat_${chat._id}`,
          orderId: order._id,
          listing: {
            _id: order.listingId._id,
            title: order.listingId.title
          },
          order: {
            _id: order._id,
            amount: order.amount,
            status: order.status
          },
          otherUser: {
            _id: otherParticipant?.userId?._id,
            username: otherParticipant?.userId?.username || 'Unknown User',
            avatar: otherParticipant?.userId?.avatar,
            email: otherParticipant?.userId?.email || ''
          },
          status: chat.status
        }
      });
    }

    // Create new chat
    console.log(`🆕 Creating new chat for order ${orderId}`);

    // Create Firebase chat room if Firebase is initialized
    let firebaseChatId = null;
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        firebaseChatId = `order_${order._id}_${Date.now()}`;
        
        const chatRoomRef = db.collection('chatRooms').doc(firebaseChatId);
        
        const chatRoomData = {
          orderId: order._id.toString(),
          participants: {
            [order.buyerId._id.toString()]: {
              id: order.buyerId._id.toString(),
              name: order.buyerId.username,
              email: order.buyerId.email,
              avatar: order.buyerId.avatar,
              role: 'buyer'
            },
            [order.sellerId._id.toString()]: {
              id: order.sellerId._id.toString(),
              name: order.sellerId.username,
              email: order.sellerId.email,
              avatar: order.sellerId.avatar,
              role: 'seller'
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          status: 'active',
          orderDetails: {
            orderId: order._id.toString(),
            amount: order.amount,
            listingTitle: order.listingId?.title || 'Order'
          }
        };
        
        await chatRoomRef.set(chatRoomData);
        
        // Add welcome message
        const welcomeMessage = {
          senderId: 'system',
          senderName: 'System',
          senderRole: 'system',
          message: `🎉 **Chat started for Order #${order._id}**\n\nBuyer: ${order.buyerId.username}\nSeller: ${order.sellerId.username}\nAmount: $${order.amount}\n\nStart discussing your order details here!`,
          timestamp: new Date().toISOString(),
          type: 'system',
          readBy: []
        };
        
        await chatRoomRef.collection('messages').add(welcomeMessage);
        
        console.log(`✅ Firebase chat room created: ${firebaseChatId}`);
      } catch (firebaseError) {
        console.error('Failed to create Firebase chat:', firebaseError);
        // Continue without Firebase
      }
    }

    // Create local chat record
    chat = new Chat({
      firebaseChatId: firebaseChatId,
      orderId: order._id,
      listingId: order.listingId._id,
      participants: [
        {
          userId: order.buyerId._id,
          role: 'buyer',
          firebaseId: order.buyerId._id.toString()
        },
        {
          userId: order.sellerId._id,
          role: 'seller',
          firebaseId: order.sellerId._id.toString()
        }
      ],
      status: 'active',
      lastMessageAt: new Date(),
      metadata: {
        firebaseChatId: firebaseChatId,
        createdFrom: 'manual'
      }
    });

    await chat.save();
    console.log(`✅ Local chat record created: ${chat._id}`);

    // Return the new chat
    const otherUser = isBuyer ? order.sellerId : order.buyerId;

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: {
        _id: chat._id,
        firebaseChatId: chat.firebaseChatId || `chat_${chat._id}`,
        orderId: order._id,
        listing: {
          _id: order.listingId._id,
          title: order.listingId.title
        },
        order: {
          _id: order._id,
          amount: order.amount,
          status: order.status
        },
        otherUser: {
          _id: otherUser._id,
          username: otherUser.username,
          avatar: otherUser.avatar,
          email: otherUser.email
        },
        status: chat.status,
        chatLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages?chat=${chat.firebaseChatId || chat._id}`
      }
    });

  } catch (error) {
    console.error('❌ Error creating chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ ARCHIVE CHAT
router.put('/archive/:chatId', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const { chatId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Find chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      p => p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to archive this chat'
      });
    }

    // Archive the chat
    chat.status = 'archived';
    chat.updatedAt = new Date();
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Chat archived successfully',
      data: { chatId: chat._id }
    });

  } catch (error) {
    console.error('❌ Error archiving chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive chat'
    });
  }
});

// ✅ MARK MESSAGES AS READ
router.put('/mark-read/:orderId', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Mark local messages as read
    await Message.updateMany(
      {
        orderId: orderId,
        receiverId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    // Also update Firebase if needed
    // (This would require additional logic to mark Firebase messages as read)

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// ✅ LOG MESSAGE TO DATABASE (for backup/analytics)
router.post('/log-message', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const { orderId, message, firebaseChatId, senderId } = req.body;

    if (!userId || !orderId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create message log
    const messageLog = new Message({
      orderId: orderId,
      senderId: senderId || userId,
      receiverId: senderId === userId ? 'other' : userId, // Simplified
      message: message,
      read: false,
      metadata: {
        firebaseChatId: firebaseChatId,
        source: 'firebase_chat'
      }
    });

    await messageLog.save();

    res.status(201).json({
      success: true,
      message: 'Message logged successfully',
      data: { messageId: messageLog._id }
    });

  } catch (error) {
    console.error('❌ Error logging message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log message'
    });
  }
});

// ✅ GET CHAT BY ORDER ID
router.get('/by-order/:orderId', authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const chat = await Chat.findOne({ orderId: orderId })
      .populate('participants.userId', 'username avatar email')
      .populate('listingId', 'title price mediaUrls')
      .populate('orderId', 'amount status orderType');

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found for this order'
      });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      p => p.userId._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this chat'
      });
    }

    // Find other user
    const otherParticipant = chat.participants.find(
      p => p.userId._id.toString() !== userId.toString()
    );

    res.status(200).json({
      success: true,
      data: {
        _id: chat._id,
        firebaseChatId: chat.firebaseChatId || `chat_${chat._id}`,
        orderId: chat.orderId?._id,
        listing: {
          _id: chat.listingId?._id,
          title: chat.listingId?.title || 'Chat',
          mediaUrls: chat.listingId?.mediaUrls || [],
          price: chat.listingId?.price || 0
        },
        order: chat.orderId ? {
          _id: chat.orderId._id,
          amount: chat.orderId.amount,
          status: chat.orderId.status,
          orderType: chat.orderId.orderType
        } : null,
        otherUser: {
          _id: otherParticipant?.userId?._id,
          username: otherParticipant?.userId?.username || 'Unknown User',
          avatar: otherParticipant?.userId?.avatar,
          email: otherParticipant?.userId?.email || ''
        },
        status: chat.status,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat'
    });
  }
});

// ✅ HEALTH CHECK
// chatRoutes.js mein health check
router.get('/firebase/health', (req, res) => {
  try {
    const { isInitialized } = require('../../../firebaseConfig');
    
    // Always return success, firebase optional hai
    res.status(200).json({
      success: true,
      message: 'Chat service is operational',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        firebase: isInitialized ? 'connected' : 'optional_not_required'
      },
      note: 'Firebase is optional for chat functionality'
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Chat service running without Firebase',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }
    });
  }
});

module.exports = router;