// Temporary: Point to existing controllers until we refactor them
const videoRoutes = require('../controller/video');
const userRoutes = require('../controller/user');
const domainRoutes = require('../controller/domainController');
const sentryRoutes = require('../controller/sentry');

// Marketplace routes
const listingRoutes = require('../controller/marketplace/listingController');
const orderRoutes = require('../controller/marketplace/orders');
const offerRoutes = require('../controller/marketplace/offers');
const chatRoutes = require('../controller/marketplace/chat');
const paymentRoutes = require('../controller/marketplace/payments');
const stripeRoutes = require('../controller/marketplace/stripe');

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