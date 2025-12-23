// src/pages/Messages.tsx - CLEAN & RESPONSIVE WITH 20%/80% LAYOUT
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FirebaseChatInterface from '../../components/chat/FirebaseChatInterface';
import MarketplaceLayout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiRefreshCw, FiShoppingBag, FiUser, FiChevronLeft, FiMail, FiCalendar, FiDollarSign } from 'react-icons/fi';

// Types
interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
  role?: 'buyer' | 'seller' | 'admin';
}

interface Chat {
  firebaseChatId: string;
  otherUser: {
    id: string;
    username: string;
    avatar?: string;
    email: string;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    mediaUrls?: string[];
  };
  order?: {
    _id: string;
    amount: number;
    status: string;
    listingTitle?: string;
    createdAt: string;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  unreadCount: number;
  updatedAt: string;
}

const Messages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChatListMobile, setShowChatListMobile] = useState(true);

  // Initialize current user from auth
  useEffect(() => {
    if (authUser) {
      setCurrentUser({
        id: authUser.id || authUser._id,
        username: authUser.username || 'User',
        email: authUser.email || '',
        avatar: authUser.avatar,
        role: authUser.role
      });
      setLoading(false);
    }
  }, [authUser]);

  // Fetch user details
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        if (currentUser) return;

        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser({
            id: userData._id || userData.id,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            role: userData.role
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!currentUser && !authUser) {
      fetchCurrentUser();
    }
  }, [authUser, currentUser, navigate]);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setChatsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3000/marketplace/chat/my-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        const transformedChats: Chat[] = (data.data || []).map((chat: any) => ({
          firebaseChatId: chat.firebaseChatId || chat._id,
          otherUser: {
            id: chat.otherUser?._id || chat.otherUserId || 'unknown',
            username: chat.otherUser?.username || 'Unknown User',
            avatar: chat.otherUser?.avatar || '',
            email: chat.otherUser?.email || ''
          },
          listing: {
            id: chat.listing?._id || chat.listingId || 'unknown',
            title: chat.listing?.title || 'Unknown Listing',
            price: chat.listing?.price || 0,
            mediaUrls: chat.listing?.mediaUrls || []
          },
          order: chat.order ? {
            _id: chat.order._id,
            amount: chat.order.amount,
            status: chat.order.status,
            listingTitle: chat.order.listingTitle,
            createdAt: chat.order.createdAt
          } : undefined,
          lastMessage: chat.lastMessage || {
            text: 'No messages yet',
            senderId: '',
            timestamp: new Date().toISOString()
          },
          unreadCount: chat.unreadCount || 0,
          updatedAt: chat.updatedAt || chat.lastMessageAt || new Date().toISOString()
        }));
        
        setChats(transformedChats);
        const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load conversations');
    } finally {
      setChatsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser?.id && !loading) {
      fetchChats();
    }
  }, [currentUser?.id, loading, fetchChats]);

  // Handle URL parameters
  useEffect(() => {
    if (chatsLoading || !chats.length) return;
    
    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');
    
    let foundChat: Chat | null = null;
    
    if (urlChatId) {
      foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
    } else if (orderId) {
      foundChat = chats.find(c => c.order?._id === orderId) || null;
    }
    
    if (foundChat && foundChat.firebaseChatId !== selectedChat?.firebaseChatId) {
      setSelectedChat(foundChat);
      setShowChatListMobile(false);
    }
  }, [chats, chatsLoading, searchParams, selectedChat]);

  // Chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    setSelectedChat(chat);
    setShowChatListMobile(false);
  }, [selectedChat]);

  const handleRefreshChats = () => {
    fetchChats();
    toast.success('Refreshed conversations');
  };

  // Format functions
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / (60 * 24))}d ago`;
  };

  // Toggle chat list on mobile
  const toggleChatListMobile = () => {
    setShowChatListMobile(!showChatListMobile);
  };

  const handleBackToChatList = () => {
    setShowChatListMobile(true);
  };

  // Loading state
  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white">
        {/* CSS Styles - Inline for this component */}
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          
          @keyframes slideOut {
            from { transform: translateX(0); }
            to { transform: translateX(-100%); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          
          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          .animate-float { animation: float 3s ease-in-out infinite; }
          
          .chat-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          
          .chat-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 2px;
          }
          
          .chat-scrollbar::-webkit-scrollbar-thumb {
            background: #e5e7eb;
            border-radius: 2px;
          }
          
          .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
          }
          
          @media (max-width: 768px) {
            .mobile-slide-in {
              animation: slideIn 0.3s ease-out;
            }
            
            .mobile-slide-out {
              animation: slideOut 0.3s ease-out;
            }
          }
        `}</style>

        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h1>
              <p className="mt-1 text-gray-500 text-xs sm:text-sm">
                Communicate with buyers and sellers
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                  {unreadCount} unread
                </span>
              )}
              <button
                onClick={handleRefreshChats}
                disabled={chatsLoading}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                <FiRefreshCw className={`w-4 h-4 mr-2 ${chatsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - 20%/80% Layout */}
        <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 h-[calc(100vh-120px)]">
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl h-full flex overflow-hidden">
            {/* Chat List - 20% width */}
            <div className={`w-full sm:w-1/5 lg:w-[20%] border-r border-gray-200 flex flex-col absolute sm:relative inset-0 z-10 bg-white transition-transform duration-300 ${
              showChatListMobile ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
            }`}>
              {/* Chat List Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Conversations</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chats.length} total • {unreadCount} unread
                    </p>
                  </div>
                  {chatsLoading && (
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-gray-300 border-t-yellow-500"></div>
                  )}
                </div>
              </div>
              
              {/* Chat List Items */}
              <div className="flex-1 overflow-y-auto chat-scrollbar">
                {chatsLoading && chats.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-yellow-500 mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-xs">Loading...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-6 text-center animate-fade-in">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiMail className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No conversations</p>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="px-3 py-1.5 text-xs bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    {chats.map((chat) => (
                      <div
                        key={chat.firebaseChatId}
                        onClick={() => handleChatSelect(chat)}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                          selectedChat?.firebaseChatId === chat.firebaseChatId ? 'bg-yellow-50 border-l-2 border-l-yellow-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="relative flex-shrink-0">
                            {chat.otherUser.avatar ? (
                              <img
                                src={chat.otherUser.avatar}
                                alt={chat.otherUser.username}
                                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-gray-200 flex items-center justify-center">
                                <FiUser className="w-4 h-4 text-blue-600" />
                              </div>
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="font-medium text-gray-900 text-sm truncate">
                                {chat.otherUser.username}
                              </h4>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatTime(chat.updatedAt)}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-600 truncate mb-1">
                              {chat.lastMessage?.text || 'No messages yet'}
                            </p>
                            
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-700 truncate flex-1">
                                {chat.listing.title}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="font-semibold text-yellow-600 whitespace-nowrap">
                                {formatPrice(chat.order?.amount || chat.listing.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface - 80% width */}
            <div className={`flex-1 flex flex-col w-full sm:w-4/5 lg:w-[80%] ${
              !showChatListMobile ? 'block' : 'hidden sm:flex'
            }`}>
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Mobile Back Button */}
                  <div className="sm:hidden border-b border-gray-200 p-3 bg-white">
                    <button
                      onClick={handleBackToChatList}
                      className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <FiChevronLeft className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Back to conversations</span>
                    </button>
                  </div>

                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-3 sm:p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {selectedChat.otherUser.avatar ? (
                            <img
                              src={selectedChat.otherUser.avatar}
                              alt={selectedChat.otherUser.username}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-sm object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-white shadow-sm flex items-center justify-center">
                              <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {selectedChat.otherUser.username}
                            </h3>
                            {selectedChat.order?.status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                selectedChat.order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                selectedChat.order.status === 'paid' ? 'bg-blue-100 text-blue-800' :
                                selectedChat.order.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedChat.order.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-600 flex-wrap">
                            <span className="font-medium truncate">{selectedChat.listing.title}</span>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <div className="flex items-center gap-1">
                              <FiDollarSign className="w-3 h-3 text-yellow-600" />
                              <span className="font-semibold text-gray-900">
                                {formatPrice(selectedChat.order?.amount || selectedChat.listing.price)}
                              </span>
                            </div>
                            {selectedChat.order?._id && (
                              <>
                                <span className="text-gray-400 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1">
                                  <FiCalendar className="w-3 h-3 text-gray-400" />
                                  <span className="text-gray-500 text-xs">Order #{selectedChat.order._id.slice(-6)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedChat.order?._id && (
                        <button
                          onClick={() => navigate(`/marketplace/orders/${selectedChat.order!._id}`)}
                          className="hidden sm:flex items-center px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors border border-yellow-200"
                        >
                          View Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="flex-1 min-h-0">
                    <FirebaseChatInterface
                      chatId={selectedChat.firebaseChatId}
                      currentUser={currentUser}
                      onSendMessage={() => toast.success('Message sent!')}
                      className="h-full"
                      orderId={selectedChat.order?._id}
                      otherUser={selectedChat.otherUser}
                    />
                  </div>
                </>
              ) : (
                // No chat selected view
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                  {chats.length === 0 ? (
                    <div className="text-center animate-fade-in">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-yellow-200 animate-float">
                        <FiMessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">No conversations yet</h3>
                      <p className="text-gray-600 max-w-sm sm:max-w-md mb-6 sm:mb-7 text-sm leading-relaxed">
                        When you place an order or receive an offer, your conversations will appear here.
                        Start exploring listings to connect with sellers!
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => navigate('/marketplace')}
                          className="px-4 py-2.5 sm:px-5 sm:py-3 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow"
                        >
                          <FiShoppingBag className="w-4 h-4 mr-2" />
                          Browse Marketplace
                        </button>
                        <button
                          onClick={handleRefreshChats}
                          className="px-4 py-2.5 sm:px-5 sm:py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center animate-fade-in">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-gray-200 animate-float">
                        <FiMessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Select a conversation</h3>
                      <p className="text-gray-600 max-w-sm sm:max-w-md mb-6 sm:mb-7 text-sm">
                        Choose a conversation from the list to start messaging
                      </p>
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="px-4 py-2.5 text-sm text-yellow-600 hover:text-yellow-700 transition-colors font-medium"
                      >
                        Browse Marketplace →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default Messages;