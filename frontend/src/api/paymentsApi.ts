// src/api/marketplace/paymentsApi.ts
import axios, { AxiosResponse } from 'axios';

// Types
export interface PaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  orderId: string;
}

export interface PaymentStatus {
  orderStatus: string;
  paymentIntent?: {
    status: string;
    amount: number;
    currency: string;
    created: number;
  };
  paymentReleased: boolean;
  releaseDate?: string;
  fees: {
    platformFee: number;
    sellerAmount: number;
    platformFeePercent: number;
  };
}

export interface Withdrawal {
  _id: string;
  amount: number; // in cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stripeTransferId?: string;
  stripePayoutId?: string;
  description?: string;
  destination?: string;
  failureReason?: string;
  requestDate: string;
  processedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  estimatedArrival?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalHistory {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  balance?: {
    availableBalance: number; // in cents
    pendingBalance: number; // in cents
    totalEarnings: number; // in cents
    totalWithdrawn: number; // in cents
  };
}

export interface WithdrawalStats {
  statsByStatus: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  lastWithdrawal: Withdrawal | null;
}

export interface EarningsBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  walletBalance: number;
  lastWithdrawal: string | null;
  nextPayoutDate: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Environment Configuration - Safe for browser
const getApiBaseUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  return isDevelopment ? 'http://localhost:3000' : '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/marketplace`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== PAYMENT METHODS ========== //

export const createPaymentIntent = async (orderId: string): Promise<ApiResponse<PaymentIntentData>> => {
  try {
    const response: AxiosResponse<ApiResponse<PaymentIntentData>> = await apiClient.post('/payments/create-payment-intent', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to create payment intent'
    };
  }
};

export const confirmPayment = async (orderId: string, paymentIntentId: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/payments/confirm-payment', { 
      orderId, 
      paymentIntentId 
    });
    return response.data;
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to confirm payment'
    };
  }
};

export const capturePayment = async (orderId: string): Promise<ApiResponse<{
  order: any;
  sellerAmount: number;
  platformFee: number;
  platformFeePercent: number;
}>> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/payments/capture-payment', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to capture payment'
    };
  }
};

export const cancelPayment = async (orderId: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/payments/cancel-payment', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling payment:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to cancel payment'
    };
  }
};

