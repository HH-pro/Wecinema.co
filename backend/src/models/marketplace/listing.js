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
  
  // 🆕 UPDATED: Price always in USD
  price: { 
    type: Number, 
    required: true,
    min: 0,
    set: function(value) {
      // Round to 2 decimal places for USD
      return parseFloat(value.toFixed(2));
    }
  },
  
  // 🆕 NEW: Store original currency for conversion tracking
  originalCurrency: {
    type: String,
    enum: ['USD', 'INR', null],
    default: null
  },
  
  // 🆕 NEW: Store original price if converted from another currency
  originalPrice: {
    type: Number,
    min: 0,
    default: null
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
  
  // 🆕 NEW: Exchange rate used for conversion
  exchangeRate: {
    type: Number,
    default: 83 // Default INR to USD rate
  },
  
  // 🆕 NEW: When the conversion was done
  convertedAt: {
    type: Date
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

// 🆕 Pre-save middleware for currency conversion
marketplaceListingSchema.pre('save', async function(next) {
  // Generate slug from title
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // 🆕 Auto-convert price to USD if needed
  // When creating new listing with originalCurrency = 'INR'
  if (this.isNew && this.originalCurrency === 'INR' && this.originalPrice) {
    // Convert INR to USD
    const exchangeRate = this.exchangeRate || 83;
    this.price = parseFloat((this.originalPrice / exchangeRate).toFixed(2));
    this.convertedAt = new Date();
  }
  
  // 🆕 Update convertedAt when price is modified
  if (this.isModified('price') && this.originalCurrency && this.originalCurrency !== 'USD') {
    this.convertedAt = new Date();
  }
  
  // Populate sellerEmail from User model if not provided
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

// 🆕 Virtual for formatted price in USD
marketplaceListingSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// 🆕 Virtual to display price with original currency if converted
marketplaceListingSchema.virtual('priceWithOriginal').get(function() {
  if (this.originalCurrency && this.originalPrice) {
    if (this.originalCurrency === 'INR') {
      return {
        usd: `$${this.price.toFixed(2)}`,
        original: `₹${this.originalPrice.toFixed(2)}`,
        currency: this.originalCurrency
      };
    }
  }
  return {
    usd: `$${this.price.toFixed(2)}`,
    original: null,
    currency: 'USD'
  };
});

// 🆕 Method to convert existing listings to USD
marketplaceListingSchema.methods.convertToUSD = function(exchangeRate = 83) {
  if (this.originalCurrency && this.originalCurrency !== 'USD') {
    this.exchangeRate = exchangeRate;
    this.price = parseFloat((this.originalPrice / exchangeRate).toFixed(2));
    this.convertedAt = new Date();
    return this;
  }
  return this;
};

// 🆕 Static method to convert all INR listings to USD
marketplaceListingSchema.statics.convertAllINRtoUSD = async function(exchangeRate = 83) {
  const listings = await this.find({ originalCurrency: 'INR' });
  
  for (let listing of listings) {
    listing.price = parseFloat((listing.originalPrice / exchangeRate).toFixed(2));
    listing.exchangeRate = exchangeRate;
    listing.convertedAt = new Date();
    await listing.save();
  }
  
  return listings.length;
};

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

// 🆕 Method to get seller contact info
marketplaceListingSchema.methods.getSellerContact = function() {
  return {
    email: this.sellerEmail,
    currency: 'USD' // Always USD
  };
};

// 🆕 Static method to find listings by seller email
marketplaceListingSchema.statics.findBySellerEmail = function(email) {
  return this.find({ sellerEmail: email.toLowerCase() });
};

// 🆕 Update email when seller updates their email
marketplaceListingSchema.statics.updateSellerEmail = async function(sellerId, newEmail) {
  return this.updateMany(
    { sellerId: sellerId },
    { sellerEmail: newEmail.toLowerCase() }
  );
};

const MarketplaceListing = mongoose.model('MarketplaceListing', marketplaceListingSchema);

module.exports = MarketplaceListing;