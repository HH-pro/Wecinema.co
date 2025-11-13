// src/pages/Messages.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatList, { Chat } from '../../components/chat/ChatList';
import FirebaseChatInterface from '../../components/chat/FirebaseChatInterface';
import MarketplaceLayout from '../../components/Layout';

interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
}

const Messages: React.FC = () => {
  const { chatId: urlChatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch user chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:3000/api/marketplace/chat/my-chats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setChats(data.data || []);
        } else {
          console.error('Failed to fetch chats');
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Fetch current user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser({
          id: payload.userId || payload.id,
          username: payload.username || 'User',
          email: payload.email || ''
        });
      } catch (error) {
        console.error('Error parsing user token:', error);
      }
    }
  }, []);

  // Handle URL chat ID
  useEffect(() => {
    if (urlChatId && chats.length > 0) {
      const chat = chats.find(c => c.firebaseChatId === urlChatId);
      if (chat) {
        setSelectedChat(chat);
      }
    }
  }, [urlChatId, chats]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    navigate(`/messages?chat=${chat.firebaseChatId}`, { replace: true });
  };

  const handleSendMessage = (message: string) => {
    console.log('Message sent:', message);
    // You can add additional logic here like notifications, analytics, etc.
  };

  if (!currentUser) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="mt-2 text-gray-600">
              Communicate with buyers and sellers
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)] flex">
            {/* Chat List */}
            <ChatList
              chats={chats}
              currentChatId={selectedChat?.firebaseChatId || null}
              onChatSelect={handleChatSelect}
              loading={loading}
            />

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={selectedChat.otherUser.avatar || '/default-avatar.png'}
                        alt={selectedChat.otherUser.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedChat.otherUser.username}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedChat.listing.title} • ${selectedChat.order?.amount}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedChat.order?.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : selectedChat.order?.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedChat.order?.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1">
                    <FirebaseChatInterface
                      chatId={selectedChat.firebaseChatId}
                      currentUser={currentUser}
                      onSendMessage={handleSendMessage}
                      className="h-full"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">No chat selected</h3>
                    <p>Choose a conversation from the list to start messaging</p>
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