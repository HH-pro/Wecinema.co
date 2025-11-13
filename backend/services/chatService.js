// services/chatService.js
const { db, collection, addDoc, updateDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp, arrayUnion } = require('./firebase');

class FirebaseChatService {
  // ✅ Create new chat in Firebase
  async createFirebaseChat(mongoChatId, participants, orderId, listingId) {
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        mongoChatId: mongoChatId,
        participants: participants,
        orderId: orderId,
        listingId: listingId,
        status: 'active',
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp()
      });

      return chatRef.id;
    } catch (error) {
      console.error('Error creating Firebase chat:', error);
      throw error;
    }
  }

  // ✅ Send message to Firebase
  async sendMessage(chatId, messageData) {
    try {
      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        ...messageData,
        timestamp: serverTimestamp(),
        readBy: [messageData.senderId] // Sender automatically reads the message
      });

      // Update last message in chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: messageData.content.substring(0, 100),
        lastMessageAt: serverTimestamp()
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // ✅ Get real-time messages
  subscribeToMessages(chatId, callback) {
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  }

  // ✅ Mark message as read
  async markAsRead(chatId, messageId, userId) {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }
}

module.exports = new FirebaseChatService();