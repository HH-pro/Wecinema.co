/**
 * Authentication & Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Generate JWT token
 * @param {Object} payload 
 * @returns {string}
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: process.env.APP_NAME || 'YourApp',
    audience: process.env.APP_URL || 'http://localhost:3000'
  });
};

/**
 * Verify JWT token
 * @param {string} token 
 * @returns {Object}
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    // Check if user still exists and is active
    const user = await User.findActiveById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or account is deactivated.'
      });
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      userType: user.userType
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const user = await User.findActiveById(decoded.userId);
    
    req.user = user ? {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    } : null;
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Ownership check middleware
const checkOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    const resourceId = req.params[paramName];
    
    if (req.user.role === 'admin' || req.user.id === resourceId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You can only access your own resources'
    });
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  generateToken,
  verifyToken
};