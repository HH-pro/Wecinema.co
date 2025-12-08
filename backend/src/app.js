const express = require("express");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const morgan = require("morgan");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");

// Import database connection
const connectDB = require("./config/config"); // ✅ Updated path

// Import controllers
const {
  VideoController,
  UserController,
  domainController,
  sentryRouter,
  listingRoutes,
  orderRoutes, 
  offerRoutes,
  chatRoutes,
  paymentRoutes,
  stripeRoutes
} = require("./controller");

// Import expiration service
require("../services/expirationService");

const app = express();

// ✅ Initialize Sentry
Sentry.init({
  dsn: "https://ffba1b70eb56e50557f3a75a5899e7ab@o4509361947148288.ingest.us.sentry.io/4509361953177600",
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

// ✅ Request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Security headers
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use(morgan("dev"));

// ✅ CORS configuration
const allowedOrigins = [
  "http://www.wecinema.co",
  "https://www.wecinema.co",
  "https://www.wecinema.co/api",
  "http://wecinema.co",
  "http://wecinema.co/api",
  "https://wecinema.co",
  "http://localhost:3000",
  "http://localhost:5173", // ✅ Added for frontend
  "https://wecinema-admin.onrender.com",
  "https://wecinema-main.vercel.app",
  "https://wecinema-21d00.firebaseapp.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ✅ IMPORTANT: Stripe webhook requires raw body parsing first
app.use("/webhook/stripe", express.raw({ type: 'application/json' }));

// ✅ Regular JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Default cookie middleware (optional)
app.use((req, res, next) => {
  res.cookie("token", "your-token-value", {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  });
  next();
});

// ✅ Debug logger (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log("📥 Request:", req.method, req.url);
    console.log("📦 Request body:", req.body);
    next();
  });
}

// ✅ Scheduled job: daily at 9 AM
cron.schedule("0 9 * * *", async () => {
  try {
    console.log("⏰ Running daily domain/hosting expiration check...");
    await axios.get("https://wecinema.co/api/check-expirations");
    console.log("✅ Expiration check completed");
  } catch (error) {
    console.error("❌ Error in scheduled expiration check:", error);
    Sentry.captureException(error);
  }
});

// ✅ API Routes with proper prefixes
app.use("/api/video", VideoController);
app.use("/api/user", UserController);
app.use("/api/domain", domainController);
app.use("/api/sentry", sentryRouter);

// ✅ Marketplace Routes with consistent API prefix
app.use("/api/marketplace/listings", listingRoutes);        // ✅ Correct prefix
app.use("/api/marketplace/orders", orderRoutes);           // ✅ Correct prefix  
app.use("/api/marketplace/offers", offerRoutes);           // ✅ Correct prefix
app.use("/api/marketplace/chat", chatRoutes);              // ✅ Correct prefix (singular chat)
app.use("/api/marketplace/payments", paymentRoutes);       // ✅ Correct prefix
app.use("/api/marketplace/stripe", stripeRoutes);          // ✅ Correct prefix

// ✅ Stripe Webhook Route (separate from API routes)
app.use("/webhook/stripe", stripeRoutes);  // ✅ Stripe webhook specific route

// ✅ Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const { checkHealth } = require("./config/database");
    const health = await checkHealth();
    
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb: health.mongodb.status,
        firebase: health.firebase.initialized ? 'initialized' : 'not_initialized'
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

// ✅ Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
    endpoints: {
      marketplace: '/api/marketplace',
      health: '/api/health',
      listings: '/api/marketplace/listings',
      offers: '/api/marketplace/offers',
      chat: '/api/marketplace/chat'
    }
  });
});

// ✅ 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/health',
      '/api/test',
      '/api/marketplace',
      '/api/marketplace/listings',
      '/api/marketplace/offers',
      '/api/marketplace/chat',
      '/api/marketplace/orders',
      '/api/user',
      '/api/video'
    ]
  });
});

// ✅ Error handler (Sentry first, then fallback)
app.use(Sentry.Handlers.errorHandler());
app.use((err, req, res, next) => {
  console.error("❌ Custom Error Handler:", err);
  
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

// ✅ Start server function
async function startServer() {
  try {
    console.log('🚀 Starting WeCinema Server...');
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to database using environment variable
    await connectDB(process.env.MONGODB_URI);
    
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/marketplace/chat`);
      console.log(`🛒 Marketplace: http://localhost:${PORT}/api/marketplace`);
      console.log(`🔄 Ready to process requests...`);
    });
    
    // ✅ Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      const { closeConnections } = require("./config/database");
      closeConnections().then(() => {
        console.log('✅ All connections closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      const { closeConnections } = require("./config/database");
      closeConnections().then(() => {
        console.log('✅ All connections closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ✅ Load environment variables and start server
require('dotenv').config();
startServer();

module.exports = app; // For testing