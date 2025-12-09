// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import database connection
const connectDB = require('./config/database');

// Import controllers directly (no separate route files)
const {
  marketplaceController,
  offerController,
  chatController
} = require('./controller'); // Assuming your controllers are exported from controller/index.js

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (if needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes using controllers directly (no route files needed)
app.use('/api/marketplace', marketplaceController); // Use controller directly as router
app.use('/api/marketplace/offers', offerController); // Use controller directly
app.use('/api/marketplace/chat', chatController); // Use controller directly

// Health endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { checkHealth } = require('./config/database');
    const health = await checkHealth();
    
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: health.timestamp,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb: health.mongodb.status,
        firebase: health.firebase.initialized ? 'initialized' : 'not_initialized',
        firebase_services: health.firebase.services
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  const statusCode = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting WeCinema Marketplace Server...');
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
    console.log(`🔥 Firebase: ${process.env.FIREBASE_PROJECT_ID ? 'Configured' : 'Not configured'}`);
    
    // Connect to database
    await connectDB(process.env.MONGODB_URI);
    
    const PORT = process.env.PORT || 3000;
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🛒 Marketplace: http://localhost:${PORT}/api/marketplace`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/marketplace/chat`);
      console.log(`🔄 Ready to process requests...`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        const { closeConnections } = require('./config/database');
        await closeConnections();
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(async () => {
        const { closeConnections } = require('./config/database');
        await closeConnections();
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;