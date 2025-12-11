const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const marketplaceListingSchema = new mongoose.Schema({
  // Basic Information
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 5000
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Listing Type & Category
  type: {
    type: String,
    enum: ['for_sale', 'licensing', 'adaptation_rights', 'commission', 'subscription', 'service'],
    required: true
  },
  category: {
    type: String,
    trim: true,
    required: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // 🎬 VIDEO SPECIFIC FIELDS
  mediaUrls: [{
    url: { 
      type: String, 
      required: true,
      validate: {
        validator: function(url) {
          // Basic URL validation
          return /^(https?:\/\/|\/uploads\/)/.test(url);
        },
        message: 'Invalid media URL'
      }
    },
    type: { 
      type: String, 
      enum: ['image', 'video', 'document', 'audio'], 
      required: true 
    },
    // Video-specific fields
    thumbnail: String,
    duration: {
      type: Number, // in seconds
      default: 0
    },
    fileSize: {
      type: Number, // in bytes
      default: 0
    },
    filename: String,
    mimeType: String,
    resolution: String, // e.g., "1920x1080"
    aspectRatio: String, // e.g., "16:9"
    bitrate: Number, // in kbps
    format: String, // e.g., "mp4", "mov"
    // Status management
    isActive: { 
      type: Boolean, 
      default: true 
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    isPreview: {
      type: Boolean,
      default: false
    },
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    },
    deactivatedAt: Date,
    activatedAt: Date,
    order: {
      type: Number,
      default: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // 🎬 VIDEO LISTING STATUS
  isVideoListing: { 
    type: Boolean, 
    default: false 
  },
  videoStatus: {
    type: String,
    enum: ['active', 'processing', 'deactivated', 'failed'],
    default: 'processing'
  },
  videoProcessing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    message: String,
    startedAt: Date,
    completedAt: Date,
    error: String
  },
  primaryVideo: {
    url: String,
    thumbnail: String,
    duration: Number,
    quality: String
  },
  
  // Listing Status
  status: {
    type: String,
    enum: ['draft', 'active', 'sold', 'inactive', 'pending_review', 'rejected', 'archived', 'expired'],
    default: 'draft'
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  rejectionReason: String,
  approvalDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 🆕 EMAIL FIELD
  sellerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        if (!email) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  // Contact Information
  contactInfo: {
    email: String,
    phone: String,
    website: String,
    socialMedia: {
      type: Map,
      of: String
    }
  },
  
  // SEO & Discovery
  slug: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  metaKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  featuredExpiresAt: Date,
  
  // Tags & Classification
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  brand: String,
  color: String,
  size: String,
  weight: Number,
  dimensions: String,
  
  // Inventory & Stock
  stockQuantity: {
    type: Number,
    default: 1,
    min: 0
  },
  allowBackorders: {
    type: Boolean,
    default: false
  },
  lowStockThreshold: {
    type: Number,
    default: 5
  },
  
  // Shipping & Delivery
  isDigital: {
    type: Boolean,
    default: true
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingDetails: {
    weight: Number,
    dimensions: String,
    shippingClass: String,
    estimatedDelivery: String,
    freeShippingThreshold: Number
  },
  deliveryTime: {
    type: String,
    default: '3-5 business days'
  },
  returnsAccepted: {
    type: Boolean,
    default: true
  },
  returnPolicy: String,
  warranty: String,
  
  // Licensing/Rights Specific
  licenseType: {
    type: String,
    enum: ['personal', 'commercial', 'exclusive', 'enterprise', 'custom', null],
    default: null
  },
  licenseTerms: String,
  usageRights: String,
  restrictions: [String],
  attributionRequired: {
    type: Boolean,
    default: false
  },
  attributionText: String,
  
  // Commission Specific
  commissionDetails: {
    deadline: Date,
    revisions: {
      type: Number,
      default: 3
    },
    maxRevisions: {
      type: Number,
      default: 5
    },
    requirements: String,
    styleReferences: [String],
    targetAudience: String,
    timeline: String
  },
  
  // Digital Product Specific
  fileFormat: String,
  fileSize: String,
  resolution: String,
  aspectRatio: String,
  compatibleWith: [String],
  systemRequirements: String,
  downloadLimit: {
    type: Number,
    default: 3
  },
  accessDuration: {
    type: Number, // in days
    default: 365
  },
  
  // Pricing & Offers
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  hasDiscount: {
    type: Boolean,
    default: false
  },
  discountPrice: Number,
  discountStartDate: Date,
  discountEndDate: Date,
  offers: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'bundle']
    },
    value: Number,
    description: String,
    validUntil: Date
  }],
  
  // Analytics & Performance
  viewCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  purchaseCount: {
    type: Number,
    default: 0
  },
  inquiryCount: {
    type: Number,
    default: 0
  },
  conversionRate: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date,
  lastPurchasedAt: Date,
  
  // Reviews & Ratings
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  
  // Social Proof
  featuredReviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  testimonials: [{
    text: String,
    author: String,
    authorRole: String,
    date: Date
  }],
  
  // Features & Specifications
  features: [{
    title: String,
    description: String,
    icon: String
  }],
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  includedItems: [String],
  requirements: String,
  
  // Timeline
  availableFrom: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  autoRenew: {
    type: Boolean,
    default: false
  },
  renewalPeriod: {
    type: Number, // in days
    default: 30
  },
  
  // Location (for physical items)
  location: {
    country: String,
    state: String,
    city: String,
    zipCode: String,
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Monetization
  revenueShare: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  affiliateCommission: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Security & Access
  isPrivate: {
    type: Boolean,
    default: false
  },
  accessCode: String,
  password: String,
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Versioning
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    data: mongoose.Schema.Types.Mixed,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: Date,
  
  // Performance Metrics
  performanceScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Custom Fields
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎬 VIRTUAL FIELDS
marketplaceListingSchema.virtual('formattedPrice').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.price);
});

marketplaceListingSchema.virtual('discountPriceFormatted').get(function() {
  if (!this.discountPrice) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.discountPrice);
});

