/**
 * JWT Authentication Middleware
 * Verifies tokens and attaches decoded payload
 */

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'your-app-name';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-app-url';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token asynchronously
 */
const verifyToken = promisify(jwt.verify);

/**
 * Extract token from Authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1]?.trim();
};

/**
 * Main authentication middleware
 * Attaches decoded user payload to req.user
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    throw new AppError('Access denied. No token provided.', 401);
  }

  try {
    const decoded = await verifyToken(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      complete: false
    });

    // Attach minimal user info from token
    // Full user fetch happens in subsequent middleware if needed
    req.user = {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401);
    }
    throw new AppError('Authentication failed.', 401);
  }
});

/**
 * Optional authentication - doesn't fail if no token
 * Attaches user if valid token, null otherwise
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = await verifyToken(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    req.user = null;
  }
  
  next();
});

module.exports = {
  authenticate,
  optionalAuth,
  extractToken // Export for testing
};