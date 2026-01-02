// src/api/marketplaceApi.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

// ============================================
// ✅ TYPE DEFINITIONS (COMPREHENSIVE)
// ============================================

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp?: string;
  version?: string;
}

// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  sellerRating: number;
  isHypeModeUser: boolean;
  role: 'user' | 'seller' | 'admin' | 'moderator';
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted' | 'rejected';
  totalSales?: number;
  totalListings?: number;
  totalReviews?: number;
  avgRating?: number;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
    github?: string;
  };
  createdAt: string;
  updatedAt: string;
  isVerified?: boolean;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    offers: boolean;
    messages: boolean;
    reviews: boolean;
  };
}

// Media Types
export interface MediaFile {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';
  thumbnail?: string;
  duration?: string;
  size?: number;
  name?: string;
  width?: number;
  height?: number;
  format?: string;
  uploadedAt?: string;
}

// Listing Types
export interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  status: 'active' | 'sold' | 'pending' | 'draft' | 'inactive' | 'reserved' | 'deleted';
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
    stripeAccountId?: string;
    stripeAccountStatus?: string;
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
  
  // Enhanced fields
  specifications?: {
    duration?: string;
    resolution?: string;
    fileFormat?: string[];
    fileSize?: string;
    includes?: string[];
    license?: string;
    deliveryTime?: string;
    revisions?: number;
    maxRevisions?: number;
    sourceFiles?: boolean;
    commercialUse?: boolean;
    resellRights?: boolean;
    printOnDemand?: boolean;
  };
  requirements?: string[];
  deliveryInstructions?: string;
  rating?: number;
  totalReviews?: number;
  isFeatured?: boolean;
  isPromoted?: boolean;
  promotedUntil?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
  };
  analytics?: {
    conversionRate?: number;
    avgTimeOnPage?: number;
    bounceRate?: number;
  };
  availability?: {
    startDate?: string;
    endDate?: string;
    quantity?: number;
    unlimited?: boolean;
  };
  pricing?: {
    basePrice: number;
    salePrice?: number;
    compareAtPrice?: number;
    discountPercentage?: number;
    isOnSale?: boolean;
    saleEndsAt?: string;
  };
  shipping?: {
    isPhysical?: boolean;
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    shippingMethods?: string[];
    processingTime?: string;
  };
  stats?: {
    dailyViews?: number;
    weeklyViews?: number;
    monthlyViews?: number;
    conversionRate?: number;
    avgOrderValue?: number;
  };
}

// Order Types
export interface Order {
  _id: string;
  orderNumber?: string;
  listingId: Listing | string;
  buyerId: User;
  sellerId: User;
  amount: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'processing' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'refunded' | 'disputed' | 'archived';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'released' | 'held' | 'partially_refunded';
  orderType: 'direct_purchase' | 'accepted_offer' | 'commission';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    email: string;
  };
  deliveryMessage?: string;
  deliveryFiles?: string[];
  deliveries?: Array<{
    _id: string;
    files: string[];
    message: string;
    timestamp: string;
    revisionNumber: number;
    isFinal: boolean;
  }>;
  revisions?: number;
  maxRevisions?: number;
  revisionNotes?: Array<{
    notes: string;
    requestedAt: string;
    requestedBy: 'buyer' | 'seller';
    completedAt?: string;
    revisionNumber: number;
  }>;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  platformFee?: number;
  sellerAmount?: number;
  paymentReleased?: boolean;
  releaseDate?: string;
  orderDate: string;
  expectedDelivery?: string;
  paidAt?: string;
  processingAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  buyerNotes?: string;
  sellerNotes?: string;
  cancelReason?: string;
  cancelledBy?: 'buyer' | 'seller' | 'admin' | 'system';
  requirements?: string;
  offerId?: string;
  
  // Enhanced fields
  paymentMethod?: 'stripe' | 'paypal' | 'crypto' | 'bank_transfer';
  paymentDetails?: {
    paymentIntentId?: string;
    paymentMethodId?: string;
    customerId?: string;
    refundId?: string;
    refundAmount?: number;
    refundReason?: string;
  };
  billingAddress?: {
    sameAsShipping: boolean;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
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
  timeline?: Array<{
    status: string;
    timestamp: string;
    description: string;
    actor: string;
  }>;
}

// Offer Types
export interface Offer {
  _id: string;
  listingId: Listing;
  buyerId: User;
  sellerId: User;
  offeredPrice: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'pending_payment' | 'paid' | 'cancelled' | 'countered' | 'withdrawn';
  message?: string;
  amount?: number;
  paymentIntentId?: string;
  requirements?: string;
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  rejectionReason?: string;
  isTemporary?: boolean;
  expiresAt?: string;
  
  // Enhanced fields
  counterOffer?: number;
  negotiationHistory?: {
    amount: number;
    message?: string;
    timestamp: string;
    by: 'buyer' | 'seller';
    status: 'proposed' | 'accepted' | 'rejected' | 'countered';
  }[];
  isAutoDecline?: boolean;
  declineReason?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  orderId?: string;
  chatRoomId?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
  };
}

// Delivery Types
export interface Delivery {
  _id: string;
  orderId: string;
  sellerId: User;
  buyerId: User;
  message: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    key?: string;
    thumbnail?: string;
  }>;
  isFinalDelivery: boolean;
  revisionNumber: number;
  status: 'pending_review' | 'accepted' | 'revision_requested' | 'rejected';
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  deliveryMethod?: 'email' | 'download' | 'physical' | 'stream';
}

