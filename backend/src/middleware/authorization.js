const { asyncHandler } = require('./errorHandler');
const { ApiError } = require('./errorHandler');
const Listing = require('../models/marketplace/listing');
const { createLogger } = require('../utils/logger');

const logger = createLogger('AuthorizationMiddleware');

/**
 * Verify resource ownership middleware factory
 * Works with any Mongoose model
 * @param {Object} options 
 * @param {Model} options.model - Mongoose model
 * @param {string} options.paramName - URL parameter name (default: 'id')
 * @param {string} options.ownerField - Field containing owner ID (default: 'owner')
 * @param {boolean} options.allowAdmin - Allow admins to bypass (default: true)
 */
const requireOwnership = (options) => {
  const {
    model,
    paramName = 'id',
    ownerField = 'owner',
    allowAdmin = true,
  } = options;
  
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName] || req.body[`${paramName}Id`];
    
    if (!resourceId) {
      throw new ApiError(400, `Resource ID required`);
    }
    
    const resource = await model.findById(resourceId);
    
    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }
    
    const ownerId = resource[ownerField]?.toString();
    const userId = req.user?.id;
    const isAdmin = req.user?.isAdmin;
    
    const isOwner = ownerId === userId;
    const hasAccess = isOwner || (allowAdmin && isAdmin);
    
    if (!hasAccess) {
      logger.warn('Ownership check failed', {
        userId,
        resourceId,
        ownerId,
        path: req.path,
      });
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    
    // Attach resource to request for downstream use
    req.resource = resource;
    next();
  });
};

/**
 * Pre-configured listing ownership middleware
 */
const requireListingOwner = requireOwnership({
  model: Listing,
  paramName: 'id',
  ownerField: 'owner',
  allowAdmin: true,
});

module.exports = {
  requireOwnership,
  requireListingOwner,
};