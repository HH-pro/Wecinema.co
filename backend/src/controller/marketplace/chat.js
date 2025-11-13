// routes/marketplace/chat.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Chat = require("../../models/marketplace/Chat");
const Order = require("../../models/marketplace/order");
const { authenticateMiddleware } = require("../../utils");
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/chat/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and document files are allowed!'));
    }
  }
});

// ✅ GET USER CHATS (Inbox)
router.get("/my-chats", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    
    const chats = await Chat.find({
      'participants.userId': userId,
      status: { $ne: 'closed' }
    })
    .populate('participants.userId', 'username avatar')
    .populate('listingId', 'title mediaUrls price')
    .populate('orderId', 'status amount orderType')
    .populate('messages.senderId', 'username avatar')
    .sort({ lastMessageAt: -1 });

    // Format response with unread counts
    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => p.userId._id.toString() !== userId.toString());
      const unreadCount = chat.getUnreadCount(userId);
      
      return {
        _id: chat._id,
        orderId: chat.orderId?._id,
        listing: chat.listingId,
        order: chat.orderId,
        otherUser: otherParticipant?.userId,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: unreadCount,
        status: chat.status,
        createdAt: chat.createdAt
      };
    });

    res.json({
      success: true,
      data: formattedChats
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chats'
    });
  }
});

// ✅ GET CHAT MESSAGES
router.get("/:chatId/messages", authenticateMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.userId': userId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }

    // Mark messages as read for this user
    await chat.markAsRead(userId);

    // Get messages with pagination
    const messages = await Chat.aggregate([
      { $match: { _id: chat._id } },
      { $unwind: '$messages' },
      { $match: { 'messages.isDeleted': false } },
      { $sort: { 'messages.createdAt': -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
      { 
        $project: {
          _id: '$messages._id',
          senderId: '$messages.senderId',
          content: '$messages.content',
          messageType: '$messages.messageType',
          fileUrl: '$messages.fileUrl',
          fileName: '$messages.fileName',
          fileSize: '$messages.fileSize',
          readBy: '$messages.readBy',
          createdAt: '$messages.createdAt',
          updatedAt: '$messages.updatedAt'
        }
      }
    ]);

    // Populate sender information
    await Chat.populate(messages, {
      path: 'senderId',
      select: 'username avatar'
    });

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: chat.messages.filter(m => !m.isDeleted).length
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// ✅ SEND MESSAGE
router.post("/:chatId/messages", authenticateMiddleware, upload.single('file'), async (req, res) => {
  let session;
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;
    const { content, messageType = 'text' } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Message content or file is required'
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // Check if user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.userId': userId
    }).session(session);

    if (!chat) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }

    // Check if chat is active
    if (chat.status === 'closed' || chat.status === 'archived') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: 'Cannot send messages in a closed chat'
      });
    }

    // Prepare message data
    const messageData = {
      senderId: userId,
      content: content || '',
      messageType: messageType,
      readBy: [{
        userId: userId,
        readAt: new Date()
      }]
    };

    // Handle file upload
    if (req.file) {
      messageData.messageType = getMessageTypeFromFile(req.file.mimetype);
      messageData.fileUrl = `/uploads/chat/${req.file.filename}`;
      messageData.fileName = req.file.originalname;
      messageData.fileSize = req.file.size;
      
      if (!content) {
        messageData.content = `Sent a file: ${req.file.originalname}`;
      }
    }

    // Add message to chat
    await chat.addMessage(messageData);

    await session.commitTransaction();

    // Populate the message for response
    const populatedMessage = await Chat.populate(messageData, {
      path: 'senderId',
      select: 'username avatar'
    });

    // Emit real-time event (if using Socket.io)
    if (global.io) {
      const otherParticipant = chat.participants.find(p => p.userId.toString() !== userId.toString());
      if (otherParticipant) {
        global.io.to(otherParticipant.userId.toString()).emit('new_message', {
          chatId: chat._id,
          message: populatedMessage
        });
      }
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ MARK MESSAGES AS READ
router.put("/:chatId/read", authenticateMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.userId': userId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }

    await chat.markAsRead(userId);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark messages as read'
    });
  }
});

// ✅ GET CHAT DETAILS
router.get("/:chatId", authenticateMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id || req.user._id || req.user.userId;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.userId': userId
    })
    .populate('participants.userId', 'username avatar email')
    .populate('listingId', 'title mediaUrls price category')
    .populate('orderId')
    .populate('messages.senderId', 'username avatar');

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }

    // Mark as read when opening chat
    await chat.markAsRead(userId);

    const otherParticipant = chat.participants.find(p => p.userId._id.toString() !== userId.toString());

    res.json({
      success: true,
      data: {
        _id: chat._id,
        order: chat.orderId,
        listing: chat.listingId,
        otherUser: otherParticipant?.userId,
        participants: chat.participants,
        status: chat.status,
        unreadCount: chat.getUnreadCount(userId),
        settings: chat.settings,
        createdAt: chat.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching chat details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat details'
    });
  }
});

// ✅ UPDATE CHAT STATUS
router.put("/:chatId/status", authenticateMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user._id || req.user.userId;

    const validStatuses = ['active', 'archived', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const chat = await Chat.findOneAndUpdate(
      {
        _id: chatId,
        'participants.userId': userId
      },
      { status },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found or access denied'
      });
    }

    res.json({
      success: true,
      data: chat,
      message: `Chat ${status} successfully`
    });

  } catch (error) {
    console.error('Error updating chat status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chat status'
    });
  }
});

// Helper function to determine message type from file
function getMessageTypeFromFile(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('application/') || mimetype.startsWith('text/')) return 'file';
  return 'file';
}

module.exports = router;