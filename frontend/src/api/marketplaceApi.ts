// src/api/marketplaceApi.js - UPDATED WITH COMPLETE EARNINGS FUNCTIONALITY
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
// ✅ EARNINGS API - COMPLETE FUNCTIONALITY
// ============================================

const earningsApi = {
  // GET EARNINGS DASHBOARD WITH STATS
  getEarningsDashboard: async (timeRange = 'month') => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/dashboard`,
        {
          params: { timeRange },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings dashboard');
    }
  },

  // GET EARNINGS SUMMARY
  getEarningsSummary: async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/summary`,
        {
          params: { startDate, endDate },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings summary');
    }
  },

  // GET EARNINGS BREAKDOWN BY PERIOD
  getEarningsBreakdown: async (period = 'daily', limit = 30) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/breakdown`,
        {
          params: { period, limit },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings breakdown');
    }
  },

  // GET TOTAL EARNINGS
  getTotalEarnings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/total`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch total earnings');
    }
  },

  // GET AVAILABLE BALANCE
  getAvailableBalance: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch available balance');
    }
  },

  // GET PENDING EARNINGS
  getPendingEarnings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/pending`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch pending earnings');
    }
  },

  // GET PAID OUT EARNINGS
  getPaidOutEarnings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/paid`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch paid out earnings');
    }
  },

  // PROCESS PAYOUT/WITHDRAWAL
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

  // REQUEST WITHDRAWAL
  requestWithdrawal: async (amount, withdrawalMethod = 'bank_transfer') => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/request-withdrawal`,
        { amount, withdrawalMethod },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to request withdrawal');
    }
  },

  // CANCEL WITHDRAWAL
  cancelWithdrawal: async (withdrawalId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/cancel-withdrawal/${withdrawalId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to cancel withdrawal');
    }
  },

  // GET PAYMENT HISTORY
  getPaymentHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 20, type, status, startDate, endDate } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/payment-history`,
        {
          params: { page, limit, type, status, startDate, endDate },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch payment history');
    }
  },

  // GET TRANSACTION HISTORY
  getTransactionHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 50, transactionType, startDate, endDate } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/transactions`,
        {
          params: { page, limit, transactionType, startDate, endDate },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch transaction history');
    }
  },

  // GET WITHDRAWAL HISTORY
  getWithdrawalHistory: async (params = {}) => {
    try {
      const { page = 1, limit = 20, status } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-history`,
        {
          params: { page, limit, status },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal history');
    }
  },

  // GET EARNINGS BY LISTING
  getEarningsByListing: async (listingId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/by-listing/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch listing earnings');
    }
  },

  // GET EARNINGS BY DATE RANGE
  getEarningsByDateRange: async (startDate, endDate) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/by-date-range`,
        {
          params: { startDate, endDate },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings by date range');
    }
  },

  // GET MONTHLY EARNINGS
  getMonthlyEarnings: async (year, month) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/monthly`,
        {
          params: { year, month },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch monthly earnings');
    }
  },

  // GET YEARLY EARNINGS
  getYearlyEarnings: async (year) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/yearly`,
        {
          params: { year },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch yearly earnings');
    }
  },

  // GET EARNINGS ANALYTICS
  getEarningsAnalytics: async (params = {}) => {
    try {
      const { 
        groupBy = 'day', 
        startDate, 
        endDate,
        limit = 30 
      } = params;
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/analytics`,
        {
          params: { groupBy, startDate, endDate, limit },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings analytics');
    }
  },

  // GET TOP EARNING LISTINGS
  getTopEarningListings: async (limit = 10) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/top-listings`,
        {
          params: { limit },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch top earning listings');
    }
  },

  // GET COMMISSION BREAKDOWN
  getCommissionBreakdown: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/commission-breakdown`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch commission breakdown');
    }
  },

  // RELEASE PENDING PAYMENT
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
  },

  // GET WITHDRAWAL SETTINGS
  getWithdrawalSettings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-settings`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal settings');
    }
  },

  // UPDATE WITHDRAWAL SETTINGS
  updateWithdrawalSettings: async (settings) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-settings`,
        settings,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to update withdrawal settings');
    }
  },

  // CHECK WITHDRAWAL ELIGIBILITY
  checkWithdrawalEligibility: async (amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/check-eligibility`,
        { amount },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to check withdrawal eligibility');
    }
  },

  // GET MINIMUM WITHDRAWAL AMOUNT
  getMinimumWithdrawalAmount: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/minimum-withdrawal`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch minimum withdrawal amount');
    }
  },

  // GET WITHDRAWAL METHODS
  getWithdrawalMethods: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-methods`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal methods');
    }
  },

  // ADD WITHDRAWAL METHOD
  addWithdrawalMethod: async (methodData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-methods`,
        methodData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to add withdrawal method');
    }
  },

  // REMOVE WITHDRAWAL METHOD
  removeWithdrawalMethod: async (methodId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-methods/${methodId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to remove withdrawal method');
    }
  },

  // SET DEFAULT WITHDRAWAL METHOD
  setDefaultWithdrawalMethod: async (methodId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/stripe/earnings/withdrawal-methods/${methodId}/default`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to set default withdrawal method');
    }
  },

  // GET EARNINGS STATEMENT
  getEarningsStatement: async (period = 'month', year, month) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/statement`,
        {
          params: { period, year, month },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings statement');
    }
  },

  // GENERATE EARNINGS REPORT
  generateEarningsReport: async (params = {}) => {
    try {
      const { format = 'pdf', startDate, endDate } = params;
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/generate-report`,
        { format, startDate, endDate },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to generate earnings report');
    }
  },

  // DOWNLOAD EARNINGS REPORT
  downloadEarningsReport: async (reportId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/download-report/${reportId}`,
        {
          ...getHeaders(),
          responseType: 'blob'
        }
      );
      return response;
    } catch (error) {
      return handleApiError(error, 'Failed to download earnings report');
    }
  },

  // GET TAX INFORMATION
  getTaxInformation: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/tax-info`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch tax information');
    }
  },

  // UPDATE TAX INFORMATION
  updateTaxInformation: async (taxData) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/stripe/earnings/tax-info`,
        taxData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to update tax information');
    }
  },

  // GET TAX DOCUMENTS
  getTaxDocuments: async (year) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/tax-documents`,
        {
          params: { year },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch tax documents');
    }
  },

  // GET REVENUE PROJECTIONS
  getRevenueProjections: async (period = 'month', months = 6) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/projections`,
        {
          params: { period, months },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch revenue projections');
    }
  },

  // GET PERFORMANCE METRICS
  getPerformanceMetrics: async (params = {}) => {
    try {
      const { startDate, endDate, compareWithPrevious = false } = params;
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/earnings/performance`,
        {
          params: { startDate, endDate, compareWithPrevious },
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch performance metrics');
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

export const calculateNetEarnings = (grossEarnings, fees, taxes = 0) => {
  const netEarnings = grossEarnings - fees - taxes;
  return {
    grossEarnings,
    fees,
    taxes,
    netEarnings
  };
};

export const getPayoutStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'paid':
    case 'success':
      return 'success';
    case 'processing':
    case 'in_transit':
      return 'warning';
    case 'pending':
    case 'on_hold':
      return 'info';
    case 'failed':
    case 'cancelled':
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
};

export const getPaymentMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'stripe':
    case 'card':
    case 'credit_card':
      return 'credit_card';
    case 'bank_transfer':
    case 'bank':
      return 'account_balance';
    case 'paypal':
      return 'paypal';
    case 'cash':
      return 'money';
    case 'upi':
      return 'payment';
    case 'wallet':
      return 'account_balance_wallet';
    default:
      return 'payment';
  }
};

export const formatDateForEarnings = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getEarningsTimePeriod = (period) => {
  const now = new Date();
  const periods = {
    'today': {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: now
    },
    'week': {
      start: new Date(now.setDate(now.getDate() - 7)),
      end: new Date()
    },
    'month': {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now
    },
    'year': {
      start: new Date(now.getFullYear(), 0, 1),
      end: now
    }
  };
  return periods[period] || periods.month;
};

export const validateWithdrawalAmount = (amount, minAmount = 50000, maxAmount = 100000000) => {
  const amountInRupees = amount / 100;
  const minAmountInRupees = minAmount / 100;
  const maxAmountInRupees = maxAmount / 100;
  
  if (amount < minAmount) {
    return {
      valid: false,
      message: `Minimum withdrawal amount is ₹${formatCurrencyAmount(minAmount)}`
    };
  }
  
  if (amount > maxAmount) {
    return {
      valid: false,
      message: `Maximum withdrawal amount is ₹${formatCurrencyAmount(maxAmount)}`
    };
  }
  
  return { valid: true, message: '' };
};

// ============================================
// ✅ EARNINGS DATA PROCESSING FUNCTIONS
// ============================================

export const processEarningsData = (rawData) => {
  if (!rawData) return null;
  
  const processedData = {
    summary: {
      totalEarnings: rawData.totalEarnings || 0,
      availableBalance: rawData.availableBalance || 0,
      pendingEarnings: rawData.pendingEarnings || 0,
      paidOutEarnings: rawData.paidOutEarnings || 0,
      thisMonthEarnings: rawData.thisMonthEarnings || 0,
      lastMonthEarnings: rawData.lastMonthEarnings || 0,
      growthRate: rawData.growthRate || 0
    },
    
    breakdown: {
      byPeriod: rawData.breakdownByPeriod || [],
      byListing: rawData.breakdownByListing || [],
      byCategory: rawData.breakdownByCategory || []
    },
    
    transactions: {
      recent: rawData.recentTransactions || [],
      pending: rawData.pendingTransactions || [],
      completed: rawData.completedTransactions || []
    },
    
    payouts: {
      recent: rawData.recentPayouts || [],
      pending: rawData.pendingPayouts || [],
      history: rawData.payoutHistory || []
    },
    
    analytics: {
      dailyAverage: rawData.dailyAverage || 0,
      weeklyAverage: rawData.weeklyAverage || 0,
      monthlyAverage: rawData.monthlyAverage || 0,
      peakDay: rawData.peakDay || null,
      peakAmount: rawData.peakAmount || 0
    }
  };
  
  return processedData;
};

export const generateEarningsReportData = (earningsData) => {
  if (!earningsData) return null;
  
  const reportData = {
    summary: {
      totalRevenue: earningsData.totalEarnings || 0,
      netEarnings: earningsData.availableBalance || 0,
      platformFees: earningsData.totalFees || 0,
      totalTransactions: earningsData.totalTransactions || 0,
      averageOrderValue: earningsData.averageOrderValue || 0
    },
    
    performance: {
      currentPeriod: earningsData.currentPeriodEarnings || 0,
      previousPeriod: earningsData.previousPeriodEarnings || 0,
      growthPercentage: earningsData.growthPercentage || 0,
      bestPerformingListing: earningsData.bestListing || null,
      conversionRate: earningsData.conversionRate || 0
    },
    
    timeline: earningsData.timelineData || [],
    
    recommendations: [
      earningsData.availableBalance > 1000000 
        ? "Consider withdrawing funds to your bank account" 
        : "Continue selling to reach withdrawal threshold",
      earningsData.growthRate < 0 
        ? "Review your listings and pricing strategy" 
        : "Great growth! Consider adding more listings",
      earningsData.pendingEarnings > 0 
        ? "Complete pending orders to release payments" 
        : "All payments processed successfully"
    ]
  };
  
  return reportData;
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
  calculateNetEarnings,
  getPayoutStatusColor,
  getPaymentMethodIcon,
  formatDateForEarnings,
  getEarningsTimePeriod,
  validateWithdrawalAmount,
  processEarningsData,
  generateEarningsReportData,
  
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
  
  // Earnings - Dashboard & Summary
  getEarningsDashboard: earningsApi.getEarningsDashboard,
  getEarningsSummary: earningsApi.getEarningsSummary,
  getEarningsBreakdown: earningsApi.getEarningsBreakdown,
  getTotalEarnings: earningsApi.getTotalEarnings,
  getAvailableBalance: earningsApi.getAvailableBalance,
  getPendingEarnings: earningsApi.getPendingEarnings,
  getPaidOutEarnings: earningsApi.getPaidOutEarnings,
  
  // Earnings - History & Transactions
  getPaymentHistory: earningsApi.getPaymentHistory,
  getTransactionHistory: earningsApi.getTransactionHistory,
  getWithdrawalHistory: earningsApi.getWithdrawalHistory,
  getEarningsByListing: earningsApi.getEarningsByListing,
  getEarningsByDateRange: earningsApi.getEarningsByDateRange,
  getMonthlyEarnings: earningsApi.getMonthlyEarnings,
  getYearlyEarnings: earningsApi.getYearlyEarnings,
  
  // Earnings - Analytics & Reports
  getEarningsAnalytics: earningsApi.getEarningsAnalytics,
  getTopEarningListings: earningsApi.getTopEarningListings,
  getCommissionBreakdown: earningsApi.getCommissionBreakdown,
  getEarningsStatement: earningsApi.getEarningsStatement,
  generateEarningsReport: earningsApi.generateEarningsReport,
  downloadEarningsReport: earningsApi.downloadEarningsReport,
  getRevenueProjections: earningsApi.getRevenueProjections,
  getPerformanceMetrics: earningsApi.getPerformanceMetrics,
  
  // Earnings - Payouts & Withdrawals
  processPayout: earningsApi.processPayout,
  requestWithdrawal: earningsApi.requestWithdrawal,
  cancelWithdrawal: earningsApi.cancelWithdrawal,
  releasePayment: earningsApi.releasePayment,
  
  // Earnings - Settings & Configuration
  getWithdrawalSettings: earningsApi.getWithdrawalSettings,
  updateWithdrawalSettings: earningsApi.updateWithdrawalSettings,
  checkWithdrawalEligibility: earningsApi.checkWithdrawalEligibility,
  getMinimumWithdrawalAmount: earningsApi.getMinimumWithdrawalAmount,
  getWithdrawalMethods: earningsApi.getWithdrawalMethods,
  addWithdrawalMethod: earningsApi.addWithdrawalMethod,
  removeWithdrawalMethod: earningsApi.removeWithdrawalMethod,
  setDefaultWithdrawalMethod: earningsApi.setDefaultWithdrawalMethod,
  
  // Earnings - Tax & Compliance
  getTaxInformation: earningsApi.getTaxInformation,
  updateTaxInformation: earningsApi.updateTaxInformation,
  getTaxDocuments: earningsApi.getTaxDocuments
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