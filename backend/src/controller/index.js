const UserController = require("./user");
const VideoController = require("./video");
const domainController = require("./domainController");
const sentryRouter = require("./sentry");


// 🆕 INDIVIDUAL MARKETPLACE ROUTES
const listingRoutes = require("./marketplace/listingController");
const orderRoutes = require("./marketplace/orders");
const offerRoutes = require("./marketplace/offers");
const chatRoutes = require("./marketplace/chat");
const paymentRoutes = require("./marketplace/payments");
const stripeRoutes = require("./marketplace/stripe");


module.exports = {
  UserController,
  VideoController,
  domainController,
  sentryRouter,
 
  // 🆕 MARKETPLACE EXPORTS
  listingRoutes,
  orderRoutes, 
  offerRoutes,
  chatRoutes,
  paymentRoutes,

  stripeRoutes,
};