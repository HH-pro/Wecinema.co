// src/pages/Messages.tsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const { user: authUser, logout } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showChatListMobile, setShowChatListMobile] = useState(true);
  
  const hasFetchedChats = useRef(false);
  const isInitialMount = useRef(true);

  console.log('Messages Page - Current state:', {
    chatsCount: chats.length,
    chatsLoading,
    currentUser: currentUser?.id,
    authUser: authUser?.id,
    selectedChatId: selectedChat?.firebaseChatId,
    hasFetched: hasFetchedChats.current
  });

  // ✅ FIX: Handle authentication and user initialization
  useEffect(() => {
    console.log('🔥 Auth user effect triggered:', authUser);
    
    const initializeUser = async () => {
      try {
        // If we have auth user from context, use it
        if (authUser) {
          setCurrentUser({
            id: authUser.id || authUser._id,
            username: authUser.username || 'User',
            email: authUser.email || '',
            avatar: authUser.avatar,
            role: authUser.role
          });
          setLoading(false);
          console.log('✅ User set from auth context');
          return;
        }

        // Try to get user from token/localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('❌ No token found, redirecting to login');
          navigate('/login');
          return;
        }

        // Fetch user from API
        console.log('🌐 Fetching user from API...');
        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.status === 401) {
          console.log('❌ Token expired or invalid');
          logout?.();
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ User data received:', userData.username);
          setCurrentUser({
            id: userData._id || userData.id,
            username: userData.username,
            email: userData.email,
            avatar: userData.avatar,
            role: userData.role
          });
        } else {
          throw new Error('Failed to fetch user');
        }
      } catch (error) {
        console.error('❌ Error initializing user:', error);
        toast.error('Please login to continue');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [authUser, navigate, logout]);

  // ✅ FIX: Fetch chats with proper cleanup and race condition prevention
  const fetchChats = useCallback(async () => {
    if (!currentUser?.id) {
      console.log('⏳ Waiting for currentUser ID...');
      return;
    }

    // Prevent multiple simultaneous fetches
    if (chatsLoading) {
      console.log('⏳ Chat fetch already in progress');
      return;
    }

    console.log('🔄 Starting fetchChats for user:', currentUser.id);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      setChatsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found');
        toast.error('Please login again');
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:3000/marketplace/chat/my-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      console.log('📥 Chat fetch response:', response.status, response.statusText);
      
      if (response.status === 401) {
        console.log('❌ Unauthorized - token expired');
        logout?.();
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch chats: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Chat fetch data received');
      
      // Handle different response formats
      const chatsData = Array.isArray(data) 
        ? data 
        : data?.data || data?.chats || [];
      
      console.log(`📊 Processing ${chatsData.length} chats`);
      
      const transformedChats: Chat[] = chatsData.map((chat: any, index: number) => {
        // Determine other user (not current user)
        const otherUser = chat.participants?.find((p: any) => 
          p._id !== currentUser.id && p.id !== currentUser.id
        ) || chat.otherUser || {};

        return {
          firebaseChatId: chat.firebaseChatId || chat.chatId || chat._id || `chat-${index}`,
          otherUser: {
            id: otherUser._id || otherUser.id || 'unknown',
            username: otherUser.username || 'Unknown User',
            avatar: otherUser.avatar || '',
            email: otherUser.email || ''
          },
          listing: {
            id: chat.listing?._id || chat.listingId || 'unknown',
            title: chat.listing?.title || chat.listingTitle || 'Unknown Listing',
            price: chat.listing?.price || chat.price || 0,
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
            text: 'Start a conversation',
            senderId: '',
            timestamp: new Date().toISOString()
          },
          unreadCount: chat.unreadCount || chat.unreadMessages || 0,
          updatedAt: chat.updatedAt || chat.lastMessageAt || new Date().toISOString()
        };
      });

      // Sort by last message time (newest first)
      transformedChats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      console.log('✅ Setting chats:', transformedChats.length);
      setChats(transformedChats);
      hasFetchedChats.current = true;

      // Calculate unread count
      const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
      console.log(`📨 Total unread: ${totalUnread}`);

      // Auto-select chat based on URL or first chat
      const urlChatId = searchParams.get('chat');
      const orderId = searchParams.get('order');
      let chatToSelect = null;

      if (urlChatId) {
        chatToSelect = transformedChats.find(c => c.firebaseChatId === urlChatId);
      } else if (orderId) {
        chatToSelect = transformedChats.find(c => c.order?._id === orderId);
      }

      if (chatToSelect) {
        console.log('🎯 Setting selected chat from URL:', chatToSelect.otherUser.username);
        setSelectedChat(chatToSelect);
      } else if (transformedChats.length > 0 && !selectedChat) {
        console.log('🤖 Auto-selecting first chat');
        setSelectedChat(transformedChats[0]);
      }

      if (transformedChats.length > 0) {
        toast.success(`Loaded ${transformedChats.length} conversations`);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('❌ Request timeout');
        toast.error('Request timeout. Please try again.');
      } else {
        console.error('❌ Error fetching chats:', error);
        console.error('Error details:', error.message);
        toast.error(error.message || 'Failed to load conversations');
      }
    } finally {
      setChatsLoading(false);
      console.log('🏁 Chat loading complete');
    }
  }, [currentUser?.id, selectedChat, navigate, logout, searchParams]);

  // ✅ FIX: Fetch chats when currentUser is available
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    console.log('📡 useEffect for chats triggered', {
      currentUserId: currentUser?.id,
      loading,
      hasFetched: hasFetchedChats.current
    });
    
    if (currentUser?.id && !loading && !hasFetchedChats.current) {
      console.log('🚀 Fetching chats now...');
      fetchChats();
    }
  }, [currentUser?.id, loading, fetchChats]);

  // ✅ FIX: Handle URL parameters after chats are loaded
  useEffect(() => {
    if (chatsLoading || chats.length === 0) {
      return;
    }

    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');
    
    console.log('🔗 URL params processing:', { urlChatId, orderId, chatsCount: chats.length });

    if (!urlChatId && !orderId) {
      return;
    }

    let foundChat: Chat | null = null;
    
    if (urlChatId) {
      foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
    } else if (orderId) {
      foundChat = chats.find(c => c.order?._id === orderId) || null;
    }
    
    if (foundChat && foundChat.firebaseChatId !== selectedChat?.firebaseChatId) {
      console.log('🎯 Setting selected chat from URL:', foundChat.otherUser.username);
      setSelectedChat(foundChat);
      if (window.innerWidth < 640) {
        setShowChatListMobile(false);
      }
    }
  }, [chats, chatsLoading, searchParams, selectedChat]);

  // Chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    console.log('👆 Chat selected:', chat.otherUser.username);
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    
    setSelectedChat(chat);
    
    // Mark as read locally
    setChats(prevChats => 
      prevChats.map(c => 
        c.firebaseChatId === chat.firebaseChatId 
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
    
    // Update unread count
    setUnreadCount(prev => Math.max(0, prev - chat.unreadCount));
    
    if (window.innerWidth < 640) {
      setShowChatListMobile(false);
    }
  }, [selectedChat]);

  const handleRefreshChats = () => {
    console.log('🔄 Manual refresh triggered');
    hasFetchedChats.current = false;
    fetchChats();
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
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 24 * 60) return `${Math.floor(diffMins / 60)}h ago`;
      return `${Math.floor(diffMins / (60 * 24))}d ago`;
    } catch (error) {
      return 'Recently';
    }
  };

  // Toggle chat list on mobile
  const toggleChatListMobile = () => {
    setShowChatListMobile(!showChatListMobile);
  };

  const handleBackToChatList = () => {
    setShowChatListMobile(true);
  };

  // Load test chats for debugging
  const loadTestChats = () => {
    console.log('🧪 Loading test chats for debugging');
    const testChats: Chat[] = [
      {
        firebaseChatId: 'test-chat-1',
        otherUser: {
          id: 'user-1',
          username: 'John Doe',
          email: 'john@example.com',
          avatar: ''
        },
        listing: {
          id: 'listing-1',
          title: 'Website Design Service',
          price: 2999,
          mediaUrls: []
        },
        order: {
          _id: 'order-123',
          amount: 2999,
          status: 'in_progress',
          listingTitle: 'Website Design Service',
          createdAt: new Date().toISOString()
        },
        lastMessage: {
          text: 'Hello, when will the design be ready?',
          senderId: 'user-1',
          timestamp: new Date().toISOString()
        },
        unreadCount: 2,
        updatedAt: new Date().toISOString()
      },
      {
        firebaseChatId: 'test-chat-2',
        otherUser: {
          id: 'user-2',
          username: 'Jane Smith',
          email: 'jane@example.com',
          avatar: ''
        },
        listing: {
          id: 'listing-2',
          title: 'Logo Design Package',
          price: 1499,
          mediaUrls: []
        },
        order: {
          _id: 'order-456',
          amount: 1499,
          status: 'completed',
          listingTitle: 'Logo Design Package',
          createdAt: new Date().toISOString()
        },
        lastMessage: {
          text: 'Thank you for the great work!',
          senderId: 'current-user',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    setChats(testChats);
    if (!selectedChat) {
      setSelectedChat(testChats[0]);
    }
    toast.success('Loaded test conversations for debugging');
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

  // If not authenticated
  if (!currentUser) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-6">Please login to view messages</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white">
        {/* Debug button - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={loadTestChats}
            className="fixed bottom-4 right-4 z-50 px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg shadow-lg hover:bg-red-600"
          >
            Load Test Chats
          </button>
        )}

        {/* CSS Styles */}
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
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
        `}</style>

        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h1>
              <p className="mt-1 text-gray-500 text-xs sm:text-sm">
                {chats.length} conversations • {unreadCount} unread
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
                <span className="sm:hidden">⟳</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-6 h-[calc(100vh-120px)]">
          <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl h-full flex overflow-hidden">
            {/* Chat List */}
            <div className={`w-full sm:w-1/5 lg:w-[20%] border-r border-gray-200 flex flex-col absolute sm:relative inset-0 z-10 bg-white transition-transform duration-300 ${
              showChatListMobile ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
            }`}>
              {/* Chat List Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">Conversations</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chats.length} found
                    </p>
                  </div>
                  {chatsLoading && (
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-gray-300 border-t-yellow-500"></div>
                  )}
                </div>
              </div>
              
              {/* Chat List Items */}
              <div className="flex-1 overflow-y-auto chat-scrollbar">
                {chatsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-yellow-500 mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-xs">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-6 text-center animate-fade-in">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FiMail className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No conversations found</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="w-full px-3 py-1.5 text-xs bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Browse Marketplace
                      </button>
                      <button
                        onClick={handleRefreshChats}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
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
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-gray-200 flex items-center justify-center">
                                <FiUser className="w-4 h-4 text-blue-600" />
                              </div>
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                                {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
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
                              {chat.lastMessage?.text || 'Start a conversation'}
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

            {/* Chat Interface */}
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
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
                              }}
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
                      onSendMessage={() => {
                        toast.success('Message sent!');
                        // Refresh chats to update last message
                        setTimeout(() => fetchChats(), 1000);
                      }}
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
                        Start by browsing the marketplace and placing an order.
                        Your conversations will appear here.
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
                        Choose a conversation from the list on the left
                      </p>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {chats.length} conversations available
                      </div>
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