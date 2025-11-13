// src/components/Chat/FirebaseChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useFirebaseChat, Message } from '../../hooks/useFirebaseChat';

interface User {
  id: string;
  username: string;
  avatar?: string;
  email: string;
}

interface FirebaseChatInterfaceProps {
  chatId: string | null;
  currentUser: User;
  onSendMessage?: (message: string) => void;
  className?: string;
}

const FirebaseChatInterface: React.FC<FirebaseChatInterfaceProps> = ({
  chatId,
  currentUser,
  onSendMessage,
  className = ''
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { messages, loading, error, sendMessage } = useFirebaseChat(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatId || isSending) return;

    const messageContent = newMessage.trim();
    setIsSending(true);

    try {
      await sendMessage({
        senderId: currentUser.id,
        senderName: currentUser.username,
        content: messageContent,
        messageType: 'text'
      });
      
      setNewMessage('');
      onSendMessage?.(messageContent);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!chatId) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading messages</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm">Start a conversation by sending a message!</p>
          </div>
        ) : (
          messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === currentUser.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                } ${
                  message.messageType === 'system' ? 'bg-yellow-100 text-yellow-800 text-center' : ''
                }`}
              >
                {message.senderId !== currentUser.id && message.messageType !== 'system' && (
                  <div className="text-xs font-semibold mb-1">{message.senderName}</div>
                )}
                
                <div className="break-words">
                  {message.content}
                </div>
                
                {message.fileUrl && (
                  <div className="mt-2">
                    {message.messageType === 'image' ? (
                      <img 
                        src={message.fileUrl} 
                        alt={message.fileName || 'Shared image'}
                        className="max-w-full rounded"
                      />
                    ) : (
                      <a 
                        href={message.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        📎 {message.fileName || 'Download file'}
                      </a>
                    )}
                  </div>
                )}
                
                <div className={`text-xs mt-1 ${
                  message.senderId === currentUser.id ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {formatMessageTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirebaseChatInterface;