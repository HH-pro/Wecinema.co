// src/api/marketplaceApi.js - UPDATED WITH PAYMENTS API FUNCTIONS
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
// ✅ PAYMENTS API FUNCTIONS (ADDED)
// ============================================

const paymentsApi = {
  getEarningsBalance: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, return mock data
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        return {
          success: true,
          data: {
            availableBalance: 150000, // $1,500 in cents
            pendingBalance: 50000,    // $500 in cents
            totalEarnings: 200000,    // $2,000 in cents
            totalWithdrawn: 50000,    // $500 in cents
            walletBalance: 150000,    // $1,500 in cents
            lastWithdrawal: null,
            nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'usd'
          }
        };
      }
      return handleApiError(error, 'Failed to fetch earnings balance');
    }
  },

  getMonthlyEarnings: async (params = {}) => {
    try {
      const { months = 6 } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/monthly`,
        {
          params: { months },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, return mock data
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        const monthlyData = [];
        const now = new Date();
        for (let i = 0; i < months; i++) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthlyData.push({
            _id: {
              year: month.getFullYear(),
              month: month.getMonth() + 1
            },
            earnings: Math.floor(Math.random() * 100000) + 50000, // $500-$1500
            orders: Math.floor(Math.random() * 10) + 1
          });
        }
        return {
          success: true,
          data: monthlyData.reverse()
        };
      }
      return handleApiError(error, 'Failed to fetch monthly earnings');
    }
  },

  getEarningsHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 50 } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/earnings/history`,
        {
          params: { page, limit },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, return mock data
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        const earningsHistory = [];
        for (let i = 0; i < 15; i++) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          earningsHistory.push({
            _id: `earning_${i}`,
            date: date.toISOString(),
            amount: Math.floor(Math.random() * 5000) + 1000, // $10-$60
            type: 'earning',
            status: i % 3 === 0 ? 'pending' : 'completed',
            description: `Order #${1000 + i}`,
            balanceAfter: Math.floor(Math.random() * 200000) + 50000 // $500-$2500
          });
        }
        return {
          success: true,
          data: {
            earnings: earningsHistory,
            pagination: {
              page: 1,
              limit: 50,
              total: 15,
              pages: 1
            }
          }
        };
      }
      return handleApiError(error, 'Failed to fetch earnings history');
    }
  },

  getWithdrawalStats: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/withdrawals/stats`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, return mock data
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        return {
          success: true,
          data: {
            totalWithdrawn: 50000, // $500 in cents
            pendingWithdrawals: 1,
            statsByStatus: [
              { _id: 'completed', count: 2 },
              { _id: 'pending', count: 1 },
              { _id: 'failed', count: 0 }
            ],
            lastWithdrawal: {
              amount: 25000, // $250 in cents
              status: 'completed',
              createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        };
      }
      return handleApiError(error, 'Failed to fetch withdrawal stats');
    }
  },

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
  },

  // UTILITY FUNCTIONS
  formatCurrency: (amount) => {
    const amountInDollars = (amount || 0) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  },

  formatCurrencyShort: (amount) => {
    const amountInDollars = (amount || 0) / 100;
    if (amountInDollars >= 1000000) {
      return `$${(amountInDollars / 1000000).toFixed(1)}M`;
    } else if (amountInDollars >= 1000) {
      return `$${(amountInDollars / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInDollars);
  },

  dollarsToCents: (dollars) => {
    return Math.round(dollars * 100);
  },

  centsToDollars: (cents) => {
    return cents / 100;
  },

  validateWithdrawalAmount: (amountInCents, availableBalance, minWithdrawal = 500) => {
    if (amountInCents < minWithdrawal) {
      return {
        valid: false,
        error: `Minimum withdrawal amount is $${(minWithdrawal / 100).toFixed(2)}`
      };
    }
    
    if (amountInCents > availableBalance) {
      return {
        valid: false,
        error: 'Insufficient available balance'
      };
    }
    
    return { valid: true };
  }
};

// ============================================
// ✅ LISTINGS API
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
// ✅ WITHDRAWAL API
// ============================================

