const { globalErrorHandler, asyncHandler, notFoundHandler, ApiError } = require('./errorHandler');
const {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireHypeMode,
  requireSeller,
  requireBuyer,
} = require('./auth');
const { requireOwnership, requireListingOwner } = require('./authorization');

module.exports = {
  // Error handling
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  ApiError,
  
  // Authentication
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireHypeMode,
  requireSeller,
  requireBuyer,
  
  // Authorization
  requireOwnership,
  requireListingOwner,
};