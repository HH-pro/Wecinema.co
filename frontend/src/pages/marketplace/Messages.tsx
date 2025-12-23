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
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const hasProcessedUrlChat = useRef(false);
  const lastChatIdRef = useRef<string | null>(null);
  const lastChatsLengthRef = useRef<number>(0);

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

  // Fetch user chats - WITHOUT AUTO-RELOADING SELECTED CHAT
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
        
        // Only update if chats actually changed
        const chatsChanged = JSON.stringify(transformedChats) !== JSON.stringify(chats);
        if (chatsChanged) {
          setChats(transformedChats);
          lastChatsLengthRef.current = transformedChats.length;
          
          // Don't auto-select chat when chats update
          // Only select chat if it's a new chat and user hasn't manually selected one
          if (selectedChat && transformedChats.length > lastChatsLengthRef.current) {
            // Check if our selected chat still exists
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

  // Initial fetch only - NO POLLING
  useEffect(() => {
    if (!currentUser?.id) return;

    // Initial fetch only
    fetchChats(false);

    // NO POLLING - Chat list won't auto-refresh
    // pollIntervalRef.current = setInterval(() => fetchChats(false), 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentUser?.id]);

  // Handle URL parameters and auto-select chat (ONLY ONCE)
  useEffect(() => {
    const handleUrlChat = () => {
      // Don't process if already processed or still loading
      if (hasProcessedUrlChat.current || chatsLoading || !chats.length) return;
      
      const urlChatId = searchParams.get('chat');
      const orderId = searchParams.get('order');
      
      if (!urlChatId && !orderId) {
        hasProcessedUrlChat.current = true;
        return;
      }
      
      // Prevent re-selecting same chat
      if (urlChatId && urlChatId === lastChatIdRef.current) {
        hasProcessedUrlChat.current = true;
        return;
      }
      
      // Mark as processed
      hasProcessedUrlChat.current = true;
      lastChatIdRef.current = urlChatId;
      
      let foundChat: Chat | null = null;
      
      // If we have URL chat ID, try to find the chat
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
    // Don't reselect same chat
    if (selectedChat?.firebaseChatId === chat.firebaseChatId) return;
    
    setSelectedChat(chat);
    setSearchParams({ chat: chat.firebaseChatId }, { replace: true });
    lastChatIdRef.current = chat.firebaseChatId;
  }, [selectedChat, setSearchParams]);

  const handleSendMessage = async (message: string) => {
    // REMOVED BACKEND LOGGING - Only Firebase will be used
    toast.success('Message sent!');
  };

  const handleRefreshChats = () => {
    // Manual refresh only
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
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
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
  const renderAvatar = (chat: Chat) => {
    const { otherUser } = chat;
    const avatarColor = getAvatarColor(otherUser.id);
    
    if (otherUser.avatar) {
      return (
        <div className="relative">
          <img
            src={otherUser.avatar}
            alt={otherUser.username}
            className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
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
            className={`${avatarColor} absolute inset-0 w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-lg avatar-fallback hidden`}
          >
            {getAvatarFallback(otherUser.username)}
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`${avatarColor} w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-lg`}
      >
        {getAvatarFallback(otherUser.username)}
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
          className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Browse Marketplace
        </button>
        <button
          onClick={handleRefreshChats}
          className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
                <p className="mt-2 text-gray-600">
                  Communicate with buyers and sellers about your orders
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {unreadCount} unread
                  </span>
                )}
                <button
                  onClick={handleRefreshChats}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[calc(100vh-180px)] flex overflow-hidden">
            {/* Chat List */}
            <div className="w-full md:w-46 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                    <p className="mt-3 text-gray-500">Loading conversations...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  <ChatList
                    chats={chats}
                    currentChatId={selectedChat?.firebaseChatId || null}
                    onChatSelect={handleChatSelect}
                    loading={chatsLoading}
                    renderAvatar={renderAvatar}
                  />
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col">
              {selectedChat && selectedChat.otherUser ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {renderAvatar(selectedChat)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-900 text-lg">
                              {selectedChat.otherUser.username}
                            </h3>
                            {selectedChat.order?.status && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                selectedChat.order.status === 'paid' 
                                  ? 'bg-green-100 text-green-800'
                                  : selectedChat.order.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : selectedChat.order.status === 'completed'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedChat.order.status.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                            <span className="font-medium">{selectedChat.listing.title}</span>
                            <span>•</span>
                            <span className="font-bold text-gray-900">${selectedChat.order?.amount || selectedChat.listing.price}</span>
                            {selectedChat.order?._id && (
                              <>
                                <span>•</span>
                                <span className="text-gray-500">Order #{selectedChat.order._id.slice(-6)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {selectedChat.order?._id && (
                          <button
                            onClick={() => navigate(`/orders/${selectedChat.order!._id}`)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  {chats.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <>
                      <div className="w-48 h-48 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center">
                        <svg className="w-24 h-24 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a conversation</h3>
                      <p className="text-gray-600 max-w-md text-center mb-8">
                        Choose a conversation from the list to start messaging.
                        All your order-related chats are listed on the left.
                      </p>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => navigate('/marketplace')}
                          className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Browse Listings
                        </button>
                        <button
                          onClick={handleRefreshChats}
                          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Refresh List
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
    </MarketplaceLayout>
  );
};

export default Messages;