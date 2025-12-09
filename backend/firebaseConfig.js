// firebaseConfig.js
const admin = require('firebase-admin');
require('dotenv').config(); // ✅ IMPORTANT: .env load karein

let adminApp = null;

try {
  if (!admin.apps.length) {
    // Check if all required environment variables are present
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing Firebase environment variables: ${missingVars.join(', ')}`);
      console.warn('⚠️ Firebase features will be disabled');
    } else {
      // Initialize with environment variables
      const firebaseConfig = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://wecinema-21d00.firebaseio.com",
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      console.log("✅ Firebase Admin SDK initialized successfully");
    }
  } else {
    adminApp = admin.apps[0];
    console.log("✅ Firebase Admin SDK already initialized");
  }
} catch (error) {
  console.error("❌ Firebase Admin initialization error:", error.message);
}

const database = adminApp ? adminApp.database() : null;
const auth = adminApp ? admin.auth() : null;

module.exports = { 
  admin: adminApp, 
  database, 
  auth,
  isInitialized: !!adminApp 
};