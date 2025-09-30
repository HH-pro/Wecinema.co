const UserController = require("./user");
const VideoController = require("./video");
const domainController = require("./domainController");
const sentryRouter = require("./sentry");


// 🆕 INDIVIDUAL MARKETPLACE ROUTES
const listingRoutes = require("./marketplace/listingController");
const orderRoutes = require("./marketplace/orders");
const offerRoutes = require("./marketplace/offers");
const messageRoutes = require("./marketplace/messages");
const paymentRoutes = require("./marketplace/payments");

module.exports = {
  UserController,
  VideoController,
  domainController,
  sentryRouter,
 
  // 🆕 MARKETPLACE EXPORTS
  listingRoutes,
  orderRoutes, 
  offerRoutes,
  messageRoutes,
  paymentRoutes
};