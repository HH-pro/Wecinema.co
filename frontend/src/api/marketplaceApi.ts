// ============================================
// ✅ MARKETPLACE API INTEGRATION
// ============================================

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
// ✅ CURRENCY FORMATTING FUNCTIONS (UPDATED FOR DOLLAR)
// ============================================

export const formatCurrency = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

export const formatCurrencyAmount = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

export const formatCurrencyShort = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  if (amountInDollars >= 1000000) {
    return `$${(amountInDollars / 1000000).toFixed(1)}M`;
  } else if (amountInDollars >= 1000) {
    return `$${(amountInDollars / 1000).toFixed(1)}K`;
  }
  return `$${amountInDollars.toFixed(2)}`;
};

// Dollar format (USD always)
export const formatCurrencyWithSymbol = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return `$${amountInDollars.toFixed(2)}`;
};

// Simple amount display without symbol
export const formatAmount = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return amountInDollars.toFixed(2);
};

// Alternative: Direct dollar formatting
export const formatUSD = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};
// ============================================
// ✅ EARNINGS API
// ============================================

const earningsApi = {
  getEarningsDashboard: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/dashboard`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings dashboard');
    }
  },

  processPayout: async (amount, paymentMethod, accountDetails) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/process-payout`,
        { amount, paymentMethod, accountDetails },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to process payout');
    }
  },

  getPaymentHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 20, type, status } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/payment-history`,
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

  getWithdrawalHistory: async (params = {}) => {
    try {
      const { status } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-history`,
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

  releasePayment: async (orderId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/release-payment/${orderId}`,
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
// ✅ STRIPE API
// ============================================

const stripeApi = {
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
// ✅ LISTINGS API
// ============================================

const listingsApi = {
  getAllListings: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`);
      const normalized = normalizeResponse(response);
      
      // Format listing prices
      if (normalized.success && normalized.data && Array.isArray(normalized.data)) {
        normalized.data = normalized.data.map(listing => ({
          ...listing,
          formattedPrice: formatCurrency(listing.price)
        }));
      }
      
      return normalized;
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
      
      const normalized = normalizeResponse(response);
      
      // Format listing prices
      if (normalized.success && normalized.data && normalized.data.listings) {
        normalized.data.listings = normalized.data.listings.map(listing => ({
          ...listing,
          formattedPrice: formatCurrency(listing.price)
        }));
      }
      
      return normalized;
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
      const normalized = normalizeResponse(response);
      
      // Format listing price
      if (normalized.success && normalized.data) {
        normalized.data.formattedPrice = formatCurrency(normalized.data.price);
      }
      
      return normalized;
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
      
      const normalized = normalizeResponse(response);
      
      // Format listing prices
      if (normalized.success && normalized.data && Array.isArray(normalized.data)) {
        normalized.data = normalized.data.map(listing => ({
          ...listing,
          formattedPrice: formatCurrency(listing.price)
        }));
      }
      
      return normalized;
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
          let orders = data.sales || data.orders || data.data || data;
          
          if (!Array.isArray(orders)) {
            orders = [];
          }
          
          // Format order amounts
          const formattedOrders = orders.map(order => ({
            ...order,
            formattedAmount: formatCurrency(order.amount || order.totalAmount || 0),
            formattedPrice: formatCurrency(order.price || 0)
          }));
          
          return formattedOrders;
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
      
      const normalized = normalizeResponse(response);
      
      // Format order amounts
      if (normalized.success && normalized.data) {
        const data = normalized.data;
        data.formattedTotal = formatCurrency(data.totalAmount || data.amount || 0);
        data.formattedSubtotal = formatCurrency(data.subtotal || 0);
        data.formattedTax = formatCurrency(data.tax || 0);
        data.formattedShipping = formatCurrency(data.shipping || 0);
        
        if (data.items && Array.isArray(data.items)) {
          data.items = data.items.map(item => ({
            ...item,
            formattedPrice: formatCurrency(item.price || 0),
            formattedTotal: formatCurrency(item.total || 0)
          }));
        }
      }
      
      return normalized;
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
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      const normalized = normalizeResponse(response);
      
      if (normalized.success && !normalized.offers && normalized.data) {
        normalized.offers = normalized.data;
      }
      
      // Format offer amounts
      if (normalized.success && normalized.offers && Array.isArray(normalized.offers)) {
        normalized.offers = normalized.offers.map(offer => ({
          ...offer,
          formattedOfferAmount: formatCurrency(offer.offerAmount || 0),
          formattedOriginalPrice: formatCurrency(offer.originalPrice || 0)
        }));
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
// ✅ UTILITY FUNCTIONS
// ============================================

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
// ✅ EARNINGS HELPER FUNCTIONS
// ============================================

export const calculateSellerEarnings = (orderAmount, commissionPercentage = 10) => {
  const commission = (orderAmount * commissionPercentage) / 100;
  const sellerEarnings = orderAmount - commission;
  
  return {
    totalAmount: orderAmount,
    commission,
    sellerEarnings,
    commissionPercentage,
    formattedTotalAmount: formatCurrency(orderAmount),
    formattedCommission: formatCurrency(commission),
    formattedSellerEarnings: formatCurrency(sellerEarnings)
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
// ✅ MAIN API EXPORT
// ============================================

const marketplaceApi = {
  // API Modules
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  earnings: earningsApi,
  
  // Currency Formatting Functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  formatCurrencyWithSymbol,
  formatAmount,
  
  // Utility Functions
  testApiConnection,
  checkAuth,
  getCurrentUserId,
  calculateSellerEarnings,
  getPayoutStatusColor,
  getPaymentMethodIcon,
  
  // Direct API Methods
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

// Default export
export default marketplaceApi;

// Named exports
export { marketplaceApi };

// Module exports
export {
  listingsApi,
  ordersApi,
  offersApi,
  stripeApi,
  earningsApi
};