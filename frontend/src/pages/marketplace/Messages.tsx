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
          document.title = `(${totalUnread}) Messages`;
        } else {
          document.title = 'Messages';
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
            className={`${sizeClasses[size]} rounded-full border border-gray-200 object-cover`}
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
            className={`${avatarColor} ${sizeClasses[size]} absolute inset-0 rounded-full border border-gray-200 flex items-center justify-center text-white font-semibold avatar-fallback hidden`}
          >
            {getAvatarFallback(otherUser.username)}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`${avatarColor} ${sizeClasses[size]} rounded-full border border-gray-200 flex items-center justify-center text-white font-semibold`}
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
        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
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
      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  };

  // Format time for chat list
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
      <p className="text-gray-600 max-w-sm mb-6">
        Your conversations with buyers and sellers will appear here
      </p>
      <button
        onClick={() => navigate('/marketplace')}
        className="px-5 py-2.5 bg-[#1DBF73] text-white font-medium rounded-md hover:bg-[#19a463] transition-colors"
      >
        Explore Marketplace
      </button>
    </div>
  );

  // Render loading state
  if (loading && isInitialMount.current) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DBF73] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-0">
          {/* Header - Fiverr Style */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                  {unreadCount > 0 && ` • ${unreadCount} unread`}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefreshChats}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Fiverr Style */}
          <div className="flex h-[calc(100vh-73px)]">
            {/* Left Sidebar - Conversations List */}
            <div className={`${selectedChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 flex-col border-r border-gray-200 flex-shrink-0`}>
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
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
                    placeholder="Search conversations"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1DBF73] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chats List */}
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DBF73] mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading conversations...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="p-8 text-center">
                    {searchQuery ? (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-gray-500 text-sm">No conversations found for "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-3 text-sm text-[#1DBF73] hover:text-[#19a463]"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <div className="py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No conversations yet</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.firebaseChatId}
                        onClick={() => handleChatSelect(chat)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedChat?.firebaseChatId === chat.firebaseChatId ? 'bg-[#F7F7F7] border-r-2 border-r-[#1DBF73]' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {renderAvatar(chat, 'md')}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="font-medium text-gray-900 text-sm truncate">
                                {chat.otherUser.username}
                              </h3>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                {formatTime(chat.updatedAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {chat.lastMessage?.text || 'Start conversation'}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {renderListingImage(chat)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">{chat.listing.title}</p>
                                  <div className="flex items-center">
                                    <p className="text-xs text-gray-500">${chat.listing.price}</p>
                                    {chat.order?.status && (
                                      <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
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
                              {chat.unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-[#1DBF73] rounded-full">
                                  {chat.unreadCount}
                                </span>
                              )}
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
            <div className={`${selectedChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Chat Header - Fiverr Style */}
                  <div className="border-b border-gray-200 p-4 bg-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Mobile back button */}
                        <button
                          onClick={() => setSelectedChat(null)}
                          className="lg:hidden flex items-center text-gray-600 hover:text-gray-900 mr-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        {renderAvatar(selectedChat, 'md')}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 text-base">
                              {selectedChat.otherUser.username}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Online
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-0.5">
                            <span className="font-medium truncate max-w-[200px]">{selectedChat.listing.title}</span>
                            <span>•</span>
                            <span className="font-semibold text-gray-900">${selectedChat.order?.amount || selectedChat.listing.price}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {selectedChat.order?._id && (
                          <button
                            onClick={() => navigate(`/orders/${selectedChat.order!._id}`)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center"
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
                  <div className="flex-1 relative bg-white">
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
                  <div className="w-40 h-40 mx-auto mb-6 bg-gray-50 rounded-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to your inbox!</h3>
                  <p className="text-gray-600 max-w-md text-center mb-8 text-sm">
                    {chats.length === 0 
                      ? "Your conversations with buyers and sellers will appear here."
                      : "Select a conversation from the list to start messaging."}
                  </p>
                  {chats.length === 0 && (
                    <button
                      onClick={() => navigate('/marketplace')}
                      className="px-5 py-2.5 bg-[#1DBF73] text-white font-medium rounded-md hover:bg-[#19a463] transition-colors"
                    >
                      Explore Marketplace
                    </button>
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