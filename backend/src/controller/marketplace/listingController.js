// src/pages/seller/SellerDashboard.tsx
// (Your existing frontend code remains the same)

// routes/marketplace/listings.js - Updated with edit/delete functionality
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
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for videos and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
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
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
});

// ✅ GENERATE VIDEO THUMBNAIL
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

// ✅ GET VIDEO DURATION
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

// ✅ VALIDATION FUNCTION
const validateListing = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }
  
  if (!data.description || data.description.trim().length < 20) {
    errors.push('Description must be at least 20 characters');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }
  
  return errors;
};

// ✅ DELETE OLD FILES HELPER
const deleteOldFiles = async (oldUrls, newUrls) => {
  try {
    const filesToDelete = oldUrls.filter(url => !newUrls.includes(url));
    
    for (const fileUrl of filesToDelete) {
      try {
        // Extract filename from URL
        const filename = path.basename(fileUrl);
        const filePath = path.join('uploads/listings/', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Deleted old file:', filePath);
          
          // Also delete thumbnail if exists
          const thumbPath = filePath.replace(/\.(mp4|mov|avi|mkv|webm)$/, '_thumb.jpg');
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

// ============================
// CRUD ROUTES
// ============================

// ✅ CREATE LISTING
router.post("/", authenticateMiddleware, upload.array('media', 10), async (req, res) => {
  try {
    console.log("=== CREATE LISTING ===");
    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files);

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
    const thumbnailUrls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const relativePath = file.path.replace(/\\/g, '/');
        const fileUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${relativePath}`;
        
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
            const thumbUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${thumbRelativePath}`;
            
            thumbnailUrls.push(thumbUrl);
            
            // Store video metadata
            mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: thumbUrl,
              duration: duration,
              filename: file.originalname,
              size: file.size
            });
            
          } catch (videoErr) {
            console.error('Error processing video:', videoErr);
            // Still add video URL even if thumbnail generation fails
            mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: null,
              duration: 0,
              filename: file.originalname,
              size: file.size
            });
          }
        } else {
          // It's an image
          mediaUrls.push({
            url: fileUrl,
            type: 'image',
            filename: file.originalname,
            size: file.size
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
      status: req.body.status || 'active',
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
      slug: req.body.slug || req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

    // Optional fields
    if (req.body.brand) listingData.brand = req.body.brand;
    if (req.body.color) listingData.color = req.body.color;
    if (req.body.size) listingData.size = req.body.size;
    if (req.body.weight) listingData.weight = parseFloat(req.body.weight);
    if (req.body.dimensions) listingData.dimensions = req.body.dimensions;
    if (req.body.warranty) listingData.warranty = req.body.warranty;
    if (req.body.features) listingData.features = req.body.features.split(',').map(f => f.trim());
    if (req.body.specifications) listingData.specifications = JSON.parse(req.body.specifications);

    console.log("Creating listing with data:", listingData);

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

// ✅ GET SINGLE LISTING
router.get("/:id", async (req, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id)
      .populate('sellerId', 'username avatar rating')
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

// ✅ UPDATE LISTING (WITH VIDEO DEACTIVATE/ACTIVATE FUNCTIONALITY)
router.put("/:id", authenticateMiddleware, upload.array('media', 10), async (req, res) => {
  let session;
  try {
    console.log("=== UPDATE LISTING ===");
    console.log("Listing ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files?.length || 0);

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
        const fileUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${relativePath}`;
        
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
            const thumbUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${thumbRelativePath}`;
            
            newMediaUrls.push(fileUrl);
            
            // Store video metadata
            listing.mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: thumbUrl,
              duration: duration,
              filename: file.originalname,
              size: file.size
            });
            
          } catch (videoErr) {
            console.error('Error processing video:', videoErr);
            listing.mediaUrls.push({
              url: fileUrl,
              type: 'video',
              thumbnail: null,
              duration: 0,
              filename: file.originalname,
              size: file.size
            });
          }
        } else {
          // It's an image
          newMediaUrls.push(fileUrl);
          listing.mediaUrls.push({
            url: fileUrl,
            type: 'image',
            filename: file.originalname,
            size: file.size
          });
        }
      }
    }

    // Handle media URLs from request (existing media that should be kept)
    if (req.body.mediaUrls) {
      try {
        const existingUrls = JSON.parse(req.body.mediaUrls);
        const existingMedia = listing.mediaUrls.filter(media => 
          existingUrls.includes(media.url)
        );
        listing.mediaUrls = existingMedia;
        newMediaUrls.push(...existingUrls);
      } catch (err) {
        console.error('Error parsing mediaUrls:', err);
      }
    }

    // ✅ VIDEO DEACTIVATE/ACTIVATE FUNCTIONALITY
    // Check if video status needs to be changed
    if (req.body.videoStatus !== undefined) {
      if (req.body.videoStatus === 'deactivated') {
        // Deactivate video - mark all videos as inactive
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
        // Activate video
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
    // Check if listing status needs to be changed
    if (req.body.status && ['active', 'inactive', 'sold', 'reserved'].includes(req.body.status)) {
      listing.status = req.body.status;
      
      // Handle sold status
      if (req.body.status === 'sold') {
        listing.soldAt = new Date();
      }
      
      // Handle reserved status
      if (req.body.status === 'reserved') {
        listing.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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
        console.error('Error parsing specifications:', err);
      }
    }

    // Save updated listing
    listing.updatedAt = new Date();
    await listing.save({ session });

    // Commit transaction
    await session.commitTransaction();

    console.log("✅ Listing updated:", listing._id);

    // Clean up old files (async, don't wait for it)
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

// ✅ DELETE LISTING
router.delete("/:id", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== DELETE LISTING REQUEST ===");
    console.log("Listing ID to delete:", req.params.id);
    console.log("User making request:", req.user);

    const userId = req.user.id || req.user._id || req.user.userId;
    
    if (!userId) {
      console.log("❌ No user ID found in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    const listing = await MarketplaceListing.findOneAndDelete({
      _id: req.params.id,
      sellerId: userId,
    });

    if (!listing) {
      console.log("❌ Listing not found or user not authorized:", {
        listingId: req.params.id,
        userId: userId
      });
      return res.status(404).json({ 
        error: "Listing not found or you don't have permission to delete this listing" 
      });
    }

    // Clean up associated files
    if (listing.mediaUrls && listing.mediaUrls.length > 0) {
      listing.mediaUrls.forEach(media => {
        try {
          // Extract filename from URL
          const urlParts = media.url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const filePath = path.join('uploads/listings/', filename);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Deleted file:', filePath);
          }
          
          // Delete thumbnail if exists
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

// ✅ UPDATE LISTING STATUS (ACTIVE/INACTIVE)
router.patch("/:id/status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== UPDATE LISTING STATUS ===");
    console.log("Listing ID:", req.params.id);
    console.log("New status:", req.body.status);

    const userId = req.user.id || req.user._id || req.user.userId;
    const { status } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!['active', 'inactive', 'sold', 'reserved'].includes(status)) {
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
    
    // Set soldAt if marking as sold
    if (status === 'sold') {
      listing.soldAt = new Date();
    }
    
    // Set reservedUntil if marking as reserved
    if (status === 'reserved') {
      listing.reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    // Clear reservedUntil if changing from reserved to another status
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

// ✅ TOGGLE VIDEO STATUS (ACTIVATE/DEACTIVATE)
router.patch("/:id/video-status", authenticateMiddleware, async (req, res) => {
  try {
    console.log("=== TOGGLE VIDEO STATUS ===");
    console.log("Listing ID:", req.params.id);
    console.log("Video status:", req.body.status);

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
      'mediaUrls.type': 'video' // Ensure listing has videos
    });

    if (!listing) {
      return res.status(404).json({ 
        error: "Listing not found, doesn't have videos, or you don't have permission" 
      });
    }

    const isActivate = status === 'activated';
    
    // Update all video media items
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
    console.log("Listing ID:", req.params.id);
    console.log("Media ID:", req.params.mediaId);

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

    // Find the media to delete
    const mediaIndex = listing.mediaUrls.findIndex(
      media => media._id.toString() === req.params.mediaId
    );

    if (mediaIndex === -1) {
      return res.status(404).json({ error: "Media not found in listing" });
    }

    const mediaToDelete = listing.mediaUrls[mediaIndex];

    // Remove media from array
    listing.mediaUrls.splice(mediaIndex, 1);

    // Update video listing flag if needed
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
        
        // Delete thumbnail if exists
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

// ✅ GET USER'S LISTINGS (FOR DASHBOARD)
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
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search in title and description
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

// ✅ HEALTH CHECK
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Listings routes are healthy",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;