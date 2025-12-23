// src/pages/Messages.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatList, { Chat } from '../../components/chat/ChatList';
import FirebaseChatInterface from '../../components/chat/FirebaseChatInterface';
import MarketplaceLayout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Types
interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
  role?: 'buyer' | 'seller' | 'admin';
}

interface Order {
  _id: string;
  amount: number;
  status: string;
  listingTitle?: string;
  createdAt: string;
}

const Messages: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const hasProcessedUrlChat = useRef(false);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        if (authUser) {
          setCurrentUser({
            id: authUser.id || authUser._id,
            username: authUser.username || 'User',
            email: authUser.email || '',
            avatar: authUser.avatar,
            role: authUser.role
          });
          return;
        }

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
      }
    };

    fetchCurrentUser();
  }, [authUser, navigate]);

  // Fetch user chats
  const fetchChats = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setChatsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3000/marketplace/chat/my-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
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
        
        const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
        
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) Messages - Marketplace`;
        } else {
          document.title = 'Messages - Marketplace';
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setChatsLoading(false);
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Initial fetch
  useEffect(() => {
    if (currentUser?.id) {
      fetchChats();
    }
  }, [currentUser?.id, fetchChats]);

  // Handle URL parameters
  useEffect(() => {
    if (chatsLoading || chats.length === 0 || hasProcessedUrlChat.current) return;

    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');

    if (urlChatId || orderId) {
      let foundChat: Chat | null = null;

      if (urlChatId) {
        foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
      } else if (orderId) {
        foundChat = chats.find(c => c.order?._id === orderId) || null;
      }

      if (foundChat) {
        setSelectedChat(foundChat);
      }
      hasProcessedUrlChat.current = true;
    }
  }, [chats, chatsLoading, searchParams]);

  // Handle chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    
    setSelectedChat(chat);
    navigate(`/messages?chat=${chat.firebaseChatId}`, { replace: true });
  }, [selectedChat, navigate]);

  const handleSendMessage = async (message: string) => {
    toast.success('Message sent!');
  };

  const handleRefreshChats = () => {
    fetchChats();
    toast.success('Conversations refreshed');
  };

  // Filter chats based on search
  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      chat.otherUser.username.toLowerCase().includes(query) ||
      chat.listing.title.toLowerCase().includes(query) ||
      (chat.lastMessage?.content?.toLowerCase() || '').includes(query)
    );
  });

  // Get avatar fallback
  const getAvatarFallback = (username: string): string => {
    if (!username || username.trim().length === 0) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-32 h-32 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center">
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
      <p className="text-gray-600 text-center mb-6 max-w-sm">
        When you place an order or receive an offer, your conversations will appear here.
      </p>
      <button
        onClick={() => navigate('/marketplace')}
        className="px-5 py-2.5 bg-[#1DBF73] text-white font-medium rounded-md hover:bg-[#19a463] transition-colors"
      >
        Browse Marketplace
      </button>
    </div>
  );

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DBF73] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="mt-1 text-gray-600">
                  Manage your conversations with buyers and sellers
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
                <button
                  onClick={handleRefreshChats}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow border border-gray-200 h-[calc(100vh-200px)] flex overflow-hidden">
            {/* Chat List - Left Sidebar */}
            <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col">
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1DBF73] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Chat List Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Conversations
                  </h2>
                  <span className="text-xs text-gray-500">
                    {filteredChats.length} of {chats.length}
                  </span>
                </div>
              </div>

              {/* Chat List Content */}
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1DBF73] mx-auto"></div>
                    <p className="mt-3 text-sm text-gray-500">Loading conversations...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  searchQuery ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500 text-sm">No conversations match your search</p>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500 text-sm">No conversations yet</p>
                    </div>
                  )
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.firebaseChatId}
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedChat?.firebaseChatId === chat.firebaseChatId ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleChatSelect(chat)}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {chat.otherUser.avatar ? (
                              <img
                                src={chat.otherUser.avatar}
                                alt={chat.otherUser.username}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#1DBF73] flex items-center justify-center text-white font-semibold">
                                {getAvatarFallback(chat.otherUser.username)}
                              </div>
                            )}
                            {chat.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>

                          {/* Chat Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {chat.otherUser.username}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {new Date(chat.updatedAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-1">
                              {chat.listing.title}
                            </p>
                            {chat.lastMessage && (
                              <p className="text-xs text-gray-500 truncate">
                                {chat.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order Status Badge */}
                        {chat.order && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              chat.order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              chat.order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              chat.order.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {chat.order.status.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface - Main Content */}
            <div className="flex-1 flex flex-col">
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {selectedChat.otherUser.avatar ? (
                          <img
                            src={selectedChat.otherUser.avatar}
                            alt={selectedChat.otherUser.username}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#1DBF73] flex items-center justify-center text-white font-semibold">
                            {getAvatarFallback(selectedChat.otherUser.username)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {selectedChat.otherUser.username}
                            {selectedChat.order?.status && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                selectedChat.order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedChat.order.status.replace('_', ' ')}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="truncate max-w-xs">{selectedChat.listing.title}</span>
                            <span className="mx-2">•</span>
                            <span className="font-medium">${selectedChat.order?.amount || selectedChat.listing.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {selectedChat.order?._id && (
                          <button
                            onClick={() => navigate(`/orders/${selectedChat.order!._id}`)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            View Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-0">
                      <FirebaseChatInterface
                        chatId={selectedChat.firebaseChatId}
                        currentUser={currentUser}
                        onSendMessage={handleSendMessage}
                        className="h-full"
                        orderId={selectedChat.order?._id}
                        otherUser={selectedChat.otherUser}
                      />
                    </div>
                  </div>
                </>
              ) : (
                // No chat selected view
                <div className="flex-1 flex items-center justify-center p-8">
                  {chats.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-600 text-sm mb-6">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Tips */}
          <div className="mt-6 md:hidden">
            <p className="text-sm text-gray-500 text-center">
              💡 Tap on a conversation to view messages
            </p>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default Messages;