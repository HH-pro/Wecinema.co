// src/components/Chat/ChatList.tsx
import React from 'react';

export interface Chat {
  _id: string;
  firebaseChatId: string;
  orderId: string;
  listing: {
    _id: string;
    title: string;
    mediaUrls: string[];
    price: number;
  };
  order: {
    _id: string;
    status: string;
    amount: number;
    orderType: string;
  };
  otherUser: {
    _id: string;
    username: string;
    avatar?: string;
    email: string;
  };
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  createdAt: string;
}

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  loading?: boolean;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentChatId,
  onChatSelect,
  loading = false
}) => {
  const formatLastMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays > 1) {
      return date.toLocaleDateString();
    } else {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="p-4 border-b border-gray-100 animate-pulse">
            <div className="flex space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Messages</h2>
        <p className="text-sm text-gray-500">{chats.length} conversations</p>
      </div>

      {chats.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p>No conversations yet</p>
          <p className="text-sm mt-1">Your chat conversations will appear here</p>
        </div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat._id}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
              currentChatId === chat.firebaseChatId ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => onChatSelect(chat)}
          >
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                <img
                  src={chat.otherUser.avatar || '/default-avatar.png'}
                  alt={chat.otherUser.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {chat.unreadCount > 0 && (
                  <div className="relative -top-2 -right-1">
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {chat.otherUser.username}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatLastMessageTime(chat.lastMessageAt)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 truncate">
                  {chat.order ? `Order: $${chat.order.amount}` : chat.listing.title}
                </p>
                
                {chat.lastMessage && (
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {truncateMessage(chat.lastMessage)}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    chat.order?.status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : chat.order?.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {chat.order?.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ChatList;