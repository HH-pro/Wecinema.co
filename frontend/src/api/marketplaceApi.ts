// src/api/marketplaceApi.js - UPDATED WITH CORRECT ROUTES
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/';

// ============================================
// ✅ HELPER FUNCTIONS (PRIVATE)
// ============================================

const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const normalizeResponse = (response) => {
  const data = response?.data || response;
  
  if (data.success !== undefined) {
    return {
      success: data.success,
      ...data
    };
  }
  
  return {
    success: true,
    ...data
  };
};

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
// ✅ EARNINGS API - UPDATED URLs
// ============================================

const earningsApi = {
  // GET EARNINGS DASHBOARD
  getEarningsDashboard: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/dashboard`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings dashboard');
    }
  },

  // PROCESS PAYOUT/WITHDRAWAL
  processPayout: async (amount, paymentMethod, accountDetails) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/earnings/process-payout`,
        { amount, paymentMethod, accountDetails },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to process payout');
    }
  },

  // GET PAYMENT HISTORY
  getPaymentHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 20, type, status } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/payment-history`,
        {
          params: { page, limit, type, status },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch payment history');
    }
  },

  // GET WITHDRAWAL HISTORY
  getWithdrawalHistory: async (params = {}) => {
    try {
      const { status } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/withdrawal-history`,
        {
          params: { status },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal history');
    }
  },

  // RELEASE PENDING PAYMENT
  releasePayment: async (orderId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/earnings/release-payment/${orderId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to release payment');
    }
  }
};

// ============================================
// ✅ STRIPE API - UPDATED URLs
// ============================================

const stripeApi = {
  // GET STRIPE STATUS
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

  // SIMPLE STATUS (Alternative)
  getStripeStatusSimple: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status-simple`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe status');
    }
  },

  // CREATE ACCOUNT LINK
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

  // ONBOARD SELLER
  onboardSeller: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/onboard-seller`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to onboard seller');
    }
  },

  // COMPLETE ONBOARDING
  completeOnboarding: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/complete-onboarding`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to complete onboarding');
    }
  },

  // GET BALANCE
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
  },

  // GET PAYOUTS
  getStripePayouts: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/payouts`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch payouts');
    }
  },

  // CREATE PAYMENT INTENT
  createPaymentIntent: async (orderId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-payment-intent`,
        { orderId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create payment intent');
    }
  },

  // CONFIRM PAYMENT
  confirmPayment: async (paymentIntentId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/confirm-payment`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to confirm payment');
    }
  },

  // CREATE LOGIN LINK
  createLoginLink: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-login-link`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create login link');
    }
  },

  // STRIPE PAYOUTS
  getStripePayoutsHistory: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/stripe-payouts`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe payouts');
    }
  }
};

// ============================================
// ✅ LISTINGS API - UPDATED URLs
// ============================================

const listingsApi = {
  getAllListings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listings');
    }
  },

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

  editListing: async (listingId, updateData) => {
    try {
      const dataToSend = {
        title: updateData.title,
        description: updateData.description,
        price: updateData.price
      };
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        dataToSend,
        getHeaders()
      );
      
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to update listing');
    }
  },

  toggleListingStatus: async (listingId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/toggle-status`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to toggle listing status');
    }
  },

  deleteListing: async (listingId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to delete listing');
    }
  },

  getListingDetails: async (listingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/${listingId}`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listing details');
    }
  },

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
// ✅ ORDERS API - UPDATED URLs
// ============================================

const ordersApi = {
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
          const orders = data.sales || data.orders || data.data || data;
          
          if (Array.isArray(orders)) {
            return orders;
          }
          
          if (data.success && Array.isArray(data.data)) {
            return data.data;
          }
        } catch (err) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching sales:', error);
      return [];
    }
  },

  updateOrderStatus: async (orderId, status, additionalData = {}) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status, ...additionalData },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to update order status');
    }
  },

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
// ✅ OFFERS API - UPDATED URLs
// ============================================

