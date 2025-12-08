// src/pages/Messages.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    orderId?: string;
    chatLink?: string;
    firebaseChatId?: string;
    isSystemMessage?: boolean;
    notificationType?: string;
  };
}

const Messages: React.FC = () => {
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Try to get user from auth context first
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

        // Fallback: parse token
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

        // Or fetch from API
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
      
      const response = await fetch('http://localhost:3000/api/marketplace/chat/my-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform API response to Chat type
        const transformedChats: Chat[] = (data.data || []).map((chat: any) => ({
          firebaseChatId: chat.firebaseChatId || chat._id,
          otherUser: {
            id: chat.otherUser?._id || chat.otherUserId,
            username: chat.otherUser?.username || 'Unknown User',
            avatar: chat.otherUser?.avatar || '/default-avatar.png',
            email: chat.otherUser?.email || ''
          },
          listing: {
            id: chat.listing?._id || chat.listingId,
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
          updatedAt: chat.updatedAt || chat.lastMessageAt
        }));
        
        setChats(transformedChats);
        
        // Calculate total unread count
        const totalUnread = transformedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
        
        // Update browser tab title with unread count
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) Messages - Marketplace`;
        } else {
          document.title = 'Messages - Marketplace';
        }
      } else {
        console.error('Failed to fetch chats');
        toast.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Network error loading conversations');
    } finally {
      setChatsLoading(false);
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false;
      }
    }
  }, [currentUser?.id]);

  // Poll for new chats and messages
  useEffect(() => {
    if (!currentUser?.id) return;

    // Initial fetch
    fetchChats();

    // Set up polling for real-time updates
    pollIntervalRef.current = setInterval(fetchChats, 30000); // Every 30 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentUser?.id, fetchChats]);

  // Fetch messages for selected chat
  const fetchChatMessages = useCallback(async (orderId: string) => {
    if (!orderId || !currentUser?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/marketplace/offers/messages/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
        
        // Mark messages as read
        if (data.data?.length > 0) {
          await markMessagesAsRead(orderId);
        }
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  }, [currentUser?.id]);

  // Mark messages as read
  const markMessagesAsRead = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `http://localhost:3000/api/marketplace/chat/mark-read/${orderId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.order?._id === orderId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Handle URL parameters and auto-select chat
  useEffect(() => {
    if (!chats.length) return;

    // Check for chatId in URL params
    const urlChatId = searchParams.get('chat');
    const orderId = searchParams.get('order');
    
    let chatToSelect: Chat | null = null;

    if (urlChatId) {
      // Find by Firebase chat ID
      chatToSelect = chats.find(c => c.firebaseChatId === urlChatId) || null;
    } else if (orderId) {
      // Find by order ID
      chatToSelect = chats.find(c => c.order?._id === orderId) || null;
      
      // If not found, try to get chat link from API
      if (!chatToSelect) {
        fetchChatLink(orderId);
      }
    }

    if (chatToSelect) {
      setSelectedChat(chatToSelect);
      
      // Fetch messages for this chat
      if (chatToSelect.order?._id) {
        fetchChatMessages(chatToSelect.order._id);
      }
      
      // Update URL
      navigate(`/messages?chat=${chatToSelect.firebaseChatId}`, { replace: true });
    }
  }, [chats, searchParams, navigate, fetchChatMessages]);

  // Fetch chat link for order
  const fetchChatLink = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/marketplace/offers/chat-link/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.chatLink) {
          // Navigate to the chat
          window.location.href = data.data.chatLink;
        }
      }
    } catch (error) {
      console.error('Error fetching chat link:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    
    // Fetch messages for selected chat
    if (chat.order?._id) {
      fetchChatMessages(chat.order._id);
    }
    
    // Update URL
    navigate(`/messages?chat=${chat.firebaseChatId}`, { replace: true });
    
    // Mark as read
    if (chat.order?._id) {
      markMessagesAsRead(chat.order._id);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedChat || !currentUser) return;
    
    try {
      // You can add additional logic here like:
      // 1. Send notification to the other user
      // 2. Update order status if needed
      // 3. Log message for analytics
      
      console.log('Message sent to chat:', selectedChat.firebaseChatId, 'Message:', message);
      
      // Optional: Send a copy to your backend
      if (selectedChat.order?._id) {
        const token = localStorage.getItem('token');
        await fetch('http://localhost:3000/api/marketplace/chat/log-message', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: selectedChat.order._id,
            message: message,
            firebaseChatId: selectedChat.firebaseChatId
          })
        });
      }
      
      toast.success('Message sent!');
    } catch (error) {
      console.error('Error logging message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleCreateNewChat = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/marketplace/chat/create/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Chat created!');
          fetchChats(); // Refresh chat list
        }
      } else {
        toast.error('Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Network error creating chat');
    }
  };

  const handleArchiveChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/marketplace/chat/archive/${chatId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Chat archived');
        setChats(prev => prev.filter(chat => chat.firebaseChatId !== chatId));
        if (selectedChat?.firebaseChatId === chatId) {
          setSelectedChat(null);
        }
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast.error('Failed to archive chat');
    }
  };

  const handleRefreshChats = () => {
    fetchChats();
    toast.success('Refreshing conversations...');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="w-full md:w-96 border-r border-gray-200 flex flex-col">
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
                    onArchiveChat={handleArchiveChat}
                  />
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img
                          src={selectedChat.otherUser.avatar || '/default-avatar.png'}
                          alt={selectedChat.otherUser.username}
                          className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                        />
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
                        <button
                          onClick={() => selectedChat.order?._id && navigate(`/orders/${selectedChat.order._id}`)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Order
                        </button>
                        <button
                          onClick={() => handleArchiveChat(selectedChat.firebaseChatId)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Archive conversation"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
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
              ) : chats.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
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
                </div>
              )}
            </div>
          </div>

          {/* System Messages Section (Optional) */}
          {messages.filter(msg => msg.metadata?.isSystemMessage).length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">System Messages</h3>
              <div className="space-y-3">
                {messages
                  .filter(msg => msg.metadata?.isSystemMessage)
                  .slice(0, 3)
                  .map(msg => (
                    <div key={msg._id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">{msg.message}</p>
                          {msg.metadata?.chatLink && (
                            <a
                              href={msg.metadata.chatLink}
                              className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              Go to chat →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default Messages;