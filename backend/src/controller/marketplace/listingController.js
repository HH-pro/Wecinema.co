// routes/marketplace/listings.js - Complete with all CRUD operations
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const MarketplaceListing = require("../../models/marketplace/listing");
const { authenticateMiddleware } = require("../../utils");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const rateLimit = require('express-rate-limit');

// Rate limiting for listing creation/update
const createUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many listing updates from this IP, please try again later'
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/listings/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter for videos and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm',
    'video/quicktime', 'video/x-msvideo'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit for videos
  }
});

// Helper Functions
const generateVideoThumbnail = (videoPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        folder: path.dirname(outputPath),
        filename: path.basename(outputPath),
        size: '640x360'
      })
      .on('end', () => {
        console.log('✅ Video thumbnail generated:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Error generating thumbnail:', err);
        reject(err);
      });
  });
};

const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('Error getting video duration:', err);
        reject(err);
      } else {
        const duration = metadata.format.duration;
        resolve(Math.floor(duration));
      }
    });
  });
};

const deleteOldFiles = async (oldUrls, newUrls) => {
  try {
    const filesToDelete = oldUrls.filter(url => !newUrls.includes(url));
    
    for (const fileUrl of filesToDelete) {
      try {
        const filename = path.basename(fileUrl);
        const filePath = path.join('uploads/listings/', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Deleted old file:', filePath);
          
          // Also delete thumbnail if exists
          const thumbPath = filePath.replace(/\.(mp4|mov|avi|mkv|webm|quicktime)$/, '_thumb.jpg');
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
            console.log('🗑️ Deleted old thumbnail:', thumbPath);
          }
        }
      } catch (fileErr) {
        console.error('Error deleting file:', fileErr);
      }
    }
  } catch (error) {
    console.error('Error in deleteOldFiles:', error);
  }
};

const validateListing = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }
  
  return errors;
};

// ============================
// CRUD ROUTES
// ============================

// ✅ GET ALL LISTINGS WITH FILTERS
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      condition,
      status = 'active',
      sellerId,
      search,
      sort = '-createdAt',
      tags
    } = req.query;

    const query = { status: 'active' };
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Filter by condition
    if (condition && condition !== 'all') {
      query.condition = condition;
    }
    
    // Filter by seller
    if (sellerId) {
      query.sellerId = sellerId;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search in title, description, and tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      select: '-__v',
      populate: {
        path: 'sellerId',
        select: 'username avatar rating email'
      }
    };

    const listings = await MarketplaceListing.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        listings: listings.docs,
        total: listings.totalDocs,
        pages: listings.totalPages,
        page: listings.page,
        hasNextPage: listings.hasNextPage,
        hasPrevPage: listings.hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings" 
    });
  }
});

// ✅ SEARCH LISTINGS
router.get("/search", async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, condition, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const query = {
      $text: { $search: q },
      status: 'active'
    };
    
    // Additional filters
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { score: { $meta: "textScore" } },
      select: 'title description price category condition mediaUrls tags createdAt',
      populate: {
        path: 'sellerId',
        select: 'username avatar rating'
      }
    };

    const listings = await MarketplaceListing.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        listings: listings.docs,
        total: listings.totalDocs,
        query: q
      }
    });
  } catch (error) {
    console.error("Error searching listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Search failed" 
    });
  }
});

