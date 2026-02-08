/**
 * MongoDB ObjectId Validation Middleware
 */

const mongoose = require('mongoose');
const AppError = require('../../utils/AppError');

/**
 * Validate single ObjectId parameter
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName] || req.query[paramName];
    
    if (!id) {
      throw new AppError(`${paramName} is required`, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(`Invalid ${paramName} format`, 400);
    }

    // Optional: Validate instance exists (strict check)
    try {
      new mongoose.Types.ObjectId(id);
      next();
    } catch (error) {
      throw new AppError(`Invalid ${paramName} format`, 400);
    }
  };
};

/**
 * Validate multiple ObjectId fields in body
 */
const validateObjectIds = (...fieldNames) => {
  return (req, res, next) => {
    const errors = [];

    fieldNames.forEach(field => {
      const value = req.body[field];
      
      if (!value) return; // Skip if not present (use required validation for that)
      
      const ids = Array.isArray(value) ? value : [value];
      
      const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
      
      if (invalidIds.length > 0) {
        errors.push(`${field} contains invalid ID(s): ${invalidIds.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      throw new AppError(errors.join('; '), 400);
    }

    next();
  };
};

module.exports = {
  validateObjectId,
  validateObjectIds
};