// api/marketplace/paymentsApi.ts
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
  balance: {
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const PAYMENTS_API_URL = `${API_BASE_URL}/payments`;

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: PAYMENTS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== PAYMENT METHODS ========== //

/**
 * Create payment intent for an order
 */
export const createPaymentIntent = async (orderId: string): Promise<ApiResponse<PaymentIntentData>> => {
  try {
    const response: AxiosResponse<ApiResponse<PaymentIntentData>> = await apiClient.post('/create-payment-intent', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to create payment intent'
    };
  }
};

/**
 * Confirm payment success
 */
export const confirmPayment = async (orderId: string, paymentIntentId: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/confirm-payment', { 
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

/**
 * Capture payment and release funds to seller
 */
export const capturePayment = async (orderId: string): Promise<ApiResponse<{
  order: any;
  sellerAmount: number;
  platformFee: number;
  platformFeePercent: number;
}>> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/capture-payment', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error capturing payment:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to capture payment'
    };
  }
};

/**
 * Cancel payment intent
 */
export const cancelPayment = async (orderId: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/cancel-payment', { orderId });
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling payment:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to cancel payment'
    };
  }
};

/**
 * Get payment status for an order
 */
export const getPaymentStatus = async (orderId: string): Promise<ApiResponse<PaymentStatus>> => {
  try {
    const response: AxiosResponse<ApiResponse<PaymentStatus>> = await apiClient.get(`/payment-status/${orderId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payment status:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch payment status'
    };
  }
};

/**
 * Request refund for an order
 */
export const requestRefund = async (orderId: string, reason: string): Promise<ApiResponse> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/request-refund', { 
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

/**
 * Get withdrawal history with pagination
 */
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
    
    const response: AxiosResponse<ApiResponse<WithdrawalHistory>> = await apiClient.get(`/withdrawals?${queryParams}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching withdrawal history:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch withdrawal history'
    };
  }
};

/**
 * Request withdrawal
 * @param amount Amount in cents (e.g., 5000 = $50.00)
 */
export const requestWithdrawal = async (amount: number): Promise<ApiResponse<{
  withdrawalId: string;
  amount: number;
  status: string;
  estimatedArrival: string;
  newBalance: number;
  availableBalance: number;
}>> => {
  try {
    const response: AxiosResponse<ApiResponse> = await apiClient.post('/withdrawals', { 
      amount 
    });
    return response.data;
  } catch (error: any) {
    console.error('Error requesting withdrawal:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to request withdrawal'
    };
  }
};

/**
 * Get withdrawal details
 */
export const getWithdrawalDetails = async (withdrawalId: string): Promise<ApiResponse<Withdrawal>> => {
  try {
    const response: AxiosResponse<ApiResponse<Withdrawal>> = await apiClient.get(`/withdrawals/${withdrawalId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching withdrawal details:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch withdrawal details'
    };
  }
};

/**
 * Cancel a pending withdrawal
 */
export const cancelWithdrawal = async (withdrawalId: string): Promise<ApiResponse<Withdrawal>> => {
  try {
    const response: AxiosResponse<ApiResponse<Withdrawal>> = await apiClient.post(`/withdrawals/${withdrawalId}/cancel`);
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling withdrawal:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to cancel withdrawal'
    };
  }
};

/**
 * Get withdrawal statistics
 */
export const getWithdrawalStats = async (): Promise<ApiResponse<WithdrawalStats>> => {
  try {
    const response: AxiosResponse<ApiResponse<WithdrawalStats>> = await apiClient.get('/withdrawals/stats/summary');
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

/**
 * Get seller earnings balance
 */
export const getEarningsBalance = async (): Promise<ApiResponse<{
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  walletBalance: number;
  lastWithdrawal: string | null;
  nextPayoutDate: string;
}>> => {
  try {
    // This endpoint might be different - adjust based on your backend
    const response = await axios.get(`${API_BASE_URL}/earnings/balance`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching earnings balance:', error);
    
    // Mock data for development
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        data: {
          availableBalance: 150000, // $1500.00 in cents
          pendingBalance: 50000, // $500.00 in cents
          totalEarnings: 200000, // $2000.00 in cents
          totalWithdrawn: 50000, // $500.00 in cents
          walletBalance: 150000, // $1500.00 in cents
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

/**
 * Get monthly earnings summary
 */
export const getMonthlyEarnings = async (params: { months?: number } = {}): Promise<ApiResponse<any[]>> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.months) queryParams.append('months', params.months.toString());
    
    const response = await axios.get(`${API_BASE_URL}/earnings/monthly?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching monthly earnings:', error);
    
    // Mock data for development
    if (process.env.NODE_ENV === 'development') {
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

/**
 * Get earnings history
 */
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
    
    const response = await axios.get(`${API_BASE_URL}/earnings/history?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching earnings history:', error);
    
    // Mock data for development
    if (process.env.NODE_ENV === 'development') {
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
          page: 1,
          limit: 10,
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

/**
 * Format currency from cents to dollars
 */
export const formatCurrency = (amountInCents: number): string => {
  const dollars = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
};

/**
 * Convert dollars to cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

/**
 * Validate withdrawal amount
 */
export const validateWithdrawalAmount = (
  amountInCents: number,
  availableBalance: number,
  minWithdrawal = 500 // $5.00 minimum
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
  dollarsToCents,
  centsToDollars,
  validateWithdrawalAmount
};

export default paymentsApi;