// Uploaded File Types
export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path?: string;
  extension?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  uploadedAt: string;
}

// Stats Types
export interface OrderStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  cancelled: number;
  disputed: number;
  totalSpent?: number;
  totalRevenue?: number;
  pendingRevenue?: number;
  averageOrderValue?: number;
  conversionRate?: number;
}

export interface SellerStats {
  statsByStatus: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  totals: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completedOrders: {
      count: number;
      revenue: number;
    };
    pendingOrders: {
      count: number;
      revenue: number;
    };
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    growthPercentage: number;
  };
  breakdown: Record<string, number>;
  topListings: Array<{
    listingId: string;
    title: string;
    orders: number;
    revenue: number;
  }>;
  recentActivity: any[];
}

// Timeline Types
export interface OrderTimelineItem {
  status: string;
  date: string;
  description: string;
  icon: string;
  color: string;
}

// Order Summary Types
export interface OrderSummary {
  orderInfo: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    orderType: string;
  };
  financial: {
    totalAmount: number;
    platformFee: number;
    netAmount: number;
    paymentStatus: string;
    paymentReleased: boolean;
    releaseDate?: string;
  };
  timeline: {
    revisionsUsed: number;
    revisionsLeft: number;
    deliveriesCount: number;
    expectedDelivery?: string;
    timeRemaining?: number;
    isOverdue?: boolean;
    deliveredAt?: string;
    completedAt?: string;
  };
  listing?: {
    title: string;
    category: string;
    type: string;
    price: number;
  };
  seller?: {
    username: string;
    rating?: number;
    name?: string;
  };
  buyer?: {
    username: string;
    name?: string;
  };
  offer?: {
    originalAmount: number;
    message?: string;
    expectedDelivery?: string;
  };
}

// Next Action Types
export interface BuyerNextAction {
  action: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
  url?: string;
  buttonText?: string;
}

// Stripe Account Types
export interface SellerAccountStatus {
  account: {
    id: string;
    business_type: string;
    business_profile: any;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    capabilities: any;
    requirements: {
      currently_due: string[];
      eventually_due: string[];
      past_due: string[];
      disabled_reason: string;
    };
  };
  status: {
    canReceivePayments: boolean;
    missingRequirements: string[];
    needsAction: boolean;
    isActive: boolean;
  };
  setupLink?: string;
  message: string;
}

// Chat/Messaging Types
export interface Message {
  _id: string;
  orderId: string;
  chatRoomId: string;
  senderId: User;
  receiverId: User;
  message: string;
  attachments: string[];
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  type: 'text' | 'file' | 'system' | 'delivery' | 'review' | 'payment';
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

// Review Types
export interface Review {
  _id: string;
  orderId: string;
  reviewerId: User;
  revieweeId: User;
  rating: number;
  comment: string;
  type: 'buyer_review' | 'seller_review' | 'product_review';
  createdAt: string;
  updatedAt: string;
  listingId?: string;
  response?: {
    message: string;
    createdAt: string;
  };
  helpful?: number;
  reported?: boolean;
}

// Cart Types
export interface CartItem {
  _id: string;
  listingId: Listing;
  quantity: number;
  addedAt: string;
  notes?: string;
  customization?: Record<string, any>;
}

// Favorite Types
export interface Favorite {
  _id: string;
  userId: string;
  listingId: Listing;
  createdAt: string;
  category?: string;
  tags?: string[];
}

// Notification Types
export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'offer' | 'message' | 'review' | 'system' | 'promotion' | 'payment' | 'delivery';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high';
}

// Filter Types
export interface ListingFilters {
  type?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recently_updated';
  sellerId?: string;
  isFeatured?: boolean;
  isDigital?: boolean;
  status?: string;
  page?: number;
  limit?: number;
  exclude?: string[];
  include?: string[];
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

// ============================================
// ✅ API CONFIGURATION & UTILITIES
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'marketplace_token',
  USER: 'marketplace_user',
  CART: 'marketplace_cart',
  FAVORITES: 'marketplace_favorites',
  SETTINGS: 'marketplace_settings'
};

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN) || 
         sessionStorage.getItem(STORAGE_KEYS.TOKEN);
};

