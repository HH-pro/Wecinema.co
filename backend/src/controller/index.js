const UserController = require("./user");
const VideoController = require("./video");
const domainController = require("./domainController");
const sentryRouter = require("./sentry");

const listingsRoutes = require("../routes/listingsRoutes");
const offersRoutes = require("../routes/offersRoutes");
const commissionsRoutes = require("../routes/commissionsRoutes");

module.exports = {
  UserController,
  VideoController,
  domainController,
  sentryRouter,
  listingsRoutes,
  offersRoutes,
  commissionsRoutes,
};
