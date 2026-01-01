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
// ✅ AMOUNT CONVERSION FUNCTIONS
// ============================================

// Convert dollars to cents (e.g., $15.00 → 1500)
export const dollarsToCents = (dollars) => {
  return Math.round(parseFloat(dollars || 0) * 100);
};

// Convert cents to dollars (e.g., 1500 → $15.00)
export const centsToDollars = (cents) => {
  return parseFloat(cents || 0) / 100;
};

// ============================================
// ✅ CURRENCY FORMATTING FUNCTIONS (DOLLAR ONLY)
// ============================================

export const formatCurrency = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

export const formatCurrencyAmount = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

export const formatCurrencyShort = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  if (amountInDollars >= 1000000) {
    return `$${(amountInDollars / 1000000).toFixed(1)}M`;
  } else if (amountInDollars >= 1000) {
    return `$${(amountInDollars / 1000).toFixed(1)}K`;
  }
  return `$${amountInDollars.toFixed(2)}`;
};

// Dollar format (USD always)
export const formatCurrencyWithSymbol = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  return `$${amountInDollars.toFixed(2)}`;
};

// Simple amount display without symbol
export const formatAmount = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  return amountInDollars.toFixed(2);
};

// Alternative: Direct dollar formatting
export const formatUSD = (amountInCents) => {
  const amountInDollars = centsToDollars(amountInCents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

// ============================================
// ✅ VALIDATION FUNCTIONS
// ============================================

export const validateWithdrawalAmount = (amountInCents, availableBalance, minWithdrawal = 500) => {
  if (amountInCents < minWithdrawal) {
    return {
      valid: false,
      error: `Minimum withdrawal amount is ${formatCurrency(minWithdrawal)}`
    };
  }
  
  if (amountInCents > availableBalance) {
    return {
      valid: false,
      error: 'Insufficient balance'
    };
  }
  
  return { valid: true };
};

// ============================================
// ✅ EARNINGS CALCULATION FUNCTIONS
// ============================================

export const calculateSellerEarnings = (orderAmountInCents, commissionPercentage = 10) => {
  // Ensure amount is in cents
  const amountInCents = typeof orderAmountInCents === 'number' ? 
    orderAmountInCents : 
    dollarsToCents(orderAmountInCents);
  
  // Calculate commission in cents
  const commission = Math.round((amountInCents * commissionPercentage) / 100);
  
  // Calculate seller earnings in cents
  const sellerEarnings = amountInCents - commission;
  
  return {
    totalAmount: amountInCents,
    commission,
    sellerEarnings,
    commissionPercentage,
    formattedTotalAmount: formatCurrency(amountInCents),
    formattedCommission: formatCurrency(commission),
    formattedSellerEarnings: formatCurrency(sellerEarnings)
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
        `${API_BASE_URL}/marketplace/stripe/earnings/dashboard`,
        getHeaders()
      );
      
      const result = normalizeResponse(response);
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Convert all amounts to cents for consistency
        const processedData = {
          // Convert string amounts to numbers and ensure they're in cents
          availableBalance: parseInt(data.availableBalance) || 
                           parseInt(data.available_balance) || 
                           dollarsToCents(data.availableBalance) || 0,
          pendingBalance: parseInt(data.pendingBalance) || 
                         parseInt(data.pending_balance) || 
                         dollarsToCents(data.pendingBalance) || 0,
          totalEarnings: parseInt(data.totalEarnings) || 
                        parseInt(data.total_earnings) || 
                        dollarsToCents(data.totalEarnings) || 0,
          totalWithdrawn: parseInt(data.totalWithdrawn) || 
                         parseInt(data.total_withdrawn) || 
                         dollarsToCents(data.totalWithdrawn) || 0,
          thisMonthRevenue: parseInt(data.thisMonthRevenue) || 
                           parseInt(data.this_month_revenue) || 
                           dollarsToCents(data.thisMonthRevenue) || 0,
          lifetimeRevenue: parseInt(data.lifetimeRevenue) || 
                          parseInt(data.lifetime_revenue) || 
                          dollarsToCents(data.lifetimeRevenue) || 0,
          currency: data.currency || 'usd',
          lastUpdated: data.lastUpdated || new Date().toISOString()
        };
        
        // Add formatted versions for display
        return {
          ...result,
          data: {
            ...processedData,
            formattedAvailableBalance: formatCurrency(processedData.availableBalance),
            formattedPendingBalance: formatCurrency(processedData.pendingBalance),
            formattedTotalEarnings: formatCurrency(processedData.totalEarnings),
            formattedTotalWithdrawn: formatCurrency(processedData.totalWithdrawn),
            formattedThisMonthRevenue: formatCurrency(processedData.thisMonthRevenue),
            formattedLifetimeRevenue: formatCurrency(processedData.lifetimeRevenue)
          }
        };
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch earnings dashboard');
    }
  },

  // PROCESS PAYOUT/WITHDRAWAL
  processPayout: async (amountInCents, paymentMethod, accountDetails) => {
    try {
      // Ensure amount is in cents
      const amount = typeof amountInCents === 'number' ? 
        amountInCents : 
        dollarsToCents(amountInCents);
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/earnings/process-payout`,
        { 
          amount, // Send in cents
          paymentMethod, 
          accountDetails 
        },
        getHeaders()
      );
      
      const result = normalizeResponse(response);
      
      // Add formatted amount to response
      if (result.success) {
        return {
          ...result,
          formattedAmount: formatCurrency(amount)
        };
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to process payout');
    }
  },

  // GET PAYMENT HISTORY
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
      
      const result = normalizeResponse(response);
      
      if (result.success) {
        let paymentData = [];
        
        // Handle different response structures
        if (Array.isArray(result.data)) {
          paymentData = result.data;
        } else if (result.data && Array.isArray(result.data.payments)) {
          paymentData = result.data.payments;
        } else if (result.data && Array.isArray(result.data.history)) {
          paymentData = result.data.history;
        } else if (result.data && Array.isArray(result.data.data)) {
          paymentData = result.data.data;
        }
        
        // Process each payment - ensure amounts are in cents
        const processedPayments = paymentData.map(payment => {
          // Convert amount to cents if needed
          let amountInCents = payment.amount || 0;
          if (amountInCents < 1000 && amountInCents > 0) {
            // If amount looks like dollars (e.g., 1500 for $15.00), convert to cents
            amountInCents = dollarsToCents(amountInCents);
          }
          
          // Calculate seller earnings for order payments
          let sellerEarnings = amountInCents;
          let commission = 0;
          let commissionPercentage = 10;
          
          if (payment.type === 'order_payment' || payment.type === 'earning' || payment.type === 'order_completion') {
            const earnings = calculateSellerEarnings(amountInCents, commissionPercentage);
            sellerEarnings = earnings.sellerEarnings;
            commission = earnings.commission;
          }
          
          return {
            ...payment,
            amount: amountInCents,
            sellerEarnings,
            commission,
            commissionPercentage,
            formattedAmount: formatCurrency(amountInCents),
            formattedSellerEarnings: formatCurrency(sellerEarnings),
            formattedCommission: formatCurrency(commission),
            // Add date formatting
            formattedDate: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-US') : 'N/A',
            formattedTime: payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString('en-US') : ''
          };
        });
        
        return {
          ...result,
          data: processedPayments,
          formattedTotal: formatCurrency(processedPayments.reduce((sum, p) => sum + p.amount, 0))
        };
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch payment history');
    }
  },

  // GET WITHDRAWAL HISTORY
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
      
      const result = normalizeResponse(response);
      
      if (result.success) {
        let withdrawalData = [];
        
        // Handle different response structures
        if (Array.isArray(result.data)) {
          withdrawalData = result.data;
        } else if (result.data && Array.isArray(result.data.withdrawals)) {
          withdrawalData = result.data.withdrawals;
        } else if (result.data && Array.isArray(result.data.history)) {
          withdrawalData = result.data.history;
        }
        
        // Process withdrawals - ensure amounts are in cents
        const processedWithdrawals = withdrawalData.map(withdrawal => {
          // Convert amount to cents if needed
          let amountInCents = withdrawal.amount || 0;
          if (amountInCents < 1000 && amountInCents > 0) {
            amountInCents = dollarsToCents(amountInCents);
          }
          
          return {
            ...withdrawal,
            amount: amountInCents,
            formattedAmount: formatCurrency(amountInCents),
            formattedDate: withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleDateString('en-US') : 'N/A',
            formattedTime: withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleTimeString('en-US') : '',
            // Add status badge class
            statusClass: withdrawal.status === 'completed' ? 'success' :
                        withdrawal.status === 'pending' ? 'warning' :
                        withdrawal.status === 'failed' ? 'error' : 'default'
          };
        });
        
        // Calculate stats
        const totalWithdrawn = processedWithdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + w.amount, 0);
        
        const pendingWithdrawals = processedWithdrawals
          .filter(w => w.status === 'pending').length;
        
        return {
          ...result,
          data: processedWithdrawals,
          stats: {
            totalWithdrawn,
            pendingWithdrawals,
            totalCount: processedWithdrawals.length,
            formattedTotalWithdrawn: formatCurrency(totalWithdrawn)
          }
        };
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch withdrawal history');
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
      
      const result = normalizeResponse(response);
      
      // Add formatted earnings if available
      if (result.success && result.data) {
        const data = result.data;
        if (data.sellerAmount || data.amount) {
          const amountInCents = data.sellerAmount || data.amount;
          return {
            ...result,
            formattedAmount: formatCurrency(amountInCents),
            data: {
              ...data,
              formattedSellerAmount: formatCurrency(amountInCents)
            }
          };
        }
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to release payment');
    }
  }
};

// ============================================
// ✅ STRIPE API
// ============================================

const stripeApi = {
  // GET STRIPE STATUS
  getStripeStatus: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status`,
        getHeaders()
      );
      
      const result = normalizeResponse(response);
      
      // Process balance amounts
      if (result.success && result.data) {
        const data = result.data;
        
        // Convert balance amounts to cents
        if (data.balance) {
          const balance = data.balance;
          if (balance.available && Array.isArray(balance.available)) {
            balance.available = balance.available.map(item => ({
              ...item,
              amount: item.amount || 0,
              formattedAmount: formatCurrency(item.amount || 0)
            }));
          }
          
          if (balance.pending && Array.isArray(balance.pending)) {
            balance.pending = balance.pending.map(item => ({
              ...item,
              amount: item.amount || 0,
              formattedAmount: formatCurrency(item.amount || 0)
            }));
          }
        }
        
        return {
          ...result,
          data: {
            ...data,
            // Add formatted available balance
            formattedAvailableBalance: formatCurrency(data.availableBalance || 0),
            formattedPendingBalance: formatCurrency(data.pendingBalance || 0)
          }
        };
      }
      
      return result;
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
      
      const result = normalizeResponse(response);
      
      // Process and format balance data
      if (result.success && result.data) {
        const data = result.data;
        
        // Calculate totals and format
        const availableTotal = data.available?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const pendingTotal = data.pending?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        
        return {
          ...result,
          data: {
            ...data,
            availableTotal,
            pendingTotal,
            formattedAvailableTotal: formatCurrency(availableTotal),
            formattedPendingTotal: formatCurrency(pendingTotal),
            totalBalance: availableTotal + pendingTotal,
            formattedTotalBalance: formatCurrency(availableTotal + pendingTotal)
          }
        };
      }
      
      return result;
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
      
      const result = normalizeResponse(response);
      
      // Format payout amounts
      if (result.success && result.data) {
        let payouts = [];
        
        if (Array.isArray(result.data)) {
          payouts = result.data;
        } else if (result.data && Array.isArray(result.data.payouts)) {
          payouts = result.data.payouts;
        }
        
        const formattedPayouts = payouts.map(payout => ({
          ...payout,
          formattedAmount: formatCurrency(payout.amount || 0),
          formattedArrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toLocaleDateString('en-US') : 'N/A',
          formattedCreated: payout.created ? new Date(payout.created * 1000).toLocaleDateString('en-US') : 'N/A'
        }));
        
        return {
          ...result,
          data: formattedPayouts
        };
      }
      
      return result;
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
      
      const result = normalizeResponse(response);
      
      // Format amount in response
      if (result.success && result.data) {
        const data = result.data;
        if (data.amount) {
          return {
            ...result,
            data: {
              ...data,
              formattedAmount: formatCurrency(data.amount)
            }
          };
        }
      }
      
      return result;
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
      
      const result = normalizeResponse(response);
      
      // Format payout history
      if (result.success && result.data) {
        let payouts = [];
        
        if (Array.isArray(result.data)) {
          payouts = result.data;
        } else if (result.data && Array.isArray(result.data.payouts)) {
          payouts = result.data.payouts;
        }
        
        const formattedPayouts = payouts.map(payout => ({
          ...payout,
          formattedAmount: formatCurrency(payout.amount || 0),
          formattedDate: payout.created ? new Date(payout.created * 1000).toLocaleDateString('en-US') : 'N/A'
        }));
        
        return {
          ...result,
          data: formattedPayouts
        };
      }
      
      return result;
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
          formattedPrice: formatCurrency(dollarsToCents(listing.price)),
          priceInCents: dollarsToCents(listing.price)
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
          formattedPrice: formatCurrency(dollarsToCents(listing.price)),
          priceInCents: dollarsToCents(listing.price)
        }));
      }
      
      return normalized;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch your listings');
    }
  },

  createListing: async (listingData) => {
    try {
      // Convert price to cents before sending
      const dataToSend = {
        ...listingData,
        price: dollarsToCents(listingData.price)
      };
      
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/create-listing`,
        dataToSend,
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
        price: dollarsToCents(updateData.price)
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
        normalized.data.formattedPrice = formatCurrency(dollarsToCents(normalized.data.price));
        normalized.data.priceInCents = dollarsToCents(normalized.data.price);
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
          formattedPrice: formatCurrency(dollarsToCents(listing.price)),
          priceInCents: dollarsToCents(listing.price)
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
  // Complete order with earnings calculation
  completeOrder: async (orderId) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete`,
        {},
        getHeaders()
      );
      
      const result = normalizeResponse(response);
      
      // Process and format earnings data
      if (result.success && result.data) {
        const data = result.data;
        
        // Calculate seller earnings from order amount
        if (data.order?.amount || data.payment?.totalAmountInCents) {
          const orderAmount = data.payment?.totalAmountInCents || dollarsToCents(data.order?.amount);
          const earnings = calculateSellerEarnings(orderAmount);
          
          return {
            ...result,
            data: {
              ...data,
              earnings,
              formattedEarnings: formatCurrency(earnings.sellerEarnings),
              formattedCommission: formatCurrency(earnings.commission)
            }
          };
        }
      }
      
      return result;
    } catch (error) {
      return handleApiError(error, 'Failed to complete order');
    }
  },

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
          
          // Format order amounts and calculate earnings
          const formattedOrders = orders.map(order => {
            const orderAmount = dollarsToCents(order.amount || order.totalAmount || 0);
            const earnings = calculateSellerEarnings(orderAmount);
            
            return {
              ...order,
              amount: orderAmount,
              formattedAmount: formatCurrency(orderAmount),
              formattedPrice: formatCurrency(dollarsToCents(order.price || 0)),
              earnings,
              formattedEarnings: formatCurrency(earnings.sellerEarnings),
              formattedCommission: formatCurrency(earnings.commission)
            };
          });
          
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
      
      const result = normalizeResponse(response);
      
      // Add earnings calculation for completed orders
      if (result.success && result.data && (status === 'completed' || status === 'delivered')) {
        const orderData = result.data;
        const orderAmount = dollarsToCents(orderData.amount || orderData.totalAmount || 0);
        const earnings = calculateSellerEarnings(orderAmount);
        
        return {
          ...result,
          data: {
            ...orderData,
            ...earnings,
            formattedOrderAmount: formatCurrency(orderAmount)
          }
        };
      }
      
      return result;
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
      
      const result = normalizeResponse(response);
      
      // Format order amounts and calculate earnings
      if (result.success && result.data) {
        const data = result.data;
        const orderAmount = dollarsToCents(data.totalAmount || data.amount || 0);
        const earnings = calculateSellerEarnings(orderAmount);
        
        return {
          ...result,
          data: {
            ...data,
            ...earnings,
            formattedTotal: formatCurrency(orderAmount),
            formattedSubtotal: formatCurrency(dollarsToCents(data.subtotal || 0)),
            formattedTax: formatCurrency(dollarsToCents(data.tax || 0)),
            formattedShipping: formatCurrency(dollarsToCents(data.shipping || 0)),
            items: data.items?.map(item => ({
              ...item,
              formattedPrice: formatCurrency(dollarsToCents(item.price || 0)),
              formattedTotal: formatCurrency(dollarsToCents(item.total || 0))
            })) || []
          }
        };
      }
      
      return result;
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
          formattedOfferAmount: formatCurrency(dollarsToCents(offer.offerAmount || 0)),
          formattedOriginalPrice: formatCurrency(dollarsToCents(offer.originalPrice || 0))
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

// Get payout status color
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

// Process order payment with earnings calculation
export const processOrderPayment = async (orderId, amountInDollars) => {
  try {
    const amountInCents = dollarsToCents(amountInDollars);
    const earnings = calculateSellerEarnings(amountInCents);
    
    const response = await axios.post(
      `${API_BASE_URL}/marketplace/orders/${orderId}/process-payment`,
      { 
        amount: amountInCents,
        currency: 'usd'
      },
      getHeaders()
    );
    
    const result = normalizeResponse(response);
    
    if (result.success && result.data) {
      return {
        ...result,
        data: {
          ...result.data,
          ...earnings
        }
      };
    }
    
    return result;
  } catch (error) {
    return handleApiError(error, 'Failed to process payment');
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
  formatUSD,
  
  // Amount Conversion
  dollarsToCents,
  centsToDollars,
  validateWithdrawalAmount,
  
  // Calculations
  calculateSellerEarnings,
  processOrderPayment,
  
  // Utility Functions
  testApiConnection,
  checkAuth,
  getCurrentUserId,
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
  completeOrder: ordersApi.completeOrder,
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