marketplaceListingSchema.virtual('hasActiveDiscount').get(function() {
  if (!this.hasDiscount || !this.discountPrice) return false;
  const now = new Date();
  return (!this.discountStartDate || now >= this.discountStartDate) &&
         (!this.discountEndDate || now <= this.discountEndDate);
});

marketplaceListingSchema.virtual('currentPrice').get(function() {
  if (this.hasActiveDiscount) {
    return this.discountPrice;
  }
  return this.price;
});

marketplaceListingSchema.virtual('currentPriceFormatted').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.currentPrice);
});

marketplaceListingSchema.virtual('discountAmount').get(function() {
  if (!this.hasActiveDiscount) return 0;
  return this.price - this.discountPrice;
});

marketplaceListingSchema.virtual('discountPercentageCalculated').get(function() {
  if (!this.hasActiveDiscount || this.price === 0) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

marketplaceListingSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

marketplaceListingSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diffTime = this.expiresAt - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

marketplaceListingSchema.virtual('isLowStock').get(function() {
  return this.stockQuantity <= this.lowStockThreshold;
});

marketplaceListingSchema.virtual('isOutOfStock').get(function() {
  return this.stockQuantity === 0 && !this.allowBackorders;
});

marketplaceListingSchema.virtual('activeVideoCount').get(function() {
  if (!this.mediaUrls) return 0;
  return this.mediaUrls.filter(media => 
    media.type === 'video' && media.isActive
  ).length;
});

marketplaceListingSchema.virtual('primaryVideoUrl').get(function() {
  if (!this.mediaUrls) return null;
  const primaryVideo = this.mediaUrls.find(media => 
    media.type === 'video' && media.isPrimary
  );
  return primaryVideo ? primaryVideo.url : null;
});

marketplaceListingSchema.virtual('videoThumbnail').get(function() {
  if (!this.mediaUrls) return null;
  const video = this.mediaUrls.find(media => 
    media.type === 'video' && media.isActive
  );
  return video ? (video.thumbnail || video.url) : null;
});

// 🎬 INDEXES
marketplaceListingSchema.index({ sellerId: 1, createdAt: -1 });
marketplaceListingSchema.index({ status: 1, createdAt: -1 });
marketplaceListingSchema.index({ category: 1, subcategory: 1 });
marketplaceListingSchema.index({ tags: 1 });
marketplaceListingSchema.index({ price: 1 });
marketplaceListingSchema.index({ sellerEmail: 1 });
marketplaceListingSchema.index({ 'location.coordinates': '2dsphere' });
marketplaceListingSchema.index({ isVideoListing: 1, videoStatus: 1 });
marketplaceListingSchema.index({ featured: 1, createdAt: -1 });
marketplaceListingSchema.index({ averageRating: -1 });
marketplaceListingSchema.index({ viewCount: -1 });
marketplaceListingSchema.index({ purchaseCount: -1 });
marketplaceListingSchema.index({ expiresAt: 1 });
marketplaceListingSchema.index({ slug: 1 }, { unique: true, sparse: true });

// Text index for search
marketplaceListingSchema.index(
  { 
    title: 'text', 
    description: 'text', 
    shortDescription: 'text',
    tags: 'text',
    brand: 'text',
    category: 'text',
    subcategory: 'text'
  },
  {
    weights: {
      title: 10,
      shortDescription: 5,
      description: 3,
      tags: 4,
      brand: 2,
      category: 1,
      subcategory: 1
    },
    name: 'listing_search_index'
  }
);

// 🎬 PRE-SAVE MIDDLEWARE
marketplaceListingSchema.pre('save', async function(next) {
  // Generate slug from title
  if (this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for uniqueness
    const Listing = mongoose.model('MarketplaceListing');
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await Listing.findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  // Set video listing flag
  if (this.isModified('mediaUrls')) {
    this.isVideoListing = this.mediaUrls && 
      this.mediaUrls.some(media => media.type === 'video');
    
    // Set primary video if not set
    if (this.isVideoListing && !this.primaryVideo) {
      const firstVideo = this.mediaUrls.find(media => media.type === 'video');
      if (firstVideo) {
        this.primaryVideo = {
          url: firstVideo.url,
          thumbnail: firstVideo.thumbnail,
          duration: firstVideo.duration,
          quality: firstVideo.resolution
        };
      }
    }
  }
  
  // Populate seller email if not provided
  if (!this.sellerEmail && this.sellerId) {
    try {
      const User = mongoose.model('User');
      const seller = await User.findById(this.sellerId).select('email username');
      if (seller) {
        this.sellerEmail = seller.email;
        
        // Also populate contact info if not set
        if (!this.contactInfo?.email) {
          this.contactInfo = this.contactInfo || {};
          this.contactInfo.email = seller.email;
        }
      }
    } catch (error) {
      console.error('Error fetching seller info:', error);
    }
  }
  
  // Set meta fields if not provided
  if (!this.metaTitle && this.title) {
    this.metaTitle = this.title.substring(0, 60);
  }
  
  if (!this.metaDescription && this.shortDescription) {
    this.metaDescription = this.shortDescription.substring(0, 160);
  } else if (!this.metaDescription && this.description) {
    this.metaDescription = this.description.substring(0, 160);
  }
  
  // Calculate discount fields
  if (this.isModified('price') || this.isModified('discountPrice')) {
    if (this.discountPrice && this.price > 0) {
      this.hasDiscount = true;
      this.discountPercentage = Math.round(((this.price - this.discountPrice) / this.price) * 100);
    } else {
      this.hasDiscount = false;
      this.discountPercentage = 0;
    }
  }
  
  // Handle status changes
  if (this.isModified('status')) {
    if (this.status === 'active' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
    
    if (this.status === 'sold' && !this.lastPurchasedAt) {
      this.lastPurchasedAt = new Date();
    }
  }
  
  // Handle video status
  if (this.isModified('videoStatus')) {
    if (this.videoStatus === 'deactivated') {
      this.videoProcessing = {
        status: 'completed',
        progress: 100,
        message: 'Video deactivated',
        completedAt: new Date()
      };
    }
  }
  
  // Increment version on significant changes
  if (this.isModified('title') || this.isModified('description') || 
      this.isModified('price') || this.isModified('mediaUrls')) {
    this.version += 1;
    
    // Store previous version
    if (this.version > 1) {
      const previousData = {
        title: this._original ? this._original.title : this.title,
        description: this._original ? this._original.description : this.description,
        price: this._original ? this._original.price : this.price,
        mediaUrls: this._original ? this._original.mediaUrls : this.mediaUrls,
        version: this.version - 1,
        changedAt: new Date(),
        changedBy: this.updatedBy
      };
      
      this.previousVersions.push(previousData);
      
      // Keep only last 5 versions
      if (this.previousVersions.length > 5) {
        this.previousVersions.shift();
      }
    }
  }
  
  // Store original for version tracking
  if (this.isNew) {
    this._original = null;
  } else {
    this._original = this._original || this.toObject();
  }
  
  next();
});

// 🎬 POST-SAVE MIDDLEWARE
marketplaceListingSchema.post('save', async function(doc, next) {
  // Update user's listing count if needed
  try {
    const User = mongoose.model('User');
    const listingCount = await mongoose.model('MarketplaceListing').countDocuments({
      sellerId: doc.sellerId,
      status: 'active'
    });
    
    await User.findByIdAndUpdate(doc.sellerId, {
      $set: { listingCount: listingCount }
    });
  } catch (error) {
    console.error('Error updating user listing count:', error);
  }
  
  next();
});

// 🎬 STATIC METHODS
marketplaceListingSchema.statics.findActive = function(query = {}) {
  return this.find({
    ...query,
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

marketplaceListingSchema.statics.findActiveVideos = function() {
  return this.find({
    isVideoListing: true,
    videoStatus: 'active',
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

marketplaceListingSchema.statics.findBySellerEmail = function(email, options = {}) {
  const query = { sellerEmail: email.toLowerCase() };
  if (options.onlyActive) {
    query.status = 'active';
  }
  return this.find(query);
};

marketplaceListingSchema.statics.updateSellerEmail = async function(sellerId, newEmail) {
  return this.updateMany(
    { sellerId: sellerId },
    { 
      sellerEmail: newEmail.toLowerCase(),
      'contactInfo.email': newEmail.toLowerCase()
    }
  );
};

marketplaceListingSchema.statics.search = function(searchTerm, filters = {}) {
  const query = {};
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  // Apply filters
  if (filters.category) query.category = filters.category;
  if (filters.subcategory) query.subcategory = filters.subcategory;
  if (filters.minPrice) query.price = { $gte: parseFloat(filters.minPrice) };
  if (filters.maxPrice) {
    query.price = query.price || {};
    query.price.$lte = parseFloat(filters.maxPrice);
  }
  if (filters.type) query.type = filters.type;
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags.map(tag => tag.toLowerCase()) };
  }
  if (filters.status) query.status = filters.status;
  if (filters.isVideoListing !== undefined) {
    query.isVideoListing = filters.isVideoListing === 'true';
  }
  if (filters.videoStatus) query.videoStatus = filters.videoStatus;
  
  // Always show active listings by default
  if (filters.status === undefined) {
    query.status = 'active';
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }
  
  return this.find(query);
};

marketplaceListingSchema.statics.getCategories = async function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

marketplaceListingSchema.statics.getStats = async function(sellerId = null) {
  const matchStage = sellerId ? { sellerId: mongoose.Types.ObjectId(sellerId) } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalListings: { $sum: 1 },
        activeListings: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'active'] },
                { $or: [
                  { $eq: ['$expiresAt', null] },
                  { $gt: ['$expiresAt', new Date()] }
                ]}
              ]},
              1,
              0
            ]
          }
        },
        videoListings: {
          $sum: { $cond: [{ $eq: ['$isVideoListing', true] }, 1, 0] }
        },
        totalViews: { $sum: '$viewCount' },
        totalFavorites: { $sum: '$favoriteCount' },
        totalPurchases: { $sum: '$purchaseCount' },
        totalRevenue: { $sum: { $multiply: ['$price', '$purchaseCount'] } },
        averageRating: { $avg: '$averageRating' }
      }
    }
  ]);
};

