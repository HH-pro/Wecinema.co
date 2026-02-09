const mongoose = require('mongoose');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validate MongoDB ObjectId
 * @param {string} id 
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate ObjectId or throw error
 * @param {string} id 
 * @param {string} fieldName 
 * @throws {ApiError}
 */
const validateObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${fieldName} format`);
  }
};

/**
 * Sanitize string input
 * @param {string} input 
 * @returns {string}
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  isValidObjectId,
  validateObjectId,
  sanitizeString,
};