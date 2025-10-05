import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import { marketplaceAPI } from '../../api';
import MarketplaceLayout from '../../components/Layout';

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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      delivered: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-2">Communicate with buyers and sellers about your orders</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex h-[600px]">
              {/* Conversations Sidebar */}
              <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h3 className="text-lg font-semibold text-gray-900">Conversations</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {conversations.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {conversations.map(conversation => (
                        <div
                          key={conversation.orderId}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedConversation === conversation.orderId 
                              ? 'bg-blue-50 border-r-2 border-blue-600' 
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedConversation(conversation.orderId);
                            navigate(`/marketplace/messages/${conversation.orderId}`);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {conversation.otherUser.username.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {conversation.otherUser.username}
                                </h4>
                                <span className="text-sm font-semibold text-gray-900">
                                  ${conversation.order.amount}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 truncate mb-2">
                                {conversation.lastMessage}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {formatDate(conversation.lastMessageTime)}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(conversation.order.status)}`}>
                                    {conversation.order.status.replace('_', ' ')}
                                  </span>
                                  {conversation.unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                      {conversation.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations</h3>
                        <p className="text-sm text-gray-500 mb-4">Start a conversation from your orders</p>
                        <button 
                          onClick={() => navigate('/marketplace/orders')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          View Your Orders
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Messages Header */}
                    <div className="border-b border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        {(() => {
                          const conversation = conversations.find(c => c.orderId === selectedConversation);
                          return conversation ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {conversation.otherUser.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-lg font-medium text-gray-900">
                                  {conversation.otherUser.username}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  Order #{conversation.orderId.slice(-6)} • ${conversation.order.amount}
                                </p>
                              </div>
                            </div>
                          ) : null;
                        })()}
                        <button 
                          onClick={() => navigate(`/marketplace/orders/${selectedConversation}`)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          View Order
                        </button>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                      <div className="space-y-4">
                        {messages.map(message => (
                          <div
                            key={message._id}
                            className={`flex ${
                              message.senderId._id === 'user1' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                                message.senderId._id === 'user1' 
                                  ? 'bg-blue-600 text-white rounded-br-none' 
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                              }`}
                            >
                              <div className="text-sm">{message.message}</div>
                              <div className={`text-xs mt-1 ${
                                message.senderId._id === 'user1' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-gray-200 bg-white p-4">
                      <div className="flex space-x-4">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          disabled={sending}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button 
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || sending}
                          className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {sending ? (
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Sending...
                            </div>
                          ) : (
                            'Send'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-500 mb-4">Choose a conversation from the list to start messaging</p>
                      {conversations.length === 0 && (
                        <button 
                          onClick={() => navigate('/marketplace')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
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
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default Messages;