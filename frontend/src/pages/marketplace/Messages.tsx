// src/pages/Messages.tsx - FIXED WITH ANIMATIONS & CSS
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatList, { Chat } from '../../components/chat/ChatList';
import FirebaseChatInterface from '../../components/chat/FirebaseChatInterface';
import MarketplaceLayout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiRefreshCw, FiShoppingBag, FiUser, FiChevronLeft, FiMail } from 'react-icons/fi';

// Types
interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
  role?: 'buyer' | 'seller' | 'admin';
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
  const [initialLoad, setInitialLoad] = useState(true);

  // Initialize currentUser from auth context
  useEffect(() => {
    if (authUser) {
      setCurrentUser({
        id: authUser.id || authUser._id,
        username: authUser.username || 'User',
        email: authUser.email || '',
        avatar: authUser.avatar,
        role: authUser.role
      });
    }
  }, [authUser]);

  // ✅ FIX: Fetch user details
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
        } else {
          // Try to parse token
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUser({
              id: payload.userId || payload.id,
              username: payload.username || 'User',
              email: payload.email || '',
              role: payload.role
            });
          } catch (parseError) {
            console.error('Error parsing token:', parseError);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    if (!currentUser && !authUser) {
      fetchCurrentUser();
    } else if (authUser) {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [authUser, currentUser, navigate]);

  // ✅ FIX: Fetch user chats
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

      const data = await response.json();
      
      if (response.ok && data.data) {
        const transformedChats: Chat[] = data.data.map((chat: any) => ({
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
        
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) Messages - Marketplace`;
        } else {
          document.title = 'Messages - Marketplace';
        }
      } else {
        console.error('Failed to fetch chats:', data);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setChatsLoading(false);
    }
  }, [currentUser?.id]);

  // ✅ FIX: Fetch chats when currentUser is available
  useEffect(() => {
    if (currentUser?.id && !loading) {
      fetchChats();
    }
  }, [currentUser?.id, loading, fetchChats]);

  // ✅ FIX: Handle URL parameters
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
      if (window.innerWidth < 1024) {
        setShowChatListMobile(false);
      }
    }
  }, [chats, chatsLoading, searchParams, selectedChat]);

  // Handle chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    setSelectedChat(chat);
    if (window.innerWidth < 1024) {
      setShowChatListMobile(false);
    }
  }, [selectedChat]);

  const handleSendMessage = async () => {
    toast.success('Message sent!');
  };

  const handleRefreshChats = () => {
    fetchChats();
    toast.success('Refreshed conversations');
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'delivered': return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Format price
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  // Toggle chat list on mobile
  const toggleChatListMobile = () => {
    setShowChatListMobile(!showChatListMobile);
  };

  // Back to chat list on mobile
  const handleBackToChatList = () => {
    setShowChatListMobile(true);
  };

  // ✅ FIX: Render chat item
  const renderChatItem = (chat: Chat) => (
    <div
      key={chat.firebaseChatId}
      onClick={() => handleChatSelect(chat)}
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
        selectedChat?.firebaseChatId === chat.firebaseChatId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          {chat.otherUser.avatar ? (
            <img
              src={chat.otherUser.avatar}
              alt={chat.otherUser.username}
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-white shadow-sm flex items-center justify-center">
              <FiUser className="w-6 h-6 text-blue-600" />
            </div>
          )}
          {chat.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {chat.unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {chat.otherUser.username}
            </h4>
            <span className="text-xs text-gray-500">
              {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 truncate mb-1">
            {chat.lastMessage?.text || 'No messages yet'}
          </p>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-900 truncate">
              {chat.listing.title}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-semibold text-blue-600">
              {formatPrice(chat.order?.amount || chat.listing.price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ✅ FIX: Render empty state
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-5 border border-gray-200 animate-float">
        <FiMessageSquare className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3 animate-fade-in">
        No conversations yet
      </h3>
      <p className="text-gray-600 max-w-md mb-7 text-sm leading-relaxed animate-fade-in delay-100">
        When you place an order or receive an offer, your conversations will appear here.
        Start exploring listings to connect with sellers!
      </p>
      <div className="flex gap-3 animate-fade-in delay-200">
        <button
          onClick={() => navigate('/marketplace')}
          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-all duration-200 flex items-center shadow-sm hover:shadow"
        >
          <FiShoppingBag className="w-4 h-4 mr-2" />
          Browse Marketplace
        </button>
        <button
          onClick={handleRefreshChats}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          Refresh
        </button>
      </div>
    </div>
  );

  // Loading state
  if (loading && initialLoad) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm animate-pulse">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 animate-fade-in">Messages</h1>
                <p className="mt-1 text-gray-500 text-sm animate-fade-in delay-100">
                  Communicate with buyers and sellers
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 animate-bounce">
                    {unreadCount} unread
                  </span>
                )}
                <button
                  onClick={handleRefreshChats}
                  disabled={chatsLoading}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
                >
                  <FiRefreshCw className={`w-4 h-4 mr-2 ${chatsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl border border-gray-200 h-[calc(100vh-180px)] flex overflow-hidden shadow-sm">
            {/* Chat List - Left Panel */}
            <div className={`w-full lg:w-1/3 xl:w-1/4 border-r border-gray-200 flex flex-col transition-all duration-300 ${!showChatListMobile && selectedChat ? 'hidden lg:flex' : 'flex'}`}>
              <div className="p-5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {chats.length} total • {unreadCount} unread
                    </p>
                  </div>
                  {chatsLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-900"></div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto chat-scrollbar">
                {chatsLoading && chats.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiMail className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm mb-3">No conversations yet</p>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                    >
                      Browse Marketplace
                    </button>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    {chats.map(chat => renderChatItem(chat))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface - Right Panel */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${showChatListMobile && selectedChat ? 'hidden lg:flex' : 'flex'}`}>
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Mobile Back Button */}
                  <div className="lg:hidden border-b border-gray-200 p-4 bg-white">
                    <button
                      onClick={handleBackToChatList}
                      className="flex items-center text-gray-700 hover:text-gray-900 transition-all duration-200 animate-fade-in"
                    >
                      <FiChevronLeft className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Back to conversations</span>
                    </button>
                  </div>

                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-5 bg-white animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {selectedChat.otherUser.avatar ? (
                            <img
                              src={selectedChat.otherUser.avatar}
                              alt={selectedChat.otherUser.username}
                              className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-white shadow-sm flex items-center justify-center">
                              <FiUser className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                          {selectedChat.order?.status && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border-2 border-white flex items-center justify-center animate-pulse">
                              <div className={`w-2 h-2 rounded-full ${
                                selectedChat.order.status === 'completed' ? 'bg-green-500' :
                                selectedChat.order.status === 'paid' ? 'bg-blue-500' :
                                selectedChat.order.status === 'in_progress' ? 'bg-yellow-500' :
                                'bg-gray-400'
                              }`}></div>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-base truncate">
                              {selectedChat.otherUser.username}
                            </h3>
                            {selectedChat.order?.status && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedChat.order.status)}`}>
                                {selectedChat.order.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium truncate">{selectedChat.listing.title}</span>
                            <span className="text-gray-400">•</span>
                            <span className="font-semibold text-gray-900">{formatPrice(selectedChat.order?.amount || selectedChat.listing.price)}</span>
                            {selectedChat.order?._id && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500 text-xs">Order #{selectedChat.order._id.slice(-8)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedChat.order?._id && (
                        <button
                          onClick={() => navigate(`/marketplace/orders/${selectedChat.order!._id}`)}
                          className="hidden lg:flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 border border-gray-300 hover:shadow-sm"
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
                      onSendMessage={handleSendMessage}
                      className="h-full"
                      orderId={selectedChat.order?._id}
                      otherUser={selectedChat.otherUser}
                    />
                  </div>
                </>
              ) : (
                // No chat selected view
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  {chats.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <>
                      <div className="w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mb-6 border border-gray-200 animate-float">
                        <FiMessageSquare className="w-16 h-16 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3 animate-fade-in">
                        Select a conversation
                      </h3>
                      <p className="text-gray-600 max-w-md text-center mb-8 text-sm animate-fade-in delay-100">
                        Choose a conversation from the list to start messaging.
                        All your order-related chats are listed on the left.
                      </p>
                      <div className="flex gap-4 animate-fade-in delay-200">
                        <button
                          onClick={() => navigate('/marketplace')}
                          className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-all duration-200 flex items-center shadow-sm hover:shadow"
                        >
                          <FiShoppingBag className="w-4 h-4 mr-2" />
                          Browse Marketplace
                        </button>
                        <button
                          onClick={handleRefreshChats}
                          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          Refresh
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        
        .delay-100 {
          animation-delay: 100ms;
        }
        
        .delay-200 {
          animation-delay: 200ms;
        }
        
        .delay-300 {
          animation-delay: 300ms;
        }
        
        .chat-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
        
        .chat-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>
    </MarketplaceLayout>
  );
};

export default Messages;