// Helper function to get headers
const getHeaders = (options?: {
  contentType?: string;
  noAuth?: boolean;
}): { headers: Record<string, string> } => {
  const token = getAuthToken();
  const contentType = options?.contentType || 'application/json';
  const headers: Record<string, string> = {
    'Content-Type': contentType
  };
  
  if (!options?.noAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

// Helper function for file upload headers
const getUploadHeaders = (): { headers: Record<string, string> } => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

// Helper function to normalize API response
const normalizeResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  const data = response?.data || response;
  
  if (data.success !== undefined) {
    return data as ApiResponse<T>;
  }
  
  return {
    success: true,
    data: data as T,
    timestamp: new Date().toISOString()
  };
};

// Helper function to handle API errors
const handleApiError = <T>(
  error: AxiosError, 
  defaultMessage: string = 'API Error'
): ApiResponse<T> => {
  console.error('API Error:', error);
  
  const errorData = error.response?.data as any || {};
  const errorMessage = errorData.message || errorData.error || error.message || defaultMessage;
  const status = error.response?.status;
  
  // Handle specific error statuses
  let userMessage = errorMessage;
  if (status === 401) {
    userMessage = 'Session expired. Please login again.';
    // Clear auth data
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    // Optional: Redirect to login
    // window.location.href = '/login';
  } else if (status === 403) {
    userMessage = 'You do not have permission to perform this action.';
  } else if (status === 404) {
    userMessage = 'Resource not found.';
  } else if (status === 429) {
    userMessage = 'Too many requests. Please try again later.';
  } else if (status >= 500) {
    userMessage = 'Server error. Please try again later.';
  }
  
  return {
    success: false,
    error: userMessage,
    status: status,
    data: errorData,
    timestamp: new Date().toISOString()
  };
};

// Retry function for failed requests
const retryRequest = async <T>(
  requestFn: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<ApiResponse<T>> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await requestFn();
      if (result.success) {
        return result;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  return {
    success: false,
    error: 'Request failed after retries',
    timestamp: new Date().toISOString()
  };
};

// ============================================
// ✅ AUTHENTICATION API
// ============================================

export const authApi = {
  // Login
  login: async (email: string, password: string, rememberMe: boolean = false): Promise<ApiResponse<{ 
    token: string; 
    user: User;
    refreshToken?: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password, rememberMe }
      );
      
      const result = normalizeResponse<{ token: string; user: User; refreshToken?: string }>(response);
      
      if (result.success && result.data) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEYS.TOKEN, result.data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data.user));
        
        if (result.data.refreshToken && rememberMe) {
          localStorage.setItem('refresh_token', result.data.refreshToken);
        }
      }
      
      return result;
    } catch (error) {
      return handleApiError(error as AxiosError, 'Login failed');
    }
  },

  // Register
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: string;
  }): Promise<ApiResponse<{ 
    token: string; 
    user: User;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        userData
      );
      
      const result = normalizeResponse<{ token: string; user: User; message: string }>(response);
      
      if (result.success && result.data) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, result.data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data.user));
      }
      
      return result;
    } catch (error) {
      return handleApiError(error as AxiosError, 'Registration failed');
    }
  },

  // Logout
  logout: async (): Promise<ApiResponse> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        getHeaders()
      );
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      return normalizeResponse(response);
    } catch (error) {
      // Still clear storage even if API call fails
      localStorage.clear();
      sessionStorage.clear();
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  },

  // Refresh Token
  refreshToken: async (): Promise<ApiResponse<{ token: string; user: User }>> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken }
      );
      
      const result = normalizeResponse<{ token: string; user: User }>(response);
      
      if (result.success && result.data) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, result.data.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data.user));
      }
      
      return result;
    } catch (error) {
      return handleApiError(error as AxiosError, 'Token refresh failed');
    }
  },

  // Forgot Password
  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        { email }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Password reset request failed');
    }
  },

  // Reset Password
  resetPassword: async (token: string, password: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { token, password }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Password reset failed');
    }
  },

  // Verify Email
  verifyEmail: async (token: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-email`,
        { token }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Email verification failed');
    }
  },

  // Get Current User
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/me`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to get user info');
    }
  },

  // Update Profile
  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/profile`,
        userData,
        getHeaders()
      );
      
      const result = normalizeResponse<User>(response);
      
      if (result.success && result.data) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data));
      }
      
      return result;
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update profile');
    }
  },

  // Change Password
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/change-password`,
        { currentPassword, newPassword },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to change password');
    }
  },

  // Delete Account
  deleteAccount: async (password: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/auth/account`,
        {
          ...getHeaders(),
          data: { password }
        }
      );
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete account');
    }
  }
};

// ============================================
// ✅ LISTINGS API (COMPREHENSIVE)
// ============================================

export const listingsApi = {
  // Get all listings with filters
  getAllListings: async (params?: ListingFilters): Promise<ApiResponse<{ 
    listings: Listing[]; 
    total: number;
    pagination: any;
    filters: any;
    categories: string[];
    priceRange: { min: number; max: number };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings`,
        { params, ...getHeaders() }
      );
      
      const data = response.data;
      
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to fetch listings',
          status: data.status,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        data: {
          listings: data.data?.listings || data.listings || [],
          total: data.total || data.count || 0,
          pagination: data.pagination,
          filters: data.filters,
          categories: data.categories || [],
          priceRange: data.priceRange || { min: 0, max: 10000 }
        },
        pagination: data.pagination,
        message: data.message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch listings');
    }
  },

  // Get listing by ID
  getListingById: async (id: string): Promise<ApiResponse<Listing>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/${id}`,
        getHeaders()
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch listing');
    }
  },

  // Get seller's listings
  getMyListings: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<{ listings: Listing[]; total: number; stats: any }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/my`,
        { params, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch your listings');
    }
  },

  // Create listing
  createListing: async (listingData: FormData | any): Promise<ApiResponse<Listing>> => {
    try {
      const isFormData = listingData instanceof FormData;
      const headers = isFormData ? getUploadHeaders() : getHeaders();
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings`,
        listingData,
        headers
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create listing');
    }
  },

  // Update listing
  updateListing: async (id: string, listingData: Partial<Listing>): Promise<ApiResponse<Listing>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/${id}`,
        listingData,
        getHeaders()
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update listing');
    }
  },

  // Delete listing
  deleteListing: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${id}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete listing');
    }
  },

  // Toggle listing status
  toggleListingStatus: async (id: string): Promise<ApiResponse<Listing>> => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${id}/toggle-status`,
        {},
        getHeaders()
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to toggle status');
    }
  },

  // Upload listing media
  uploadMedia: async (files: File[], listingId?: string): Promise<ApiResponse<{ 
    files: UploadedFile[];
    urls: string[];
  }>> => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (listingId) {
        formData.append('listingId', listingId);
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/upload-media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to upload media');
    }
  },

  // Delete media
  deleteMedia: async (listingId: string, mediaUrl: string): Promise<ApiResponse<Listing>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}/media`,
        {
          ...getHeaders(),
          data: { mediaUrl }
        }
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete media');
    }
  },

  // Increment views
  incrementViews: async (id: string): Promise<ApiResponse<{ views: number }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/${id}/view`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to increment views');
    }
  },

  // Search listings
  searchListings: async (query: string, filters?: ListingFilters): Promise<ApiResponse<{ 
    listings: Listing[]; 
    total: number;
    suggestions?: string[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/search`,
        {
          params: { q: query, ...filters },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Search failed');
    }
  },

  // Get featured listings
  getFeaturedListings: async (limit?: number): Promise<ApiResponse<Listing[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/featured`,
        { params: { limit }, ...getHeaders() }
      );
      return normalizeResponse<Listing[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch featured listings');
    }
  },

  // Get similar listings
  getSimilarListings: async (listingId: string, limit: number = 4): Promise<ApiResponse<Listing[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/${listingId}/similar`,
        { params: { limit }, ...getHeaders() }
      );
      return normalizeResponse<Listing[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch similar listings');
    }
  },

  // Get listing analytics
  getListingAnalytics: async (listingId: string): Promise<ApiResponse<{
    views: number;
    favorites: number;
    purchases: number;
    conversionRate: number;
    revenue: number;
    timeline: Array<{ date: string; views: number; purchases: number }>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/${listingId}/analytics`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch analytics');
    }
  },

  // Update listing SEO
  updateSeo: async (listingId: string, seoData: {
    title?: string;
    description?: string;
    keywords?: string[];
    slug?: string;
  }): Promise<ApiResponse<Listing>> => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/seo`,
        seoData,
        getHeaders()
      );
      return normalizeResponse<Listing>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update SEO');
    }
  },

  // Bulk update listings
  bulkUpdate: async (updates: Array<{ id: string; updates: Partial<Listing> }>): Promise<ApiResponse<{ 
    updated: number; 
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/bulk-update`,
        { updates },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Bulk update failed');
    }
  },

  // Export listings
  exportListings: async (format: 'csv' | 'json' = 'csv', filters?: ListingFilters): Promise<ApiResponse<{ 
    url: string; 
    filename: string;
    expiresAt: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/export`,
        {
          params: { format, ...filters },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Export failed');
    }
  },

  // Import listings
  importListings: async (file: File, options?: {
    overwrite?: boolean;
    skipDuplicates?: boolean;
  }): Promise<ApiResponse<{ 
    imported: number; 
    skipped: number;
    errors: any[];
  }>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options) {
        formData.append('options', JSON.stringify(options));
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/import`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Import failed');
    }
  }
};

// ============================================
// ✅ ORDERS API (COMPREHENSIVE)
// ============================================

export const ordersApi = {
  // Get buyer orders
  getBuyerOrders: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<{ 
    orders: Order[]; 
    total: number;
    stats: OrderStats;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/buyer`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch orders');
    }
  },

  // Get seller orders
  getSellerOrders: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<{ 
    orders: Order[]; 
    total: number;
    stats: SellerStats;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/seller`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch sales');
    }
  },

  // Get order by ID
  getOrderById: async (id: string): Promise<ApiResponse<{
    order: Order;
    timeline: OrderTimelineItem[];
    nextActions: BuyerNextAction[];
    permissions: Record<string, boolean>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${id}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch order details');
    }
  },

  // Create direct order
  createDirectOrder: async (data: {
    listingId: string;
    quantity?: number;
    requirements?: string;
    expectedDelivery?: string;
    shippingAddress?: any;
    billingAddress?: any;
    couponCode?: string;
  }): Promise<ApiResponse<{
    order: Order;
    paymentIntent: PaymentIntent;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/direct`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create order');
    }
  },

  // Create order from offer
  createOrderFromOffer: async (offerId: string): Promise<ApiResponse<{
    order: Order;
    paymentIntent?: PaymentIntent;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/from-offer/${offerId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create order from offer');
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: string, notes?: string): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status, notes },
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update order status');
    }
  },

  // Request revision
  requestRevision: async (orderId: string, notes: string): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/revision`,
        { notes },
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to request revision');
    }
  },

  // Deliver order
  deliverOrder: async (orderId: string, data: {
    files: string[];
    message: string;
    isFinalDelivery?: boolean;
  }): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliver`,
        data,
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to deliver order');
    }
  },

  // Complete order
  completeOrder: async (orderId: string): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete`,
        {},
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to complete order');
    }
  },

  // Cancel order
  cancelOrder: async (orderId: string, reason?: string): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/cancel`,
        { reason },
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel order');
    }
  },

  // Dispute order
  disputeOrder: async (orderId: string, reason: string, evidence?: string[]): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/dispute`,
        { reason, evidence },
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to dispute order');
    }
  },

  // Resolve dispute
  resolveDispute: async (orderId: string, resolution: string, refundAmount?: number): Promise<ApiResponse<Order>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/resolve-dispute`,
        { resolution, refundAmount },
        getHeaders()
      );
      return normalizeResponse<Order>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to resolve dispute');
    }
  },

  // Get order deliveries
  getOrderDeliveries: async (orderId: string): Promise<ApiResponse<Delivery[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliveries`,
        getHeaders()
      );
      return normalizeResponse<Delivery[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch deliveries');
    }
  },

  // Get order timeline
  getOrderTimeline: async (orderId: string): Promise<ApiResponse<OrderTimelineItem[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/timeline`,
        getHeaders()
      );
      return normalizeResponse<OrderTimelineItem[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch timeline');
    }
  },

  // Get order messages
  getOrderMessages: async (orderId: string): Promise<ApiResponse<Message[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/messages`,
        getHeaders()
      );
      return normalizeResponse<Message[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch messages');
    }
  },

  // Send order message
  sendOrderMessage: async (orderId: string, message: string, attachments?: string[]): Promise<ApiResponse<Message>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/messages`,
        { message, attachments },
        getHeaders()
      );
      return normalizeResponse<Message>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to send message');
    }
  },

  // Get order statistics
  getOrderStatistics: async (period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    revenue: number;
    orders: number;
    averageOrderValue: number;
    conversionRate: number;
    growth: number;
    chartData: Array<{ date: string; revenue: number; orders: number }>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/statistics`,
        { params: { period }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch statistics');
    }
  },

  // Export orders
  exportOrders: async (format: 'csv' | 'json' = 'csv', filters?: any): Promise<ApiResponse<{ 
    url: string; 
    filename: string;
    expiresAt: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/export`,
        {
          params: { format, ...filters },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Export failed');
    }
  },

  // Bulk update orders
  bulkUpdateOrders: async (orderIds: string[], updates: Partial<Order>): Promise<ApiResponse<{ 
    updated: number; 
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/bulk-update`,
        { orderIds, updates },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Bulk update failed');
    }
  },

  // Get download files
  getDownloadFiles: async (orderId: string): Promise<ApiResponse<UploadedFile[]>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/files`,
        getHeaders()
      );
      return normalizeResponse<UploadedFile[]>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch files');
    }
  },

  // Download file
  downloadFile: async (orderId: string, fileUrl: string): Promise<Blob> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/download`,
        {
          params: { fileUrl },
          responseType: 'blob',
          ...getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// ============================================
// ✅ OFFERS API (COMPREHENSIVE)
// ============================================

export const offersApi = {
  // Make offer
  makeOffer: async (data: {
    listingId: string;
    amount: number;
    message?: string;
    requirements?: string;
    expectedDelivery?: string;
  }): Promise<ApiResponse<{ 
    offer: Offer; 
    paymentIntent?: PaymentIntent;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to make offer');
    }
  },

  // Get offers made
  getOffersMade: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ 
    offers: Offer[]; 
    total: number;
    stats: Record<string, number>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/made`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offers made');
    }
  },

  // Get offers received
  getOffersReceived: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ 
    offers: Offer[]; 
    total: number;
    stats: Record<string, number>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offers received');
    }
  },

  // Get offer by ID
  getOfferById: async (id: string): Promise<ApiResponse<Offer>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/${id}`,
        getHeaders()
      );
      return normalizeResponse<Offer>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offer');
    }
  },

  // Accept offer
  acceptOffer: async (id: string): Promise<ApiResponse<{
    offer: Offer;
    order: Order;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${id}/accept`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to accept offer');
    }
  },

  // Reject offer
  rejectOffer: async (id: string, reason?: string): Promise<ApiResponse<Offer>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${id}/reject`,
        { reason },
        getHeaders()
      );
      return normalizeResponse<Offer>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to reject offer');
    }
  },

  // Counter offer
  counterOffer: async (id: string, amount: number, message?: string): Promise<ApiResponse<Offer>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${id}/counter`,
        { amount, message },
        getHeaders()
      );
      return normalizeResponse<Offer>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to counter offer');
    }
  },

  // Withdraw offer
  withdrawOffer: async (id: string): Promise<ApiResponse<Offer>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${id}/withdraw`,
        {},
        getHeaders()
      );
      return normalizeResponse<Offer>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to withdraw offer');
    }
  },

  // Update offer
  updateOffer: async (id: string, updates: Partial<Offer>): Promise<ApiResponse<Offer>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${id}`,
        updates,
        getHeaders()
      );
      return normalizeResponse<Offer>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update offer');
    }
  },

  // Get offer statistics
  getOfferStatistics: async (): Promise<ApiResponse<{
    made: Record<string, number>;
    received: Record<string, number>;
    conversionRate: number;
    averageAmount: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/statistics`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offer statistics');
    }
  },

  // Check for pending offers on listing
  checkPendingOffer: async (listingId: string): Promise<ApiResponse<{
    hasPendingOffer: boolean;
    offer?: Offer;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/check-pending/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to check pending offers');
    }
  },

  // Get negotiation history
  getNegotiationHistory: async (offerId: string): Promise<ApiResponse<Array<{
    amount: number;
    message?: string;
    timestamp: string;
    by: 'buyer' | 'seller';
    status: string;
  }>>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/${offerId}/negotiation-history`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch negotiation history');
    }
  },

  // Send counter offer notification
  sendCounterNotification: async (offerId: string, message?: string): Promise<ApiResponse<{ 
    success: boolean;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${offerId}/notify-counter`,
        { message },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to send notification');
    }
  }
};

// ============================================
// ✅ PAYMENTS API (COMPREHENSIVE)
// ============================================

export const paymentsApi = {
  // Create payment intent
  createPaymentIntent: async (data: {
    amount: number;
    currency?: string;
    metadata?: any;
  }): Promise<ApiResponse<PaymentIntent>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/intent`,
        data,
        getHeaders()
      );
      return normalizeResponse<PaymentIntent>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create payment intent');
    }
  },

  // Confirm payment
  confirmPayment: async (paymentIntentId: string): Promise<ApiResponse<{
    success: boolean;
    order?: Order;
    offer?: Offer;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/confirm`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to confirm payment');
    }
  },

  // Capture payment
  capturePayment: async (paymentIntentId: string): Promise<ApiResponse<{
    success: boolean;
    amount: number;
    captured: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/capture`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to capture payment');
    }
  },

  // Cancel payment
  cancelPayment: async (paymentIntentId: string): Promise<ApiResponse<{
    success: boolean;
    cancelled: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/cancel`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel payment');
    }
  },

  // Refund payment
  refundPayment: async (paymentIntentId: string, amount?: number, reason?: string): Promise<ApiResponse<{
    success: boolean;
    refundId: string;
    amount: number;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/refund`,
        { paymentIntentId, amount, reason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to process refund');
    }
  },

  // Get payment methods
  getPaymentMethods: async (): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
    };
  }>>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/methods`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch payment methods');
    }
  },

  // Add payment method
  addPaymentMethod: async (paymentMethodId: string): Promise<ApiResponse<{
    id: string;
    success: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/methods`,
        { paymentMethodId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to add payment method');
    }
  },

  // Remove payment method
  removePaymentMethod: async (paymentMethodId: string): Promise<ApiResponse<{
    success: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/payments/methods/${paymentMethodId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to remove payment method');
    }
  },

  // Set default payment method
  setDefaultPaymentMethod: async (paymentMethodId: string): Promise<ApiResponse<{
    success: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/methods/default`,
        { paymentMethodId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to set default payment method');
    }
  },

  // Get transaction history
  getTransactionHistory: async (filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'charge' | 'refund' | 'payout';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    transactions: Array<{
      id: string;
      amount: number;
      currency: string;
      type: string;
      status: string;
      description: string;
      createdAt: string;
      orderId?: string;
      offerId?: string;
    }>;
    total: number;
    summary: {
      totalAmount: number;
      totalRefunds: number;
      netAmount: number;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/transactions`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch transaction history');
    }
  },

  // Get payout history
  getPayoutHistory: async (filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    payouts: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      arrivalDate: string;
      description: string;
      statementDescriptor: string;
    }>;
    total: number;
    pendingBalance: number;
    availableBalance: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/payouts`,
        { params: filters, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch payout history');
    }
  },

  // Request payout
  requestPayout: async (amount: number): Promise<ApiResponse<{
    success: boolean;
    payoutId?: string;
    estimatedArrival: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/request-payout`,
        { amount },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to request payout');
    }
  },

  // Get balance
  getBalance: async (): Promise<ApiResponse<{
    pendingAmount: number;
    availableAmount: number;
    totalAmount: number;
    currency: string;
    lastPayout?: string;
    nextPayout?: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch balance');
    }
  },

  // Verify payment
  verifyPayment: async (paymentIntentId: string): Promise<ApiResponse<{
    verified: boolean;
    status: string;
    amount: number;
    orderId?: string;
    offerId?: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/verify/${paymentIntentId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to verify payment');
    }
  },

  // Get payment status
  getPaymentStatus: async (paymentIntentId: string): Promise<ApiResponse<{
    status: string;
    lastPaymentError?: string;
    requiresAction: boolean;
    nextAction?: any;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/status/${paymentIntentId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch payment status');
    }
  }
};

