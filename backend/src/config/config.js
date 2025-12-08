const mongoose = require("mongoose");
const admin = require("firebase-admin");

/**
 * Connect to a MongoDB database using Mongoose.
 * @param {string} databaseURL - The URL of the MongoDB database to connect to.
 * @returns {Promise<mongoose.Mongoose>} A promise that resolves with the Mongoose instance upon successful connection.
 */
async function connectToMongoDB(databaseURL) {
	// Define Mongoose connection options.
	const options = {
		dbName: "wecinemaDB_test",
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// Additional options can be added here if needed.
	};

	try {
		// Attempt to connect to the MongoDB database.
		const mongooseInstance = await mongoose.connect(databaseURL, options);
		console.log("✅ DB CONNECTION SUCCESSFUL!");
		console.log("📊 Database:", databaseURL);
		
		// Initialize Firebase after MongoDB connection
		await initializeFirebase();
		
		return mongooseInstance;
	} catch (error) {
		// Handle connection errors.
		console.error(
			`❌ An error occurred while connecting to the database: ${error}`
		);
		throw error;
	}
}

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase() {
	try {
		// Check if Firebase is already initialized
		if (admin.apps.length > 0) {
			console.log("✅ Firebase already initialized");
			return admin.app();
		}

		// Load environment variables
		require('dotenv').config();
		
		// Check for required Firebase environment variables
		const requiredVars = [
			'FIREBASE_PROJECT_ID',
			'FIREBASE_CLIENT_EMAIL', 
			'FIREBASE_PRIVATE_KEY',
			'FIREBASE_DATABASE_URL'
		];
		
		const missingVars = requiredVars.filter(varName => !process.env[varName]);
		
		if (missingVars.length > 0) {
			console.warn(`⚠️  Missing Firebase environment variables: ${missingVars.join(', ')}`);
			console.warn("⚠️  Firebase features will be disabled");
			return null;
		}

		// Create service account configuration
		const serviceAccount = {
			type: 'service_account',
			project_id: process.env.FIREBASE_PROJECT_ID,
			private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'f08306fa7ba1a4cb5d65693ab63953c1dfe4f458',
			private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
			client_email: process.env.FIREBASE_CLIENT_EMAIL,
			client_id: process.env.FIREBASE_CLIENT_ID || '111883497657450145565',
			auth_uri: 'https://accounts.google.com/o/oauth2/auth',
			token_uri: 'https://oauth2.googleapis.com/token',
			auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
			client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-bh6ix%40wecinema-21d00.iam.gserviceaccount.com',
			universe_domain: 'googleapis.com'
		};

		// Initialize Firebase Admin SDK
		const firebaseApp = admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			databaseURL: process.env.FIREBASE_DATABASE_URL
		});

		console.log("✅ Firebase Admin SDK initialized successfully!");
		console.log("🔥 Firebase Project:", process.env.FIREBASE_PROJECT_ID);
		console.log("🔗 Database URL:", process.env.FIREBASE_DATABASE_URL);
		
		// Test Firebase connections
		await testFirebaseConnections();
		
		return firebaseApp;
		
	} catch (error) {
		console.error("❌ Firebase initialization failed:", error.message);
		console.log("⚠️  Firebase features will be disabled");
		return null;
	}
}

/**
 * Test Firebase connections
 */
async function testFirebaseConnections() {
	try {
		// Test Realtime Database
		const rtdb = admin.database();
		const testRef = rtdb.ref('connection_test');
		await testRef.set({ 
			timestamp: new Date().toISOString(),
			status: 'connected'
		});
		console.log("✅ Realtime Database connected");
		
		// Cleanup test data
		await testRef.remove();
		
		// Test Firestore
		const firestore = admin.firestore();
		const firestoreTest = firestore.collection('connection_tests').doc('test');
		await firestoreTest.set({
			timestamp: new Date().toISOString(),
			status: 'connected'
		});
		console.log("✅ Firestore connected");
		
		// Cleanup
		await firestoreTest.delete();
		
		console.log("🎉 All Firebase services connected successfully!");
		
	} catch (error) {
		console.error("⚠️  Firebase connection test failed:", error.message);
	}
}

/**
 * Get Firebase Admin instance
 */
function getFirebaseAdmin() {
	if (admin.apps.length === 0) {
		throw new Error('Firebase not initialized. Call initializeFirebase() first.');
	}
	return admin;
}

/**
 * Get Firestore instance
 */
function getFirestore() {
	if (admin.apps.length === 0) {
		throw new Error('Firebase not initialized. Call initializeFirebase() first.');
	}
	return admin.firestore();
}

/**
 * Get Realtime Database instance
 */
function getDatabase() {
	if (admin.apps.length === 0) {
		throw new Error('Firebase not initialized. Call initializeFirebase() first.');
	}
	return admin.database();
}

/**
 * Health check for Firebase services
 */
async function checkFirebaseHealth() {
	try {
		if (admin.apps.length === 0) {
			return {
				status: 'not_initialized',
				message: 'Firebase not initialized'
			};
		}

		// Test Firestore
		const firestore = admin.firestore();
		const firestoreHealth = await firestore.collection('health_checks').doc('test').get();
		
		// Test Realtime Database
		const rtdb = admin.database();
		const rtdbRef = rtdb.ref('health_check');
		await rtdbRef.set({ timestamp: new Date().toISOString() });
		await rtdbRef.remove();
		
		return {
			status: 'healthy',
			services: {
				firestore: 'connected',
				realtime_database: 'connected',
				project_id: process.env.FIREBASE_PROJECT_ID,
				database_url: process.env.FIREBASE_DATABASE_URL
			}
		};
		
	} catch (error) {
		return {
			status: 'unhealthy',
			message: error.message,
			services: {
				firestore: 'error',
				realtime_database: 'error'
			}
		};
	}
}

module.exports = {
	connectToMongoDB,
	initializeFirebase,
	getFirebaseAdmin,
	getFirestore,
	getDatabase,
	checkFirebaseHealth,
	admin // Export admin for direct use if needed
};