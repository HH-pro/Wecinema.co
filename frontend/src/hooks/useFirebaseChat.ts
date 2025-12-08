// src/hooks/useFirebaseChat.ts
import { useState, useEffect } from 'react';
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
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  readBy: string[];
  timestamp: Date;
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
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, 
        (snapshot: QuerySnapshot<DocumentData>) => {
          const messagesData: Message[] = snapshot.docs.map(doc => ({
            id: doc.id,
            senderId: doc.data().senderId,
            senderName: doc.data().senderName || 'Unknown',
            content: doc.data().content,
            messageType: doc.data().messageType || 'text',
            fileUrl: doc.data().fileUrl,
            fileName: doc.data().fileName,
            fileSize: doc.data().fileSize,
            readBy: doc.data().readBy || [],
            timestamp: doc.data().timestamp?.toDate() || new Date()
          }));
          
          setMessages(messagesData);
          setLoading(false);
        },
        (err) => {
          console.error('Firebase snapshot error:', err);
          setError('Failed to load messages');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up chat listener:', err);
      setError('Failed to connect to chat');
      setLoading(false);
    }
  }, [chatId]);

  // Send message
  const sendMessage = async (messageData: {
    senderId: string;
    senderName: string;
    content: string;
    messageType?: 'text' | 'image' | 'file' | 'system';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }): Promise<void> => {
    if (!chatId) {
      throw new Error('No chat ID provided');
    }

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        ...messageData,
        readBy: [messageData.senderId],
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
      throw new Error('Failed to send message');
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string, userId: string): Promise<void> => {
    if (!chatId) return;

    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (err) {
      console.error('Error marking message as read:', err);
      throw new Error('Failed to mark message as read');
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead
  };
};