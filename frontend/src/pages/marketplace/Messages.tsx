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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const hasProcessedUrlChat = useRef(false);
  const lastChatIdRef = useRef<string | null>(null);
  const lastChatsLengthRef = useRef<number>(0);

  // Filter chats based on search
  const filteredChats = chats.filter(chat => 
    chat.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
  const fetchChats = useCallback(async (showToast = false) => {
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
            mediaUrls: chat.listing?.mediaUrls || [],
            images: chat.listing?.images || []
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
        
        // Sort chats by last message time (newest first)
        transformedChats.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        // Only update if chats actually changed
        const chatsChanged = JSON.stringify(transformedChats) !== JSON.stringify(chats);
        if (chatsChanged) {
          setChats(transformedChats);
          lastChatsLengthRef.current = transformedChats.length;
          
          if (selectedChat && transformedChats.length > lastChatsLengthRef.current) {
            const chatStillExists = transformedChats.some(c => c.firebaseChatId === selectedChat.firebaseChatId);
            if (!chatStillExists) {
              setSelectedChat(null);
            }
          }
        }
        
        const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
        
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) Messages - Marketplace`;
        } else {
          document.title = 'Messages - Marketplace';
        }

        if (showToast) {
          toast.success('Conversations updated');
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      if (showToast) {
        toast.error('Failed to refresh conversations');
      }
    } finally {
      setChatsLoading(false);
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  }, [currentUser?.id, chats, selectedChat]);

  // Initial fetch only
  useEffect(() => {
    if (!currentUser?.id) return;

    fetchChats(false);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentUser?.id]);

  // Handle URL parameters and auto-select chat
  useEffect(() => {
    const handleUrlChat = () => {
      if (hasProcessedUrlChat.current || chatsLoading || !chats.length) return;
      
      const urlChatId = searchParams.get('chat');
      const orderId = searchParams.get('order');
      
      if (!urlChatId && !orderId) {
        hasProcessedUrlChat.current = true;
        return;
      }
      
      if (urlChatId && urlChatId === lastChatIdRef.current) {
        hasProcessedUrlChat.current = true;
        return;
      }
      
      hasProcessedUrlChat.current = true;
      lastChatIdRef.current = urlChatId;
      
      let foundChat: Chat | null = null;
      
      if (urlChatId) {
        foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
      } else if (orderId) {
        foundChat = chats.find(c => c.order?._id === orderId) || null;
      }
      
      if (foundChat) {
        setSelectedChat(foundChat);
        if (urlChatId) {
          setSearchParams({ chat: urlChatId }, { replace: true });
        }
      }
    };

    handleUrlChat();
  }, [chats, chatsLoading, searchParams, setSearchParams]);

  // Reset URL processing flag when leaving page
  useEffect(() => {
    return () => {
      hasProcessedUrlChat.current = false;
      lastChatIdRef.current = null;
    };
  }, []);

  // Handle chat selection
  const handleChatSelect = useCallback((chat: Chat) => {
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    
    setSelectedChat(chat);
    setSearchParams({ chat: chat.firebaseChatId }, { replace: true });
    lastChatIdRef.current = chat.firebaseChatId;
  }, [selectedChat, setSearchParams]);

  const handleSendMessage = async (message: string) => {
    toast.success('Message sent!');
  };

  const handleRefreshChats = () => {
    fetchChats(true);
  };

  // Get first letter of name for avatar
  const getAvatarFallback = (username: string): string => {
    if (!username || username.trim().length === 0) return 'U';
    return username.charAt(0).toUpperCase();
  };

  // Get avatar color based on user ID
  const getAvatarColor = (userId: string): string => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-teal-500 to-teal-600'
    ];
    
    if (!userId) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Render avatar with fallback
  const renderAvatar = (chat: Chat, size: 'sm' | 'md' | 'lg' = 'md') => {
    const { otherUser } = chat;
    const avatarColor = getAvatarColor(otherUser.id);
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg'
    };
    
    if (otherUser.avatar) {
      return (
        <div className="relative">
          <img
            src={otherUser.avatar}
            alt={otherUser.username}
            className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-sm object-cover`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.avatar-fallback');
                if (fallback) {
                  (fallback as HTMLElement).style.display = 'flex';
                }
              }
            }}
          />
          <div 
            className={`${avatarColor} ${sizeClasses[size]} absolute inset-0 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold avatar-fallback hidden`}
          >
            {getAvatarFallback(otherUser.username)}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`${avatarColor} ${sizeClasses[size]} rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold`}
      >
        {getAvatarFallback(otherUser.username)}
      </div>
    );
  };

  // Render mini listing image
  const renderListingImage = (chat: Chat) => {
    const images = chat.listing.images || chat.listing.mediaUrls || [];
    
    if (images.length > 0) {
      return (
        <div className="w-10 h-10 rounded-md overflow-hidden border border-gray-200">
          <img
            src={images[0]}
            alt={chat.listing.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('bg-gray-100');
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center">
        <svg className="w-16 h-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">No conversations yet</h3>
      <p className="text-gray-600 max-w-md mb-8">
        When you place an order or receive an offer, your conversations will appear here.
        Start exploring listings to connect with sellers!
      </p>
      <div className="space-x-4">
        <button
          onClick={() => navigate('/marketplace')}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-sm"
        >
          Browse Marketplace
        </button>
        <button
          onClick={handleRefreshChats}
          className="px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );

  // Render loading state
  if (loading && isInitialMount.current) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div className="mb-3 sm:mb-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Messages</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All messages are read'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefreshChats}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Fiverr Style Layout */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-140px)] sm:h-[calc(100vh-160px)] flex flex-col sm:flex-row overflow-hidden">
            {/* Left Sidebar - Conversations List */}
            <div className={`${selectedChat ? 'hidden sm:flex' : 'flex'} sm:w-96 flex-col border-r border-gray-200 flex-shrink-0`}>
              {/* Search Bar */}
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                    <p className="mt-3 text-gray-500">Loading conversations...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center">
                    {searchQuery ? (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500">No conversations found for "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-3 text-sm text-yellow-600 hover:text-yellow-700"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-gray-500">No conversations yet</p>
                        <button
                          onClick={() => navigate('/marketplace')}
                          className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          Start Shopping
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.firebaseChatId}
                        onClick={() => handleChatSelect(chat)}
                        className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedChat?.firebaseChatId === chat.firebaseChatId ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {renderAvatar(chat, 'md')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 text-sm truncate">
                                {chat.otherUser.username}
                              </h3>
                              <span className="text-xs text-gray-500">
                                {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600 truncate">
                                {chat.lastMessage?.text || 'No messages yet'}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-2 space-x-2">
                              {renderListingImage(chat)}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{chat.listing.title}</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500">${chat.listing.price}</p>
                                  {chat.order?.status && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                      chat.order.status === 'paid' 
                                        ? 'bg-green-100 text-green-800'
                                        : chat.order.status === 'in_progress'
                                        ? 'bg-blue-100 text-blue-800'
                                        : chat.order.status === 'completed'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {chat.order.status.charAt(0).toUpperCase() + chat.order.status.slice(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Chat Interface */}
            <div className={`${selectedChat ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Chat Header - Fiverr Style */}
                  <div className="border-b border-gray-200 p-3 sm:p-4 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Mobile back button */}
                        <button
                          onClick={() => setSelectedChat(null)}
                          className="sm:hidden flex items-center text-gray-600 hover:text-gray-900 mr-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {renderAvatar(selectedChat, 'md')}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                              {selectedChat.otherUser.username}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Online
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span className="font-medium">{selectedChat.listing.title}</span>
                            <span>•</span>
                            <span className="font-bold text-gray-900">${selectedChat.order?.amount || selectedChat.listing.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {selectedChat.order?._id && (
                          <button
                            onClick={() => navigate(`/orders/${selectedChat.order!._id}`)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Order
                          </button>
                        )}
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="flex-1 relative bg-gray-50">
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
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-48 h-48 mx-auto mb-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Welcome to your inbox!</h3>
                  <p className="text-gray-600 max-w-md text-center mb-8">
                    {chats.length === 0 
                      ? "Your conversations with buyers and sellers will appear here. Start by exploring the marketplace!"
                      : "Select a conversation from the list to start messaging."}
                  </p>
                  <div className="flex items-center space-x-4">
                    {chats.length === 0 && (
                      <button
                        onClick={() => navigate('/marketplace')}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-sm"
                      >
                        Browse Marketplace
                      </button>
                    )}
                    <button
                      onClick={handleRefreshChats}
                      className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
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