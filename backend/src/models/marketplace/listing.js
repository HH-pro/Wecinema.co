const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema({
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
    maxlength: 2000
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['for_sale', 'licensing', 'adaptation_rights', 'commission'],
    required: true
  },
  category: {
    type: String,
    trim: true
  },
  mediaUrls: [{
    type: String,
    validate: {
      validator: function(url) {
        // Basic URL validation
        return /^https?:\/\/.+\..+/.test(url);
      },
      message: 'Invalid media URL'
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'sold', 'inactive', 'pending_review'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // 🆕 OPTIONAL ENHANCEMENTS:
  
  // For better search and filtering
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Analytics and popularity
  viewCount: {
    type: Number,
    default: 0
  },
  favoriteCount: {
    type: Number,
    default: 0
  },
  
  // Purchase information (if applicable)
  purchaseCount: {
    type: Number,
    default: 0
  },
  
  // Licensing/rights specific fields
  licenseType: {
    type: String,
    enum: ['personal', 'commercial', 'exclusive', null],
    default: null
  },
  usageRights: String,
  
  // Commission specific fields
  commissionDetails: {
    deadline: Date,
    revisions: Number,
    requirements: String
  },
  
  // Digital delivery
  isDigital: {
    type: Boolean,
    default: true
  },
  fileSize: String,
  format: String,
  
  // SEO and discovery
  metaKeywords: [String],
  featured: {
    type: Boolean,
    default: false
  },
  
  // Moderation
  approved: {
    type: Boolean,
    default: false
  },
  rejectionReason: String,
  
  // Expiration for temporary listings
  expiresAt: Date

}, { 
  timestamps: true 
});

// 🆕 Indexes for better performance
marketplaceListingSchema.index({ sellerId: 1, createdAt: -1 });
marketplaceListingSchema.index({ status: 1, createdAt: -1 });
marketplaceListingSchema.index({ category: 1 });
marketplaceListingSchema.index({ tags: 1 });
marketplaceListingSchema.index({ price: 1 });
marketplaceListingSchema.index({ title: 'text', description: 'text', tags: 'text' });

// 🆕 Pre-save middleware to generate slug
marketplaceListingSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// 🆕 Virtual for formatted price
marketplaceListingSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// 🆕 Method to check if listing is available
marketplaceListingSchema.methods.isAvailable = function() {
  return this.status === 'active' && (!this.expiresAt || this.expiresAt > new Date());
};

// 🆕 Static method for active listings
marketplaceListingSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);
module.exports = MarketplaceListing;