// 🎬 INSTANCE METHODS
marketplaceListingSchema.methods.isAvailable = function() {
  return this.status === 'active' && 
         (!this.expiresAt || this.expiresAt > new Date()) &&
         (this.isDigital || (this.stockQuantity > 0 || this.allowBackorders));
};

marketplaceListingSchema.methods.getSellerContact = function() {
  return {
    email: this.sellerEmail || this.contactInfo?.email,
    phone: this.contactInfo?.phone,
    website: this.contactInfo?.website,
    socialMedia: this.contactInfo?.socialMedia || {}
  };
};

marketplaceListingSchema.methods.incrementView = async function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

marketplaceListingSchema.methods.incrementFavorite = async function() {
  this.favoriteCount += 1;
  return this.save();
};

marketplaceListingSchema.methods.decrementFavorite = async function() {
  if (this.favoriteCount > 0) {
    this.favoriteCount -= 1;
  }
  return this.save();
};

marketplaceListingSchema.methods.recordPurchase = async function(quantity = 1) {
  this.purchaseCount += quantity;
  this.lastPurchasedAt = new Date();
  
  if (!this.isDigital) {
    if (this.stockQuantity >= quantity) {
      this.stockQuantity -= quantity;
    } else if (this.allowBackorders) {
      this.stockQuantity = 0;
    } else {
      throw new Error('Insufficient stock');
    }
  }
  
  return this.save();
};

