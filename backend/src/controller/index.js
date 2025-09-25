const UserController = require("./user") 
const VideoController = require("./video"); 
const domainController = require("./domainController"); 
const sentryRouter = require("./sentry"); 





module.exports = {
	UserController,
    VideoController,
    domainController,
    sentryRouter

};