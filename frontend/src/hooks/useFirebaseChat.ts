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
import { firestore } from '../firebase/config'; // Change import from db to firestore

// ... rest of your code remains the same, just change the db references:
export const useFirebaseChat = (chatId: string | null) => {
  // ...

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
        collection(firestore, 'chats', chatId, 'messages'), // Change db to firestore
        orderBy('timestamp', 'asc')
      );

      // ... rest of the code
    }
    // ...
  }, [chatId]);

  const sendMessage = async (messageData: {
    // ...
  }): Promise<void> => {
    if (!chatId) {
      throw new Error('No chat ID provided');
    }

    try {
      await addDoc(collection(firestore, 'chats', chatId, 'messages'), { // Change db to firestore
        // ...
      });
    } catch (err) {
      // ...
    }
  };

  const markAsRead = async (messageId: string, userId: string): Promise<void> => {
    if (!chatId) return;

    try {
      const messageRef = doc(firestore, 'chats', chatId, 'messages', messageId); // Change db to firestore
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (err) {
      // ...
    }
  };

  // ...
};