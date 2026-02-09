const mongoose = require('mongoose');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Database');

/**
 * Database connection states
 * @readonly
 * @enum {number}
 */
const ConnectionState = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  CONNECTING: 2,
  DISCONNECTING: 3,
};

/**
 * Mongoose connection configuration options
 * @type {mongoose.ConnectOptions}
 */
const MONGOOSE_OPTIONS = {
  dbName: process.env.MONGODB_DB_NAME || 'wecinemaDB_test',
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 2,
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT, 10) || 5000,
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT, 10) || 45000,
  connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT, 10) || 10000,
  retryWrites: true,
  retryReads: true,
};

/**
 * Validates MongoDB connection URL format
 * @param {string} url - MongoDB connection URL
 * @returns {boolean}
 */
const isValidMongoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const mongoUrlPattern = /^mongodb(\+srv)?:\/\/.+/;
  return mongoUrlPattern.test(url);
};

/**
 * Get current connection state
 * @returns {string}
 */
const getConnectionState = () => {
  const state = mongoose.connection.readyState;
  const stateMap = {
    [ConnectionState.DISCONNECTED]: 'disconnected',
    [ConnectionState.CONNECTED]: 'connected',
    [ConnectionState.CONNECTING]: 'connecting',
    [ConnectionState.DISCONNECTING]: 'disconnecting',
  };
  return stateMap[state] || 'unknown';
};

/**
 * Check if database is connected
 * @returns {boolean}
 */
const isConnected = () => mongoose.connection.readyState === ConnectionState.CONNECTED;

/**
 * Establish connection to MongoDB
 * @param {string} databaseURL - MongoDB connection string
 * @returns {Promise<typeof mongoose>}
 * @throws {Error}
 */
const connect = async (databaseURL) => {
  if (!isValidMongoUrl(databaseURL)) {
    const error = new Error('Invalid MongoDB connection URL provided');
    logger.error('Database connection failed: Invalid URL format');
    throw error;
  }

  if (isConnected()) {
    logger.warn('Database already connected, skipping connection attempt');
    return mongoose;
  }

  try {
    logger.info('Initiating database connection...');
    
    const connection = await mongoose.connect(databaseURL, MONGOOSE_OPTIONS);
    
    logger.info('Database connection established successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
    });

    return connection;
  } catch (error) {
    logger.error('Database connection failed', {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Gracefully close database connection
 * @returns {Promise<void>}
 */
const disconnect = async () => {
  if (!isConnected()) {
    logger.warn('No active database connection to close');
    return;
  }

  try {
    logger.info('Closing database connection...');
    await mongoose.connection.close();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection', { error: error.message });
    throw error;
  }
};

/**
 * Setup connection event handlers
 */
const setupEventHandlers = () => {
  mongoose.connection.on('connected', () => {
    logger.info('Mongoose connected to database');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('Mongoose connection error', { error: error.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose disconnected from database');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Mongoose reconnected to database');
  });

  process.on('SIGINT', async () => {
    await disconnect();
    process.exit(0);
  });
};

// Initialize event handlers
setupEventHandlers();

module.exports = {
  connect,
  disconnect,
  isConnected,
  getConnectionState,
  mongoose,
};