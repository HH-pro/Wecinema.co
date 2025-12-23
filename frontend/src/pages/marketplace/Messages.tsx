// src/pages/Messages.tsx - CLEAN & PROFESSIONAL VERSION
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
  
  const hasProcessedUrlChat = useRef(false);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
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

        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
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
        }
      } catch (error) {
        console.error('Error fetching user:', error);
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
    if (!currentUser?.id) return;
    fetchChats();
  }, [currentUser?.id, fetchChats]);

  // Handle URL parameters
  useEffect(() => {
    if (hasProcessedUrlChat.current || chatsLoading || !chats.length) return;
    
    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');
    
    if (!urlChatId && !orderId) {
      hasProcessedUrlChat.current = true;
      return;
    }
    
    hasProcessedUrlChat.current = true;
    
    let foundChat: Chat | null = null;
    
    if (urlChatId) {
      foundChat = chats.find(c => c.firebaseChatId === urlChatId) || null;
    } else if (orderId) {
      foundChat = chats.find(c => c.order?._id === orderId) || null;
    }
    
    if (foundChat) {
      setSelectedChat(foundChat);
    }
  }, [chats, chatsLoading, searchParams]);

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
    toast.success('Refreshed conversations');
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h3>
      <p className="text-gray-600 max-w-sm mb-6">
        Start a conversation by placing an order or contacting a seller.
      </p>
      <button
        onClick={() => navigate('/marketplace')}
        className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors"
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="mt-1 text-gray-600">
                  Communicate with buyers and sellers
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshChats}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-160px)] flex flex-col md:flex-row overflow-hidden">
            {/* Chat List - Left Panel */}
            <div className="w-full md:w-96 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {chats.length} total
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {chatsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-3 text-gray-500 text-sm">Loading...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">No conversations</p>
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
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedChat.otherUser.avatar ? (
                          <img
                            src={selectedChat.otherUser.avatar}
                            alt={selectedChat.otherUser.username}
                            className="w-10 h-10 rounded-full border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {selectedChat.otherUser.username?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {selectedChat.otherUser.username}
                            </h3>
                            {selectedChat.order?.status && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedChat.order.status)}`}>
                                {selectedChat.order.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                            <span>{selectedChat.listing.title}</span>
                            <span>•</span>
                            <span className="font-medium">${selectedChat.order?.amount || selectedChat.listing.price}</span>
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
                          onClick={() => navigate(`/orders/${selectedChat.order!._id}`)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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
                <div className="flex-1 flex items-center justify-center p-6">
                  {chats.length === 0 ? (
                    renderEmptyState()
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
                      <p className="text-gray-600 max-w-sm mb-6">
                        Choose a conversation from the list to start messaging
                      </p>
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