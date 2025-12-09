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
  limit,
  where,
  getDocs
} from 'firebase/firestore';
import { firestore } from '../firebase/config';

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
  read?: boolean;
  metadata?: Record<string, any>;
}

interface SendMessageParams {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export const useFirebaseChat = (chatId: string | null) => {
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

    try {
      const messagesQuery = query(
        collection(firestore, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(messagesQuery, 
        (snapshot: QuerySnapshot<DocumentData>) => {
          const messagesData: Message[] = snapshot.docs.map(doc => {
            const data = doc.data();
            
            // Ensure all fields have proper values, handle undefined
            return {
              id: doc.id,
              senderId: data.senderId || '',
              senderName: data.senderName || 'Unknown',
              senderAvatar: data.senderAvatar || '',
              content: data.content || '',
              messageType: data.messageType || 'text',
              fileUrl: data.fileUrl || undefined,
              fileName: data.fileName || undefined,
              fileSize: data.fileSize || undefined,
              readBy: data.readBy || [],
              timestamp: data.timestamp?.toDate() || new Date(),
              read: data.read || false,
              metadata: data.metadata || {}
            };
          });
          
          setMessages(messagesData);
          setLoading(false);
        },
        (err) => {
          console.error('Firebase snapshot error:', err);
          setError('Failed to load messages: ' + err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error setting up chat listener:', err);
      setError('Failed to connect to chat: ' + err.message);
      setLoading(false);
    }
  }, [chatId]);

  // Send message with proper data cleaning
  const sendMessage = useCallback(async (params: SendMessageParams): Promise<boolean> => {
    if (!chatId) {
      setError('No chat ID provided');
      return false;
    }

    try {
      console.log('Sending message with params:', params);
      
      // Clean up parameters - ensure no undefined values for Firebase
      const messageData: any = {
        senderId: params.senderId || '',
        senderName: params.senderName || 'User',
        senderAvatar: params.senderAvatar || null, // Use null instead of undefined
        content: params.content || '',
        messageType: params.messageType || 'text',
        readBy: [params.senderId],
        timestamp: serverTimestamp(),
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add optional fields only if they exist
      if (params.fileUrl) messageData.fileUrl = params.fileUrl;
      if (params.fileName) messageData.fileName = params.fileName;
      if (params.fileSize) messageData.fileSize = params.fileSize;

      // Clean metadata - remove undefined values
      if (params.metadata) {
        messageData.metadata = {};
        Object.keys(params.metadata).forEach(key => {
          const value = params.metadata![key];
          if (value !== undefined && value !== null) {
            messageData.metadata[key] = value;
          }
        });
      } else {
        messageData.metadata = {};
      }

      console.log('Clean message data for Firebase:', messageData);

      await addDoc(collection(firestore, 'chats', chatId, 'messages'), messageData);
      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message: ' + err.message);
      return false;
    }
  }, [chatId]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string, userId: string): Promise<boolean> => {
    if (!chatId) return false;

    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId),
        read: true
      });
      return true;
    } catch (err: any) {
      console.error('Error marking message as read:', err);
      return false;
    }
  }, [chatId]);

  // Mark all messages as read for current user
  const markAllAsRead = useCallback(async (userId: string): Promise<boolean> => {
    if (!chatId || !userId) return false;

    try {
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const q = query(
        messagesRef,
        where('read', '==', false),
        where('senderId', '!=', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const updatePromises: Promise<void>[] = [];

      querySnapshot.forEach((docSnap) => {
        const updatePromise = updateDoc(doc(firestore, 'chats', chatId, 'messages', docSnap.id), {
          readBy: arrayUnion(userId),
          read: true,
          readAt: serverTimestamp()
        });
        updatePromises.push(updatePromise);
      });

      await Promise.all(updatePromises);
      return true;
    } catch (err: any) {
      console.error('Error marking all messages as read:', err);
      return false;
    }
  }, [chatId]);

  // Send typing status
  const sendTypingStatus = useCallback(async (isTyping: boolean, userId: string): Promise<boolean> => {
    if (!chatId) return false;

    try {
      const chatRef = doc(firestore, 'chats', chatId);
      await updateDoc(chatRef, {
        isTyping: isTyping,
        typingUserId: userId,
        typingUpdatedAt: serverTimestamp()
      });
      return true;
    } catch (err: any) {
      console.error('Error sending typing status:', err);
      return false;
    }
  }, [chatId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    markAllAsRead,
    sendTypingStatus
  };
};