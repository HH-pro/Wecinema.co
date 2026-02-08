/**
 * Pure Validation Utilities
 * No dependencies on req/res - testable functions
 */

const mongoose = require('mongoose');

/**
 * Check if value is valid MongoDB ObjectId
 * @param {*} id - Value to check
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Strict validation - checks if ID is valid AND creates proper ObjectId
 * @param {*} id 
 * @returns {boolean}
 */
const isValidObjectIdStrict = (id) => {
  if (!isValidObjectId(id)) return false;
  
  try {
    const objectId = new mongoose.Types.ObjectId(id);
    return objectId.toString() === id;
  } catch {
    return false;
  }
};

/**
 * Validate array of IDs
 * @param {Array} ids 
 * @returns {Object} { valid: boolean, invalid: Array }
 */
const validateObjectIdArray = (ids) => {
  if (!Array.isArray(ids)) {
    return { valid: false, invalid: ['Input is not an array'] };
  }

  const invalid = ids.filter(id => !isValidObjectId(id));
  
  return {
    valid: invalid.length === 0,
    invalid
  };
};

/**
 * Sanitize string to prevent NoSQL injection
 * @param {string} str 
 * @returns {string}
 */
const sanitizeMongo = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/^\$/, '');
};

module.exports = {
  isValidObjectId,
  isValidObjectIdStrict,
  validateObjectIdArray,
  sanitizeMongo
};