marketplaceListingSchema.methods.toggleVideoStatus = async function(status) {
  if (!['active', 'deactivated'].includes(status)) {
    throw new Error('Invalid video status');
  }
  
  this.videoStatus = status;
  
  // Update all video media items
  this.mediaUrls = this.mediaUrls.map(media => {
    if (media.type === 'video') {
      media.isActive = status === 'active';
      if (status === 'active') {
        media.activatedAt = new Date();
        media.deactivatedAt = undefined;
      } else {
        media.deactivatedAt = new Date();
        media.activatedAt = undefined;
      }
    }
    return media;
  });
  
  return this.save();
};

marketplaceListingSchema.methods.activateVideo = async function(mediaId = null) {
  if (mediaId) {
    // Activate specific video
    const mediaIndex = this.mediaUrls.findIndex(media => 
      media._id.toString() === mediaId && media.type === 'video'
    );
    
    if (mediaIndex === -1) {
      throw new Error('Video not found');
    }
    
    this.mediaUrls[mediaIndex].isActive = true;
    this.mediaUrls[mediaIndex].activatedAt = new Date();
    this.mediaUrls[mediaIndex].deactivatedAt = undefined;
  } else {
    // Activate all videos
    this.mediaUrls = this.mediaUrls.map(media => {
      if (media.type === 'video') {
        media.isActive = true;
        media.activatedAt = new Date();
        media.deactivatedAt = undefined;
      }
      return media;
    });
  }
  
  this.videoStatus = 'active';
  return this.save();
};

