// src/components/Chat/FirebaseChatInterface.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFirebaseChat, Message as FirebaseMessage } from '../../hooks/useFirebaseChat';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
// Correct import path for your firebase config
import { firestore as db } from '../../firebase/config'; // Import as 'db'
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  collection,
  updateDoc,
  increment
} from 'firebase/firestore';

interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
  role?: string;
}

interface FirebaseChatInterfaceProps {
  chatId: string;
  currentUser: User;
  onSendMessage?: (message: string) => void;
  className?: string;
  orderId?: string;
  otherUser?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface SystemMessage {
  id: string;
  content: string;
  timestamp: Date;
  messageType: 'system';
  metadata?: {
    orderId?: string;
    isSystemMessage?: boolean;
  };
}

const FirebaseChatInterface: React.FC<FirebaseChatInterfaceProps> = ({
  chatId,
  currentUser,
  onSendMessage,
  className = '',
  orderId,
  otherUser
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [chatExists, setChatExists] = useState(false);
  
  const { messages, loading, error, sendMessage, sendTypingStatus, markAsRead } = useFirebaseChat(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // Check if chat exists in Firebase
  const checkChatExists = useCallback(async () => {
    if (!chatId || chatInitialized) return;

    try {
      console.log('Checking if chat exists:', chatId);
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        console.log('Chat exists in Firebase');
        setChatExists(true);
        setChatInitialized(true);
      } else {
        console.log('Chat does not exist in Firebase');
        setChatExists(false);
      }
    } catch (error: any) {
      console.error('Error checking chat existence:', error);
      setChatExists(false);
    }
  }, [chatId, chatInitialized]);

  // Initialize chat in Firebase if it doesn't exist
  const initializeChat = useCallback(async () => {
    if (!chatId || !currentUser?.id || !otherUser?.id || chatInitialized || chatExists) {
      return;
    }

    try {
      console.log('Initializing chat:', {
        chatId,
        currentUserId: currentUser.id,
        otherUserId: otherUser.id,
        orderId
      });

      const chatRef = doc(db, 'chats', chatId);
      
      // Create chat document structure
      const chatData = {
        id: chatId,
        firebaseChatId: chatId,
        buyerId: currentUser.id,
        sellerId: otherUser.id,
        listingId: orderId || '',
        orderId: orderId || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        participants: [currentUser.id, otherUser.id],
        participantNames: {
          [currentUser.id]: currentUser.username || 'Buyer',
          [otherUser.id]: otherUser.username || 'Seller'
        },
        participantAvatars: {
          [currentUser.id]: currentUser.avatar || '',
          [otherUser.id]: otherUser.avatar || ''
        },
        metadata: {
          orderId: orderId,
          createdFromOrder: !!orderId,
          initializedAt: new Date().toISOString(),
          platform: 'marketplace'
        },
        unreadCount: {
          [currentUser.id]: 0,
          [otherUser.id]: 0
        },
        isActive: true
      };

      console.log('Creating chat with data:', chatData);
      
      await setDoc(chatRef, chatData);
      console.log('Chat created successfully in Firebase');
      
      // Create welcome message
      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const welcomeMessage = {
          text: `🎉 Chat started for ${orderId ? `order #${orderId.slice(-8)}` : 'this conversation'}. You can now discuss details here.`,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '',
          timestamp: serverTimestamp(),
          read: true,
          metadata: {
            isSystemMessage: true,
            orderId: orderId,
            createdAt: new Date().toISOString(),
            messageType: 'system'
          },
          messageType: 'system'
        };
        
        await setDoc(doc(messagesRef), welcomeMessage);
        console.log('Welcome message added');
      } catch (messageError) {
        console.warn('Could not add welcome message:', messageError);
      }

      setChatExists(true);
      setChatInitialized(true);
      setInitializationError(null);
      
      toast.success('Chat initialized successfully!');
    } catch (error: any) {
      console.error('Error initializing chat in Firebase:', error);
      setInitializationError(`Failed to initialize chat: ${error.message}`);
      toast.error('Failed to initialize chat. Please try again.');
    }
  }, [chatId, currentUser, otherUser, orderId, chatInitialized, chatExists]);

  // Check and initialize chat on component mount
  useEffect(() => {
    if (chatId && currentUser?.id && otherUser?.id) {
      checkChatExists().then(() => {
        if (!chatExists && !chatInitialized) {
          initializeChat();
        }
      });
    }
  }, [chatId, currentUser, otherUser, checkChatExists, initializeChat, chatExists, chatInitialized]);

  // Fetch system messages from your backend
  const fetchSystemMessages = useCallback(async () => {
    if (!orderId || !currentUser.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/marketplace/offers/messages/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const systemMsgs = data.data
          ?.filter((msg: any) => msg.metadata?.isSystemMessage)
          .map((msg: any) => ({
            id: msg._id,
            content: msg.message,
            timestamp: new Date(msg.createdAt),
            messageType: 'system' as const,
            metadata: msg.metadata
          })) || [];
        
        setSystemMessages(systemMsgs);
      }
    } catch (error) {
      console.error('Error fetching system messages:', error);
    }
  }, [orderId, currentUser.id]);

  // Combine Firebase messages with system messages
  const allMessages = [...systemMessages, ...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || isSending) {
      toast.error('Cannot send empty message');
      return;
    }

    if (!chatExists) {
      toast.error('Chat is not ready yet. Please wait...');
      return;
    }

    const messageContent = newMessage.trim();
    setIsSending(true);

