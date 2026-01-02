// src/types/marketplace.ts

// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  sellerRating: number;
  isHypeModeUser: boolean;
  role: string;
  phoneNumber?: string;
  bio?: string;
  joinDate?: string;
  totalSales?: number;
  totalListings?: number;
  isVerified?: boolean;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
}

// Media Types
export interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'document';
  thumbnail?: string;
  duration?: string;
  size?: number;
  name?: string;
}

// Review Types
export interface Review {
  _id: string;
  orderId: string;
  reviewerId: User;
  revieweeId: User;
  rating: number;
  comment: string;
  type: 'buyer_review' | 'seller_review';
  createdAt: string;
  updatedAt: string;
}

// Listing Types
export interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  status: 'active' | 'sold' | 'pending' | 'draft' | 'inactive';
  mediaUrls: string[];
  thumbnail?: string;
  category: string;
  tags: string[];
  views: number;
  favoriteCount: number;
  purchaseCount: number;
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
    phoneNumber?: string;
    isHypeModeUser?: boolean;
    role?: string;
  };
  sellerEmail?: string;
  type: string;
  currency: string;
  isDigital: boolean;
  createdAt: string;
  updatedAt: string;
  createdAtFormatted?: string;
  statusColor?: string;
  seller?: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
    isHypeModeUser?: boolean;
    role?: string;
  };
  // Enhanced fields
  specifications?: {
    duration?: string;
    resolution?: string;
    fileFormat?: string;
    fileSize?: string;
    includes?: string[];
    license?: string;
    deliveryTime?: string;
    revisions?: number;
  };
  requirements?: string[];
  deliveryInstructions?: string;
  rating?: number;
  totalReviews?: number;
  reviews?: Review[];
  isFeatured?: boolean;
  isPromoted?: boolean;
  promotedUntil?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

// Order Types
export interface Order {
  _id: string;
  buyerId: User;
  sellerId: User;
  listingId?: Listing;
  orderType: 'buy_now' | 'accepted_offer' | 'commission';
  amount: number;
  status: 'pending_payment' | 'paid' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed' | 'refunded';
  stripePaymentIntentId?: string;
  paymentReleased: boolean;
  releaseDate?: string;
  platformFee?: number;
  sellerAmount?: number;
  requirements?: string;
  deliveryMessage?: string;
  deliveryFiles: string[];
  revisions: number;
  maxRevisions: number;
  revisionNotes?: string[];
  buyerNotes?: string;
  sellerNotes?: string;
  expectedDelivery?: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields
  paymentMethod?: 'stripe' | 'paypal' | 'crypto';
  paymentDetails?: {
    paymentIntentId?: string;
    paymentMethodId?: string;
    customerId?: string;
    refundId?: string;
  };
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  taxAmount?: number;
  discountAmount?: number;
  couponCode?: string;
  trackingNumber?: string;
  deliveryProof?: string[];
  disputeReason?: string;
  resolution?: string;
  refundAmount?: number;
  refundReason?: string;
}

// Offer Types
export interface Offer {
  _id: string;
  buyerId: User;
  listingId: Listing;
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'countered' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields
  counterOffer?: number;
  expirationDate?: string;
  paymentIntentId?: string;
  requirements?: string;
  expectedDelivery?: string;
  negotiationHistory?: {
    amount: number;
    message?: string;
    timestamp: string;
    by: 'buyer' | 'seller';
  }[];
  isAutoDecline?: boolean;
  declineReason?: string;
}

// Message Types
export interface Message {
  _id: string;
  orderId: string;
  senderId: User;
  receiverId: User;
  message: string;
  attachments: string[];
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields
  type: 'text' | 'file' | 'system' | 'delivery';
  parentMessageId?: string;
  reactions?: {
    userId: string;
    emoji: string;
  }[];
  metadata?: {
    fileType?: string;
    fileSize?: number;
    fileName?: string;
    thumbnail?: string;
  };
}

// Notification Types
export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'offer' | 'message' | 'review' | 'system' | 'promotion';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  icon?: string;
}

// Cart Types
export interface CartItem {
  _id: string;
  listingId: Listing;
  quantity: number;
  addedAt: string;
  notes?: string;
}

// Favorite Types
export interface Favorite {
  _id: string;
  userId: string;
  listingId: Listing;
  createdAt: string;
}

// Commission Types
export interface CommissionRequest {
  _id: string;
  buyerId: User;
  sellerId: User;
  title: string;
  description: string;
  budget: number;
  deadline?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  requirements?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  listingsCount?: number;
}

// Tag Types
export interface Tag {
  _id: string;
  name: string;
  slug: string;
  count?: number;
}

// Form Data Types
export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  specifications?: {
    duration?: string;
    resolution?: string;
    fileFormat?: string;
    fileSize?: string;
    includes?: string[];
    license?: string;
    deliveryTime?: string;
    revisions?: number;
  };
  requirements?: string[];
  deliveryInstructions?: string;
  mediaFiles?: File[];
  existingMedia?: string[];
  isDigital: boolean;
  isFeatured?: boolean;
}

export interface OrderFormData {
  listingId: string;
  orderType: string;
  amount: number;
  requirements?: string;
  expectedDelivery?: string;
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  couponCode?: string;
}

export interface OfferFormData {
  listingId: string;
  amount: number;
  message?: string;
  requirements?: string;
  expectedDelivery?: string;
}

export interface ReviewFormData {
  orderId: string;
  rating: number;
  comment: string;
  type: 'buyer_review' | 'seller_review';
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

// Filter Types
export interface ListingFilters {
  type?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  tags?: string[];
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating' | 'popular';
  sellerId?: string;
  isFeatured?: boolean;
  isDigital?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

// Search Types
export interface SearchOptions {
  query: string;
  filters?: ListingFilters;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Payment Types
export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status?: string;
  metadata?: {
    orderId?: string;
    offerId?: string;
    listingId?: string;
    userId?: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billing_details?: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

// Billing Types
export interface BillingDetails {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// Analytics Types
export interface AnalyticsData {
  totalSales: number;
  totalRevenue: number;
  activeListings: number;
  pendingOrders: number;
  monthlySales: {
    month: string;
    sales: number;
    revenue: number;
  }[];
  topListings: Listing[];
  recentOrders: Order[];
}

// Dashboard Stats
export interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalSales: number;
  totalRevenue: number;
  pendingOrders: number;
  activeOffers: number;
  unreadMessages: number;
  recentActivity: (Order | Offer | Message)[];
}

// Export all types
export type {
  User,
  Listing,
  Order,
  Offer,
  Message,
  Review,
  CartItem,
  Favorite,
  CommissionRequest,
  Category,
  Tag,
  Notification,
  ListingFormData,
  OrderFormData,
  OfferFormData,
  ReviewFormData,
  ApiResponse,
  ListingFilters,
  SearchOptions,
  PaymentIntent,
  PaymentMethod,
  BillingDetails,
  AnalyticsData,
  DashboardStats,
  MediaFile,
};