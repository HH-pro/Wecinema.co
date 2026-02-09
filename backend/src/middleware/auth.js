const jwt = require('jsonwebtoken');
const { createLogger } = require('../utils/logger');
const { ApiError } = require('./errorHandler');
const { asyncHandler } = require('./errorHandler');
const User = require('../models/user');

const logger = createLogger('AuthMiddleware');

/**
 * Extract JWT token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null}
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
};

/**
 * Verify JWT token and return decoded payload
 * @param {string} token 
 * @returns {Object}
 * @throws {ApiError}
 */
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      throw new ApiError(500, 'Authentication service unavailable');
    }
    
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token. Please log in again.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your token has expired. Please log in again.');
    }
    throw error;
  }
};

/**
 * Main authentication middleware
 * Verifies JWT and attaches user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  
  if (!token) {
    throw new ApiError(401, 'Access denied. No token provided.');
  }
  
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.userId).select('-password -__v');
  
  if (!user) {
    throw new ApiError(401, 'User not found. Token may be invalid.');
  }
  
  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact support.');
  }
  
  // Standardized user object attachment
  req.user = {
    _id: user._id,
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role,
    isAdmin: user.isAdmin || false,
    isHypeModeUser: user.isHypeModeUser || false,
  };
  
  logger.debug('User authenticated', { userId: req.user.id, path: req.path });
  next();
});

/**
 * Optional authentication - doesn't throw if no token
 * Attaches user if token valid, continues regardless
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = {
        _id: user._id,
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
        isAdmin: user.isAdmin || false,
      };
    }
  } catch (error) {
    // Silently continue without user
    logger.debug('Optional auth failed, continuing as guest');
  }
  
  next();
});

/**
 * Role-based authorization middleware factory
 * @param  {...string} allowedRoles 
 * @returns {Function}
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const hasRole = allowedRoles.includes(req.user.role);
    const isAdmin = req.user.isAdmin;
    
    if (!hasRole && !isAdmin) {
      throw new ApiError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }
    
    next();
  };
};

/**
 * Admin-only middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  if (!req.user.isAdmin) {
    throw new ApiError(403, 'Admin access required');
  }
  
  next();
};

/**
 * HypeMode subscription check
 */
const requireHypeMode = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  const user = await User.findById(req.user.id).select('isHypeModeUser subscription');
  
  if (!user.isHypeModeUser) {
    throw new ApiError(403, 'HypeMode subscription required for this feature');
  }
  
  next();
});

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireHypeMode,
  requireSeller: requireRole('seller', 'both'),
  requireBuyer: requireRole('buyer', 'both'),
};