const withdrawalsApi = {
  getWithdrawalHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 10, status = '' } = params;
      const queryParams = new URLSearchParams();
      if (page) queryParams.append('page', page.toString());
      if (limit) queryParams.append('limit', limit.toString());
      if (status) queryParams.append('status', status);
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/payments/withdrawals?${queryParams}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // Return mock history for development
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        const withdrawals = [];
        for (let i = 0; i < 8; i++) {
          const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
          withdrawals.push({
            _id: `withdrawal_${i}`,
            amount: [10000, 15000, 25000, 5000, 30000][i % 5], // $100-$300
            status: i === 0 ? 'pending' : i === 1 ? 'processing' : 'completed',
            stripeTransferId: `tr_${Date.now()}_${i}`,
            stripePayoutId: i > 1 ? `po_${Date.now()}_${i}` : undefined,
            createdAt: date.toISOString(),
            completedAt: i > 1 ? new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            destination: 'Bank Account •••• 4321',
            description: `Withdrawal #${100 + i}`
          });
        }
        return {
          success: true,
          withdrawals,
          pagination: {
            page: 1,
            limit: 10,
            total: 8,
            pages: 1
          },
          balance: {
            availableBalance: 150000,
            pendingBalance: 50000,
            totalEarnings: 200000,
            totalWithdrawn: 75000
          }
        };
      }
      return handleApiError(error, 'Failed to fetch withdrawal history');
    }
  },

  requestWithdrawal: async (amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/withdrawals`,
        { amount },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, return mock success
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
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
      
      return handleApiError(error, 'Failed to request withdrawal');
    }
  },

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
// ✅ EARNINGS API
// ============================================

const earningsApi = {
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
          const orders = await ordersApi.getMySales();
          const completedOrders = Array.isArray(orders) ? 
            orders.filter(order => order.status === 'completed') : [];
          
          const totalRevenue = completedOrders.reduce((sum, order) => 
            sum + (order.amount || 0), 0) * 100;
          
          return {
            success: true,
            availableBalance: totalRevenue,
            currency: 'usd'
          };
        } catch (calcError) {
          return {
            success: true,
            availableBalance: 0,
            currency: 'usd'
          };
        }
      }
      
      return handleApiError(error, 'Failed to fetch available balance');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS (PUBLIC)
// ============================================

// ✅ CURRENCY FORMATTING FUNCTIONS (USD)
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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountInDollars);
};

// ✅ VALIDATION FUNCTIONS
export const validateWithdrawalAmount = (amountInCents, availableBalance, minWithdrawal = 500) => {
  if (amountInCents < minWithdrawal) {
    return {
      valid: false,
      error: `Minimum withdrawal amount is $${(minWithdrawal / 100).toFixed(2)}`
    };
  }
  
  if (amountInCents > availableBalance) {
    return {
      valid: false,
      error: 'Insufficient available balance'
    };
  }
  
  return { valid: true };
};

export const dollarsToCents = (dollars) => {
  return Math.round(dollars * 100);
};

export const centsToDollars = (cents) => {
  return cents / 100;
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
// ✅ MAIN API EXPORT (SINGLE EXPORT OBJECT)
// ============================================

const marketplaceApi = {
  // API Modules
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  withdrawals: withdrawalsApi,
  earnings: earningsApi,
  payments: paymentsApi, // ✅ ADDED PAYMENTS API
  
  // Utility Functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  validateWithdrawalAmount,
  dollarsToCents,
  centsToDollars,
  testApiConnection,
  checkAuth,
  getCurrentUserId,
  
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
  createStripeAccountLink: stripeApi.createStripeAccountLink,
  getStripeBalance: stripeApi.getStripeBalance,
  
  // Withdrawals
  getWithdrawalHistory: withdrawalsApi.getWithdrawalHistory,
  requestWithdrawal: withdrawalsApi.requestWithdrawal,
  getWithdrawalById: withdrawalsApi.getWithdrawalById,
  cancelWithdrawal: withdrawalsApi.cancelWithdrawal,
  
  // Earnings
  getEarningsSummary: earningsApi.getEarningsSummary,
  getEarningsByPeriod: earningsApi.getEarningsByPeriod,
  getAvailableBalance: earningsApi.getAvailableBalance,
  
  // ✅ ADDED PAYMENTS API METHODS
  getEarningsBalance: paymentsApi.getEarningsBalance,
  getMonthlyEarnings: paymentsApi.getMonthlyEarnings,
  getEarningsHistory: paymentsApi.getEarningsHistory,
  getWithdrawalStats: paymentsApi.getWithdrawalStats
};

// ============================================
// ✅ EXPORT CONFIGURATION
// ============================================

// Export the full API object as default
export default marketplaceApi;

// Export all individual functions and modules
export { marketplaceApi };

// Export all individual utility functions


// Export API modules (optional - for advanced usage)
export {
  listingsApi,
  ordersApi,
  offersApi,
  stripeApi,
  withdrawalsApi,
  earningsApi,
  paymentsApi
};