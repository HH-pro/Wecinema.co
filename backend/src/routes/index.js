const videoRoutes = require('./video.routes');
const userRoutes = require('./user.routes');
const domainRoutes = require('./domain.routes');
const sentryRoutes = require('./sentry.routes');
const listingRoutes = require('./marketplace/listing.routes');
const orderRoutes = require('./marketplace/order.routes');
const offerRoutes = require('./marketplace/offer.routes');
const chatRoutes = require('./marketplace/chat.routes');
const paymentRoutes = require('./marketplace/payment.routes');
const stripeRoutes = require('./marketplace/stripe.routes');

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