// ✅ GET SINGLE LISTING
router.get("/:id", async (req, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id)
      .populate('sellerId', 'username avatar rating email createdAt')
      .populate('reviews.userId', 'username avatar')
      .select('-__v');

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Increment view count
    listing.views = (listing.views || 0) + 1;
    await listing.save();

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error("Error fetching listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// ✅ CREATE LISTING
router.post("/", authenticateMiddleware, createUpdateLimiter, upload.array('media', 10), async (req, res) => {
  try {
    console.log("=== CREATE LISTING ===");
    console.log("User ID:", req.user?.id);
    console.log("Files uploaded:", req.files?.length || 0);

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate required fields
    const validationErrors = validateListing(req.body);
    if (validationErrors.length > 0) {
      // Delete uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    // Process media files
    const mediaUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const relativePath = file.path.replace(/\\/g, '/');
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const fileUrl = `${baseUrl}/${relativePath}`;
        
        // Check if file is a video
        if (file.mimetype.startsWith('video/')) {
          // Generate thumbnail for video
          const thumbFilename = file.filename.replace(path.extname(file.filename), '_thumb.jpg');
          const thumbPath = path.join(path.dirname(file.path), thumbFilename);
          
          try {
            await generateVideoThumbnail(file.path, thumbPath);
            
            // Get video duration
            const duration = await getVideoDuration(file.path);
            
            const thumbRelativePath = thumbPath.replace(/\\/g, '/');
            const thumbUrl = `${baseUrl}/${thumbRelativePath}`;
            
            // Store video metadata
            mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: thumbUrl,
              duration: duration,
              filename: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              isActive: true
            });
            
          } catch (videoErr) {
            console.error('Error processing video:', videoErr);
            mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: null,
              duration: 0,
              filename: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              isActive: true
            });
          }
        } else {
          // It's an image
          mediaUrls.push({
            url: fileUrl,
            type: 'image',
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
        }
      }
    }

    // Create listing data
    const listingData = {
      sellerId: userId,
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      condition: req.body.condition || 'new',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      mediaUrls: mediaUrls,
      status: req.body.status || 'draft',
      stockQuantity: parseInt(req.body.stockQuantity) || 1,
      deliveryTime: req.body.deliveryTime || '3-5 days',
      shippingCost: parseFloat(req.body.shippingCost) || 0,
      returnsAccepted: req.body.returnsAccepted === 'true',
      // Video-specific fields
      isVideoListing: mediaUrls.some(media => media.type === 'video'),
      videoDetails: mediaUrls.find(media => media.type === 'video') || null,
      // SEO fields
      metaTitle: req.body.metaTitle || req.body.title.substring(0, 60),
      metaDescription: req.body.metaDescription || req.body.description.substring(0, 160),
      slug: req.body.slug || req.body.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 100)
    };

    // Optional fields
    if (req.body.brand) listingData.brand = req.body.brand;
    if (req.body.color) listingData.color = req.body.color;
    if (req.body.size) listingData.size = req.body.size;
    if (req.body.weight) listingData.weight = parseFloat(req.body.weight);
    if (req.body.dimensions) listingData.dimensions = req.body.dimensions;
    if (req.body.warranty) listingData.warranty = req.body.warranty;
    if (req.body.features) listingData.features = req.body.features.split(',').map(f => f.trim());
    if (req.body.specifications) {
      try {
        listingData.specifications = JSON.parse(req.body.specifications);
      } catch (err) {
        listingData.specifications = req.body.specifications;
      }
    }

    const listing = new MarketplaceListing(listingData);
    await listing.save();

    console.log("✅ Listing created:", listing._id);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing
    });

  } catch (error) {
    console.error("❌ Error creating listing:", error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: Object.values(error.errors).map(err => err.message) 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to create listing",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ UPDATE LISTING
router.put("/:id", authenticateMiddleware, createUpdateLimiter, upload.array('media', 10), async (req, res) => {
  let session;
  try {
    console.log("=== UPDATE LISTING ===");
    console.log("Listing ID:", req.params.id);

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate required fields
    const validationErrors = validateListing(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(', ') });
    }

    // Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Find the listing
    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId
    }).session(session);

    if (!listing) {
      await session.abortTransaction();
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to edit this listing" 
      });
    }

    // Store old media URLs for cleanup
    const oldMediaUrls = listing.mediaUrls.map(media => media.url);
    const newMediaUrls = [];

    // Process new uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const relativePath = file.path.replace(/\\/g, '/');
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const fileUrl = `${baseUrl}/${relativePath}`;
        
        // Check if file is a video
        if (file.mimetype.startsWith('video/')) {
          // Generate thumbnail for video
          const thumbFilename = file.filename.replace(path.extname(file.filename), '_thumb.jpg');
          const thumbPath = path.join(path.dirname(file.path), thumbFilename);
          
          try {
            await generateVideoThumbnail(file.path, thumbPath);
            
            // Get video duration
            const duration = await getVideoDuration(file.path);
            
            const thumbRelativePath = thumbPath.replace(/\\/g, '/');
            const thumbUrl = `${baseUrl}/${thumbRelativePath}`;
            
            newMediaUrls.push(fileUrl);
            
            // Store video metadata
            listing.mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: thumbUrl,
              duration: duration,
              filename: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              isActive: true
            });
            
          } catch (videoErr) {
            console.error('Error processing video:', videoErr);
            listing.mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: null,
              duration: 0,
              filename: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              isActive: true
            });
          }
        } else {
          // It's an image
          newMediaUrls.push(fileUrl);
          listing.mediaUrls.push({
            url: fileUrl,
            type: 'image',
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype
          });
        }
      }
    }

    // Handle existing media URLs that should be kept
    if (req.body.mediaUrls) {
      try {
        const existingUrls = Array.isArray(req.body.mediaUrls) 
          ? req.body.mediaUrls 
          : JSON.parse(req.body.mediaUrls);
        
        // Keep only media that are in the existingUrls array
        listing.mediaUrls = listing.mediaUrls.filter(media => 
          existingUrls.includes(media.url)
        );
        newMediaUrls.push(...existingUrls);
      } catch (err) {
        console.error('Error parsing mediaUrls:', err);
      }
    }

    // ✅ VIDEO DEACTIVATE/ACTIVATE FUNCTIONALITY
    if (req.body.videoStatus !== undefined) {
      if (req.body.videoStatus === 'deactivated') {
        // Deactivate all videos
        listing.mediaUrls = listing.mediaUrls.map(media => {
          if (media.type === 'video') {
            return {
              ...media.toObject(),
              isActive: false,
              deactivatedAt: new Date()
            };
          }
          return media;
        });
        listing.isVideoActive = false;
      } else if (req.body.videoStatus === 'activated') {
        // Activate all videos
        listing.mediaUrls = listing.mediaUrls.map(media => {
          if (media.type === 'video') {
            return {
              ...media.toObject(),
              isActive: true,
              activatedAt: new Date()
            };
          }
          return media;
        });
        listing.isVideoActive = true;
      }
    }

    // ✅ LISTING STATUS UPDATE
    if (req.body.status && ['active', 'inactive', 'sold', 'reserved', 'draft'].includes(req.body.status)) {
      listing.status = req.body.status;
      
      if (req.body.status === 'sold') {
        listing.soldAt = new Date();
      }
      
      if (req.body.status === 'reserved') {
        listing.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }
      
      if (req.body.status !== 'reserved' && listing.status === 'reserved') {
        listing.reservedUntil = null;
      }
    }

    // Update basic listing fields
    listing.title = req.body.title;
    listing.description = req.body.description;
    listing.price = parseFloat(req.body.price);
    listing.category = req.body.category;
    listing.condition = req.body.condition || listing.condition;
    listing.tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : listing.tags;
    listing.stockQuantity = parseInt(req.body.stockQuantity) || listing.stockQuantity;
    listing.deliveryTime = req.body.deliveryTime || listing.deliveryTime;
    listing.shippingCost = parseFloat(req.body.shippingCost) || listing.shippingCost;
    listing.returnsAccepted = req.body.returnsAccepted === 'true';
    
    // Update video-specific fields
    listing.isVideoListing = listing.mediaUrls.some(media => media.type === 'video');
    listing.videoDetails = listing.mediaUrls.find(media => media.type === 'video') || null;

    // Update SEO fields
    if (req.body.metaTitle) listing.metaTitle = req.body.metaTitle;
    if (req.body.metaDescription) listing.metaDescription = req.body.metaDescription;
    if (req.body.slug) listing.slug = req.body.slug;

    // Optional fields
    if (req.body.brand !== undefined) listing.brand = req.body.brand;
    if (req.body.color !== undefined) listing.color = req.body.color;
    if (req.body.size !== undefined) listing.size = req.body.size;
    if (req.body.weight !== undefined) listing.weight = parseFloat(req.body.weight);
    if (req.body.dimensions !== undefined) listing.dimensions = req.body.dimensions;
    if (req.body.warranty !== undefined) listing.warranty = req.body.warranty;
    if (req.body.features !== undefined) listing.features = req.body.features.split(',').map(f => f.trim());
    if (req.body.specifications !== undefined) {
      try {
        listing.specifications = JSON.parse(req.body.specifications);
      } catch (err) {
        listing.specifications = req.body.specifications;
      }
    }

    // Save updated listing
    listing.updatedAt = new Date();
    await listing.save({ session });

    // Commit transaction
    await session.commitTransaction();

    console.log("✅ Listing updated:", listing._id);

    // Clean up old files (async)
    deleteOldFiles(oldMediaUrls, newMediaUrls).catch(err => 
      console.error('Error cleaning up old files:', err)
    );

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: listing
    });

  } catch (error) {
    console.error("❌ Error updating listing:", error);
    
    if (session) {
      await session.abortTransaction();
    }
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: Object.values(error.errors).map(err => err.message) 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to update listing",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// ✅ QUICK UPDATE LISTING (Simple fields only)
router.put("/:id/quick-update", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== QUICK UPDATE LISTING ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to edit this listing" 
      });
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'description', 'price', 'category', 'condition', 
      'tags', 'stockQuantity', 'deliveryTime', 'shippingCost', 
      'returnsAccepted', 'brand', 'color', 'size', 'weight',
      'dimensions', 'warranty', 'features', 'specifications',
      'metaTitle', 'metaDescription', 'slug', 'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'tags' && typeof req.body[field] === 'string') {
          listing[field] = req.body[field].split(',').map(tag => tag.trim());
        } else if (field === 'price' || field === 'shippingCost' || field === 'weight') {
          listing[field] = parseFloat(req.body[field]);
        } else if (field === 'stockQuantity') {
          listing[field] = parseInt(req.body[field]);
        } else if (field === 'returnsAccepted') {
          listing[field] = req.body[field] === 'true';
        } else if (field === 'features' && typeof req.body[field] === 'string') {
          listing[field] = req.body[field].split(',').map(f => f.trim());
        } else if (field === 'specifications' && typeof req.body[field] === 'string') {
          try {
            listing[field] = JSON.parse(req.body[field]);
          } catch (err) {
            listing[field] = req.body[field];
          }
        } else {
          listing[field] = req.body[field];
        }
      }
    });

    listing.updatedAt = new Date();
    await listing.save();

    console.log("✅ Listing quick updated:", listing._id);

    res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: listing
    });
  } catch (error) {
    console.error("❌ Error quick updating listing:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: Object.values(error.errors).map(err => err.message) 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to update listing",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ DELETE LISTING
router.delete("/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DELETE LISTING REQUEST ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: userId,
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to delete this listing" 
      });
    }

    // Clean up associated files
    if (listing.mediaUrls && listing.mediaUrls.length > 0) {
      listing.mediaUrls.forEach(media => {
        try {
          const urlParts = media.url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const filePath = path.join('uploads/listings/', filename);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Deleted file:', filePath);
          }
          
          if (media.thumbnail) {
            const thumbParts = media.thumbnail.split('/');
            const thumbFilename = thumbParts[thumbParts.length - 1];
            const thumbPath = path.join('uploads/listings/', thumbFilename);
            
            if (fs.existsSync(thumbPath)) {
              fs.unlinkSync(thumbPath);
              console.log('🗑️ Deleted thumbnail:', thumbPath);
            }
          }
        } catch (fileErr) {
          console.error('Error deleting file:', fileErr);
        }
      });
    }

    console.log("✅ Listing deleted successfully:", listing._id);
    res.status(200).json({ 
      success: true,
      message: "Listing deleted successfully", 
      data: {
        _id: listing._id,
        title: listing.title,
        status: listing.status
      }
    });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to delete listing",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ UPDATE LISTING STATUS