export const getPaymentStatus = async (orderId: string): Promise<ApiResponse<PaymentStatus>> => {
  try {
    const response: AxiosResponse<ApiResponse<PaymentStatus>> = await apiClient.get(`/payments/payment-status/${orderId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payment status:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch payment status'
    };
  }
};

export const requestRefund = async (orderId: string, reason: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/payments/request-refund', { 
      orderId, 
      reason 
    });
    return response.data;
  } catch (error: any) {
    console.error('Error requesting refund:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to request refund'
    };
  }
};

// ========== WITHDRAWAL METHODS ========== //

export const getWithdrawalHistory = async (
  params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}
): Promise<ApiResponse<WithdrawalHistory>> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    
    const response: AxiosResponse<ApiResponse<WithdrawalHistory>> = await apiClient.get(`/payments/withdrawals?${queryParams}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching withdrawal history:', error);
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Mock data for development
    if (isDevelopment) {
      return {
        success: true,
        data: {
          withdrawals: [
            {
              _id: 'mock_1',
              amount: 15000,
              status: 'completed',
              description: 'Withdrawal to bank account',
              destination: 'Bank Account •••• 4321',
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              completedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
              requestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
              _id: 'mock_2',
              amount: 25000,
              status: 'pending',
              description: 'Withdrawal request',
              destination: 'Stripe Account',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
          ],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 10,
            total: 2,
            pages: 1
          },
          balance: {
            availableBalance: 150000,
            pendingBalance: 50000,
            totalEarnings: 200000,
            totalWithdrawn: 40000
          }
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch withdrawal history'
    };
  }
};

export const requestWithdrawal = async (amount: number): Promise<ApiResponse<{
  withdrawalId: string;
  amount: number;
  status: string;
  estimatedArrival: string;
  newBalance: number;
  availableBalance: number;
}>> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/payments/withdrawals/request', { 
      amount 
    });
    return response.data;
  } catch (error: any) {
    console.error('Error requesting withdrawal:', error);
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Mock success for development
    if (isDevelopment) {
      return {
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: {
          withdrawalId: 'mock_' + Date.now(),
          amount,
          status: 'pending',
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          newBalance: 100000,
          availableBalance: 100000
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to request withdrawal'
    };
  }
};

export const getWithdrawalDetails = async (withdrawalId: string): Promise<ApiResponse<Withdrawal>> => {
  try {
    const response: AxiosResponse<ApiResponse<Withdrawal>> = await apiClient.get(`/payments/withdrawals/${withdrawalId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching withdrawal details:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch withdrawal details'
    };
  }
};

export const cancelWithdrawal = async (withdrawalId: string): Promise<ApiResponse<Withdrawal>> => {
  try {
    const response: AxiosResponse<ApiResponse<Withdrawal>> = await apiClient.post(`/payments/withdrawals/${withdrawalId}/cancel`);
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling withdrawal:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to cancel withdrawal'
    };
  }
};

export const getWithdrawalStats = async (): Promise<ApiResponse<WithdrawalStats>> => {
  try {
    const response: AxiosResponse<ApiResponse<WithdrawalStats>> = await apiClient.get('/payments/withdrawals/stats/summary');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching withdrawal stats:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch withdrawal stats'
    };
  }
};

// ========== EARNINGS METHODS ========== //

export const getEarningsBalance = async (): Promise<ApiResponse<EarningsBalance>> => {
  try {
    const response = await apiClient.get('/payments/earnings/balance');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching earnings balance:', error);
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Mock data for development
    if (isDevelopment) {
      return {
        success: true,
        data: {
          availableBalance: 150000,
          pendingBalance: 50000,
          totalEarnings: 200000,
          totalWithdrawn: 50000,
          walletBalance: 150000,
          lastWithdrawal: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch earnings balance'
    };
  }
};

export const getMonthlyEarnings = async (params: { months?: number } = {}): Promise<ApiResponse<any[]>> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.months) queryParams.append('months', params.months.toString());
    
    const response = await apiClient.get(`/payments/earnings/monthly?${queryParams}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching monthly earnings:', error);
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Mock data for development
    if (isDevelopment) {
      const now = new Date();
      const mockData = [
        { _id: { year: now.getFullYear(), month: now.getMonth() - 5 }, earnings: 120000, orders: 3 },
        { _id: { year: now.getFullYear(), month: now.getMonth() - 4 }, earnings: 150000, orders: 4 },
        { _id: { year: now.getFullYear(), month: now.getMonth() - 3 }, earnings: 180000, orders: 5 },
        { _id: { year: now.getFullYear(), month: now.getMonth() - 2 }, earnings: 220000, orders: 6 },
        { _id: { year: now.getFullYear(), month: now.getMonth() - 1 }, earnings: 250000, orders: 7 },
        { _id: { year: now.getFullYear(), month: now.getMonth() }, earnings: 300000, orders: 8 }
      ];
      
      return {
        success: true,
        data: mockData
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch monthly earnings'
    };
  }
};

export const getEarningsHistory = async (params: {
  page?: number;
  limit?: number;
  type?: string;
} = {}): Promise<ApiResponse<{ earnings: any[]; pagination: any }>> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.type) queryParams.append('type', params.type);
    
    const response = await apiClient.get(`/payments/earnings/history?${queryParams}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching earnings history:', error);
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    // Mock data for development
    if (isDevelopment) {
      const mockData = {
        earnings: [
          {
            _id: '1',
            type: 'earning',
            amount: 50000,
            description: 'Order #12345 - Website Design',
            status: 'completed',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            balanceAfter: 150000
          },
          {
            _id: '2',
            type: 'earning',
            amount: 75000,
            description: 'Order #12346 - Mobile App',
            status: 'completed',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            balanceAfter: 100000
          },
          {
            _id: '3',
            type: 'withdrawal',
            amount: 50000,
            description: 'Withdrawal to bank account',
            status: 'completed',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            balanceAfter: 25000
          }
        ],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: 3,
          pages: 1
        }
      };
      
      return {
        success: true,
        data: mockData
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch earnings history'
    };
  }
};

// ========== HELPER FUNCTIONS ========== //

export const formatCurrency = (amountInCents: number): string => {
  const rupees = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees);
};

export const formatCurrencyAmount = (amountInCents: number): string => {
  const rupees = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees);
};

export const formatCurrencyShort = (amountInCents: number): string => {
  const rupees = amountInCents / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(1)}Cr`;
  } else if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  } else if (rupees >= 1000) {
    return `₹${(rupees / 1000).toFixed(1)}K`;
  }
  return `₹${rupees.toFixed(0)}`;
};

export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

export const rupeesToCents = (rupees: number): number => {
  return Math.round(rupees * 100);
};

export const centsToRupees = (cents: number): number => {
  return cents / 100;
};

export const validateWithdrawalAmount = (
  amountInCents: number,
  availableBalance: number,
  minWithdrawal = 500 // ₹5.00 minimum
): { valid: boolean; error?: string } => {
  if (!amountInCents || amountInCents <= 0) {
    return { valid: false, error: 'Please enter a valid amount' };
  }
  
  if (amountInCents > availableBalance) {
    return { 
      valid: false, 
      error: `Cannot withdraw more than your available balance of ${formatCurrency(availableBalance)}` 
    };
  }
  
  if (amountInCents < minWithdrawal) {
    return { 
      valid: false, 
      error: `Minimum withdrawal amount is ${formatCurrency(minWithdrawal)}` 
    };
  }
  
  return { valid: true };
};

// ========== EXPORT API OBJECT ========== //

const paymentsApi = {
  // Payment methods
  createPaymentIntent,
  confirmPayment,
  capturePayment,
  cancelPayment,
  getPaymentStatus,
  requestRefund,
  
  // Withdrawal methods
  getWithdrawalHistory,
  requestWithdrawal,
  getWithdrawalDetails,
  cancelWithdrawal,
  getWithdrawalStats,
  
  // Earnings methods
  getEarningsBalance,
  getMonthlyEarnings,
  getEarningsHistory,
  
  // Helper functions
  formatCurrency,
  formatCurrencyAmount,
  formatCurrencyShort,
  rupeesToCents,
  centsToRupees,
  validateWithdrawalAmount
};

export default paymentsApi;