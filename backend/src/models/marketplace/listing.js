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
  
  // ✅ Price in INR (Database mein INR hi store hoga)
  price: { 
    type: Number, 
    required: true,
    min: 0,
    set: function(value) {
      // 2 decimal places tak round karein
      return parseFloat(value.toFixed(2));
    }
  },
  
  // ✅ NEW: Display currency (bas display ke liye)
  displayCurrency: {
    type: String,
    enum: ['USD'],
    default: 'USD'
  },
  
  // ✅ NEW: Exchange rate for display
  displayExchangeRate: {
    type: Number,
    default: 83 // INR to USD rate
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
  
  sellerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  // Optional enhancements
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
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
  licenseType: {
    type: String,
    enum: ['personal', 'commercial', 'exclusive', null],
    default: null
  },
  usageRights: String,
  commissionDetails: {
    deadline: Date,
    revisions: Number,
    requirements: String
  },
  isDigital: {
    type: Boolean,
    default: true
  },
  fileSize: String,
  format: String,
  metaKeywords: [String],
  featured: {
    type: Boolean,
    default: false
  },
  approved: {
    type: Boolean,
    default: false
  },
  rejectionReason: String,
  expiresAt: Date

}, { 
  timestamps: true 
});

// Indexes
marketplaceListingSchema.index({ sellerId: 1, createdAt: -1 });
marketplaceListingSchema.index({ status: 1, createdAt: -1 });
marketplaceListingSchema.index({ category: 1 });
marketplaceListingSchema.index({ tags: 1 });
marketplaceListingSchema.index({ price: 1 });
marketplaceListingSchema.index({ sellerEmail: 1 });
marketplaceListingSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Pre-save middleware
marketplaceListingSchema.pre('save', async function(next) {
  // Generate slug
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Populate sellerEmail
  if (!this.sellerEmail && this.sellerId) {
    try {
      const User = mongoose.model('User');
      const seller = await User.findById(this.sellerId).select('email');
      if (seller && seller.email) {
        this.sellerEmail = seller.email;
      }
    } catch (error) {
      console.error('Error fetching seller email:', error);
    }
  }
  
  next();
});

// ✅ Virtual for formatted price in $ (Display ke liye)
marketplaceListingSchema.virtual('displayPrice').get(function() {
  const priceInUSD = this.price / (this.displayExchangeRate || 83);
  return `$${priceInUSD.toFixed(2)}`;
});

// ✅ Virtual for actual price in INR (Database value)
marketplaceListingSchema.virtual('actualPrice').get(function() {
  return `₹${this.price.toFixed(2)}`;
});

// ✅ Method to get both prices
marketplaceListingSchema.methods.getPriceInfo = function() {
  const priceInUSD = this.price / (this.displayExchangeRate || 83);
  return {
    priceInUSD: priceInUSD.toFixed(2),
    priceInINR: this.price.toFixed(2),
    display: `$${priceInUSD.toFixed(2)}`,
    actual: `₹${this.price.toFixed(2)}`,
    exchangeRate: this.displayExchangeRate || 83
  };
};

// Static method for active listings
marketplaceListingSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Method to check if listing is available
marketplaceListingSchema.methods.isAvailable = function() {
  return this.status === 'active' && (!this.expiresAt || this.expiresAt > new Date());
};

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);

module.exports = MarketplaceListing;