marketplaceListingSchema.methods.deactivateVideo = async function(mediaId = null) {
  if (mediaId) {
    // Deactivate specific video
    const mediaIndex = this.mediaUrls.findIndex(media => 
      media._id.toString() === mediaId && media.type === 'video'
    );
    
    if (mediaIndex === -1) {
      throw new Error('Video not found');
    }
    
    this.mediaUrls[mediaIndex].isActive = false;
    this.mediaUrls[mediaIndex].deactivatedAt = new Date();
    this.mediaUrls[mediaIndex].activatedAt = undefined;
  } else {
    // Deactivate all videos
    this.mediaUrls = this.mediaUrls.map(media => {
      if (media.type === 'video') {
        media.isActive = false;
        media.deactivatedAt = new Date();
        media.activatedAt = undefined;
      }
      return media;
    });
  }
  
  this.videoStatus = 'deactivated';
  return this.save();
};

marketplaceListingSchema.methods.addMedia = async function(mediaData) {
  // Set order if not provided
  if (!mediaData.order && this.mediaUrls.length > 0) {
    const maxOrder = Math.max(...this.mediaUrls.map(m => m.order || 0));
    mediaData.order = maxOrder + 1;
  }
  
  this.mediaUrls.push(mediaData);
  
  // Update video listing flag
  if (mediaData.type === 'video') {
    this.isVideoListing = true;
    this.videoStatus = 'active';
    
    // Set as primary if it's the first video
    if (!this.primaryVideo) {
      this.primaryVideo = {
        url: mediaData.url,
        thumbnail: mediaData.thumbnail,
        duration: mediaData.duration,
        quality: mediaData.resolution
      };
      mediaData.isPrimary = true;
    }
  }
  
  return this.save();
};

marketplaceListingSchema.methods.removeMedia = async function(mediaId) {
  const mediaIndex = this.mediaUrls.findIndex(media => 
    media._id.toString() === mediaId
  );
  
  if (mediaIndex === -1) {
    throw new Error('Media not found');
  }
  
  const mediaToRemove = this.mediaUrls[mediaIndex];
  
  // Remove from array
  this.mediaUrls.splice(mediaIndex, 1);
  
  // Update video listing flag if needed
  if (mediaToRemove.type === 'video') {
    const hasOtherVideos = this.mediaUrls.some(media => media.type === 'video');
    this.isVideoListing = hasOtherVideos;
    
    if (!hasOtherVideos) {
      this.videoStatus = 'deactivated';
      this.primaryVideo = null;
    } else if (mediaToRemove.isPrimary) {
      // Set another video as primary
      const firstVideo = this.mediaUrls.find(media => media.type === 'video');
      if (firstVideo) {
        firstVideo.isPrimary = true;
        this.primaryVideo = {
          url: firstVideo.url,
          thumbnail: firstVideo.thumbnail,
          duration: firstVideo.duration,
          quality: firstVideo.resolution
        };
      }
    }
  }
  
  return this.save();
};