// ============================================
// ✅ MESSAGES API (COMPREHENSIVE)
// ============================================

export const messagesApi = {
  // Get conversations
  getConversations: async (): Promise<ApiResponse<Array<{
    id: string;
    otherUser: User;
    lastMessage: Message;
    unreadCount: number;
    order?: Order;
    offer?: Offer;
    updatedAt: string;
  }>>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/messages/conversations`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch conversations');
    }
  },

  // Get conversation messages
  getConversationMessages: async (conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    messages: Message[];
    total: number;
    conversation: any;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/messages/conversations/${conversationId}`,
        { params, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch messages');
    }
  },

  // Send message
  sendMessage: async (conversationId: string, data: {
    message: string;
    attachments?: string[];
    replyTo?: string;
  }): Promise<ApiResponse<Message>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/messages/conversations/${conversationId}`,
        data,
        getHeaders()
      );
      return normalizeResponse<Message>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to send message');
    }
  },

  // Mark as read
  markAsRead: async (conversationId: string, messageIds?: string[]): Promise<ApiResponse<{
    read: boolean;
    count: number;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/messages/conversations/${conversationId}/read`,
        { messageIds },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to mark as read');
    }
  },

  // Delete message
  deleteMessage: async (messageId: string): Promise<ApiResponse<{
    deleted: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/messages/${messageId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete message');
    }
  },

  // Delete conversation
  deleteConversation: async (conversationId: string): Promise<ApiResponse<{
    deleted: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/messages/conversations/${conversationId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete conversation');
    }
  },

  // Get unread count
  getUnreadCount: async (): Promise<ApiResponse<{
    count: number;
    byConversation: Record<string, number>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/messages/unread`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch unread count');
    }
  },

  // Upload attachment
  uploadAttachment: async (file: File): Promise<ApiResponse<UploadedFile>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/messages/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return normalizeResponse<UploadedFile>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to upload attachment');
    }
  },

  // Search messages
  searchMessages: async (query: string): Promise<ApiResponse<Array<{
    message: Message;
    conversation: any;
    highlights: string[];
  }>>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/messages/search`,
        { params: { q: query }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to search messages');
    }
  }
};

