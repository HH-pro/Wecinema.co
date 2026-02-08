/**
 * Authorization Middleware
 * Role checks, feature checks (HypeMode), buyer/seller verification
 */

const User = require('../../models/user');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY = {
  user: 1,
  buyer: 2,
  seller: 2,
  subadmin: 3,
  admin: 4
};

/**
 * Check if user has required role or higher
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasPermission = allowedRoles.some(role => 
      ROLE_HIERARCHY[role] <= userRoleLevel
    );

    if (!hasPermission) {
      throw new AppError('Insufficient permissions', 403);
    }

    next();
  };
};

/**
 * Verify user is HypeMode subscriber
 * Fetches fresh user data from DB
 */
const requireHypeMode = asyncHandler(async (req, res, next) => {
  if (!req.user?.userId) {
    throw new AppError('Authentication required', 401);
  }

  // Use lean() for read-only operation
  const user = await User.findById(req.user.userId)
    .select('isHypeModeUser isActive')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.isActive) {
    throw new AppError('Account deactivated', 403);
  }

  if (!user.isHypeModeUser) {
    throw new AppError(
      'HypeMode subscription required for marketplace features', 
      403
    );
  }

  // Attach hype mode status for downstream use
  req.user.isHypeMode = true;
  next();
});

/**
 * Verify user is a seller (cached to prevent duplicate DB calls)
 */
const requireSeller = asyncHandler(async (req, res, next) => {
  if (!req.user?.userId) {
    throw new AppError('Authentication required', 401);
  }

  // Skip DB call if role already verified in token
  if (req.user.role === 'seller' || req.user.role === 'admin') {
    return next();
  }

  // Fetch and verify seller status
  const user = await User.findById(req.user.userId)
    .select('userType role isActive')
    .lean();

  if (!user?.isActive) {
    throw new AppError('Account not active', 403);
  }

  const isSeller = user.userType === 'seller' || 
                   user.role === 'seller' || 
                   user.role === 'admin';

  if (!isSeller) {
    throw new AppError('Seller account required', 403);
  }

  next();
});

/**
 * Verify user is a buyer
 */
const requireBuyer = asyncHandler(async (req, res, next) => {
  if (!req.user?.userId) {
    throw new AppError('Authentication required', 401);
  }

  // Check token role first
  if (req.user.role === 'buyer' || req.user.role === 'admin') {
    return next();
  }

  const user = await User.findById(req.user.userId)
    .select('userType role isActive')
    .lean();

  if (!user?.isActive) {
    throw new AppError('Account not active', 403);
  }

  const isBuyer = user.userType === 'buyer' || 
                  user.userType === 'both' ||
                  user.role === 'buyer';

  if (!isBuyer) {
    throw new AppError('Buyer account required to make purchases', 403);
  }

  next();
});

/**
 * Combined middleware: Requires authentication + specific conditions
 */
const requireAuthAnd = (...checks) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user?.userId) {
      throw new AppError('Authentication required', 401);
    }

    for (const check of checks) {
      await check(req, res, () => {}); // Run each check
    }
    
    next();
  });
};

module.exports = {
  authorize,
  requireHypeMode,
  requireSeller,
  requireBuyer,
  requireAuthAnd,
  ROLE_HIERARCHY
};