// config/database.js
const mongoose = require("mongoose");
const admin = require("firebase-admin");

/**
 * Main function to connect to MongoDB and initialize Firebase
 * @param {string} databaseURL - MongoDB connection string
 * @returns {Promise<mongoose.Mongoose>} Mongoose instance
 */
async function connectDB(databaseURL) {
  // MongoDB connection options
  const options = {
    dbName: process.env.DB_NAME || "wecinemaDB",
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  console.log(`🔗 Connecting to MongoDB...`);

  try {
    // Connect to MongoDB
    const mongooseInstance = await mongoose.connect(databaseURL, options);
    
    console.log("✅ MongoDB Connected Successfully!");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🏷️ Host: ${mongoose.connection.host}`);
    console.log(`📈 Port: ${mongoose.connection.port}`);
    
    // Initialize Firebase after MongoDB is connected
    await initializeFirebase();
    
    // Set up connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("👋 MongoDB connection closed through app termination");
      process.exit(0);
    });

    return mongooseInstance;
    
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

/**
 * Initialize Firebase Admin SDK
 * @returns {Promise<admin.app.App|null>} Firebase app instance or null
 */
async function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log("✅ Firebase already initialized");
      return admin.app();
    }

    // Check for required environment variables
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL', 
      'FIREBASE_PRIVATE_KEY',
      'FIREBASE_DATABASE_URL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️ Missing Firebase environment variables: ${missingVars.join(', ')}`);
      console.warn("⚠️ Firebase features will be disabled");
      return null;
    }

    console.log(`🔥 Initializing Firebase Admin SDK...`);

    // Prepare service account credentials
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "f08306fa7ba1a4cb5d65693ab63953c1dfe4f458",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || "111883497657450145565",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-bh6ix%40wecinema-21d00.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    };

    // Initialize Firebase
    const firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log("✅ Firebase Admin SDK Initialized!");
    console.log(`🔥 Project: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`🔗 Database: ${process.env.FIREBASE_DATABASE_URL}`);
    
    // Test Firebase connections
    await testFirebaseConnections();
    
    return firebaseApp;
    
  } catch (error) {
    console.error("❌ Firebase Initialization Failed:", error.message);
    console.error("Full error:", error);
    return null;
  }
}

/**
 * Test Firebase connections (Firestore & Realtime Database)
 */
async function testFirebaseConnections() {
  try {
    // Test Firestore
    const firestore = admin.firestore();
    const firestoreTestRef = firestore.collection("connection_tests").doc("test");
    
    await firestoreTestRef.set({
      timestamp: new Date().toISOString(),
      status: "connected",
      test: "firestore"
    });
    
    console.log("✅ Firestore: Connection test successful");
    
    // Cleanup
    await firestoreTestRef.delete();
    
    // Test Realtime Database
    const database = admin.database();
    const rtdbTestRef = database.ref("connection_tests/test");
    
    await rtdbTestRef.set({
      timestamp: new Date().toISOString(),
      status: "connected",
      test: "realtime_database"
    });
    
    console.log("✅ Realtime Database: Connection test successful");
    
    // Cleanup
    await rtdbTestRef.remove();
    
    console.log("🎉 All Firebase services are working!");
    
  } catch (error) {
    console.warn("⚠️ Firebase connection test failed:", error.message);
  }
}

/**
 * Get Firebase Admin instance
 * @returns {admin.app.App} Firebase admin instance
 */
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin;
}

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore} Firestore instance
 */
function getFirestore() {
  if (admin.apps.length === 0) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin.firestore();
}

/**
 * Get Realtime Database instance
 * @returns {admin.database.Database} Realtime Database instance
 */
function getDatabase() {
  if (admin.apps.length === 0) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin.database();
}

/**
 * Check health of all services
 * @returns {Promise<Object>} Health status object
 */
async function checkHealth() {
  const health = {
    timestamp: new Date().toISOString(),
    mongodb: {
      status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      readyState: mongoose.connection.readyState,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host
    },
    firebase: {
      initialized: admin.apps.length > 0,
      services: {}
    }
  };

  // Check Firebase services if initialized
  if (admin.apps.length > 0) {
    try {
      const firestore = admin.firestore();
      const firestoreTest = firestore.collection("health_checks").doc("test");
      await firestoreTest.set({ timestamp: new Date().toISOString() });
      await firestoreTest.delete();
      health.firebase.services.firestore = "healthy";
    } catch (error) {
      health.firebase.services.firestore = "unhealthy";
      health.firebase.services.firestore_error = error.message;
    }

    try {
      const database = admin.database();
      const dbRef = database.ref("health_checks/test");
      await dbRef.set({ timestamp: new Date().toISOString() });
      await dbRef.remove();
      health.firebase.services.realtime_database = "healthy";
    } catch (error) {
      health.firebase.services.realtime_database = "unhealthy";
      health.firebase.services.realtime_database_error = error.message;
    }
  }

  return health;
}

/**
 * Close all database connections
 */
async function closeConnections() {
  try {
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
    }
    
    // Firebase connections don't need explicit closing
    console.log("✅ All connections closed");
    
  } catch (error) {
    console.error("❌ Error closing connections:", error);
  }
}

// Export main function as default
module.exports = connectDB;

// Export helper functions
module.exports.initializeFirebase = initializeFirebase;
module.exports.getFirebaseAdmin = getFirebaseAdmin;
module.exports.getFirestore = getFirestore;
module.exports.getDatabase = getDatabase;
module.exports.checkHealth = checkHealth;
module.exports.closeConnections = closeConnections;
module.exports.admin = admin;
module.exports.mongoose = mongoose;

// Also export as connectToMongoDB for backward compatibility
module.exports.connectToMongoDB = connectDB;