// ============================================
// ✅ REVIEWS API (COMPREHENSIVE)
// ============================================

export const reviewsApi = {
  // Create review
  createReview: async (data: {
    orderId: string;
    rating: number;
    comment: string;
    type: 'buyer_review' | 'seller_review';
    anonymous?: boolean;
  }): Promise<ApiResponse<Review>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/reviews`,
        data,
        getHeaders()
      );
      return normalizeResponse<Review>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create review');
    }
  },

  // Get reviews
  getReviews: async (params?: {
    userId?: string;
    listingId?: string;
    type?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<ApiResponse<{
    reviews: Review[];
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/reviews`,
        { params, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch reviews');
    }
  },

  // Update review
  updateReview: async (reviewId: string, updates: Partial<Review>): Promise<ApiResponse<Review>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/reviews/${reviewId}`,
        updates,
        getHeaders()
      );
      return normalizeResponse<Review>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update review');
    }
  },

  // Delete review
  deleteReview: async (reviewId: string): Promise<ApiResponse<{
    deleted: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/reviews/${reviewId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete review');
    }
  },

  // Report review
  reportReview: async (reviewId: string, reason: string): Promise<ApiResponse<{
    reported: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/reviews/${reviewId}/report`,
        { reason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to report review');
    }
  },

  // Respond to review
  respondToReview: async (reviewId: string, responseText: string): Promise<ApiResponse<Review>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/reviews/${reviewId}/respond`,
        { response: responseText },
        getHeaders()
      );
      return normalizeResponse<Review>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to respond to review');
    }
  },

  // Mark review as helpful
  markHelpful: async (reviewId: string): Promise<ApiResponse<{
    helpful: boolean;
    count: number;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/reviews/${reviewId}/helpful`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to mark as helpful');
    }
  },

  // Get review statistics
  getReviewStatistics: async (userId?: string): Promise<ApiResponse<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    recentReviews: Review[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/reviews/statistics`,
        { params: { userId }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch review statistics');
    }
  }
};

// ============================================
// ✅ FAVORITES API (COMPREHENSIVE)
// ============================================

export const favoritesApi = {
  // Get favorites
  getFavorites: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<ApiResponse<{
    favorites: Favorite[];
    total: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/favorites`,
        { params, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch favorites');
    }
  },

  // Add to favorites
  addToFavorites: async (listingId: string): Promise<ApiResponse<Favorite>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/favorites`,
        { listingId },
        getHeaders()
      );
      return normalizeResponse<Favorite>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to add to favorites');
    }
  },

  // Remove from favorites
  removeFromFavorites: async (listingId: string): Promise<ApiResponse<{
    removed: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/favorites/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to remove from favorites');
    }
  },

  // Check if favorited
  checkFavorite: async (listingId: string): Promise<ApiResponse<{
    isFavorited: boolean;
    favorite?: Favorite;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/favorites/check/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to check favorite status');
    }
  },

  // Get favorite statistics
  getFavoriteStatistics: async (): Promise<ApiResponse<{
    totalFavorites: number;
    byCategory: Record<string, number>;
    recentlyAdded: Favorite[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/favorites/statistics`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch favorite statistics');
    }
  }
};

