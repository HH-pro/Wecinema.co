// firebaseConfig.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let adminApp = null;

try {
  if (!admin.apps.length) {
    // Try multiple methods
    const serviceAccountPath = require("../backend/src/serviceAccountKey.json");
    
    if (fs.existsSync(serviceAccountPath)) {
      // Method 1: File se
      const serviceAccount = require(serviceAccountPath);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://wecinema-21d00.firebaseio.com"
      });
      console.log("✅ Firebase initialized from file");
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Method 2: Environment variable se
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://wecinema-21d00.firebaseio.com"
      });
      console.log("✅ Firebase initialized from env variable");
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      // Method 3: Direct env variables se
      const firebaseConfig = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "wecinema-21d00",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };
      
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: "https://wecinema-21d00.firebaseio.com"
      });
      console.log("✅ Firebase initialized from env config");
    } else {
      // Method 4: Without credentials (limited functionality)
      adminApp = admin.initializeApp({
        databaseURL: "https://wecinema-21d00.firebaseio.com",
        projectId: "wecinema-21d00"
      });
      console.log("⚠️ Firebase initialized without credentials (limited access)");
    }
  } else {
    adminApp = admin.apps[0];
    console.log("✅ Firebase Admin SDK already initialized");
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
  adminApp = null;
}

// Export
module.exports = { 
  admin: adminApp, 
  database: adminApp ? adminApp.database() : null, 
  auth: adminApp ? admin.auth() : null,
  isInitialized: !!adminApp 
};