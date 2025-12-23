// src/pages/Messages.tsx - FIXED LOADING & YELLOW THEME VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatList, { Chat } from '../../components/chat/ChatList';
import FirebaseChatInterface from '../../components/chat/FirebaseChatInterface';
import MarketplaceLayout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiRefreshCw, FiShoppingBag, FiUser } from 'react-icons/fi';

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

  // ✅ FIX: Initialize currentUser from auth context immediately
  useEffect(() => {
    if (authUser) {
      setCurrentUser({
        id: authUser.id || authUser._id,
        username: authUser.username || 'User',
        email: authUser.email || '',
        avatar: authUser.avatar,
        role: authUser.role
      });
      setLoading(false); // ✅ Set loading false immediately if authUser exists
    }
  }, [authUser]);

  // ✅ FIX: Fetch user details only if not in auth context
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Skip if already set from auth context
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
          // Fallback to token parsing
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
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    if (!currentUser && !authUser) {
      fetchCurrentUser();
    }
  }, [authUser, currentUser, navigate]);

  // ✅ FIX: Fetch user chats with proper error handling
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
          lastMessage: chat.lastMessage,
          unreadCount: chat.unreadCount || 0,
          updatedAt: chat.updatedAt || chat.lastMessageAt || new Date().toISOString()
        }));
        
        setChats(transformedChats);
        
        // Calculate total unread messages
        const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
        
        // Update page title
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) Messages - Marketplace`;
        } else {
          document.title = 'Messages - Marketplace';
        }
      } else {
        throw new Error('Failed to fetch chats');
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load conversations');
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

  // ✅ FIX: Handle URL parameters - simplified
  useEffect(() => {
    if (chatsLoading || !chats.length) return;
    
    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');
    
    if (!urlChatId && !orderId) return;
    
    let foundChat: Chat | null = null;
    
    if (urlChatId) {
      foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
    } else if (orderId) {
      foundChat = chats.find(c => c.order?._id === orderId) || null;
    }
    
    if (foundChat && foundChat.firebaseChatId !== selectedChat?.firebaseChatId) {
      setSelectedChat(foundChat);
    }
  }, [chats, chatsLoading, searchParams, selectedChat]);

  // Handle chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    setSelectedChat(chat);
  }, [selectedChat]);

  const handleSendMessage = async () => {
    toast.success('Message sent!');
  };

  const handleRefreshChats = () => {
    fetchChats();
  };

  // ✅ FIX: Yellow theme status colors
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // ✅ FIX: Render empty state with yellow theme
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-4 border border-yellow-200">
        <FiMessageSquare className="w-10 h-10 text-yellow-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
      <p className="text-gray-600 max-w-sm mb-6 text-sm">
        Start a conversation by placing an order or contacting a seller
      </p>
      <button
        onClick={() => navigate('/marketplace')}
        className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center shadow-sm"
      >
        <FiShoppingBag className="w-4 h-4 mr-2" />
        Browse Marketplace
      </button>
    </div>
  );

  // ✅ FIX: Loading state with yellow spinner
  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header with yellow theme */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="mt-1 text-gray-600 text-sm">
                  Communicate with buyers and sellers
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
                <button
                  onClick={handleRefreshChats}
                  disabled={chatsLoading}
                  className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className={`w-4 h-4 mr-2 ${chatsLoading ? 'animate-spin text-yellow-600' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg border border-gray-200 h-[calc(100vh-160px)] flex flex-col lg:flex-row overflow-hidden">
            {/* Chat List - Left Panel */}
            <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {chats.length} total
                    </p>
                  </div>
                  {chatsLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {chatsLoading && chats.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">No conversations</p>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="mt-3 px-3 py-1.5 text-sm text-yellow-600 hover:text-yellow-700 transition-colors"
                    >
                      Browse Listings
                    </button>
                  </div>
                ) : (
                  <ChatList
                    chats={chats}
                    currentChatId={selectedChat?.firebaseChatId || null}
                    onChatSelect={handleChatSelect}
                    loading={chatsLoading}
                  />
                )}
              </div>
            </div>

            {/* Chat Interface - Right Panel */}
            <div className="flex-1 flex flex-col">
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Chat Header with yellow accent */}
                  <div className="border-b border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedChat.otherUser.avatar ? (
                          <img
                            src={selectedChat.otherUser.avatar}
                            alt={selectedChat.otherUser.username}
                            className="w-10 h-10 rounded-full border border-gray-300 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                            <FiUser className="w-5 h-5 text-yellow-600" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {selectedChat.otherUser.username}
                            </h3>
                            {selectedChat.order?.status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedChat.order.status)}`}>
                                {selectedChat.order.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 truncate">
                            <span className="truncate">{selectedChat.listing.title}</span>
                            <span>•</span>
                            <span className="font-medium text-yellow-700">{formatPrice(selectedChat.order?.amount || selectedChat.listing.price)}</span>
                            {selectedChat.order?._id && (
                              <>
                                <span>•</span>
                                <span className="text-gray-500">Order #{selectedChat.order._id.slice(-6)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedChat.order?._id && (
                        <button
                          onClick={() => navigate(`/marketplace/orders/${selectedChat.order!._id}`)}
                          className="px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors whitespace-nowrap border border-yellow-200"
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
                // No chat selected view with yellow theme
                <div className="flex-1 flex items-center justify-center p-6">
                  {chats.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-200">
                        <FiMessageSquare className="w-8 h-8 text-yellow-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-600 max-w-sm text-sm mb-6">
                        Choose a conversation from the list to start messaging
                      </p>
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="px-4 py-2 text-sm text-yellow-600 hover:text-yellow-700 transition-colors"
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