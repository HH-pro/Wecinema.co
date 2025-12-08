// src/hooks/useFirebaseChat.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  updateDoc,
  doc,
  arrayUnion,
  DocumentData,
  QuerySnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
  read?: boolean;
}

interface SendMessageData {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

interface UseFirebaseChatReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (data: SendMessageData) => Promise<string>;
  markAsRead: (messageId: string, userId: string) => Promise<void>;
  sendTypingStatus?: (isTyping: boolean) => Promise<void>;
}

export const useFirebaseChat = (chatId: string | null): UseFirebaseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`📡 Setting up Firebase listener for chat: ${chatId}`);

    try {
      // CORRECTED PATH: chatRooms/{chatId}/messages
      const messagesRef = collection(db, 'chatRooms', chatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

      const unsubscribe = onSnapshot(messagesQuery, 
        (snapshot: QuerySnapshot<DocumentData>) => {
          console.log(`📥 Received ${snapshot.docs.length} messages for chat ${chatId}`);
          
          const messagesData: Message[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            
            // Handle timestamp conversion safely
            let timestamp: Date;
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp?.toDate) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp) {
              timestamp = new Date(data.timestamp);
            } else {
              timestamp = new Date();
            }

            return {
              id: docSnap.id,
              senderId: data.senderId || data.sender_id || '',
              senderName: data.senderName || data.sender_name || 'Unknown',
              senderAvatar: data.senderAvatar || data.sender_avatar,
              content: data.content || data.message || '',
              messageType: data.messageType || data.type || 'text',
              fileUrl: data.fileUrl || data.file_url,
              fileName: data.fileName || data.file_name,
              fileSize: data.fileSize || data.file_size,
              readBy: data.readBy || data.read_by || [],
              read: data.read || false,
              timestamp: timestamp,
              metadata: data.metadata || {}
            };
          });
          
          setMessages(messagesData);
          setLoading(false);
        },
        (err) => {
          console.error('❌ Firebase snapshot error:', err);
          setError(`Failed to load messages: ${err.message}`);
          setLoading(false);
        }
      );

      return () => {
        console.log(`🔴 Unsubscribing from chat ${chatId}`);
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Error setting up chat listener:', err);
      setError(`Failed to connect to chat: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  }, [chatId]);

  // Send message
  const sendMessage = useCallback(async (messageData: SendMessageData): Promise<string> => {
    if (!chatId) {
      throw new Error('No chat ID provided');
    }

    console.log(`📤 Sending message to chat ${chatId}:`, messageData);

    try {
      // CORRECTED PATH: chatRooms/{chatId}/messages
      const messagesRef = collection(db, 'chatRooms', chatId, 'messages');
      
      const messagePayload = {
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        senderAvatar: messageData.senderAvatar || '',
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        fileUrl: messageData.fileUrl || '',
        fileName: messageData.fileName || '',
        fileSize: messageData.fileSize || 0,
        readBy: [messageData.senderId],
        read: false,
        timestamp: serverTimestamp(),
        metadata: messageData.metadata || {}
      };

      const docRef = await addDoc(messagesRef, messagePayload);
      
      // Also update the chat room's last message timestamp
      try {
        const chatRoomRef = doc(db, 'chatRooms', chatId);
        await updateDoc(chatRoomRef, {
          lastMessageAt: serverTimestamp(),
          lastMessage: messageData.content.substring(0, 100),
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.warn('⚠️ Failed to update chat room metadata:', updateError);
        // Continue anyway, this is not critical
      }

      console.log(`✅ Message sent with ID: ${docRef.id}`);
      return docRef.id;
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      throw new Error(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [chatId]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string, userId: string): Promise<void> => {
    if (!chatId || !messageId) {
      console.warn('⚠️ Cannot mark as read: missing chatId or messageId');
      return;
    }

    try {
      // CORRECTED PATH: chatRooms/{chatId}/messages/{messageId}
      const messageRef = doc(db, 'chatRooms', chatId, 'messages', messageId);
      
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
        read: true,
        readAt: serverTimestamp()
      });
      
      console.log(`✅ Message ${messageId} marked as read by ${userId}`);
    } catch (err) {
      console.error('❌ Error marking message as read:', err);
      throw new Error(`Failed to mark message as read: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [chatId]);

  // Optional: Send typing status
  const sendTypingStatus = useCallback(async (isTyping: boolean): Promise<void> => {
    if (!chatId) return;

    try {
      const chatRoomRef = doc(db, 'chatRooms', chatId);
      await updateDoc(chatRoomRef, {
        [`typing.${Date.now()}`]: {
          isTyping,
          timestamp: serverTimestamp()
        }
      });
    } catch (err) {
      console.error('❌ Error sending typing status:', err);
    }
  }, [chatId]);

  // Mark all messages as read for user
  const markAllAsRead = useCallback(async (userId: string): Promise<void> => {
    if (!chatId) return;

    try {
      const batchPromises = messages
        .filter(msg => !msg.readBy.includes(userId) && msg.senderId !== userId)
        .map(async (msg) => {
          const messageRef = doc(db, 'chatRooms', chatId, 'messages', msg.id);
          return updateDoc(messageRef, {
            readBy: arrayUnion(userId),
            read: true
          });
        });

      await Promise.all(batchPromises);
      console.log(`✅ All messages marked as read for user ${userId}`);
    } catch (err) {
      console.error('❌ Error marking all messages as read:', err);
    }
  }, [chatId, messages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    sendTypingStatus,
    markAllAsRead
  };
};

// Default export for convenience
export default useFirebaseChat;