router.patch("/:id/status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== UPDATE LISTING STATUS ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    const { status } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!['active', 'inactive', 'sold', 'reserved', 'draft'].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to update this listing" 
      });
    }

    listing.status = status;
    
    if (status === 'sold') {
      listing.soldAt = new Date();
    }
    
    if (status === 'reserved') {
      listing.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    if (status !== 'reserved' && listing.status === 'reserved') {
      listing.reservedUntil = null;
    }

    listing.updatedAt = new Date();
    await listing.save();

    console.log("✅ Listing status updated:", listing._id, "->", status);

    res.status(200).json({
      success: true,
      message: `Listing status updated to ${status}`,
      data: {
        _id: listing._id,
        title: listing.title,
        status: listing.status,
        updatedAt: listing.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Error updating listing status:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to update listing status" 
    });
  }
});

// ✅ TOGGLE VIDEO STATUS
router.patch("/:id/video-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== TOGGLE VIDEO STATUS ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    const { status } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!['activated', 'deactivated'].includes(status)) {
      return res.status(400).json({ error: "Invalid video status value" });
    }

    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId,
      'mediaUrls.type': 'video'
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found, doesn't have videos, or you don't have permission" 
      });
    }

    const isActivate = status === 'activated';
    
    listing.mediaUrls = listing.mediaUrls.map(media => {
      if (media.type === 'video') {
        return {
          ...media.toObject(),
          isActive: isActivate,
          [isActivate ? 'activatedAt' : 'deactivatedAt']: new Date()
        };
      }
      return media;
    });

    listing.isVideoActive = isActivate;
    listing.updatedAt = new Date();
    await listing.save();

    console.log("✅ Video status updated:", listing._id, "->", status);

    res.status(200).json({
      success: true,
      message: `Video ${isActivate ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: listing._id,
        title: listing.title,
        isVideoActive: listing.isVideoActive,
        videoCount: listing.mediaUrls.filter(m => m.type === 'video').length,
        updatedAt: listing.updatedAt
      }
    });
  } catch (error) {
    console.error("❌ Error toggling video status:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to update video status" 
    });
  }
});

// ✅ DELETE SPECIFIC MEDIA FROM LISTING
router.delete("/:id/media/:mediaId", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DELETE SPECIFIC MEDIA ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission" 
      });
    }

    const mediaIndex = listing.mediaUrls.findIndex(
      media => media._id.toString() === req.params.mediaId
    );

    if (mediaIndex === -1) {
      return res.status(404).json({ error: "Media not found in listing" });
    }

    const mediaToDelete = listing.mediaUrls[mediaIndex];

    listing.mediaUrls.splice(mediaIndex, 1);

    listing.isVideoListing = listing.mediaUrls.some(media => media.type === 'video');
    if (!listing.isVideoListing) {
      listing.videoDetails = null;
      listing.isVideoActive = false;
    }

    listing.updatedAt = new Date();
    await listing.save();

    // Delete the actual file
    try {
      if (mediaToDelete.url) {
        const urlParts = mediaToDelete.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filePath = path.join('uploads/listings/', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Deleted media file:', filePath);
        }
        
        if (mediaToDelete.thumbnail) {
          const thumbParts = mediaToDelete.thumbnail.split('/');
          const thumbFilename = thumbParts[thumbParts.length - 1];
          const thumbPath = path.join('uploads/listings/', thumbFilename);
          
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
            console.log('🗑️ Deleted thumbnail:', thumbPath);
          }
        }
      }
    } catch (fileErr) {
      console.error('Error deleting media file:', fileErr);
    }

    console.log("✅ Media deleted from listing:", mediaToDelete._id);

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
      data: {
        listingId: listing._id,
        mediaId: req.params.mediaId,
        remainingMediaCount: listing.mediaUrls.length,
        isVideoListing: listing.isVideoListing
      }
    });
  } catch (error) {
    console.error("❌ Error deleting media:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    res.status(500).json({ 
      success: false,
      error: "Failed to delete media" 
    });
  }
});

// ✅ GET USER'S LISTINGS
router.get("/user/:userId/listings", async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 20,
      status,
      category,
      sort = '-createdAt',
      search 
    } = req.query;

    const query = { sellerId: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      select: '-__v',
      populate: {
        path: 'sellerId',
        select: 'username avatar rating'
      }
    };

    const listings = await MarketplaceListing.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        listings: listings.docs,
        total: listings.totalDocs,
        pages: listings.totalPages,
        page: listings.page,
        hasNextPage: listings.hasNextPage,
        hasPrevPage: listings.hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings" 
    });
  }
});

// ✅ GET MY LISTINGS (for authenticated user)
router.get("/my-listings", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { 
      page = 1, 
      limit = 20,
      status,
      category,
      sort = '-createdAt',
      search 
    } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const query = { sellerId: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      select: '-__v'
    };

    const listings = await MarketplaceListing.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        listings: listings.docs,
        total: listings.totalDocs,
        pages: listings.totalPages,
        page: listings.page,
        hasNextPage: listings.hasNextPage,
        hasPrevPage: listings.hasPrevPage
      }
    });
  } catch (error) {
    console.error("Error fetching my listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch listings" 
    });
  }
});

// ✅ DUPLICATE LISTING
router.post("/:id/duplicate", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DUPLICATE LISTING ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const originalListing = await MarketplaceListing.findOne({
      _id: req.params.id,
      sellerId: userId
    });

    if (!originalListing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to duplicate this listing" 
      });
    }

    // Create a copy of the listing
    const duplicateData = originalListing.toObject();
    
    // Remove fields that shouldn't be duplicated
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.views;
    delete duplicateData.favorites;
    delete duplicateData.soldAt;
    delete duplicateData.reservedUntil;
    delete duplicateData.reviews;
    
    // Modify title to indicate it's a copy
    duplicateData.title = `Copy of ${duplicateData.title}`;
    
    // Set default status
    duplicateData.status = 'draft';
    
    // Create new media references
    if (duplicateData.mediaUrls && duplicateData.mediaUrls.length > 0) {
      duplicateData.mediaUrls = duplicateData.mediaUrls.map(media => ({
        ...media,
        _id: new mongoose.Types.ObjectId()
      }));
    }

    const duplicateListing = new MarketplaceListing(duplicateData);
    await duplicateListing.save();

    console.log("✅ Listing duplicated:", duplicateListing._id);

    res.status(201).json({
      success: true,
      message: "Listing duplicated successfully",
      data: duplicateListing
    });
  } catch (error) {
    console.error("❌ Error duplicating listing:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to duplicate listing",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ BULK ACTIONS
router.post("/bulk-actions", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== BULK ACTIONS ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    const { action, listingIds, data } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!action || !listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    let result;

    switch (action) {
      case 'delete':
        result = await MarketplaceListing.deleteMany({
          _id: { $in: listingIds },
          sellerId: userId
        });
        break;

      case 'update_status':
        if (!data || !data.status) {
          return res.status(400).json({ error: "Status is required for update_status action" });
        }
        
        if (!['active', 'inactive', 'sold', 'reserved', 'draft'].includes(data.status)) {
          return res.status(400).json({ error: "Invalid status value" });
        }

        const updateData = { 
          status: data.status,
          updatedAt: new Date()
        };
        
        if (data.status === 'sold') {
          updateData.soldAt = new Date();
        }
        
        if (data.status === 'reserved') {
          updateData.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        result = await MarketplaceListing.updateMany(
          {
            _id: { $in: listingIds },
            sellerId: userId
          },
          updateData
        );
        break;

      case 'update_category':
        if (!data || !data.category) {
          return res.status(400).json({ error: "Category is required for update_category action" });
        }

        result = await MarketplaceListing.updateMany(
          {
            _id: { $in: listingIds },
            sellerId: userId
          },
          { 
            category: data.category,
            updatedAt: new Date()
          }
        );
        break;

      default:
        return res.status(400).json({ error: "Invalid action" });
    }

    console.log("✅ Bulk action completed:", action, "affected:", result.modifiedCount || result.deletedCount);

    res.status(200).json({
      success: true,
      message: `Bulk action '${action}' completed successfully`,
      data: {
        action,
        affectedCount: result.modifiedCount || result.deletedCount || 0,
        total: listingIds.length
      }
    });
  } catch (error) {
    console.error("❌ Error performing bulk actions:", error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ error: "Invalid listing ID format" });
    }
    
    res.status(500).json({ 
      error: "Failed to perform bulk actions",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ EXPORT LISTINGS
router.get("/export", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== EXPORT LISTINGS ===");

    const userId = req.user.id || req.user._id || req.user.userId;
    const { 
      format = 'json',
      startDate,
      endDate,
      status
    } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Build query
    const query = { sellerId: userId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Fetch listings
    const listings = await MarketplaceListing.find(query)
      .select('title description price category condition status stockQuantity views favorites createdAt updatedAt tags deliveryTime shippingCost')
      .sort('-createdAt')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const json2csvParser = new Parser({
        fields: ['Title', 'Description', 'Price', 'Category', 'Condition', 'Status', 'Stock Quantity', 'Views', 'Favorites', 'Tags', 'Delivery Time', 'Shipping Cost', 'Created At', 'Updated At']
      });
      
      const csvData = listings.map(listing => ({
        Title: listing.title,
        Description: listing.description,
        Price: listing.price,
        Category: listing.category,
        Condition: listing.condition,
        Status: listing.status,
        'Stock Quantity': listing.stockQuantity,
        Views: listing.views,
        Favorites: listing.favorites,
        Tags: listing.tags?.join(', '),
        'Delivery Time': listing.deliveryTime,
        'Shipping Cost': listing.shippingCost,
        'Created At': listing.createdAt,
        'Updated At': listing.updatedAt
      }));

      const csv = json2csvParser.parse(csvData);
      
      res.header('Content-Type', 'text/csv');
      res.attachment(`listings-export-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else {
      // Return JSON
      res.status(200).json({
        success: true,
        data: listings,
        count: listings.length,
        exportDate: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("❌ Error exporting listings:", error);
    res.status(500).json({ 
      error: "Failed to export listings",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET SIMILAR LISTINGS
router.get("/:id/similar", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    const listing = await MarketplaceListing.findById(id);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const similarListings = await MarketplaceListing.find({
      _id: { $ne: id },
      category: listing.category,
      status: 'active'
    })
    .limit(parseInt(limit))
    .select('title price category condition mediaUrls')
    .populate('sellerId', 'username avatar rating')
    .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: similarListings
    });
  } catch (error) {
    console.error("Error fetching similar listings:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch similar listings" 
    });
  }
});

// ✅ FAVORITE/UNFAVORITE LISTING
router.post("/:id/favorite", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findById(id);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    const isFavorited = listing.favorites.includes(userId);
    
    if (isFavorited) {
      // Remove from favorites
      listing.favorites = listing.favorites.filter(fav => fav.toString() !== userId);
      await listing.save();
      
      res.status(200).json({
        success: true,
        message: "Removed from favorites",
        data: { favorited: false }
      });
    } else {
      // Add to favorites
      listing.favorites.push(userId);
      await listing.save();
      
      res.status(200).json({
        success: true,
        message: "Added to favorites",
        data: { favorited: true }
      });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to update favorites" 
    });
  }
});