// ============================================
// ✅ CART API (COMPREHENSIVE)
// ============================================

export const cartApi = {
  // Get cart
  getCart: async (): Promise<ApiResponse<{
    items: CartItem[];
    total: number;
    itemCount: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/cart`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch cart');
    }
  },

  // Add to cart
  addToCart: async (listingId: string, quantity?: number, customization?: any): Promise<ApiResponse<CartItem>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/cart`,
        { listingId, quantity, customization },
        getHeaders()
      );
      return normalizeResponse<CartItem>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to add to cart');
    }
  },

  // Update cart item
  updateCartItem: async (itemId: string, updates: {
    quantity?: number;
    customization?: any;
  }): Promise<ApiResponse<CartItem>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/cart/${itemId}`,
        updates,
        getHeaders()
      );
      return normalizeResponse<CartItem>(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update cart item');
    }
  },

  // Remove from cart
  removeFromCart: async (itemId: string): Promise<ApiResponse<{
    removed: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/cart/${itemId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to remove from cart');
    }
  },

  // Clear cart
  clearCart: async (): Promise<ApiResponse<{
    cleared: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/cart`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to clear cart');
    }
  },

  // Checkout cart
  checkoutCart: async (data?: {
    shippingAddress?: any;
    billingAddress?: any;
    paymentMethod?: string;
    couponCode?: string;
  }): Promise<ApiResponse<{
    orders: Order[];
    paymentIntents: PaymentIntent[];
    success: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/cart/checkout`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to checkout cart');
    }
  }
};

// ============================================
// ✅ NOTIFICATIONS API (COMPREHENSIVE)
// ============================================

export const notificationsApi = {
  // Get notifications
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
  }): Promise<ApiResponse<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/notifications`,
        { params, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch notifications');
    }
  },

  // Mark as read
  markAsRead: async (notificationIds: string[]): Promise<ApiResponse<{
    read: boolean;
    count: number;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/notifications/read`,
        { notificationIds },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to mark as read');
    }
  },

  // Mark all as read
  markAllAsRead: async (): Promise<ApiResponse<{
    read: boolean;
    count: number;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/notifications/read-all`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to mark all as read');
    }
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<ApiResponse<{
    deleted: boolean;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/notifications/${notificationId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete notification');
    }
  },

  // Delete all notifications
  deleteAllNotifications: async (): Promise<ApiResponse<{
    deleted: boolean;
    count: number;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/notifications`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete all notifications');
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences: {
    email?: boolean;
    push?: boolean;
    offers?: boolean;
    messages?: boolean;
    reviews?: boolean;
  }): Promise<ApiResponse<{
    updated: boolean;
    preferences: any;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/notifications/preferences`,
        preferences,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update preferences');
    }
  },

  // Get notification preferences
  getPreferences: async (): Promise<ApiResponse<any>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/notifications/preferences`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch preferences');
    }
  }
};

// ============================================
// ✅ ANALYTICS API (COMPREHENSIVE)
// ============================================

export const analyticsApi = {
  // Get dashboard analytics
  getDashboardAnalytics: async (period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    overview: {
      totalRevenue: number;
      totalOrders: number;
      totalListings: number;
      conversionRate: number;
      averageOrderValue: number;
      growthRate: number;
    };
    revenueChart: Array<{ date: string; revenue: number }>;
    orderChart: Array<{ date: string; orders: number }>;
    topListings: Array<{ listing: Listing; revenue: number; orders: number }>;
    recentOrders: Order[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/analytics/dashboard`,
        { params: { period }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch dashboard analytics');
    }
  },

  // Get seller analytics
  getSellerAnalytics: async (period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    sales: {
      total: number;
      growth: number;
      chart: Array<{ date: string; sales: number }>;
    };
    revenue: {
      total: number;
      growth: number;
      chart: Array<{ date: string; revenue: number }>;
    };
    listings: {
      active: number;
      total: number;
      performance: Array<{ listing: Listing; views: number; sales: number }>;
    };
    reviews: {
      averageRating: number;
      totalReviews: number;
      distribution: Record<number, number>;
    };
    performance: {
      conversionRate: number;
      averageResponseTime: number;
      customerSatisfaction: number;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/analytics/seller`,
        { params: { period }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch seller analytics');
    }
  },

  // Get buyer analytics
  getBuyerAnalytics: async (period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    spending: {
      total: number;
      average: number;
      chart: Array<{ date: string; spending: number }>;
    };
    orders: {
      total: number;
      completed: number;
      active: number;
      chart: Array<{ date: string; orders: number }>;
    };
    activity: {
      favorites: number;
      offers: number;
      reviews: number;
      messages: number;
    };
    categories: Array<{ category: string; spending: number; orders: number }>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/analytics/buyer`,
        { params: { period }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch buyer analytics');
    }
  },

  // Get listing analytics
  getListingAnalytics: async (listingId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<ApiResponse<{
    overview: {
      views: number;
      favorites: number;
      purchases: number;
      conversionRate: number;
      revenue: number;
    };
    performance: {
      dailyViews: number;
      weeklyViews: number;
      monthlyViews: number;
      bounceRate: number;
      avgTimeOnPage: number;
    };
    timeline: Array<{ date: string; views: number; purchases: number }>;
    sources: Array<{ source: string; views: number; percentage: number }>;
    demographics: {
      ageGroups: Record<string, number>;
      locations: Array<{ location: string; views: number }>;
      devices: Record<string, number>;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/analytics/listings/${listingId}`,
        { params: { period }, ...getHeaders() }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch listing analytics');
    }
  },

  // Export analytics
  exportAnalytics: async (type: 'sales' | 'revenue' | 'traffic' | 'performance', format: 'csv' | 'json' = 'csv', params?: any): Promise<ApiResponse<{ 
    url: string; 
    filename: string;
    expiresAt: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/analytics/export/${type}`,
        {
          params: { format, ...params },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to export analytics');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency
export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

// Calculate platform fee (10%)
export const calculatePlatformFee = (amount: number, platformFeePercent: number = 10): number => {
  return parseFloat((amount * (platformFeePercent / 100)).toFixed(2));
};

// Calculate seller payout
export const calculateSellerPayout = (amount: number, platformFeePercent: number = 10): number => {
  const fee = calculatePlatformFee(amount, platformFeePercent);
  return parseFloat((amount - fee).toFixed(2));
};

// Check if user is authenticated
export const checkAuth = (): boolean => {
  return !!getAuthToken();
};

// Get current user
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Format date
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Format relative time
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDate(dateString, { month: 'short', day: 'numeric' });
};

// Format bytes
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Generate slug
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

// Validate email
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone number
export const validatePhone = (phone: string): boolean => {
  const re = /^[\+]?[1-9][\d]{0,15}$/;
  return re.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Generate order number
export const generateOrderNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random.toString().padStart(4, '0')}`;
};

// Calculate days between dates
export const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Parse query string
export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};

// Build query string
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  return searchParams.toString();
};

// ============================================
// ✅ EXPORT ALL APIs
// ============================================

const marketplaceApi = {
  // API groups
  auth: authApi,
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  payments: paymentsApi,
  messages: messagesApi,
  reviews: reviewsApi,
  favorites: favoritesApi,
  cart: cartApi,
  notifications: notificationsApi,
  analytics: analyticsApi,
  
  // Utility functions
  utils: {
    formatCurrency,
    calculatePlatformFee,
    calculateSellerPayout,
    checkAuth,
    getCurrentUser,
    getAuthToken,
    formatDate,
    formatRelativeTime,
    formatBytes,
    generateSlug,
    validateEmail,
    validatePhone,
    debounce,
    throttle,
    generateOrderNumber,
    calculateDaysBetween,
    parseQueryString,
    buildQueryString,
    retryRequest,
    normalizeResponse,
    handleApiError,
    STORAGE_KEYS,
    API_BASE_URL
  },
  
  
};

export default marketplaceApi;