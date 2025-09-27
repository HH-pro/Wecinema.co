const UserController = require("./user");
const VideoController = require("./video");
const domainController = require("./domainController");
const sentryRouter = require("./sentry");

const listingsRoutes = require("./listingsController");
const offersRoutes = require("./offersRoutes");
const commissionsRoutes = require("./commissionsRoutes");

module.exports = {
  UserController,
  VideoController,
  domainController,
  sentryRouter,
  listingsRoutes,
  offersRoutes,
  commissionsRoutes,
};
