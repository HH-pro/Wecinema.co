// src/api/marketplaceApi.js - UPDATED WITH CORRECT ENDPOINT PATHS
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

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
// ✅ EARNINGS API
// ============================================

const earningsApi = {
  // GET EARNINGS DASHBOARD
  getEarningsDashboard: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/earnings/dashboard`,
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
        `${API_BASE_URL}/api/marketplace/earnings/process-payout`,
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
        `${API_BASE_URL}/api/marketplace/earnings/payment-history`,
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
        `${API_BASE_URL}/api/marketplace/earnings/withdrawal-history`,
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
        `${API_BASE_URL}/api/marketplace/earnings/release-payment/${orderId}`,
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
// ✅ LISTINGS API
// ============================================

const listingsApi = {
  getAllListings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/marketplace/listings`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listings');
    }
  },

  getMyListings: async (params = {}) => {
    try {
      const { page = 1, limit = 10, status = '' } = params;
      const response = await axios.get(`${API_BASE_URL}/api/marketplace/listings/my-listings`, {
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
        `${API_BASE_URL}/api/marketplace/listings/create-listing`,
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
        `${API_BASE_URL}/api/marketplace/listings/${listingId}`,
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
        `${API_BASE_URL}/api/marketplace/listings/${listingId}/toggle-status`,
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
        `${API_BASE_URL}/api/marketplace/listings/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to delete listing');
    }
  },

  getListingDetails: async (listingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/marketplace/listings/${listingId}`);
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listing details');
    }
  },

  getUserListings: async (userId, params = {}) => {
    try {
      const { page = 1, limit = 20, status = '' } = params;
      const response = await axios.get(`${API_BASE_URL}/api/marketplace/user/${userId}/listings`, {
        params: { page, limit, status }
      });
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch user listings');
    }
  }
};

// ============================================
// ✅ ORDERS API
// ============================================

const ordersApi = {
  getMySales: async () => {
    try {
      const endpoints = [
        `${API_BASE_URL}/api/marketplace/my-sales`,
        `${API_BASE_URL}/api/marketplace/orders/my-sales`,
        `${API_BASE_URL}/api/marketplace/seller/orders`
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
        `${API_BASE_URL}/api/marketplace/orders/${orderId}/status`,
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
        `${API_BASE_URL}/api/marketplace/orders/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch order details');
    }
  }
};

// ============================================
// ✅ OFFERS API
// ============================================

const offersApi = {
  getReceivedOffers: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/offers/received-offers`,
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
        `${API_BASE_URL}/api/marketplace/offers/${offerId}/accept`,
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
        `${API_BASE_URL}/api/marketplace/offers/${offerId}/reject`,
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
// ✅ STRIPE API
// ============================================

const stripeApi = {
  getStripeStatus: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/stripe/status`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe status');
    }
  },

  getStripeStatusSimple: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/stripe/status-simple`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe status');
    }
  },

  onboardSeller: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/onboard-seller`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to onboard seller');
    }
  },

  completeOnboarding: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/complete-onboarding`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to complete onboarding');
    }
  },

  createStripeAccountLink: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/create-account-link`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create Stripe account link');
    }
  },

  createLoginLink: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/create-login-link`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create Stripe login link');
    }
  },

  getStripeBalance: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/stripe/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe balance');
    }
  },

  getPayouts: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/stripe/payouts`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch payouts');
    }
  },

  createPayout: async (amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/create-payout`,
        { amount },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create payout');
    }
  },

  getStripePayouts: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/stripe/stripe-payouts`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe payouts');
    }
  },

  createPaymentIntent: async (orderId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/create-payment-intent`,
        { orderId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create payment intent');
    }
  },

  confirmPayment: async (paymentIntentId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/marketplace/stripe/confirm-payment`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to confirm payment');
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
    const response = await axios.get(`${API_BASE_URL}/api/marketplace/test`);
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
// ✅ DASHBOARD API (Combined data for dashboard)
// ============================================

const dashboardApi = {
  // Get complete dashboard data
  getDashboardData: async () => {
    try {
      // Fetch all data in parallel
      const [
        earningsResponse,
        stripeStatusResponse,
        listingsResponse,
        salesResponse,
        offersResponse
      ] = await Promise.allSettled([
        earningsApi.getEarningsDashboard(),
        stripeApi.getStripeStatusSimple(),
        listingsApi.getMyListings({ page: 1, limit: 5 }),
        ordersApi.getMySales(),
        offersApi.getReceivedOffers()
      ]);

      // Process responses
      const earnings = earningsResponse.status === 'fulfilled' ? earningsResponse.value : { success: false, data: null };
      const stripeStatus = stripeStatusResponse.status === 'fulfilled' ? stripeStatusResponse.value : { success: false, data: null };
      const listings = listingsResponse.status === 'fulfilled' ? listingsResponse.value : { success: false, data: [] };
      const sales = salesResponse.status === 'fulfilled' ? salesResponse.value : [];
      const offers = offersResponse.status === 'fulfilled' ? offersResponse.value : { success: false, data: [] };

      // Calculate order stats
      const orderStats = {
        totalOrders: sales.length,
        completed: sales.filter(order => order.status === 'completed').length,
        pending: sales.filter(order => ['pending', 'in_progress'].includes(order.status)).length,
        cancelled: sales.filter(order => order.status === 'cancelled').length,
        totalRevenue: sales.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      };

      return {
        success: true,
        data: {
          earnings: earnings.success ? earnings.data : null,
          stripeStatus: stripeStatus.success ? stripeStatus.data : null,
          listings: listings.success ? listings.data : [],
          sales: Array.isArray(sales) ? sales : [],
          offers: offers.success ? offers.data : [],
          orderStats,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      return handleApiError(error, 'Failed to fetch dashboard data');
    }
  },

  // Quick refresh for dashboard
  refreshDashboard: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/marketplace/dashboard/refresh`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // Fallback to individual API calls
      return dashboardApi.getDashboardData();
    }
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
  dashboard: dashboardApi,
  
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
  onboardSeller: stripeApi.onboardSeller,
  completeOnboarding: stripeApi.completeOnboarding,
  createStripeAccountLink: stripeApi.createStripeAccountLink,
  createLoginLink: stripeApi.createLoginLink,
  getStripeBalance: stripeApi.getStripeBalance,
  getPayouts: stripeApi.getPayouts,
  createPayout: stripeApi.createPayout,
  getStripePayouts: stripeApi.getStripePayouts,
  createPaymentIntent: stripeApi.createPaymentIntent,
  confirmPayment: stripeApi.confirmPayment,
  
  // Earnings
  getEarningsDashboard: earningsApi.getEarningsDashboard,
  processPayout: earningsApi.processPayout,
  getPaymentHistory: earningsApi.getPaymentHistory,
  getWithdrawalHistory: earningsApi.getWithdrawalHistory,
  releasePayment: earningsApi.releasePayment,
  
  // Dashboard
  getDashboardData: dashboardApi.getDashboardData,
  refreshDashboard: dashboardApi.refreshDashboard
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
  earningsApi,
  dashboardApi
};