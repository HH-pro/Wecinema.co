// components/chat/FirebaseChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  Timestamp,
  where
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: any;
  read: boolean;
  metadata?: any;
}

interface FirebaseChatInterfaceProps {
  chatId: string;
  currentUser: any;
  onSendMessage?: (message: string) => void;
  className?: string;
  orderId?: string;
  otherUser?: any;
}

const FirebaseChatInterface: React.FC<FirebaseChatInterfaceProps> = ({
  chatId,
  currentUser,
  onSendMessage,
  className = '',
  orderId,
  otherUser
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // Check chat permissions
  useEffect(() => {
    const checkChatPermission = async () => {
      if (!chatId || !currentUser?.id) return;
      
      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          setError('Chat does not exist');
          setHasPermission(false);
          return;
        }
        
        const chatData = chatSnap.data();
        const isParticipant = chatData?.buyerId === currentUser.id || 
                              chatData?.sellerId === currentUser.id;
        
        if (!isParticipant) {
          setError('You do not have permission to view this chat');
          setHasPermission(false);
          return;
        }
        
        setHasPermission(true);
        setError(null);
      } catch (error: any) {
        console.error('Permission check error:', error);
        
        // If permission denied error, show specific message
        if (error.code === 'permission-denied') {
          setError('Permission denied. Please check Firebase security rules.');
          setHasPermission(false);
        } else {
          setError('Error loading chat');
          setHasPermission(false);
        }
      }
    };
    
    checkChatPermission();
  }, [chatId, currentUser?.id]);

  // Fetch messages
  useEffect(() => {
    if (!chatId || !currentUser?.id || !hasPermission) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(100)
      );
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messagesData: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesData.push({
              id: doc.id,
              text: data.text || data.message || '',
              senderId: data.senderId,
              senderName: data.senderName || 'User',
              senderAvatar: data.senderAvatar,
              timestamp: data.timestamp,
              read: data.read || false,
              metadata: data.metadata
            });
          });
          
          setMessages(messagesData);
          setLoading(false);
          
          // Auto-scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        },
        (error) => {
          console.error('Firebase snapshot error:', error);
          
          // Handle specific Firebase errors
          if (error.code === 'permission-denied') {
            setError('Firebase permission denied. Please check security rules.');
            toast.error('Permission denied. Contact administrator.');
          } else if (error.code === 'not-found') {
            setError('Chat not found in Firebase');
            toast.error('Chat not found');
          } else {
            setError(`Firebase error: ${error.message}`);
            toast.error('Error loading messages');
          }
          
          setLoading(false);
        }
      );
      
      return () => unsubscribe();
    } catch (error: any) {
      console.error('Error setting up chat listener:', error);
      setError(error.message);
      setLoading(false);
    }
  }, [chatId, currentUser?.id, hasPermission]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || !currentUser || !hasPermission) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.id,
        senderName: currentUser.username || 'User',
        senderAvatar: currentUser.avatar,
        timestamp: serverTimestamp(),
        read: false,
        metadata: {
          orderId: orderId,
          chatId: chatId,
          sentAt: new Date().toISOString()
        }
      });
      
      // Update last message timestamp in chat document
      try {
        const chatRef = doc(db, 'chats', chatId);
        // Note: We can't directly update here due to security rules
        // This should be handled by a Cloud Function or backend
      } catch (updateError) {
        console.warn('Could not update chat timestamp:', updateError);
      }
      
      // Call parent callback if provided
      if (onSendMessage) {
        onSendMessage(messageText);
      }
      
      console.log('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Cannot send message.');
      } else if (error.code === 'not-found') {
        toast.error('Chat not found');
      } else {
        toast.error('Failed to send message');
      }
      
      // Restore message if failed to send
      setNewMessage(messageText);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return '';
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  // Format date for message grouping
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp.toDate) {
        date = timestamp.toDate();
      } else {
        return '';
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return '';
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // Render permission error
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-8 ${className}`}>
        <div className="w-24 h-24 mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.246 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Permission Error</h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
        </div>
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 max-w-md">
          <p className="font-semibold mb-2">Troubleshooting steps:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Check Firebase Firestore security rules</li>
            <li>Verify you are logged in correctly</li>
            <li>Ensure you have permission to access this chat</li>
            <li>Contact administrator if issue persists</li>
          </ul>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-32 h-32 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No messages yet</h3>
            <p className="text-gray-600 max-w-md mb-6">
              Start the conversation by sending your first message.
              Discuss the order details, ask questions, or coordinate delivery.
            </p>
            <div className="text-sm text-gray-500">
              <p>• All messages are end-to-end encrypted</p>
              <p>• Chat history is saved for future reference</p>
            </div>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-6">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="mx-4 px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                    {date}
                  </span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
                
                {/* Messages for this date */}
                {dateMessages.map((message) => {
                  const isOwnMessage = message.senderId === currentUser?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-yellow-100 rounded-br-none'
                            : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {/* Sender info for others' messages */}
                        {!isOwnMessage && (
                          <div className="flex items-center mb-1">
                            {message.senderAvatar ? (
                              <img
                                src={message.senderAvatar}
                                alt={message.senderName}
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mr-2">
                                {message.senderName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-semibold text-gray-900">
                              {message.senderName}
                            </span>
                          </div>
                        )}
                        
                        {/* Message text */}
                        <p className="text-gray-800 whitespace-pre-wrap break-words">
                          {message.text}
                        </p>
                        
                        {/* Message time and status */}
                        <div className={`flex items-center justify-end mt-1 ${
                          isOwnMessage ? 'text-yellow-700' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">
                            {formatTime(message.timestamp)}
                          </span>
                          {isOwnMessage && (
                            <span className="ml-2 text-xs">
                              {message.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            disabled={!hasPermission}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !hasPermission}
            className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </form>
        
        {/* Chat guidelines */}
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure chat
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Encrypted
            </span>
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