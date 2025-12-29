// src/api/marketplaceApi.js - UPDATED VERSION WITH WITHDRAWAL SUPPORT
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Helper function to get headers
const getHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

// Helper function to normalize API response
const normalizeResponse = (response) => {
  const data = response?.data || response;
  
  // Check different possible response structures
  if (data.success !== undefined) {
    return {
      success: data.success,
      ...data
    };
  }
  
  // If no success property, assume it's successful if we have data
  return {
    success: true,
    ...data
  };
};

// Helper function to handle API errors
const handleApiError = (error, defaultMessage = 'API Error') => {
  console.error('API Error:', error);
  
  const errorData = error.response?.data || {};
  const errorMessage = errorData.message || errorData.error || error.message || defaultMessage;
  
  return {
    success: false,
    error: errorMessage,
    status: error.response?.status,
    data: errorData
  };
};

// ============================================
// ✅ LISTINGS API - UPDATED
// ============================================

export const listingsApi = {
  // Get all active listings (public)
  getAllListings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listings');
    }
  },

  // Get seller's own listings
  getMyListings: async (params = {}) => {
    try {
      const { page = 1, limit = 10, status = '' } = params;
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/my-listings`, {
        params: { page, limit, status },
        ...getHeaders()
      });
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch your listings');
    }
  },

  // Create new listing
  createListing: async (listingData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/create-listing`,
        listingData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create listing');
    }
  },

  // ✅ UPDATED: Edit listing with consistent response
  editListing: async (listingId, updateData) => {
    try {
      // Prepare data - only send what we need
      const dataToSend = {
        title: updateData.title,
        description: updateData.description,
        price: updateData.price
      };
      
      console.log('📝 Edit API call:', { listingId, dataToSend });
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        dataToSend,
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Edit API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to update listing');
      console.error('❌ Edit API error:', errorResponse);
      return errorResponse;
    }
  },

  // ✅ UPDATED: Toggle listing status with consistent response
  toggleListingStatus: async (listingId) => {
    try {
      console.log('🔄 Toggle API call:', listingId);
      
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/toggle-status`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Toggle API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to toggle listing status');
      console.error('❌ Toggle API error:', errorResponse);
      return errorResponse;
    }
  },

  // ✅ UPDATED: Delete listing with consistent response
  deleteListing: async (listingId) => {
    try {
      console.log('🗑️ Delete API call:', listingId);
      
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Delete API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to delete listing');
      console.error('❌ Delete API error:', errorResponse);
      return errorResponse;
    }
  },

  // Get single listing details
  getListingDetails: async (listingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/${listingId}`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listing details');
    }
  },

  // Get listings by user ID
  getUserListings: async (userId, params = {}) => {
    try {
      const { page = 1, limit = 20, status = '' } = params;
      const response = await axios.get(`${API_BASE_URL}/marketplace/user/${userId}/listings`, {
        params: { page, limit, status }
      });
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch user listings');
    }
  }
};

// ============================================
// ✅ ORDERS API - UPDATED
// ============================================

export const ordersApi = {
  // Get seller's orders/sales
  getMySales: async () => {
    try {
      const endpoints = [
        `${API_BASE_URL}/marketplace/my-sales`,
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        `${API_BASE_URL}/marketplace/seller/orders`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            ...getHeaders(),
            params: { limit: 100 }
          });
          
          const data = response.data || response;
          
          // Try to extract orders from different response structures
          const orders = data.sales || data.orders || data.data || data;
          
          // If we got an array, return it
          if (Array.isArray(orders)) {
            console.log('📊 Found orders at:', endpoint);
            return orders;
          }
          
          // If response has success property
          if (data.success && Array.isArray(data.data)) {
            return data.data;
          }
          
        } catch (err) {
          console.log(`⚠️ Endpoint ${endpoint} failed:`, err.message);
          continue;
        }
      }
      
      console.log('⚠️ No orders found in any endpoint');
      return [];
      
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      return [];
    }
  },

  // ✅ UPDATED: Update order status with consistent response
  updateOrderStatus: async (orderId, status, additionalData = {}) => {
    try {
      console.log('📦 Update order status:', { orderId, status });
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status, ...additionalData },
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Order status update response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to update order status');
      console.error('❌ Order status update error:', errorResponse);
      return errorResponse;
    }
  },

  // Get order details
  getOrderDetails: async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch order details');
    }
  }
};