marketplaceListingSchema.methods.setPrimaryVideo = async function(mediaId) {
  // Reset all primary flags
  this.mediaUrls = this.mediaUrls.map(media => {
    if (media.type === 'video') {
      media.isPrimary = media._id.toString() === mediaId;
    }
    return media;
  });
  
  // Find and set new primary video
  const primaryVideo = this.mediaUrls.find(media => 
    media.type === 'video' && media._id.toString() === mediaId
  );
  
  if (!primaryVideo) {
    throw new Error('Video not found');
  }
  
  this.primaryVideo = {
    url: primaryVideo.url,
    thumbnail: primaryVideo.thumbnail,
    duration: primaryVideo.duration,
    quality: primaryVideo.resolution
  };
  
  return this.save();
};

marketplaceListingSchema.methods.updateMediaOrder = async function(orderedMediaIds) {
  const mediaMap = new Map();
  this.mediaUrls.forEach(media => {
    mediaMap.set(media._id.toString(), media);
  });
  
  // Reorder media based on provided order
  this.mediaUrls = orderedMediaIds
    .map(id => mediaMap.get(id))
    .filter(media => media !== undefined);
  
  // Update order field
  this.mediaUrls.forEach((media, index) => {
    media.order = index;
  });
  
  return this.save();
};

marketplaceListingSchema.methods.applyDiscount = async function(discountPercentage, endDate = null) {
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }
  
  this.hasDiscount = true;
  this.discountPercentage = discountPercentage;
  this.discountPrice = this.price * (1 - discountPercentage / 100);
  
  if (endDate) {
    this.discountEndDate = new Date(endDate);
  }
  
  return this.save();
};

marketplaceListingSchema.methods.removeDiscount = async function() {
  this.hasDiscount = false;
  this.discountPercentage = 0;
  this.discountPrice = undefined;
  this.discountStartDate = undefined;
  this.discountEndDate = undefined;
  
  return this.save();
};

marketplaceListingSchema.methods.clone = async function(newSellerId = null) {
  const clonedData = this.toObject();
  
  // Remove fields that shouldn't be cloned
  delete clonedData._id;
  delete clonedData.slug;
  delete clonedData.viewCount;
  delete clonedData.favoriteCount;
  delete clonedData.purchaseCount;
  delete clonedData.inquiryCount;
  delete clonedData.averageRating;
  delete clonedData.ratingCount;
  delete clonedData.reviews;
  delete clonedData.featuredReviews;
  delete clonedData.lastViewedAt;
  delete clonedData.lastPurchasedAt;
  delete clonedData.publishedAt;
  delete clonedData.createdAt;
  delete clonedData.updatedAt;
  delete clonedData.previousVersions;
  delete clonedData.version;
  
  // Update seller if provided
  if (newSellerId) {
    clonedData.sellerId = newSellerId;
  }
  
  // Set to draft status
  clonedData.status = 'draft';
  clonedData.moderatedStatus = 'pending';
  
  // Create new listing
  const Listing = mongoose.model('MarketplaceListing');
  const newListing = new Listing(clonedData);
  
  return newListing.save();
};

// 🎬 QUERY HELPERS
marketplaceListingSchema.query.active = function() {
  return this.where({
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

marketplaceListingSchema.query.video = function() {
  return this.where({
    isVideoListing: true,
    videoStatus: 'active'
  });
};

marketplaceListingSchema.query.featured = function() {
  return this.where({
    featured: true,
    $or: [
      { featuredExpiresAt: null },
      { featuredExpiresAt: { $gt: new Date() } }
    ]
  });
};

marketplaceListingSchema.query.byCategory = function(category) {
  return this.where({ category });
};

marketplaceListingSchema.query.bySeller = function(sellerId) {
  return this.where({ sellerId });
};

marketplaceListingSchema.query.byPriceRange = function(min, max) {
  const query = {};
  if (min !== undefined) query.$gte = min;
  if (max !== undefined) query.$lte = max;
  return this.where({ price: query });
};

marketplaceListingSchema.query.withDiscount = function() {
  return this.where({ hasDiscount: true });
};

// Add pagination plugin
marketplaceListingSchema.plugin(mongoosePaginate);

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);
module.exports = MarketplaceListing;