// ✅ GET FAVORITE LISTINGS
router.get("/favorites", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { 
      page = 1, 
      limit = 20 
    } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const query = { 
      favorites: userId,
      status: 'active'
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: '-createdAt',
      select: 'title price category condition mediaUrls favorites',
      populate: {
        path: 'sellerId',
        select: 'username avatar rating'
      }
    };

    const listings = await MarketplaceListing.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        listings: listings.docs,
        total: listings.totalDocs,
        pages: listings.totalPages,
        page: listings.page
      }
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch favorites" 
    });
  }
});

// ✅ REPORT LISTING
router.post("/:id/report", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;
    const { reason, description } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!reason) {
      return res.status(400).json({ error: "Reason is required" });
    }

    const listing = await MarketplaceListing.findById(id);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Add report to listing (you might want to store reports in a separate collection)
    listing.reports = listing.reports || [];
    listing.reports.push({
      userId,
      reason,
      description,
      createdAt: new Date()
    });

    await listing.save();

    // TODO: Send notification to admin

    res.status(200).json({
      success: true,
      message: "Listing reported successfully",
      data: {
        reported: true,
        listingId: listing._id
      }
    });
  } catch (error) {
    console.error("Error reporting listing:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to report listing" 
    });
  }
});

// ✅ GET LISTING ANALYTICS
router.get("/:id/analytics", authenticateMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id || req.user.userId;
    const { id } = req.params;
    const { period = 'month' } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOne({
      _id: id,
      sellerId: userId
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission" 
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // TODO: Implement more detailed analytics
    // For now, return basic stats
    const analytics = {
      views: listing.views || 0,
      favorites: listing.favorites?.length || 0,
      createdAt: listing.createdAt,
      status: listing.status,
      performance: {
        viewsPerDay: Math.round((listing.views || 0) / Math.max(1, (now - listing.createdAt) / (1000 * 60 * 60 * 24)))
      }
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Error fetching listing analytics:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch analytics" 
    });
  }
});

// ✅ HEALTH CHECK
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Listings API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

module.exports = router;