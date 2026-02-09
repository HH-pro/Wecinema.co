// backend/src/app.js
require('dotenv').config();

const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const axios = require('axios');

const { connectToMongoDB } = require('./config/config');
const {
  videoController,
  userController,
  domainController,
  sentryController,
  listingController,
  orderController,
  offerController,
  chatController,
  paymentController,
  stripeController,
} = require('./controller');

require('../services/expirationService');

const app = express();

// ================== Security Middleware ==================
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ================== Sentry Setup ==================
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// ================== Logging ==================
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ================== Stripe Webhook (Raw Body Parser) ==================
app.use('/webhook/stripe', express.raw({ type: 'application/json', verify: (req, res, buf) => { req.rawBody = buf; } }));

// ================== Body Parsers ==================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================== CORS Setup ==================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ================== Health Check ==================
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ================== Routes ==================
const API_PREFIX = process.env.API_PREFIX || '';

app.use(`${API_PREFIX}/video`, videoController);
app.use(`${API_PREFIX}/user`, userController);
app.use(`${API_PREFIX}/domain`, domainController);
app.use(`${API_PREFIX}/sentry`, sentryController);

// Marketplace Routes
app.use(`${API_PREFIX}/marketplace/listings`, listingController);
app.use(`${API_PREFIX}/marketplace/orders`, orderController);
app.use(`${API_PREFIX}/marketplace/offers`, offerController);
app.use(`${API_PREFIX}/marketplace/chat`, chatController);
app.use(`${API_PREFIX}/marketplace/payments`, paymentController);
app.use(`${API_PREFIX}/marketplace/stripe`, stripeController);

// ================== 404 Handler ==================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ================== Error Handling ==================
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ================== Cron Jobs ==================
if (process.env.ENABLE_EXPIRATION_CRON === 'true' && process.env.EXPIRATION_CHECK_URL) {
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('Running daily domain/hosting expiration check...');
      await axios.get(process.env.EXPIRATION_CHECK_URL, { timeout: 30000 });
      console.log('Expiration check completed successfully');
    } catch (error) {
      console.error('Error in scheduled expiration check:', error.message);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
    }
  });
}

// ================== Database Connection & Server Start ==================
const PORT = parseInt(process.env.PORT, 10) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not defined');
  process.exit(1);
}

const startServer = async () => {
  try {
    await connectToMongoDB(MONGODB_URI);
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🏪 API Base: http://localhost:${PORT}${API_PREFIX}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    process.exit(1);
  }
};

startServer();

module.exports = app;