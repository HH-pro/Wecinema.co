// src/api/marketplaceApi.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log request for debugging
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
      success: response.data?.success,
      message: response.data?.message
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    });

    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // Clear tokens and redirect to login
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      if (status === 404) {
        console.warn('⚠️ API endpoint not found:', error.config.url);
      }
      
      // Return formatted error
      return Promise.reject({
        success: false,
        status,
        error: data?.error || 'Request failed',
        message: data?.message || error.message,
        details: data?.details
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        success: false,
        error: 'Request timeout',
        message: 'The server took too long to respond. Please try again.'
      });
    }
    
    if (error.code === 'NETWORK_ERROR') {
      return Promise.reject({
        success: false,
        error: 'Network error',
        message: 'Unable to connect to server. Please check your internet connection.'
      });
    }
    
    return Promise.reject({
      success: false,
      error: 'Unknown error',
      message: error.message || 'An unexpected error occurred'
    });
  }
);

// Helper function to get headers (legacy support)
const getHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// ============================================
// ✅ LISTINGS API - CORRECTED ROUTES
// ============================================

export const listingsApi = {
  // Get all active listings (public)
  getAllListings: async (params = {}) => {
    try {
      const response = await apiClient.get('/marketplace/listings', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all listings:', error);
      throw error;
    }
  },

  // Get seller's own listings
  getMyListings: async (params = {}) => {
    try {
      const { page = 1, limit = 10, status = '', search = '' } = params;
      const response = await apiClient.get('/marketplace/my-listings', {
        params: { page, limit, status, search }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching my listings:', error);
      throw error;
    }
  },

  // Create new listing
  createListing: async (listingData) => {
    try {
      const response = await apiClient.post(
        '/marketplace/create-listing',
        listingData
      );
      return response.data;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  },

  // Edit/Update listing - CORRECTED ROUTE
  editListing: async (listingId, updateData) => {
    try {
      const response = await apiClient.put(
        `/marketplace/listings/${listingId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('Error editing listing:', error);
      throw error;
    }
  },

  // Toggle listing status (activate/deactivate) - MULTIPLE OPTIONS
  toggleListingStatus: async (listingId) => {
    try {
      // Try PATCH first (recommended)
      try {
        const response = await apiClient.patch(
          `/marketplace/listing/${listingId}/toggle-status`,
          {}
        );
        return response.data;
      } catch (patchError) {
        // Fallback to POST if PATCH fails
        if (patchError.status === 404 || patchError.status === 405) {
          const response = await apiClient.post(
            `/marketplace/listing/${listingId}/toggle-status`,
            {}
          );
          return response.data;
        }
        throw patchError;
      }
    } catch (error) {
      console.error('Error toggling listing status:', error);
      throw error;
    }
  },

  // Delete listing - MULTIPLE OPTIONS FOR COMPATIBILITY
  deleteListing: async (listingId) => {
    try {
      // Try primary route first
      try {
        const response = await apiClient.delete(`/marketplace/listing/${listingId}`);
        return response.data;
      } catch (deleteError) {
        // Fallback to alternative route
        if (deleteError.status === 404) {
          const response = await apiClient.delete(`/marketplace/listings/${listingId}`);
          return response.data;
        }
        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  },

  // Get single listing details
  getListingDetails: async (listingId) => {
    try {
      const response = await apiClient.get(`/marketplace/listing/${listingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching listing details:', error);
      throw error;
    }
  },

  // Get listings by user ID
  getUserListings: async (userId, params = {}) => {
    try {
      const { page = 1, limit = 20, status = '', exclude = '' } = params;
      const response = await apiClient.get(`/marketplace/user/${userId}/listings`, {
        params: { page, limit, status, exclude }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  },

  // Search listings
  searchListings: async (params = {}) => {
    try {
      const response = await apiClient.get('/marketplace/search', { params });
      return response.data;
    } catch (error) {
      console.error('Error searching listings:', error);
      throw error;
    }
  },

  // Get listing statistics
  getListingStats: async () => {
    try {
      const response = await apiClient.get('/marketplace/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching listing stats:', error);
      throw error;
    }
  },

  // Get debug routes
  getDebugRoutes: async () => {
    try {
      const response = await apiClient.get('/marketplace/debug/routes');
      return response.data;
    } catch (error) {
      console.error('Error fetching debug routes:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ ORDERS API
// ============================================

export const ordersApi = {
  // Get seller's orders/sales
  getMySales: async (params = {}) => {
    try {
      const response = await apiClient.get('/marketplace/my-sales', { params });
      return response.data;
    } catch (error) {
      // Try alternative endpoints
      const endpoints = [
        '/marketplace/orders/my-sales',
        '/marketplace/seller/orders',
        '/marketplace/sales'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await apiClient.get(endpoint, { params });
          return response.data;
        } catch (err) {
          continue;
        }
      }
      
      console.error('Error fetching sales:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status, additionalData = {}) => {
    try {
      const response = await apiClient.put(
        `/marketplace/orders/${orderId}/status`,
        { status, ...additionalData }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Get order details
  getOrderDetails: async (orderId) => {
    try {
      const response = await apiClient.get(`/marketplace/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  },

  // Create order from offer
  createOrderFromOffer: async (offerId) => {
    try {
      const response = await apiClient.post(`/marketplace/orders/create-from-offer/${offerId}`);
      return response.data;
    } catch (error) {
      console.error('Error creating order from offer:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ OFFERS API
// ============================================

export const offersApi = {
  // Get received offers
  getReceivedOffers: async (params = {}) => {
    try {
      const response = await apiClient.get('/marketplace/offers/received-offers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  },

  // Get sent offers
  getSentOffers: async (params = {}) => {
    try {
      const response = await apiClient.get('/marketplace/offers/sent-offers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching sent offers:', error);
      throw error;
    }
  },

  // Create/send offer
  createOffer: async (listingId, offerData) => {
    try {
      const response = await apiClient.post(`/marketplace/offers/${listingId}/create`, offerData);
      return response.data;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  },

  // Accept offer
  acceptOffer: async (offerId) => {
    try {
      const response = await apiClient.put(`/marketplace/offers/${offerId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  },

  // Reject offer
  rejectOffer: async (offerId) => {
    try {
      const response = await apiClient.put(`/marketplace/offers/${offerId}/reject`);
      return response.data;
    } catch (error) {
      console.error('Error rejecting offer:', error);
      throw error;
    }
  },

  // Counter offer
  counterOffer: async (offerId, counterData) => {
    try {
      const response = await apiClient.put(`/marketplace/offers/${offerId}/counter`, counterData);
      return response.data;
    } catch (error) {
      console.error('Error countering offer:', error);
      throw error;
    }
  },

  // Get offer details
  getOfferDetails: async (offerId) => {
    try {
      const response = await apiClient.get(`/marketplace/offers/${offerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching offer details:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ STRIPE API
// ============================================

export const stripeApi = {
  // Get Stripe account status
  getStripeStatus: async () => {
    try {
      const response = await apiClient.get('/marketplace/stripe/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      throw error;
    }
  },

  // Create Stripe account link
  createStripeAccountLink: async () => {
    try {
      const response = await apiClient.post('/marketplace/stripe/create-account-link');
      return response.data;
    } catch (error) {
      console.error('Error creating Stripe link:', error);
      throw error;
    }
  },

  // Get Stripe dashboard link
  getStripeDashboardLink: async () => {
    try {
      const response = await apiClient.get('/marketplace/stripe/dashboard-link');
      return response.data;
    } catch (error) {
      console.error('Error fetching Stripe dashboard link:', error);
      throw error;
    }
  },

  // Create Stripe checkout session
  createCheckoutSession: async (listingId) => {
    try {
      const response = await apiClient.post(`/marketplace/stripe/create-checkout/${listingId}`);
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ USER API
// ============================================

export const userApi = {
  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const response = await apiClient.get(`/marketplace/user/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      const response = await apiClient.put(`/marketplace/user/${userId}/profile`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get seller rating
  getSellerRating: async (userId) => {
    try {
      const response = await apiClient.get(`/marketplace/user/${userId}/rating`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seller rating:', error);
      throw error;
    }
  },

  // Submit review
  submitReview: async (orderId, reviewData) => {
    try {
      const response = await apiClient.post(`/marketplace/reviews/${orderId}`, reviewData);
      return response.data;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date
export const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', { ...defaultOptions, ...options }).format(date);
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Generate placeholder image
export const getPlaceholderImage = (index = 0) => {
  const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD'];
  const color = colors[index % colors.length];
  return `https://via.placeholder.com/400x300/${color}/FFFFFF?text=Listing+${index + 1}`;
};

// Calculate days ago
export const getDaysAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};

// Validate listing data
export const validateListingData = (data) => {
  const errors = {};
  
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  
  if (!data.price || isNaN(data.price) || parseFloat(data.price) <= 0) {
    errors.price = 'Price must be a positive number';
  }
  
  if (!data.type || !['sell', 'rent', 'auction', 'exchange'].includes(data.type)) {
    errors.type = 'Please select a valid listing type';
  }
  
  if (data.mediaUrls && data.mediaUrls.length > 10) {
    errors.mediaUrls = 'Maximum 10 images allowed';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Test API connectivity
export const testApiConnection = async () => {
  try {
    const response = await apiClient.get('/marketplace/debug/routes');
    return {
      success: true,
      message: 'API connection successful',
      data: response.data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: 'API connection failed',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

// Helper to retry failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// ============================================
// ✅ EXPORT ALL APIS
// ============================================

export default {
  // API clients
  api: apiClient,
  
  // API modules
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  user: userApi,
  
  // Utilities
  utils: {
    formatCurrency,
    formatDate,
    truncateText,
    getPlaceholderImage,
    getDaysAgo,
    validateListingData,
    testApiConnection,
    retryRequest,
    getHeaders // Legacy support
  },
  
  // Constants
  constants: {
    API_BASE_URL,
    LISTING_TYPES: ['sell', 'rent', 'auction', 'exchange'],
    STATUS_TYPES: ['active', 'inactive', 'sold', 'reserved'],
    ORDER_STATUS: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    OFFER_STATUS: ['pending', 'accepted', 'rejected', 'countered', 'expired']
  }
};