/**
 * Middleware Barrel Export
 * Clean import interface for routes
 */

// Authentication
const { authenticate, optionalAuth } = require('./auth/authenticate');
const { 
  authorize, 
  requireHypeMode, 
  requireSeller, 
  requireBuyer 
} = require('./auth/authorize');
const { requireListingOwner, checkOwnership } = require('./auth/ownership');

// Validation
const { validateObjectId, validateObjectIds } = require('./validation/validateObjectId');

// Error handling
const errorHandler = require('./error/errorHandler');

module.exports = {
  // Auth
  authenticate,
  optionalAuth,
  authorize,
  requireHypeMode,
  requireSeller,
  requireBuyer,
  requireListingOwner,
  checkOwnership,
  
  // Validation
  validateObjectId,
  validateObjectIds,
  
  // Error
  errorHandler
};