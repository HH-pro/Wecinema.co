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
// Rest of the code remains the same...

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
  
  const { messages, loading, error, sendMessage, sendTypingStatus, markAsRead } = useFirebaseChat(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // Initialize chat in Firebase if it doesn't exist
  const initializeChat = useCallback(async () => {
    if (!chatId || !currentUser?.id || !otherUser?.id || chatInitialized) {
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
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        console.log('Chat does not exist, creating new chat...');
        
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
            initializedAt: new Date().toISOString()
          }
        };

        console.log('Creating chat with data:', chatData);
        
        await setDoc(chatRef, chatData);
        console.log('Chat created successfully in Firebase');
        
        // Also create messages subcollection structure
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const welcomeMessage = {
          text: `Chat started for order ${orderId ? `#${orderId.slice(-8)}` : ''}. Please discuss order details here.`,
          senderId: 'system',
          senderName: 'System',
          senderAvatar: '',
          timestamp: serverTimestamp(),
          read: true,
          metadata: {
            isSystemMessage: true,
            orderId: orderId,
            createdAt: new Date().toISOString()
          },
          messageType: 'system'
        };
        
        await setDoc(doc(messagesRef, 'welcome'), welcomeMessage);
        console.log('Welcome message added');
      } else {
        console.log('Chat already exists in Firebase');
      }

      setChatInitialized(true);
      setInitializationError(null);
    } catch (error: any) {
      console.error('Error initializing chat in Firebase:', error);
      setInitializationError(`Failed to initialize chat: ${error.message}`);
      toast.error('Failed to initialize chat. Please try again.');
    }
  }, [chatId, currentUser, otherUser, orderId, chatInitialized]);

  // Check if chat exists and initialize if needed
  useEffect(() => {
    if (chatId && currentUser?.id && otherUser?.id && !chatInitialized) {
      initializeChat();
    }
  }, [chatId, currentUser, otherUser, chatInitialized, initializeChat]);

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

    if (!chatInitialized) {
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

      // Send to Firebase
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
      
      // Also log to your backend (optional)
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
              senderName: currentUser.username
            })
          });
        } catch (backendError) {
          console.warn('Failed to log message to backend:', backendError);
          // Continue even if backend logging fails
        }
      }
      
      // Update chat document with last message
      try {
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
          lastMessage: messageContent,
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log('Chat document updated with last message');
      } catch (updateError) {
        console.warn('Failed to update chat document:', updateError);
      }
      
      setNewMessage('');
      onSendMessage?.(messageContent);
      toast.success('Message sent!');
      
    } catch (err: any) {
      console.error('Failed to send message:', err);
      
      // Specific error handling
      if (err.code === 'permission-denied') {
        toast.error('Permission denied. Check Firebase security rules.');
      } else if (err.code === 'not-found') {
        toast.error('Chat not found. Please refresh the page.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
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

  // Initial load and scroll
  useEffect(() => {
    if (!loading && allMessages.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [loading, allMessages.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (chatId && allMessages.length > 0 && chatInitialized) {
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
  }, [chatId, allMessages, currentUser.id, markAsRead, chatInitialized]);

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

    if (message.content.startsWith('🎉 **NEW ORDER RECEIVED!**') || 
        message.content.startsWith('✅ **ORDER CONFIRMED!**')) {
      return (
        <div className="prose prose-sm max-w-none">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            {message.content.split('\n').map((line, idx) => {
              if (line.includes('**')) {
                return (
                  <strong key={idx} className="text-blue-800 block mb-1">
                    {line.replace(/\*\*/g, '')}
                  </strong>
                );
              }
              if (line.includes('[OPEN CHAT WITH')) {
                const match = line.match(/\[(.*?)\]\((.*?)\)/);
                if (match) {
                  return (
                    <a
                      key={idx}
                      href={match[2]}
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {match[1]}
                    </a>
                  );
                }
              }
              return <p key={idx} className="mb-1">{line}</p>;
            })}
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
              {otherUser?.avatar && (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.username}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-xs font-medium text-gray-700">
                {message.senderName || otherUser?.username}
              </span>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isSystem
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 text-center'
                : isCurrentUser
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }`}
          >
            {renderMessageContent(message)}
            
            {/* Message time */}
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'} ${
              isSystem ? 'text-yellow-600' : ''
            }`}>
              {formatMessageTime(message.timestamp)}
              {!isSystem && message.messageType !== 'system' && 'read' in message && isCurrentUser && (
                <span className="ml-2">
                  {message.read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!chatId) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="w-24 h-24 mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No chat selected</h3>
        <p className="text-gray-600 text-center max-w-sm">
          Select a conversation from the list to start messaging
        </p>
      </div>
    );
  }

  if (initializationError) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600 p-6 bg-red-50 rounded-lg border border-red-200 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Chat Initialization Error</h3>
          <p className="text-sm text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (loading && allMessages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Error loading messages</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      {otherUser && (
        <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="relative">
              {otherUser.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.username}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-blue-500 text-white flex items-center justify-center font-bold">
                  {otherUser.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{otherUser.username}</h3>
              <p className="text-sm text-gray-600">
                {isTyping ? 'Typing...' : 'Online • Chat connected'}
              </p>
            </div>
            {orderId && (
              <a
                href={`/orders/${orderId}`}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Order
              </a>
            )}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50/50 to-white"
      >
        {/* Chat not initialized warning */}
        {!chatInitialized && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
            <p className="text-yellow-800 text-sm">
              ⚡ Setting up secure chat connection...
            </p>
          </div>
        )}

        {/* Empty State */}
        {allMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-600 max-w-sm mb-6">
              This is the beginning of your conversation with {otherUser?.username || 'the other user'}. 
              Discuss your order details, ask questions, or share updates here.
            </p>
            {orderId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Be clear about your requirements and communicate regularly 
                  for the best results!
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Welcome message */}
            {allMessages.length > 0 && (
              <div className="text-center mb-8">
                <div className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg">
                  <p className="font-semibold">Chat with {otherUser?.username || 'your order partner'}</p>
                  <p className="text-sm opacity-90">All messages are secure and encrypted</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {allMessages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="fixed bottom-24 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="flex-1 relative">
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
              placeholder="Type your message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isSending || !chatInitialized}
            />
            {/* Quick action buttons */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <button
                type="button"
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                onClick={() => {
                  document.getElementById('file-input')?.click();
                }}
                disabled={isSending || !chatInitialized}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input type="file" id="file-input" className="hidden" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending || !chatInitialized}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-full hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isSending ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        {/* Chat status */}
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!chatInitialized && (
              <span className="text-yellow-600 flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-1"></div>
                Connecting...
              </span>
            )}
            {chatInitialized && (
              <span className="text-green-600 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Connected
              </span>
            )}
          </div>
          {orderId && (
            <span className="text-gray-600">
              Order: #{orderId.slice(-8)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirebaseChatInterface;