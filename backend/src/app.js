
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const cron = require('node-cron');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');


const { config } = require('./config');
const { connect } = require('./config/database');
const { createLogger } = require('./utils/logger');
const { globalErrorHandler, notFoundHandler } = require('./middleware');
const { initializeServices } = require('../services');

// Route imports
const {
  videoRoutes,
  userRoutes,
  domainRoutes,
  sentryRoutes,
  listingRoutes,
  orderRoutes,
  offerRoutes,
  chatRoutes,
  paymentRoutes,
  stripeRoutes,
} = require('./routes');

const logger = createLogger('App');
const app = express();

// ============== Sentry Initialization ==============
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: config.isProduction ? 0.1 : 1.0,
    profilesSampleRate: config.isProduction ? 0.1 : 1.0,
  });
  
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ============== Security Middleware ==============
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: config.isProduction ? undefined : false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ status: 'error', message: options.message });
  },
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  skipSuccessfulRequests: true,
});
app.use('/api/user/login', authLimiter);
app.use('/api/user/register', authLimiter);

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// ============== CORS Configuration ==============
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ============== Body Parsing ==============
// Stripe webhook needs raw body
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============== Compression ==============
app.use(compression());

// ============== Logging ==============
if (config.isDevelopment) {
  app.use(morgan('dev'));
}

// Request logging middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ============== Health Check ==============
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// ============== API Routes ==============
app.use('/api/video', videoRoutes);
app.use('/api/user', userRoutes);
app.use('/api/domain', domainRoutes);
app.use('/api/sentry', sentryRoutes);

// Marketplace Routes
app.use('/api/marketplace/listings', listingRoutes);
app.use('/api/marketplace/orders', orderRoutes);
app.use('/api/marketplace/offers', offerRoutes);
app.use('/api/marketplace/chat', chatRoutes);
app.use('/api/marketplace/payments', paymentRoutes);
app.use('/api/marketplace/stripe', stripeRoutes);

// ============== 404 Handler ==============
app.use(notFoundHandler);

// ============== Error Handling ==============
if (config.sentry.dsn) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(globalErrorHandler);

// ============== Scheduled Tasks ==============
if (config.cron.enabled) {
  cron.schedule('0 9 * * *', async () => {
    try {
      logger.info('Running daily expiration check...');
      await initializeServices.expirationCheck();
      logger.info('Expiration check completed');
    } catch (error) {
      logger.error('Expiration check failed', { error: error.message });
      Sentry.captureException(error);
    }
  });
}

// ============== Server Initialization ==============
const startServer = async () => {
  try {
    // Connect to database
    await connect(config.database.uri);
    logger.info('Database connected successfully');

    // Initialize external services
    await initializeServices();
    logger.info('External services initialized');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        port: config.port,
        env: config.env,
        url: `http://localhost:${config.port}`,
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', { error: err.message });
      Sentry.captureException(err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('UNCAUGHT EXCEPTION! Shutting down...', { error: err.message });
      Sentry.captureException(err);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Process terminated');
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { app, startServer };