const offersApi = {
  getReceivedOffers: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      const normalized = normalizeResponse(response);
      
      if (normalized.success && !normalized.offers && normalized.data) {
        normalized.offers = normalized.data;
      }
      
      return normalized;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch offers');
    }
  },

  acceptOffer: async (offerId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/accept`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to accept offer');
    }
  },

  rejectOffer: async (offerId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/reject`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to reject offer');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS (PUBLIC)
// ============================================

export const formatCurrency = (amount) => {
  const amountInRupees = (amount || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInRupees);
};

export const formatCurrencyAmount = (amount) => {
  const amountInRupees = (amount || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInRupees);
};

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

export const checkAuth = () => {
  const token = getAuthToken();
  return !!token;
};

export const getCurrentUserId = () => {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

// ============================================
// ✅ HELPER FUNCTIONS FOR EARNINGS
// ============================================

export const calculateSellerEarnings = (orderAmount, commissionPercentage = 10) => {
  const commission = (orderAmount * commissionPercentage) / 100;
  const sellerEarnings = orderAmount - commission;
  return {
    totalAmount: orderAmount,
    commission,
    sellerEarnings,
    commissionPercentage
  };
};

export const getPayoutStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'pending':
      return 'info';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

export const getPaymentMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'stripe':
      return 'credit_card';
    case 'bank_transfer':
      return 'account_balance';
    case 'paypal':
      return 'paypal';
    case 'cash':
      return 'money';
    default:
      return 'payment';
  }
};

// ============================================
// ✅ MAIN API EXPORT (SINGLE EXPORT OBJECT)
// ============================================

const marketplaceApi = {
  // API Modules
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  earnings: earningsApi,
  
  // Utility Functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  testApiConnection,
  checkAuth,
  getCurrentUserId,
  calculateSellerEarnings,
  getPayoutStatusColor,
  getPaymentMethodIcon,
  
  // Direct API Methods (for convenience)
  // Listings
  getAllListings: listingsApi.getAllListings,
  getMyListings: listingsApi.getMyListings,
  createListing: listingsApi.createListing,
  editListing: listingsApi.editListing,
  deleteListing: listingsApi.deleteListing,
  getListingDetails: listingsApi.getListingDetails,
  
  // Orders
  getMySales: ordersApi.getMySales,
  updateOrderStatus: ordersApi.updateOrderStatus,
  getOrderDetails: ordersApi.getOrderDetails,
  
  // Offers
  getReceivedOffers: offersApi.getReceivedOffers,
  acceptOffer: offersApi.acceptOffer,
  rejectOffer: offersApi.rejectOffer,
  
  // Stripe
  getStripeStatus: stripeApi.getStripeStatus,
  getStripeStatusSimple: stripeApi.getStripeStatusSimple,
  createStripeAccountLink: stripeApi.createStripeAccountLink,
  getStripeBalance: stripeApi.getStripeBalance,
  onboardSeller: stripeApi.onboardSeller,
  completeOnboarding: stripeApi.completeOnboarding,
  getStripePayouts: stripeApi.getStripePayouts,
  createPaymentIntent: stripeApi.createPaymentIntent,
  confirmPayment: stripeApi.confirmPayment,
  createLoginLink: stripeApi.createLoginLink,
  getStripePayoutsHistory: stripeApi.getStripePayoutsHistory,
  
  // Earnings
  getEarningsDashboard: earningsApi.getEarningsDashboard,
  processPayout: earningsApi.processPayout,
  getPaymentHistory: earningsApi.getPaymentHistory,
  getWithdrawalHistory: earningsApi.getWithdrawalHistory,
  releasePayment: earningsApi.releasePayment
};

// ============================================
// ✅ EXPORT CONFIGURATION
// ============================================

// Export the full API object as default
export default marketplaceApi;

// Export all individual functions and modules
export { marketplaceApi };

// Export API modules (optional - for advanced usage)
export {
  listingsApi,
  ordersApi,
  offersApi,
  stripeApi,
  earningsApi
};