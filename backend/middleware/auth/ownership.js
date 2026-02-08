/**
 * Resource Ownership Middleware
 * Verifies user owns the requested resource
 */

const mongoose = require('mongoose');
const Listing = require('../../models/marketplace/listing');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Generic ownership checker factory
 * @param {Object} options - Configuration object
 * @param {string} options.model - Mongoose model name
 * @param {string} options.paramName - URL parameter name (default: 'id')
 * @param {string} options.ownerField - Field containing owner ID (default: 'owner')
 * @param {boolean} options.attachResource - Attach resource to req (default: true)
 */
const checkOwnership = (options = {}) => {
  const {
    model: Model,
    paramName = 'id',
    ownerField = 'owner',
    attachResource = true
  } = options;

  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[paramName] || req.body[`${paramName}Id`];
    
    if (!resourceId) {
      throw new AppError(`${paramName} is required`, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      throw new AppError(`Invalid ${paramName} format`, 400);
    }

    // Use lean() for performance, select only needed fields
    const resource = await Model.findById(resourceId)
      .select(`${ownerField} status`)
      .lean();

    if (!resource) {
      throw new AppError('Resource not found', 404);
    }

    // Compare owner - handle both ObjectId and string
    const ownerId = resource[ownerField]?.toString();
    const userId = req.user?.userId || req.user?.id;

    if (ownerId !== userId && req.user?.role !== 'admin') {
      throw new AppError('Access denied. You do not own this resource.', 403);
    }

    if (attachResource) {
      req.resource = resource;
      req.resourceType = Model.modelName;
    }

    next();
  });
};

/**
 * Pre-configured middleware for Listing ownership
 */
const requireListingOwner = checkOwnership({
  model: Listing,
  paramName: 'id',
  ownerField: 'owner'
});

/**
 * Batch ownership check for multiple resources
 */
const checkBatchOwnership = (Model, ownerField = 'owner') => {
  return asyncHandler(async (req, res, next) => {
    const { ids } = req.body; // Array of resource IDs
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Resource IDs array required', 400);
    }

    // Validate all IDs
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new AppError(`Invalid IDs: ${invalidIds.join(', ')}`, 400);
    }

    const resources = await Model.find({
      _id: { $in: ids },
      [ownerField]: req.user.userId
    }).select('_id').lean();

    const foundIds = resources.map(r => r._id.toString());
    const notOwned = ids.filter(id => !foundIds.includes(id));

    if (notOwned.length > 0) {
      throw new AppError(
        `You do not own the following resources: ${notOwned.join(', ')}`, 
        403
      );
    }

    next();
  });
};

module.exports = {
  checkOwnership,
  requireListingOwner,
  checkBatchOwnership
};