/**
 * Input Validation Middleware
 * Uses express-validator for comprehensive validation
 */

const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Custom sanitizers
const sanitizeMongo = (value) => {
  if (typeof value === 'string') {
    // Prevent NoSQL injection operators
    return value.replace(/^\$/, '');
  }
  return value;
};

// Validation rules
const userValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores')
      .customSanitizer(sanitizeMongo),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .customSanitizer(sanitizeMongo),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Valid date of birth is required (YYYY-MM-DD)')
      .custom((value) => {
        const dob = new Date(value);
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 13) throw new Error('Must be at least 13 years old');
        if (age > 120) throw new Error('Invalid date of birth');
        return true;
      }),
    
    body('userType')
      .optional()
      .isIn(['buyer', 'seller', 'normalUser'])
      .withMessage('Invalid user type')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  updateProfile: [
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters')
      .escape(), // XSS protection
    
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    
    body('coverImage')
      .optional()
      .isURL()
      .withMessage('Cover image must be a valid URL')
  ],

  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],

  followUser: [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
      .custom((value, { req }) => {
        if (value === req.user.id) {
          throw new Error('Cannot follow yourself');
        }
        return true;
      })
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .default(1)
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .default(20)
      .toInt()
  ]
};

// Middleware to check validation results
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  };
};

// MongoDB ID validation helper
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  userValidation,
  validate,
  isValidObjectId
};