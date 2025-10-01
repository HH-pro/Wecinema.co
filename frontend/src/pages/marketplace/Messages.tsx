import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import { marketplaceAPI } from '../../services/api';

interface Message {
  _id: string;
  senderId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  receiverId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  message: string;
  attachments: string[];
  read: boolean;
  createdAt: string;
}

interface Conversation {
  orderId: string;
  otherUser: {
    _id: string;
    username: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  order: any;
}

const Messages: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(orderId || null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      // For now, we'll simulate conversations. In real app, you'd fetch from API
      const mockConversations: Conversation[] = [
        {
          orderId: 'order1',
          otherUser: { _id: 'user2', username: 'john_doe' },
          lastMessage: 'Looking forward to working with you!',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          order: { _id: 'order1', amount: 100, status: 'in_progress' }
        },
        {
          orderId: 'order2',
          otherUser: { _id: 'user3', username: 'jane_smith' },
          lastMessage: 'I have delivered the work, please review.',
          lastMessageTime: new Date(Date.now() - 86400000).toISOString(),
          unreadCount: 1,
          order: { _id: 'order2', amount: 150, status: 'delivered' }
        }
      ];
      setConversations(mockConversations);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationOrderId: string) => {
    try {
      const messagesData = await marketplaceAPI.messages.get(conversationOrderId);
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // For demo, create mock messages
      const mockMessages: Message[] = [
        {
          _id: '1',
          senderId: { _id: 'user1', username: 'current_user' },
          receiverId: { _id: 'user2', username: 'john_doe' },
          message: 'Hello, I have some questions about the order.',
          attachments: [],
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: '2',
          senderId: { _id: 'user2', username: 'john_doe' },
          receiverId: { _id: 'user1', username: 'current_user' },
          message: 'Sure! What would you like to know?',
          attachments: [],
          read: true,
          createdAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          _id: '3',
          senderId: { _id: 'user1', username: 'current_user' },
          receiverId: { _id: 'user2', username: 'john_doe' },
          message: 'When can I expect the delivery?',
          attachments: [],
          read: true,
          createdAt: new Date(Date.now() - 600000).toISOString()
        }
      ];
      setMessages(mockMessages);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      
      // Find the conversation to get receiver ID
      const conversation = conversations.find(c => c.orderId === selectedConversation);
      if (!conversation) return;

      // In real app, you'd use the API:
      // await marketplaceAPI.messages.send({
      //   orderId: selectedConversation,
      //   message: newMessage,
      //   receiverId: conversation.otherUser._id
      // }, setSending);

      // For demo, add message locally
      const newMsg: Message = {
        _id: Date.now().toString(),
        senderId: { _id: 'user1', username: 'current_user' },
        receiverId: conversation.otherUser,
        message: newMessage,
        attachments: [],
        read: false,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.orderId === selectedConversation 
            ? { 
                ...conv, 
                lastMessage: newMessage,
                lastMessageTime: new Date().toISOString()
              }
            : conv
        )
      );

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="messages-header">
        <h1>Messages</h1>
        <p>Communicate with buyers and sellers</p>
      </div>

      <div className="messages-layout">
        {/* Conversations List */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h3>Conversations</h3>
          </div>
          
          <div className="conversations-list">
            {conversations.map(conversation => (
              <div
                key={conversation.orderId}
                className={`conversation-item ${
                  selectedConversation === conversation.orderId ? 'active' : ''
                }`}
                onClick={() => {
                  setSelectedConversation(conversation.orderId);
                  navigate(`/marketplace/messages/${conversation.orderId}`);
                }}
              >
                <div className="conversation-avatar">
                  {conversation.otherUser.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="conversation-content">
                  <div className="conversation-header">
                    <span className="username">{conversation.otherUser.username}</span>
                    <span className="order-amount">${conversation.order.amount}</span>
                  </div>
                  
                  <div className="conversation-preview">
                    <p className="last-message">{conversation.lastMessage}</p>
                    <span className="message-time">
                      {formatDate(conversation.lastMessageTime)}
                    </span>
                  </div>
                  
                  <div className="conversation-meta">
                    <span className={`status status-${conversation.order.status}`}>
                      {conversation.order.status}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className="unread-badge">{conversation.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {conversations.length === 0 && (
            <div className="empty-conversations">
              <p>No conversations yet</p>
              <button 
                onClick={() => navigate('/marketplace/orders')}
                className="btn btn-primary"
              >
                View Your Orders
              </button>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="messages-area">
          {selectedConversation ? (
            <>
              {/* Messages Header */}
              <div className="messages-header-bar">
                {(() => {
                  const conversation = conversations.find(c => c.orderId === selectedConversation);
                  return conversation ? (
                    <>
                      <div className="current-conversation-info">
                        <div className="user-avatar">
                          {conversation.otherUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4>{conversation.otherUser.username}</h4>
                          <span className="order-info">
                            Order #{conversation.orderId.slice(-6)} • ${conversation.order.amount}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(`/marketplace/orders/${selectedConversation}`)}
                        className="btn btn-outline"
                      >
                        View Order
                      </button>
                    </>
                  ) : null;
                })()}
              </div>

              {/* Messages List */}
              <div className="messages-list">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={`message ${
                      message.senderId._id === 'user1' ? 'sent' : 'received'
                    }`}
                  >
                    <div className="message-content">
                      <div className="message-text">{message.message}</div>
                      <div className="message-time">
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <div className="message-input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    disabled={sending}
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="send-button"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state">
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the list to start messaging</p>
                {conversations.length === 0 && (
                  <button 
                    onClick={() => navigate('/marketplace')}
                    className="btn btn-primary"
                  >
                    Browse Marketplace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;