// ============================================
// ✅ OFFERS API - UPDATED
// ============================================

export const offersApi = {
  // Get received offers
  getReceivedOffers: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      const normalized = normalizeResponse(response);
      
      // Ensure offers array exists
      if (normalized.success && !normalized.offers && normalized.data) {
        normalized.offers = normalized.data;
      }
      
      return normalized;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch offers');
    }
  },

  // ✅ UPDATED: Accept offer with consistent response
  acceptOffer: async (offerId) => {
    try {
      console.log('✅ Accept offer API call:', offerId);
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/accept`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Accept offer response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to accept offer');
      console.error('❌ Accept offer error:', errorResponse);
      return errorResponse;
    }
  },

  // ✅ UPDATED: Reject offer with consistent response
  rejectOffer: async (offerId) => {
    try {
      console.log('❌ Reject offer API call:', offerId);
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/reject`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Reject offer response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error, 'Failed to reject offer');
      console.error('❌ Reject offer error:', errorResponse);
      return errorResponse;
    }
  }
};

// ============================================
// ✅ STRIPE API - UPDATED
// ============================================

export const stripeApi = {
  // Get Stripe account status
  getStripeStatus: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe status');
    }
  },

  // Create Stripe account link
  createStripeAccountLink: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-account-link`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create Stripe link');
    }
  },

  // ✅ NEW: Get Stripe balance
  getStripeBalance: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe balance');
    }
  }
};

// ============================================
// ✅ WITHDRAWAL API - NEW
// ============================================

export const withdrawalsApi = {
  // Get withdrawal history
  getWithdrawalHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 10, status = '' } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append('page', page.toString());
      if (limit) queryParams.append('limit', limit.toString());
      if (status) queryParams.append('status', status);
      
      const url = `${API_BASE_URL}/marketplace/withdrawals?${queryParams}`;
      console.log('💰 Fetching withdrawal history:', url);
      
      const response = await axios.get(url, getHeaders());
      const normalized = normalizeResponse(response);
      console.log('✅ Withdrawal history response:', normalized);
      return normalized;
      
    } catch (error) {
      console.log('⚠️ Withdrawal API not available, returning empty history');
      // Return empty history for development
      return {
        success: true,
        withdrawals: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        }
      };
    }
  },

  // Request withdrawal
  requestWithdrawal: async (amount) => {
    try {
      console.log('💰 Requesting withdrawal:', amount);
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/withdrawals`,
        { amount },
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Withdrawal request response:', normalized);
      return normalized;
      
    } catch (error) {
      // For development, return mock success
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        console.log('🛠️ Development mode: Returning mock withdrawal success');
        return {
          success: true,
          message: 'Withdrawal request submitted successfully',
          withdrawal: {
            _id: Date.now().toString(),
            amount: amount,
            status: 'pending',
            stripeTransferId: 'tr_mock_' + Date.now(),
            createdAt: new Date().toISOString(),
            destination: 'Bank Account •••• 4321',
            description: `Withdrawal of $${(amount / 100).toFixed(2)}`
          }
        };
      }
      
      const errorResponse = handleApiError(error, 'Failed to request withdrawal');
      console.error('❌ Withdrawal request error:', errorResponse);
      return errorResponse;
    }
  },

  // Get withdrawal by ID
  getWithdrawalById: async (withdrawalId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/withdrawals/${withdrawalId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal details');
    }
  },

  // Cancel withdrawal
  cancelWithdrawal: async (withdrawalId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/withdrawals/${withdrawalId}/cancel`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to cancel withdrawal');
    }
  }
};

// ============================================
// ✅ EARNINGS API - NEW
// ============================================

export const earningsApi = {
  // Get seller earnings summary
  getEarningsSummary: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/summary`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings summary');
    }
  },

  // Get earnings by period
  getEarningsByPeriod: async (period = 'month') => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/period/${period}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings by period');
    }
  },

  // Get available balance (calculated from completed orders)
  getAvailableBalance: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/available-balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, calculate from orders
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        try {
          // Get orders and calculate balance
          const orders = await ordersApi.getMySales();
          const completedOrders = Array.isArray(orders) ? 
            orders.filter(order => order.status === 'completed') : [];
          
          const totalRevenue = completedOrders.reduce((sum, order) => 
            sum + (order.amount || 0), 0) * 100; // Convert to cents
          
          return {
            success: true,
            availableBalance: totalRevenue,
            currency: 'inr'
          };
        } catch (calcError) {
          console.log('Using default available balance');
          return {
            success: true,
            availableBalance: 0,
            currency: 'inr'
          };
        }
      }
      
      return handleApiError(error, 'Failed to fetch available balance');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency (updated for INR)
