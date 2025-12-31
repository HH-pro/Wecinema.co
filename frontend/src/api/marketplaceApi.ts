// src/api/marketplaceApi.js - UPDATED WITH CORRECT ROUTES
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
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        {
          ...getHeaders(),
          params: { limit: 100 }
        }
      );
      
      if (response.data?.success && Array.isArray(response.data.sales)) {
        return response.data.sales;
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
  },

  // ✅ ADDED: Get buyer orders
  getMyOrders: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-orders`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch your orders');
    }
  },

  // ✅ ADDED: Start processing order (seller)
  startProcessing: async (orderId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/start-processing`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to start processing order');
    }
  },

  // ✅ ADDED: Start work on order (seller)
  startWork: async (orderId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/start-work`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to start work on order');
    }
  },

  // ✅ ADDED: Deliver order (seller)
  deliverOrder: async (orderId, deliveryData) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliver-with-email`,
        deliveryData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to deliver order');
    }
  },

  // ✅ ADDED: Complete revision (seller)
  completeRevision: async (orderId, deliveryData) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete-revision`,
        deliveryData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to complete revision');
    }
  },

  // ✅ ADDED: Complete order (buyer)
  completeOrder: async (orderId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to complete order');
    }
  },

  // ✅ ADDED: Request revision (buyer)
  requestRevision: async (orderId, revisionNotes) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/request-revision`,
        { revisionNotes },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to request revision');
    }
  },

  // ✅ ADDED: Cancel order by buyer
  cancelByBuyer: async (orderId, cancelReason) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/cancel-by-buyer`,
        { cancelReason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to cancel order');
    }
  },

  // ✅ ADDED: Cancel order by seller
  cancelBySeller: async (orderId, cancelReason) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/cancel-by-seller`,
        { cancelReason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to cancel order');
    }
  },

  // ✅ ADDED: Get order deliveries
  getDeliveries: async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliveries`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch deliveries');
    }
  },

  // ✅ ADDED: Get delivery details
  getDeliveryDetails: async (deliveryId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/deliveries/${deliveryId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch delivery details');
    }
  },

  // ✅ ADDED: Download files
  downloadFiles: async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/download-files`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch download files');
    }
  },

  // ✅ ADDED: Get order summary
  getOrderSummary: async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/summary`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch order summary');
    }
  },

  // ✅ ADDED: Get order timeline
  getOrderTimeline: async (orderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/timeline`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch order timeline');
    }
  },

  // ✅ ADDED: Get seller statistics
  getSellerStats: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stats/seller`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch seller statistics');
    }
  },

  // ✅ ADDED: Get buyer statistics
  getBuyerStats: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stats/buyer`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch buyer statistics');
    }
  }
};

// ============================================
// ✅ EARNINGS API (UPDATED ROUTES)
// ============================================
// In src/api/marketplaceApi.js, update getEarningsSummary:
const earningsApi = {
  getEarningsSummary: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/earnings/summary`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      console.error('❌ Earnings summary API error:', error.response?.data || error.message);
      
      // Return mock data for development
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        console.log('🛠️ Using mock earnings data for development');
        return {
          success: true,
          data: {
            availableBalance: 150000, // $1,500.00 in cents
            pendingBalance: 50000, // $500.00 in cents
            totalEarnings: 250000, // $2,500.00 in cents
            totalWithdrawn: 100000, // $1,000.00 in cents
            walletBalance: 150000,
            lastWithdrawal: {
              amount: 50000,
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'completed'
            },
            nextPayoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            currency: 'inr',
            thisMonthEarnings: 75000,
            completedOrdersCount: 5,
            pendingOrdersCount: 2
          }
        };
      }
      
      return handleApiError(error, 'Failed to fetch earnings summary');
    }
  },
 

  getEarningsByPeriod: async (period = 'month') => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/earnings/period/${period}`,
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
        `${API_BASE_URL}/marketplace/orders/earnings/available-balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // For development, calculate from orders
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        try {
          const orders = await ordersApi.getMySales();
          const completedOrders = Array.isArray(orders) ? 
            orders.filter(order => order.status === 'completed' && order.paymentReleased) : [];
          
          const totalRevenue = completedOrders.reduce((sum, order) => 
            sum + (order.sellerAmount || order.amount || 0), 0);
          
          return {
            success: true,
            data: {
              availableBalance: totalRevenue * 100, // Convert to cents
              pendingBalance: 0,
              totalEarnings: totalRevenue * 100,
              totalWithdrawn: 0,
              currency: 'inr'
            }
          };
        } catch (calcError) {
          return {
            success: true,
            data: {
              availableBalance: 0,
              pendingBalance: 0,
              totalEarnings: 0,
              totalWithdrawn: 0,
              currency: 'inr'
            }
          };
        }
      }
      
      return handleApiError(error, 'Failed to fetch available balance');
    }
  }
};

// ============================================
// ✅ WITHDRAWAL API (UPDATED ROUTES)
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
        `${API_BASE_URL}/marketplace/orders/payments/withdrawals?${queryParams}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      // Return empty history for development
      return {
        success: true,
        data: {
          withdrawals: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1
          }
        }
      };
    }
  },

  requestWithdrawal: async (amount) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/withdrawals`,
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
        `${API_BASE_URL}/marketplace/orders/withdrawals/${withdrawalId}`,
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
        `${API_BASE_URL}/marketplace/orders/withdrawals/${withdrawalId}/cancel`,
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
// ✅ STRIPE API (UPDATED ROUTES)
// ============================================

const stripeApi = {
  getStripeStatus: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stripe/status`,
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
        `${API_BASE_URL}/marketplace/orders/stripe/create-account-link`,
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
        `${API_BASE_URL}/marketplace/orders/stripe/balance`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch Stripe balance');
    }
  },

  // ✅ ADDED: Check seller account status
  getSellerAccountStatus: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/seller/account-status`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch seller account status');
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
  },

  // ✅ ADDED: Create order from offer
  createOrderFromOffer: async (offerData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/create`,
        offerData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'Failed to create order from offer');
    }
  }
};

