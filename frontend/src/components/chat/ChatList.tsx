// src/components/chat/ChatList.tsx
import React from 'react';

export interface Chat {
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
    mediaUrls: string[];
  };
  order?: {
    _id: string;
    amount: number;
    status: string;
    listingTitle?: string;
    createdAt: string;
  };
  lastMessage: {
    message: string;
    senderId: string;
    createdAt: string;
    read: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  loading: boolean;
  renderAvatar?: (chat: Chat) => React.ReactNode;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentChatId,
  onChatSelect,
  loading,
  renderAvatar
}) => {
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

  // Default avatar renderer
  const defaultRenderAvatar = (chat: Chat) => {
    const { otherUser } = chat;
    const avatarColor = getAvatarColor(otherUser.id);
    
    if (otherUser.avatar) {
      return (
        <div className="relative">
          <img
            src={otherUser.avatar}
            alt={otherUser.username || 'User'}
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
          <div className="absolute inset-0 flex items-center justify-center avatar-fallback hidden">
            <div className={`${avatarColor} w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-lg`}>
              {getAvatarFallback(otherUser.username)}
            </div>
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

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 p-3">
              <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
        <p className="text-gray-500">When you start a conversation, it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {chats.map((chat) => {
        const isActive = currentChatId === chat.firebaseChatId;
        
        return (
          <div
            key={chat.firebaseChatId}
            className={`relative p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
              isActive ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
            }`}
            onClick={() => onChatSelect(chat)}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {renderAvatar ? renderAvatar(chat) : defaultRenderAvatar(chat)}
              </div>
              
              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">
                    {chat.otherUser.username || 'Unknown User'}
                  </h4>
                </div>
                
                <p className="text-sm text-gray-600 truncate mt-1">
                  {chat.listing.title || 'Unknown Listing'}
                </p>
                
                {chat.lastMessage && (
                  <div className="mt-2 flex items-center space-x-2">
                    <p className="text-sm text-gray-500 truncate flex-1">
                      {chat.lastMessage.message && chat.lastMessage.message.length > 40
                        ? `${chat.lastMessage.message.substring(0, 40)}...`
                        : chat.lastMessage.message || 'No messages yet'}
                    </p>
                    {!chat.lastMessage.read && chat.unreadCount > 0 && (
                      <span className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {chat.unreadCount}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Order Status Badge */}
            {chat.order?.status && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  chat.order.status === 'paid' 
                    ? 'bg-green-100 text-green-800'
                    : chat.order.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : chat.order.status === 'completed'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {chat.order.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChatList;