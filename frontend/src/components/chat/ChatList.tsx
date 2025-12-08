// src/components/Chat/ChatList.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  lastMessage?: string;
  unreadCount?: number;
  updatedAt: string;
  metadata?: {
    firebaseChatId?: string;
    orderId?: string;
    listingId?: string;
  };
}

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chat: Chat) => void;
  loading?: boolean;
  onArchiveChat?: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentChatId,
  onChatSelect,
  loading = false,
  onArchiveChat
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const formatLastMessageTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

      if (diffHours < 24) {
        if (diffHours < 1) {
          return 'Just now';
        }
        return `${diffHours}h ago`;
      } else if (diffHours < 48) {
        return 'Yesterday';
      } else if (diffHours < 168) { // 7 days
        const days = Math.floor(diffHours / 24);
        return `${days}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return 'Recent';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 40): string => {
    if (!message) return '';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return 'Active';
    return status.replace('_', ' ').toUpperCase();
  };

  // Filter chats based on search and status
  const filteredChats = chats.filter(chat => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      chat.otherUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.order?._id?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'unread' && (chat.unreadCount || 0) > 0) ||
      (filterStatus === 'active' && chat.order?.status === 'in_progress') ||
      (filterStatus === 'completed' && chat.order?.status === 'completed') ||
      (filterStatus === 'paid' && chat.order?.status === 'paid');

    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (e: React.MouseEvent, orderId?: string) => {
    e.stopPropagation();
    if (orderId) {
      navigate(`/orders/${orderId}`);
    }
  };

  const handleArchive = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (onArchiveChat && window.confirm('Are you sure you want to archive this conversation?')) {
      onArchiveChat(chatId);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
        </div>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="p-4 border-b border-gray-100 animate-pulse">
            <div className="flex space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full bg-white h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Messages</h2>
        
        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1">
          {['all', 'unread', 'active', 'paid', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900 mb-1">No conversations found</p>
            <p className="text-sm text-gray-600">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try different search terms or filters' 
                : 'Start a conversation by placing an order or making an offer'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredChats.map((chat) => (
              <div
                key={chat.firebaseChatId}
                className={`p-4 cursor-pointer transition-all hover:bg-gray-50 active:bg-gray-100 ${
                  currentChatId === chat.firebaseChatId 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : ''
                }`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="flex space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 relative">
                    <img
                      src={chat.otherUser.avatar || '/default-avatar.png'}
                      alt={chat.otherUser.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    {chat.unreadCount && chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </span>
                      </div>
                    )}
                    {chat.order?.status === 'in_progress' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {chat.otherUser.username}
                        </h3>
                        {chat.order?.status && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(chat.order.status)}`}>
                            {getStatusText(chat.order.status)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatLastMessageTime(chat.updatedAt)}
                      </span>
                    </div>
                    
                    {/* Listing Info */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <span className="font-medium truncate">{chat.listing.title}</span>
                      <span>•</span>
                      <span className="font-bold text-gray-900">
                        ${chat.order?.amount || chat.listing.price}
                      </span>
                      {chat.order?._id && (
                        <>
                          <span>•</span>
                          <span className="text-gray-500 text-xs">
                            Order #{chat.order._id.slice(-6)}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* Last Message */}
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-500 truncate">
                        {truncateMessage(chat.lastMessage, 60)}
                      </p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex space-x-2">
                        {chat.order?._id && (
                          <button
                            onClick={(e) => handleViewOrder(e, chat.order?._id)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          >
                            View Order
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-1">
                        {onArchiveChat && (
                          <button
                            onClick={(e) => handleArchive(e, chat.firebaseChatId)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Archive conversation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>
            {filteredChats.length} of {chats.length} conversations
          </span>
          {chats.some(chat => chat.unreadCount && chat.unreadCount > 0) && (
            <span className="font-medium text-blue-600">
              {chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)} unread
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;