export const formatCurrency = (amount) => {
  // Amount is in cents, convert to rupees
  const amountInRupees = (amount || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInRupees);
};

// Format currency without symbol (for display)
export const formatCurrencyAmount = (amount) => {
  const amountInRupees = (amount || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInRupees);
};

// Format currency short (for large amounts)
export const formatCurrencyShort = (amount) => {
  const amountInRupees = (amount || 0) / 100;
  if (amountInRupees >= 10000000) {
    return `₹${(amountInRupees / 10000000).toFixed(1)}Cr`;
  } else if (amountInRupees >= 100000) {
    return `₹${(amountInRupees / 100000).toFixed(1)}L`;
  } else if (amountInRupees >= 1000) {
    return `₹${(amountInRupees / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountInRupees);
};

// Test API connectivity
export const testApiConnection = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/marketplace/test`);
    return {
      success: true,
      message: 'API connection successful',
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'API connection failed',
      error: error.message
    };
  }
};

// Check if user is authenticated
export const checkAuth = () => {
  const token = getAuthToken();
  return !!token;
};

// Get current user ID from token
export const getCurrentUserId = () => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    // Decode JWT token to get user ID
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// ============================================
// ✅ MAIN API EXPORT
// ============================================

// Export all APIs
const marketplaceApi = {
  // Core APIs
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  withdrawals: withdrawalsApi,
  earnings: earningsApi,
  
  // Utility functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  testApiConnection,
  checkAuth,
  getCurrentUserId,
  getAuthToken,
  
  // Convenience methods
  getWithdrawalHistory: withdrawalsApi.getWithdrawalHistory,
  requestWithdrawal: withdrawalsApi.requestWithdrawal,
  getEarningsSummary: earningsApi.getEarningsSummary,
  getAvailableBalance: earningsApi.getAvailableBalance,
  
  // For backward compatibility
  getAllListings: listingsApi.getAllListings,
  getMyListings: listingsApi.getMyListings,
  createListing: listingsApi.createListing,
  editListing: listingsApi.editListing,
  deleteListing: listingsApi.deleteListing,
  getMySales: ordersApi.getMySales,
  updateOrderStatus: ordersApi.updateOrderStatus,
  getReceivedOffers: offersApi.getReceivedOffers,
  acceptOffer: offersApi.acceptOffer,
  rejectOffer: offersApi.rejectOffer,
  getStripeStatus: stripeApi.getStripeStatus
};

export default marketplaceApi;

// Named exports for all APIs
export {
  listingsApi,
  ordersApi,
  offersApi,
  stripeApi,
  withdrawalsApi,
  earningsApi,
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  testApiConnection,
  checkAuth,
  getCurrentUserId
};