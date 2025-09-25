const express = require("express");

// Existing
const UserController = require("../controllers/user");
const VideoController = require("../controllers/video");
const domainController = require("../controllers/domainController");
const sentryRouter = require("../controllers/sentry");

// New Hype Mode Controllers
const listingsRoutes = require("./listingsRoutes");   // ✅ Sell Dashboard, For Sale
const offersRoutes = require("./offersRoutes");       // ✅ Make Offer
const commissionsRoutes = require("./commissionsRoutes"); // ✅ Commissions

const router = express.Router();

// Old Routes
router.use("/users", UserController);
router.use("/videos", VideoController);
router.use("/domains", domainController);
router.use("/sentry", sentryRouter);

// New Routes
router.use("/listings", listingsRoutes);       // e.g. POST /api/listings
router.use("/offers", offersRoutes);           // e.g. POST /api/offers
router.use("/commissions", commissionsRoutes); // e.g. POST /api/commissions

module.exports = router;