    try {
      console.log('Sending message to Firebase:', {
        chatId,
        message: messageContent,
        senderId: currentUser.id
      });

      // Send to Firebase using your hook
      const messageSent = await sendMessage({
        senderId: currentUser.id,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        content: messageContent,
        messageType: 'text',
        metadata: {
          orderId,
          isUserMessage: true,
          timestamp: new Date().toISOString()
        }
      });

      if (!messageSent) {
        throw new Error('Failed to send message to Firebase');
      }
      
      console.log('Message sent successfully to Firebase');
      
      // Update chat document with last message
      try {
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
          lastMessage: messageContent,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          [`unreadCount.${otherUser?.id}`]: increment(1)
        });
        console.log('Chat document updated with last message');
      } catch (updateError) {
        console.warn('Failed to update chat document:', updateError);
      }
      
      // Log to backend (optional)
      if (orderId) {
        try {
          const token = localStorage.getItem('token');
          await fetch('http://localhost:3000/marketplace/chat/log-message', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              orderId,
              message: messageContent,
              firebaseChatId: chatId,
              senderId: currentUser.id,
              senderName: currentUser.username,
              isFirebaseMessage: true
            })
          });
        } catch (backendError) {
          console.warn('Failed to log message to backend:', backendError);
        }
      }
      
      setNewMessage('');
      onSendMessage?.(messageContent);
      toast.success('Message sent!');
      
    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check Firebase security rules.');
      } else if (err.code === 'not-found') {
        toast.error('Chat not found. Please refresh the page.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
      
      // Restore message if failed
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    setIsTyping(true);
    sendTypingStatus?.(true);

    const timeout = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus?.(false);
    }, 1000);

    setTypingTimeout(timeout);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (!loading && allMessages.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [loading, allMessages.length]);

  // Mark messages as read
  useEffect(() => {
    if (chatId && allMessages.length > 0 && chatExists) {
      const unreadMessages = allMessages.filter(msg => 
        msg.messageType !== 'system' && 
        'senderId' in msg &&
        msg.senderId !== currentUser.id &&
        'read' in msg &&
        !msg.read
      );
      
      if (unreadMessages.length > 0) {
        markAsRead?.();
      }
    }
  }, [chatId, allMessages, currentUser.id, markAsRead, chatExists]);

  // Fetch system messages
  useEffect(() => {
    if (orderId) {
      fetchSystemMessages();
    }
  }, [orderId, fetchSystemMessages]);

  const formatMessageTime = (timestamp: Date): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  };

  const renderMessageContent = (message: FirebaseMessage | SystemMessage) => {
    if (message.messageType === 'system') {
      return (
        <div className="text-center italic text-gray-600 text-sm">
          {message.content}
        </div>
      );
    }

    if (message.content.includes('🎉') || message.content.includes('✅')) {
      return (
        <div className="prose prose-sm max-w-none">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
            <div className="break-words whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="break-words whitespace-pre-wrap">
        {message.content}
      </div>
    );
  };

  const renderMessage = (message: FirebaseMessage | SystemMessage) => {
    const isCurrentUser = message.messageType !== 'system' && 'senderId' in message && message.senderId === currentUser.id;
    const isSystem = message.messageType === 'system';

    return (
      <div
        key={message.id}
        className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'} ${isSystem ? 'justify-center' : ''}`}
      >
        <div className={`max-w-xs lg:max-w-md ${isSystem ? 'w-full' : ''}`}>
          {/* Sender info for other user */}
          {!isCurrentUser && !isSystem && message.messageType !== 'system' && 'senderName' in message && (
            <div className="flex items-center space-x-2 mb-1 ml-1">
              {otherUser?.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.username}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700">
                {message.senderName || otherUser?.username}
              </span>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`px-3 py-2 rounded-lg ${isSystem
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 text-center text-xs'
                : isCurrentUser
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
          >
            {renderMessageContent(message)}
            
            {/* Message time */}
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} ${isSystem ? 'text-yellow-600' : ''}`}>
              {formatMessageTime(message.timestamp)}
              {!isSystem && message.messageType !== 'system' && 'read' in message && isCurrentUser && (
                <span className="ml-1">
                  {message.read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && !chatExists) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat...</p>
        </div>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600 p-6 bg-red-50 rounded-lg border border-red-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Chat Error</h3>
          <p className="text-sm text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error && !chatExists) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600 p-6 bg-red-50 rounded-lg border border-red-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Connection Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      {otherUser && (
        <div className="border-b border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {otherUser.avatar ? (
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.username}
                    className="w-8 h-8 rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                    {otherUser.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{otherUser.username}</h3>
                <p className="text-xs text-gray-600">
                  {isTyping ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            {orderId && (
              <a
                href={`/orders/${orderId}`}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Order
              </a>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 bg-gray-50"
      >
        {/* Chat status */}
        {!chatExists && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-center">
            <p className="text-yellow-800 text-xs flex items-center justify-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
              Setting up chat connection...
            </p>
          </div>
        )}

        {/* Empty State */}
        {allMessages.length === 0 && chatExists ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 mb-4 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Start chatting</h3>
            <p className="text-gray-600 text-sm max-w-sm mb-4">
              Say hello to {otherUser?.username || 'your partner'} and discuss your order details.
            </p>
          </div>
        ) : (
          <>
            {/* Messages */}
            {allMessages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="fixed bottom-20 right-3 p-2 bg-blue-500 text-white rounded-full shadow hover:bg-blue-600 transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            disabled={isSending || !chatExists}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || !chatExists}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? (
              <div className="flex items-center">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                Sending
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        {/* Status */}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center">
            {!chatExists ? (
              <span className="text-yellow-600 flex items-center">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse mr-1"></div>
                Connecting...
              </span>
            ) : (
              <span className="text-green-600 flex items-center">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                Connected
              </span>
            )}
          </div>
          {orderId && (
            <span className="text-xs text-gray-500">
              Order: #{orderId?.slice(-6)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirebaseChatInterface;