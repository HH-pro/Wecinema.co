const express = require('express');

// Helper to safely load routes
const safeRequire = (name, path) => {
  try {
    const module = require(path);
    console.log(`✅ Loaded: ${name}`);
    return module;
  } catch (error) {
    console.error(`❌ Failed to load ${name} from ${path}:`, error.message);
    // Return empty router as fallback
    const router = express.Router();
    router.get('/', (req, res) => res.status(503).json({ error: `${name} not available` }));
    return router;
  }
};

const videoRoutes = safeRequire('videoRoutes', '../controller/video');
const userRoutes = safeRequire('userRoutes', '../controller/user');
const domainRoutes = safeRequire('domainRoutes', '../controller/domainController');
const sentryRoutes = safeRequire('sentryRoutes', '../controller/sentry');

// Marketplace routes
const listingRoutes = safeRequire('listingRoutes', '../controller/marketplace/listingController');
const orderRoutes = safeRequire('orderRoutes', '../controller/marketplace/orders');
const offerRoutes = safeRequire('offerRoutes', '../controller/marketplace/offers');
const chatRoutes = safeRequire('chatRoutes', '../controller/marketplace/chat');
const paymentRoutes = safeRequire('paymentRoutes', '../controller/marketplace/payments');
const stripeRoutes = safeRequire('stripeRoutes', '../controller/marketplace/stripe');

module.exports = {
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
};