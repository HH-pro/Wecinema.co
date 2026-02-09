const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Firebase');

/**
 * Validate required Firebase configuration
 * @param {Object} config 
 * @returns {boolean}
 */
const validateConfig = (config) => {
  const required = ['project_id', 'private_key', 'client_email'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing Firebase config fields: ${missing.join(', ')}`);
    return false;
  }
  return true;
};

/**
 * Load service account from file or environment
 * @returns {Object|null}
 */
const loadServiceAccount = () => {
  // Method 1: Service account file (recommended for production)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(process.cwd(), 'config', 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const account = require(serviceAccountPath);
      logger.info('Loaded Firebase service account from file');
      return account;
    } catch (error) {
      logger.error('Failed to load service account file', { error: error.message });
    }
  }

  // Method 2: Base64 encoded JSON (for CI/CD, Docker, Heroku)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 
        'base64'
      ).toString('utf8');
      const account = JSON.parse(decoded);
      logger.info('Loaded Firebase service account from environment (base64)');
      return account;
    } catch (error) {
      logger.error('Failed to decode base64 service account', { error: error.message });
    }
  }

  // Method 3: Individual environment variables (fallback)
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const config = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    };

    if (validateConfig(config)) {
      logger.info('Loaded Firebase config from environment variables');
      return config;
    }
  }

  return null;
};

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App|null}
 */
const initializeFirebase = () => {
  // Return existing app if already initialized
  if (admin.apps.length > 0) {
    logger.debug('Using existing Firebase app');
    return admin.app();
  }

  const serviceAccount = loadServiceAccount();

  if (!serviceAccount) {
    logger.warn('Firebase service account not configured. Firebase features disabled.');
    return null;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 
        `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 
        `${serviceAccount.project_id}.appspot.com`,
    });

    logger.info('Firebase Admin SDK initialized', { 
      projectId: serviceAccount.project_id 
    });

    return app;
  } catch (error) {
    logger.error('Firebase initialization failed', { error: error.message });
    return null;
  }
};

// Initialize on module load
const firebaseApp = initializeFirebase();

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
const isInitialized = () => !!firebaseApp;

/**
 * Get Firebase Auth instance
 * @returns {admin.auth.Auth|null}
 */
const getAuth = () => {
  if (!isInitialized()) {
    logger.warn('Firebase not initialized, cannot get Auth');
    return null;
  }
  return admin.auth();
};

/**
 * Get Firebase Firestore instance
 * @returns {admin.firestore.Firestore|null}
 */
const getFirestore = () => {
  if (!isInitialized()) {
    logger.warn('Firebase not initialized, cannot get Firestore');
    return null;
  }
  return admin.firestore();
};

/**
 * Get Firebase Realtime Database instance
 * @returns {admin.database.Database|null}
 */
const getDatabase = () => {
  if (!isInitialized()) {
    logger.warn('Firebase not initialized, cannot get Database');
    return null;
  }
  return admin.database();
};

/**
 * Get Firebase Storage instance
 * @returns {admin.storage.Storage|null}
 */
const getStorage = () => {
  if (!isInitialized()) {
    logger.warn('Firebase not initialized, cannot get Storage');
    return null;
  }
  return admin.storage();
};

/**
 * Verify Firebase ID token
 * @param {string} idToken 
 * @returns {Promise<admin.auth.DecodedIdToken|null>}
 */
const verifyIdToken = async (idToken) => {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Auth not available');
  }

  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  admin,
  firebaseApp,
  isInitialized,
  getAuth,
  getFirestore,
  getDatabase,
  getStorage,
  verifyIdToken,
};