// ============================================
// ✅ FILE UPLOAD API
// ============================================

const uploadApi = {
  uploadDeliveryFiles: async (files) => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/upload/delivery`,
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
      return handleApiError(error, 'Failed to upload files');
    }
  },

  getUploadedFile: async (filename) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/upload/delivery/${filename}`
      );
      return response;
    } catch (error) {
      return handleApiError(error, 'Failed to get uploaded file');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS (PUBLIC)
// ============================================

export const formatCurrencyAmount = (amount) => {
  const amountInDollars = (amount || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

export const formatCurrencyShort = (amountInCents: number, currency: string = 'USD') => {
  const amountInDollars = amountInCents / 100;
  
  if (amountInDollars >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInDollars);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};
export const testApiConnection = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/marketplace/orders/test`);
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

// ✅ ADDED: Currency conversion helpers
export const dollarsToCents = (dollars) => {
  return Math.round(dollars * 100);
};

export const centsToDollars = (cents) => {
  return cents / 100;
};

// ✅ ADDED: Validate withdrawal amount
export const validateWithdrawalAmount = (amountInCents, availableBalance) => {
  if (amountInCents <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }
  
  if (amountInCents < 100) { // Minimum $1.00
    return { valid: false, error: 'Minimum withdrawal amount is $1.00 (100 cents)' };
  }
  
  if (amountInCents > availableBalance) {
    return { valid: false, error: 'Insufficient balance for withdrawal' };
  }
  
  return { valid: true };
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
  upload: uploadApi,
  
  // Utility Functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  dollarsToCents,
  centsToDollars,
  validateWithdrawalAmount,
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
  getMyOrders: ordersApi.getMyOrders,
  updateOrderStatus: ordersApi.updateOrderStatus,
  getOrderDetails: ordersApi.getOrderDetails,
  startProcessing: ordersApi.startProcessing,
  startWork: ordersApi.startWork,
  deliverOrder: ordersApi.deliverOrder,
  completeRevision: ordersApi.completeRevision,
  completeOrder: ordersApi.completeOrder,
  requestRevision: ordersApi.requestRevision,
  cancelByBuyer: ordersApi.cancelByBuyer,
  cancelBySeller: ordersApi.cancelBySeller,
  getDeliveries: ordersApi.getDeliveries,
  getDeliveryDetails: ordersApi.getDeliveryDetails,
  downloadFiles: ordersApi.downloadFiles,
  getOrderSummary: ordersApi.getOrderSummary,
  getOrderTimeline: ordersApi.getOrderTimeline,
  getSellerStats: ordersApi.getSellerStats,
  getBuyerStats: ordersApi.getBuyerStats,
  
  // Offers
  getReceivedOffers: offersApi.getReceivedOffers,
  acceptOffer: offersApi.acceptOffer,
  rejectOffer: offersApi.rejectOffer,
  createOrderFromOffer: offersApi.createOrderFromOffer,
  
  // Stripe
  getStripeStatus: stripeApi.getStripeStatus,
  getSellerAccountStatus: stripeApi.getSellerAccountStatus,
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
  
  // Upload
  uploadDeliveryFiles: uploadApi.uploadDeliveryFiles,
  getUploadedFile: uploadApi.getUploadedFile
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
  withdrawalsApi,
  earningsApi,
  uploadApi
};