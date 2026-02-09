// backend/src/config/config.js
const mongoose = require('mongoose');

/**
 * MongoDB connection configuration
 * @module config/database
 */

const DEFAULT_OPTIONS = {
  dbName: process.env.MONGODB_DB_NAME || 'wecinemaDB',
  maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
};

/**
 * Connect to MongoDB database
 * @param {string} databaseURL - MongoDB connection string
 * @returns {Promise<typeof mongoose>} Mongoose instance
 * @throws {Error} If connection fails
 */
async function connectToMongoDB(databaseURL) {
  if (!databaseURL) {
    throw new Error('Database URL is required');
  }

  // Remove deprecated options (handled automatically in Mongoose 6+)
  const options = {
    ...DEFAULT_OPTIONS,
  };

  // Connection event handlers
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
  });

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Closing MongoDB connection...`);
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

  try {
    const connection = await mongoose.connect(databaseURL, options);
    
    // Log connection details (hide credentials)
    const sanitizedUrl = databaseURL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`📊 Database: ${options.dbName}`);
    console.log(`🔌 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
    
    return connection;
  } catch (error) {
    console.error('💥 Database connection failed:', error.message);
    
    // Provide helpful error messages for common issues
    if (error.name === 'MongoServerError' && error.code === 8000) {
      console.error('Authentication failed. Check your credentials.');
    } else if (error.name === 'MongoNetworkError') {
      console.error('Network error. Check your connection string and network access.');
    }
    
    throw error;
  }
}

/**
 * Disconnect from MongoDB (useful for testing)
 * @returns {Promise<void>}
 */
async function disconnectFromMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed manually');
  }
}

/**
 * Check if MongoDB is connected
 * @returns {boolean}
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectToMongoDB,
  disconnectFromMongoDB,
  isConnected,
};