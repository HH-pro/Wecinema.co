// firebaseConfig.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../backend/src/serviceAccount.json'); // You need to download this from Firebase Console

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://wecinema-21d00.firebaseio.com", // Add your database URL
      projectId: "wecinema-21d00"
    });
  }
  
  const database = admin.database();
  const auth = admin.auth();
  
  module.exports = { admin, database, auth };
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  module.exports = { admin: null, database: null, auth: null };
}