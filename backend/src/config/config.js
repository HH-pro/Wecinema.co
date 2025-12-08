// config/database.js or utils/dbConnection.js
const mongoose = require("mongoose");
const admin = require("firebase-admin");

/**
 * Connect to MongoDB and initialize Firebase
 */
async function connectDB(databaseURL) { // ✅ Changed name to connectDB
  const options = {
    dbName: "wecinemaDB_test",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    console.log(`🔗 Connecting to MongoDB...`);
    const mongooseInstance = await mongoose.connect(databaseURL, options);
    console.log("✅ MongoDB Connected Successfully!");
    
    // Initialize Firebase
    await initializeFirebase();
    
    return mongooseInstance;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error;
  }
}

/**
 * Initialize Firebase
 */
async function initializeFirebase() {
  try {
    if (admin.apps.length > 0) {
      console.log("✅ Firebase already initialized");
      return;
    }

    // Check environment variables
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.warn("⚠️  Firebase private key not found. Firebase disabled.");
      return;
    }

    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log("✅ Firebase Admin SDK Initialized!");
    
  } catch (error) {
    console.error("❌ Firebase Initialization Error:", error.message);
  }
}

/**
 * Get Firebase services
 */
function getFirebaseAdmin() {
  return admin.apps.length > 0 ? admin : null;
}

function getFirestore() {
  return admin.apps.length > 0 ? admin.firestore() : null;
}

function getDatabase() {
  return admin.apps.length > 0 ? admin.database() : null;
}

// ✅ Export as default function (connectDB)
module.exports = connectDB;

// ✅ Also export other functions as properties
module.exports.initializeFirebase = initializeFirebase;
module.exports.getFirebaseAdmin = getFirebaseAdmin;
module.exports.getFirestore = getFirestore;
module.exports.getDatabase = getDatabase;
module.exports.admin = admin;