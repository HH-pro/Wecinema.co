// src/api/marketplaceApi.js
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

// ============================================
// ✅ LISTINGS API
// ============================================

export const listingsApi = {
  // Get all active listings (public)
  getAllListings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all listings:', error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error('Error fetching my listings:', error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  },

  // Simple version - for only title, description, price updates
editListing: async (listingId, updateData) => {
  try {
    // Prepare data with only the fields you want to update
    const dataToSend = {};
    
    if (updateData.title) {
      dataToSend.title = updateData.title;
    }
    
    if (updateData.description) {
      dataToSend.description = updateData.description;
    }
    
    if (updateData.price) {
      dataToSend.price = updateData.price;
    }
    
    // Add other fields only if they exist
    if (updateData.type) dataToSend.type = updateData.type;
    if (updateData.category) dataToSend.category = updateData.category;
    if (updateData.tags) dataToSend.tags = updateData.tags;
    if (updateData.mediaUrls) dataToSend.mediaUrls = updateData.mediaUrls;
    
    const response = await axios.put(
      `${API_BASE_URL}/marketplace/listings/${listingId}`,
      dataToSend,
      getHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error editing listing:', error);
    
    // Extract error message
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to update listing';
    
    throw new Error(errorMessage);
  }
},

  // Toggle listing status (activate/deactivate)
  toggleListingStatus: async (listingId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/toggle-status`,
        {},
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling listing status:', error);
      throw error;
    }
  },

  // Delete listing
  deleteListing: async (id) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${id}`,
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  },

  // Get single listing details
  getListingDetails: async (listingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/${listingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching listing details:', error);
      throw error;
    }
  },

  // Get listings by user ID
  getUserListings: async (userId, params = {}) => {
    try {
      const { page = 1, limit = 20, status = '' } = params;
      const response = await axios.get(`${API_BASE_URL}/marketplace/user/${userId}/listings`, {
        params: { page, limit, status }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ ORDERS API
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
          
          if (response.data.success) {
            return response.data.sales || response.data.orders || response.data.data || [];
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status, additionalData = {}) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status, ...additionalData },
        getHeaders()
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
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}`,
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ OFFERS API
// ============================================

export const offersApi = {
  // Get received offers
  getReceivedOffers: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  },

  // Accept offer
  acceptOffer: async (offerId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/accept`,
        {},
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw error;
    }
  },

  // Reject offer
  rejectOffer: async (offerId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/reject`,
        {},
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error rejecting offer:', error);
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
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status`,
        getHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
      throw error;
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
      return response.data;
    } catch (error) {
      console.error('Error creating Stripe link:', error);
      throw error;
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
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

// Export all APIs
export default {
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  utils: {
    formatCurrency,
    testApiConnection
  }
};