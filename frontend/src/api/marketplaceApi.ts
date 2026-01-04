// src/api/marketplaceApi.ts - COMPLETE UPDATED VERSION
import axios, { AxiosError, AxiosResponse } from 'axios';

// ============================================
// ✅ TYPE DEFINITIONS (UPDATED)
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  status: 'active' | 'sold' | 'pending' | 'draft' | 'inactive' | 'reserved';
  type: string;
  category: string;
  tags: string[];
  currency: string;
  isDigital: boolean;
  mediaUrls: string[];
  thumbnail?: string;
  views: number;
  favoriteCount: number;
  purchaseCount: number;
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
    phoneNumber?: string;
    stripeAccountId?: string;
    stripeAccountStatus?: string;
  };
  sellerEmail?: string;
  seller?: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
  };
  maxRevisions?: number;
  deliveryTime?: string;
  availability?: string;
  totalOrders?: number;
  lastOrderAt?: string;
  reservedUntil?: string;
  createdAt: string;
  updatedAt: string;
  createdAtFormatted?: string;
  statusColor?: string;
}

export interface Order {
  _id: string;
  orderNumber?: string;
  listingId: Listing | string;
  buyerId: {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  sellerId: {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    sellerRating?: number;
    stripeAccountId?: string;
    stripeAccountStatus?: string;
  };
  amount: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'processing' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'refunded' | 'disputed';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'released' | 'held';
  orderType: 'direct_purchase' | 'accepted_offer';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  deliveryMessage?: string;
  deliveryFiles?: string[];
  deliveries?: string[];
  revisions?: number;
  maxRevisions?: number;
  revisionNotes?: Array<{
    notes: string;
    requestedAt: string;
    requestedBy: string;
    completedAt?: string;
  }>;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  platformFee?: number;
  sellerAmount?: number;
  paymentReleased?: boolean;
  releaseDate?: string;
  orderDate: string;
  expectedDelivery?: string;
  paidAt?: string;
  processingAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  buyerNotes?: string;
  sellerNotes?: string;
  cancelReason?: string;
  cancelledBy?: string;
  requirements?: string;
  offerId?: string;
}

export interface Offer {
  _id: string;
  listingId: Listing;
  buyerId: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  sellerId: string;
  offeredPrice: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'pending_payment' | 'paid' | 'cancelled';
  message?: string;
  amount?: number;
  paymentIntentId?: string;
  requirements?: string;
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  rejectionReason?: string;
  isTemporary?: boolean;
  expiresAt?: string;
}

export interface Delivery {
  _id: string;
  orderId: string;
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  buyerId: {
    _id: string;
    username: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  message: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    key?: string;
  }>;
  isFinalDelivery: boolean;
  revisionNumber: number;
  status: 'pending_review' | 'accepted' | 'revision_requested';
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path?: string;
  extension?: string;
}

export interface OrderStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  cancelled: number;
  disputed: number;
  totalSpent?: number;
  totalRevenue?: number;
  pendingRevenue?: number;
}

export interface OrderTimelineItem {
  status: string;
  date: string;
  description: string;
  icon: string;
}

export interface OrderSummary {
  orderInfo: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    orderType: string;
  };
  financial: {
    totalAmount: number;
    platformFee: number;
    netAmount: number;
    paymentStatus: string;
    paymentReleased: boolean;
    releaseDate?: string;
  };
  timeline: {
    revisionsUsed: number;
    revisionsLeft: number;
    deliveriesCount: number;
    expectedDelivery?: string;
    timeRemaining?: number;
    isOverdue?: boolean;
    deliveredAt?: string;
    completedAt?: string;
  };
  listing?: {
    title: string;
    category: string;
    type: string;
    price: number;
  };
  seller?: {
    username: string;
    rating?: number;
    name?: string;
  };
  offer?: {
    originalAmount: number;
    message?: string;
    expectedDelivery?: string;
  };
}

export interface BuyerNextAction {
  action: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SellerAccountStatus {
  account: {
    id: string;
    business_type: string;
    business_profile: any;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    capabilities: any;
    requirements: {
      currently_due: string[];
      eventually_due: string[];
      past_due: string[];
      disabled_reason: string;
      pending_verification?: string[];
    };
    balance?: {
      available: number;
      pending: number;
      total: number;
      currency: string;
    };
  };
  status: {
    canReceivePayments: boolean;
    missingRequirements: string[];
    needsAction: boolean;
    isActive: boolean;
  };
  setupLink?: string;
  message: string;
}

export interface SellerStats {
  statsByStatus: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
  completedOrders?: any[];
  monthlyRevenue?: Array<{
    month: string;
    year: number;
    revenue: number;
    orders: number;
  }>;
  totals: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completedOrders: {
      count: number;
      revenue: number;
    };
    pendingOrders: {
      count: number;
      revenue: number;
    };
    thisMonthRevenue: number;
  };
  breakdown: Record<string, {
    count: number;
    revenue: number;
  }>;
}

// ============================================
// ✅ STRIPE SPECIFIC TYPES
// ============================================

export interface StripeOnboardingResponse {
  url: string;
  stripeAccountId: string;
  message: string;
  accountStatus?: 'new' | 'verification_required' | 'incomplete' | 'active';
  requirements?: {
    pending_verification?: string[];
    currently_due?: string[];
    disabled_reason?: string;
  };
}

export interface StripeContinueOnboardingResponse {
  url: string;
  stripeAccountId: string;
  message: string;
  accountStatus: 'verification_in_progress';
  requirements?: {
    pending_verification?: string[];
  };
}

export interface StripeAccountRequirements {
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string;
  };
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  disabled_reason: string;
}

// ============================================
// ✅ API CONFIGURATION
// ============================================

const API_BASE_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://wecinema-co.onrender.com/';




// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Helper function to get headers
const getHeaders = (): { headers: Record<string, string> } => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

// Helper function for file upload headers
const getUploadHeaders = (): { headers: Record<string, string> } => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

// Helper function to normalize API response
const normalizeResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  const data = response?.data || response;
  
  if (data.success !== undefined) {
    return data as ApiResponse<T>;
  }
  
  return {
    success: true,
    data: data as T
  };
};

// Helper function to handle API errors
const handleApiError = <T>(error: AxiosError, defaultMessage: string = 'API Error'): ApiResponse<T> => {
  console.error('API Error:', error);
  
  const errorData = error.response?.data as any || {};
  const errorMessage = errorData.message || errorData.error || error.message || defaultMessage;
  
  return {
    success: false,
    error: errorMessage,
    status: error.response?.status,
    data: errorData
  };
};

// ============================================
// ✅ STRIPE API ENDPOINTS
// ============================================

export const stripeApi = {
  // Start Stripe onboarding
  startStripeOnboarding: async (): Promise<ApiResponse<StripeOnboardingResponse>> => {
    try {
      console.log('🔄 Calling /marketplace/stripe/onboard-seller');
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/onboard-seller`,
        {},
        getHeaders()
      );
      
      const data = response.data;
      console.log('✅ Onboarding response:', {
        success: data.success,
        hasUrl: !!data.url,
        hasAccountId: !!data.stripeAccountId,
        accountStatus: data.accountStatus
      });
      
      return {
        success: data.success,
        data: {
          url: data.url,
          stripeAccountId: data.stripeAccountId,
          message: data.message,
          accountStatus: data.accountStatus,
          requirements: data.requirements
        },
        message: data.message,
        error: data.error
      };
    } catch (error) {
      console.error('❌ Stripe onboarding error:', error);
      return handleApiError(error as AxiosError, 'Failed to start Stripe onboarding');
    }
  },

  // Continue Stripe onboarding for existing accounts
  continueStripeOnboarding: async (): Promise<ApiResponse<StripeContinueOnboardingResponse>> => {
    try {
      console.log('🔄 Calling /marketplace/stripe/continue-onboarding');
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/continue-onboarding`,
        {},
        getHeaders()
      );
      
      const data = response.data;
      console.log('✅ Continue onboarding response:', {
        success: data.success,
        hasUrl: !!data.url,
        accountStatus: data.accountStatus
      });
      
      return {
        success: data.success,
        data: {
          url: data.url,
          stripeAccountId: data.stripeAccountId,
          message: data.message,
          accountStatus: data.accountStatus,
          requirements: data.requirements,
          pending_verification: data.pending_verification
        },
        message: data.message,
        error: data.error
      };
    } catch (error) {
      console.error('❌ Continue onboarding error:', error);
      return handleApiError(error as AxiosError, 'Failed to continue Stripe onboarding');
    }
  },

  // Get Stripe account status
  getStripeAccountStatus: async (): Promise<ApiResponse<SellerAccountStatus>> => {
    try {
      console.log('🔍 Calling /marketplace/stripe/account-status');
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/account-status`,
        getHeaders()
      );
      
      const data = response.data;
      console.log('✅ Account status response:', {
        success: data.success,
        hasAccount: !!data.data?.account,
        charges_enabled: data.data?.account?.charges_enabled,
        pending_verification: data.data?.account?.requirements?.pending_verification
      });
      
      if (data.success) {
        return {
          success: true,
          data: data.data,
          message: data.message
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to get account status',
          message: data.message
        };
      }
    } catch (error) {
      console.error('❌ Get account status error:', error);
      return handleApiError(error as AxiosError, 'Failed to get Stripe account status');
    }
  },

  // Get account requirements
  getAccountRequirements: async (): Promise<ApiResponse<StripeAccountRequirements>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/account-requirements`,
        getHeaders()
      );
      
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to get account requirements');
    }
  },

  // Update verification details
  updateStripeVerification: async (data: any): Promise<ApiResponse<any>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/update-verification`,
        data,
        getHeaders()
      );
      
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update verification');
    }
  },

  // Disconnect Stripe account
  disconnectStripeAccount: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/disconnect`,
        {},
        getHeaders()
      );
      
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to disconnect Stripe account');
    }
  },

  // Create account link for existing account
  createAccountLink: async (accountId: string): Promise<ApiResponse<{ url: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-account-link`,
        { accountId },
        getHeaders()
      );
      
      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message,
        error: response.data.error
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create account link');
    }
  }
};

// ============================================
// ✅ LISTINGS API
// ============================================

export const listingsApi = {
  // Get all listings
  getAllListings: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    type?: string;
  }): Promise<ApiResponse<{ listings: Listing[]; pagination?: any; currency?: string; filters?: any }>> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`, {
        params
      });
      
      const data = response.data;
      
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to fetch listings',
          status: data.status
        };
      }
      
      return {
        success: true,
        data: {
          listings: data.data?.listings || data.listings || [],
          pagination: data.pagination,
          currency: data.currency,
          filters: data.filters
        },
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch listings');
    }
  },

  // Get seller's own listings
  getMyListings: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<{ 
    listings: Listing[]; 
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    }
  }>> => {
    try {
      console.log('📡 API: Calling GET /marketplace/listings/my-listings');
      console.log('📋 Params:', params);
      
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/my-listings`, {
        params,
        ...getHeaders()
      });
      
      console.log('✅ API Response Structure:', {
        hasData: !!response.data.data,
        hasListingsDirect: !!response.data.listings,
        fullResponse: response.data
      });
      
      if (response.data.success) {
        let listings: Listing[] = [];
        let pagination = {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: 0,
          pages: 0
        };
        
        if (response.data.data && response.data.data.listings) {
          listings = response.data.data.listings || [];
          pagination = response.data.data.pagination || pagination;
        } else if (response.data.listings) {
          listings = response.data.listings || [];
          pagination = response.data.pagination || pagination;
        }
        
        console.log(`✅ Retrieved ${listings.length} listings`);
        
        return {
          success: true,
          data: {
            listings,
            pagination
          },
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to fetch listings',
          message: response.data.message
        };
      }
      
    } catch (error) {
      console.error('❌ API Error in getMyListings:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch your listings');
    }
  },

  // Create new listing
  createListing: async (listingData: {
    title: string;
    description: string;
    price: number;
    category: string;
    type: string;
    tags?: string[];
    mediaUrls?: string[];
    maxRevisions?: number;
    deliveryTime?: string;
    availability?: string;
  }): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listings/create-listing`,
        listingData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create listing');
    }
  },

  // Edit listing
  editListing: async (listingId: string, updateData: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    tags?: string[];
    mediaUrls?: string[];
    status?: string;
    type?: string;
    maxRevisions?: number;
    deliveryTime?: string;
  }): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        updateData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update listing');
    }
  },

  // Toggle listing status
  toggleListingStatus: async (listingId: string): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/toggle-status`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to toggle listing status');
    }
  },

  // Delete listing
  deleteListing: async (listingId: string): Promise<ApiResponse> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete listing');
    }
  },

  // Get single listing details
  getListingDetails: async (listingId: string): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/${listingId}`
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch listing details');
    }
  },

  // Get listings by user ID
  getUserListings: async (userId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<{ listings: Listing[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/user/${userId}/listings`,
        { params }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch user listings');
    }
  },

  // Increment listing views
  incrementViews: async (listingId: string): Promise<ApiResponse> => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/views`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update views');
    }
  },

  // Search listings
  searchListings: async (query: string, params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<{ listings: Listing[] }>> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/search`, {
        params: { q: query, ...params }
      });
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to search listings');
    }
  }
};

// ============================================
// ✅ ORDERS API (COMPREHENSIVELY UPDATED)
// ============================================

export const ordersApi = {
  // ========== ORDER CREATION ========== //
  
  // Create order (seller accepting offer)
  createOrder: async (orderData: {
    offerId: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    shippingAddress?: any;
    paymentMethod?: string;
    notes?: string;
    expectedDeliveryDays?: number;
  }): Promise<ApiResponse<{ 
    order: Order;
    nextSteps: {
      paymentRequired: boolean;
      message: string;
    };
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/create`,
        orderData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create order');
    }
  },

  // Create direct payment order
  createDirectPayment: async (listingId: string, requirements?: string): Promise<ApiResponse<{
    order: Order;
    clientSecret: string;
    paymentIntentId: string;
    chatId: string;
    redirectUrl: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/create-direct-payment`,
        { listingId, requirements },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create direct payment');
    }
  },

  // ========== BUYER ORDER QUERIES ========== //
  
  // Get buyer's orders
  getMyOrders: async (): Promise<ApiResponse<{ 
    orders: Order[]; 
    stats: OrderStats; 
    count: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-orders`,
        getHeaders()
      );
      
      const data = response.data;
      
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to fetch orders',
          message: data.message
        };
      }
      
      return {
        success: true,
        data: {
          orders: data.orders || [],
          stats: data.stats || {},
          count: data.count || 0
        },
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch your orders');
    }
  },

  // Get buyer dashboard statistics
  getBuyerStats: async (): Promise<ApiResponse<{
    stats: any[];
    totals: {
      totalOrders: number;
      totalSpent: number;
      activeOrders: number;
      completedOrders: number;
      pendingOrders: number;
      cancelledOrders: number;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stats/buyer`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch buyer statistics');
    }
  },

  // ========== SELLER ORDER QUERIES ========== //
  
  // Get seller's sales
  getMySales: async (): Promise<ApiResponse<{ 
    sales: Order[]; 
    stats: OrderStats; 
    count: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        getHeaders()
      );
      
      const data = response.data;
      
      if (data.success === false) {
        return {
          success: false,
          error: data.error || 'Failed to fetch sales',
          message: data.message
        };
      }
      
      return {
        success: true,
        data: {
          sales: data.sales || [],
          stats: data.stats || {},
          count: data.count || 0
        },
        message: data.message
      };
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch your sales');
    }
  },

  // Get seller statistics
  getSellerStats: async (): Promise<ApiResponse<SellerStats>> => {
    try {
      console.log('🔍 Calling seller stats API...');
      
      const headers = getHeaders();
      console.log('📋 Request headers:', {
        hasAuth: !!headers.headers.Authorization,
        baseURL: API_BASE_URL,
        endpoint: '/marketplace/orders/stats/seller'
      });
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stats/seller`,
        headers
      );
      
      console.log('📊 Seller stats API response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        success: response.data?.success,
        dataKeys: response.data ? Object.keys(response.data) : 'No data'
      });
      
      const responseData = response.data;
      
      if (responseData.success === true) {
        console.log('✅ API returned direct success');
        
        const statsData = responseData.data || responseData;
        
        return {
          success: true,
          data: statsData,
          message: responseData.message || 'Seller statistics fetched successfully',
          status: response.status
        };
      }
      
      if (responseData.success === false) {
        console.warn('⚠️ API returned success: false', responseData);
        
        return {
          success: false,
          error: responseData.error || responseData.message || 'Failed to fetch seller statistics',
          message: responseData.message,
          status: response.status,
          data: responseData.data || responseData
        };
      }
      
      console.log('ℹ️ Response has non-standard format, normalizing...');
      
      let statsData: SellerStats | null = null;
      
      if (responseData.statsByStatus || responseData.totals) {
        statsData = responseData;
      } else if (responseData.data?.statsByStatus || responseData.data?.totals) {
        statsData = responseData.data;
      }
      
      if (statsData) {
        return {
          success: true,
          data: statsData,
          message: 'Seller statistics fetched successfully',
          status: response.status
        };
      }
      
      console.error('❓ Unknown response format:', responseData);
      
      return {
        success: false,
        error: 'Unknown response format from server',
        message: 'Could not parse seller statistics',
        status: response.status,
        data: responseData
      };
      
    } catch (error) {
      console.error('❌ Error in getSellerStats API:', error);
      
      const axiosError = error as AxiosError;
      const errorResponse = axiosError.response?.data as any;
      
      const errorMessage = 
        errorResponse?.error || 
        errorResponse?.message || 
        errorResponse?.details ||
        axiosError.message || 
        'Failed to fetch seller statistics';
      
      console.error('📋 Error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        errorMessage: errorMessage,
        responseData: errorResponse
      });
      
      return {
        success: false,
        error: errorMessage,
        message: errorResponse?.message,
        status: axiosError.response?.status,
        data: errorResponse
      };
    }
  },

  // ✅ NEW: Get completed orders for earnings tab
  getCompletedOrders: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{
    completedOrders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    summary: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
  }>> => {
    try {
      console.log('💰 Calling completed orders API...');
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/stats/completed-orders`,
        {
          params,
          ...getHeaders()
        }
      );
      
      console.log('✅ Completed orders response:', {
        success: response.data.success,
        count: response.data.data?.completedOrders?.length,
        totalRevenue: response.data.data?.summary?.totalRevenue
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to fetch completed orders',
          message: response.data.message
        };
      }
    } catch (error) {
      console.error('❌ Error fetching completed orders:', error);
      return handleApiError(error as AxiosError, 'Failed to fetch completed orders');
    }
  },

  // ========== STRIPE ACCOUNT MANAGEMENT ========== //
  
  // Get seller's Stripe account status (now uses stripeApi)
  getSellerAccountStatus: async (): Promise<ApiResponse<SellerAccountStatus>> => {
    return stripeApi.getStripeAccountStatus();
  },

  // Start Stripe onboarding (now uses stripeApi)
  startStripeOnboarding: async (): Promise<ApiResponse<StripeOnboardingResponse>> => {
    return stripeApi.startStripeOnboarding();
  },

  // Continue Stripe onboarding (NEW)
  continueStripeOnboarding: async (): Promise<ApiResponse<StripeContinueOnboardingResponse>> => {
    return stripeApi.continueStripeOnboarding();
  },

  // Disconnect Stripe account (NEW)
  disconnectStripeAccount: async (): Promise<ApiResponse<{ message: string }>> => {
    return stripeApi.disconnectStripeAccount();
  },

  // ========== SINGLE ORDER OPERATIONS ========== //
  
  // Get order details
  getOrderDetails: async (orderId: string): Promise<ApiResponse<{
    order: Order;
    deliveries: Delivery[];
    deliveryFiles: any[];
    timeline: OrderTimelineItem[];
    userRole: 'buyer' | 'seller' | 'admin';
    permissions: {
      canCompletePayment: boolean;
      canRequestRevision: boolean;
      canCompleteOrder: boolean;
      canCancel: boolean;
      canDownloadFiles: boolean;
      canContactSeller: boolean;
      canLeaveReview: boolean;
      canViewDeliveryHistory: boolean;
      canStartProcessing: boolean;
      canStartWork: boolean;
      canDeliver: boolean;
      canCompleteRevision: boolean;
    };
    orderSummary: {
      totalAmount: number;
      platformFee: number;
      netAmount: number;
      revisionsUsed: number;
      revisionsLeft: number;
      expectedDelivery?: string;
      daysRemaining?: number;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch order details');
    }
  },

  // Get order timeline
  getOrderTimeline: async (orderId: string): Promise<ApiResponse<{
    timeline: OrderTimelineItem[];
    currentStatus: string;
    nextSteps: string[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/timeline`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch order timeline');
    }
  },

  // Get order summary
  getOrderSummary: async (orderId: string): Promise<ApiResponse<{
    summary: OrderSummary;
    nextActions: BuyerNextAction[];
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/summary`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch order summary');
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: string): Promise<ApiResponse<{
    order: Order;
    previousStatus: string;
    newStatus: string;
    updatedAt: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update order status');
    }
  },

  // ========== BUYER ORDER ACTIONS ========== //
  
  // Complete order (buyer)
  completeOrder: async (orderId: string): Promise<ApiResponse<{
    order: Order;
    payment: {
      released: boolean;
      success: boolean;
      error?: string;
      sellerAmountInCents: number;
      platformFeeInCents: number;
      totalAmountInCents: number;
      sellerAmountDollars: string;
      platformFeeDollars: string;
      totalAmountDollars: string;
    };
    nextSteps: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to complete order');
    }
  },

  // Request revision (buyer)
  requestRevision: async (orderId: string, revisionNotes: string): Promise<ApiResponse<{
    order: Order;
    revisionsUsed: number;
    revisionsLeft: number;
    nextSteps: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/request-revision`,
        { revisionNotes },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to request revision');
    }
  },

  // Cancel order (buyer)
  cancelOrderByBuyer: async (orderId: string, cancelReason?: string): Promise<ApiResponse<{
    order: Order;
    refundProcessed: boolean;
    nextSteps: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/cancel-by-buyer`,
        { cancelReason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel order');
    }
  },

  // ========== SELLER ORDER ACTIONS ========== //
  
  // Start processing order (seller)
  startProcessing: async (orderId: string): Promise<ApiResponse<{
    order: Order;
    nextAction: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/start-processing`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to start processing');
    }
  },

  // Start work on order (seller)
  startWork: async (orderId: string): Promise<ApiResponse<{
    order: Order;
    nextAction: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/start-work`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to start work');
    }
  },

  // Deliver order (seller)
  deliverOrder: async (orderId: string, deliveryData: {
    deliveryMessage: string;
    deliveryFiles?: string[];
    attachments?: any[];
    isFinalDelivery?: boolean;
  }): Promise<ApiResponse<{
    order: Order;
    delivery: Delivery;
    emailSent: boolean;
    nextAction: string;
    reviewPeriod: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliver-with-email`,
        deliveryData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to deliver order');
    }
  },

  // Complete revision (seller)
  completeRevision: async (orderId: string, deliveryData: {
    deliveryMessage: string;
    deliveryFiles?: string[];
    attachments?: any[];
    isFinalDelivery?: boolean;
  }): Promise<ApiResponse<{
    order: Order;
    delivery: Delivery;
    revisionsUsed: number;
    revisionsLeft: number;
    emailSent: boolean;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/complete-revision`,
        deliveryData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to complete revision');
    }
  },

  // Cancel order (seller)
  cancelOrderBySeller: async (orderId: string, cancelReason?: string): Promise<ApiResponse<{
    order: Order;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/cancel-by-seller`,
        { cancelReason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel order');
    }
  },

  // ========== DELIVERY MANAGEMENT ========== //
  
  // Get deliveries for order
  getDeliveries: async (orderId: string): Promise<ApiResponse<{
    deliveries: Delivery[];
    count: number;
    orderStatus: string;
    revisionsUsed: number;
    revisionsLeft: number;
    canRequestRevision: boolean;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/deliveries`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch deliveries');
    }
  },

  // Get delivery details
  getDeliveryDetails: async (deliveryId: string): Promise<ApiResponse<{
    delivery: Delivery;
    userRole: 'buyer' | 'seller';
    permissions: {
      canDownloadFiles: boolean;
      canRequestRevision: boolean;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/deliveries/${deliveryId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch delivery details');
    }
  },

  // Get download files for order
  getDownloadFiles: async (orderId: string): Promise<ApiResponse<{
    files: any[];
    count: number;
    orderStatus: string;
    totalRevisions: number;
    canRequestRevision: boolean;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}/download-files`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch download files');
    }
  },

  // ========== FILE UPLOAD ========== //
  
  // Upload delivery files
  uploadDeliveryFiles: async (files: File[]): Promise<ApiResponse<{
    files: UploadedFile[];
    count: number;
  }>> => {
    try {
      const formData = new FormData();
      files.forEach(file => {
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
      return handleApiError(error as AxiosError, 'Failed to upload files');
    }
  },

  // ========== ADMIN OPERATIONS ========== //
  
  // Delete all orders (admin only)
  deleteAllOrders: async (): Promise<ApiResponse<{
    deletedCount: number;
    timestamp: string;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/orders/delete-all-orders`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete orders');
    }
  }
};

// ============================================
// ✅ OFFERS API (UPDATED)
// ============================================

export const offersApi = {
  // ========== OFFER MANAGEMENT ========== //
  
  // Check for pending offer on a listing
  checkPendingOffer: async (listingId: string): Promise<ApiResponse<{
    hasPendingOffer: boolean;
    data?: {
      _id: string;
      status: string;
      amount: number;
      createdAt: string;
      paymentIntentId?: string;
      isTemporary?: boolean;
      expiresAt?: string;
    };
    message: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/check-pending-offer/${listingId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to check pending offer');
    }
  },

  // Make an offer with immediate payment
  makeOffer: async (offerData: {
    listingId: string;
    amount: number;
    message?: string;
    requirements?: string;
    expectedDelivery?: string;
  }): Promise<ApiResponse<{ 
    offer: Offer; 
    clientSecret: string; 
    paymentIntentId: string;
    amount: number;
    nextSteps: string;
    stripeStatus?: string;
    isExistingOffer?: boolean;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/make-offer`,
        offerData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to make offer');
    }
  },

  // Cancel temporary offer (when user goes back without paying)
  cancelTemporaryOffer: async (offerId: string): Promise<ApiResponse<{
    offerId: string;
    cancelledAt: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/cancel-temporary-offer/${offerId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel temporary offer');
    }
  },

  // Get offer payment status
  getPaymentStatus: async (offerId: string): Promise<ApiResponse<{
    offerId: string;
    status: string;
    stripeStatus: string | null;
    isTemporary: boolean;
    expiresAt: string | null;
    isExpired: boolean;
    paymentIntentId: string | null;
    canContinuePayment: boolean;
    requiresCapture: boolean;
    amount: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/payment-status/${offerId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to get payment status');
    }
  },

  // Confirm offer payment
  confirmOfferPayment: async (paymentData: {
    offerId: string;
    paymentIntentId: string;
  }): Promise<ApiResponse<{ 
    orderId: string;
    redirectUrl: string;
    chatUrl?: string;
    notifications: any;
    paymentStatus: string;
    requiresCapture: boolean;
    orderDetails: {
      amount: number;
      sellerName: string;
      buyerName: string;
      listingTitle: string;
      orderDate: string;
      requirements?: string;
    };
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/confirm-offer-payment`,
        paymentData,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to confirm payment');
    }
  },

  // Capture payment manually (for requires_capture status)
  capturePayment: async (orderId: string): Promise<ApiResponse<{
    orderId: string;
    paymentStatus: string;
    capturedAt: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/capture-payment/${orderId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to capture payment');
    }
  },

  // Get offers received (as seller)
  getReceivedOffers: async (): Promise<ApiResponse<{ 
    offers: Offer[]; 
    count: number;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch received offers');
    }
  },

  // Get offers made (as buyer)
  getMyOffers: async (): Promise<ApiResponse<{ 
    offers: Offer[]; 
    count: number;
    timestamp: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/my-offers`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch my offers');
    }
  },

  // Get single offer details
  getOfferDetails: async (offerId: string): Promise<ApiResponse<{ 
    offer: Offer;
    associatedOrder?: any;
    chatRoom?: any;
    chatLink?: string;
    userRole: 'buyer' | 'seller';
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/${offerId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offer details');
    }
  },

  // Accept offer (seller)
  acceptOffer: async (offerId: string): Promise<ApiResponse<{ 
    offer: Offer;
    order?: any;
    redirectUrl: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/accept-offer/${offerId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to accept offer');
    }
  },

  // Reject offer (seller)
  rejectOffer: async (offerId: string, rejectionReason?: string): Promise<ApiResponse<{ 
    offer: Offer;
    buyerNotified: boolean;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/reject-offer/${offerId}`,
        { rejectionReason },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to reject offer');
    }
  },

  // Cancel offer (buyer)
  cancelOffer: async (offerId: string): Promise<ApiResponse<{ 
    offer: Offer;
    sellerNotified: boolean;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/cancel-offer/${offerId}`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel offer');
    }
  },

  // Get chat link for order
  getChatLink: async (orderId: string): Promise<ApiResponse<{
    chatLink: string;
    firebaseChatId: string;
    orderId: string;
    directLink: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/chat-link/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to get chat link');
    }
  },

  // Get offer statistics
  getOfferStats: async (): Promise<ApiResponse<{
    asBuyer: Record<string, number>;
    asSeller: Record<string, number>;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/stats/overview`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offer statistics');
    }
  },

  // Get messages for order
  getOrderMessages: async (orderId: string): Promise<ApiResponse<{
    messages: any[];
    count: number;
    orderId: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/messages/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch order messages');
    }
  },

  // Test Stripe connection
  testStripeConnection: async (): Promise<ApiResponse<{
    testIntentId: string;
    clientSecret: string;
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/test-stripe`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Stripe test failed');
    }
  },

  // Health check
  healthCheck: async (): Promise<ApiResponse<{
    timestamp: string;
    services: {
      database: string;
      stripe: string;
      firebase: string;
      emailService: string;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/health`
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Health check failed');
    }
  },

  // Cleanup expired offers
  cleanupExpiredOffers: async (): Promise<ApiResponse<{
    cleanedCount: number;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/cleanup-expired-offers`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cleanup expired offers');
    }
  },

  // Delete all offers (testing only)
  deleteAllOffers: async (): Promise<ApiResponse<{
    deletedCount: number;
    cancelledPaymentIntents: number;
  }>> => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/offers/delete-all-offers`
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to delete offers');
    }
  },

  // Get direct purchase route
  createDirectPurchase: async (listingId: string, requirements?: string): Promise<ApiResponse<{
    order: Order;
    clientSecret: string;
    paymentIntentId: string;
    chatId: string;
    redirectUrl: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/create-direct-payment`,
        { listingId, requirements },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create direct purchase');
    }
  }
};

// ============================================
// ✅ PAYMENTS API
// ============================================

export const paymentsApi = {
  // Create payment intent for offer/order
  createPaymentIntent: async (data: {
    offerId?: string;
    orderId?: string;
    amount: number;
    currency?: string;
  }): Promise<ApiResponse<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/create-payment-intent`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create payment intent');
    }
  },

  // Confirm payment
  confirmPayment: async (data: {
    orderId: string;
    paymentIntentId: string;
  }): Promise<ApiResponse<{
    order: Order;
    success: boolean;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/confirm-payment`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to confirm payment');
    }
  },

  // Capture payment (release funds to seller)
  capturePayment: async (data: {
    orderId: string;
  }): Promise<ApiResponse<{
    order: Order;
    sellerAmount: number;
    platformFee: number;
    platformFeePercent: number;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/capture-payment`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to capture payment');
    }
  },

  // Cancel payment
  cancelPayment: async (data: {
    orderId: string;
  }): Promise<ApiResponse<{
    order: Order;
    success: boolean;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/cancel-payment`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to cancel payment');
    }
  },

  // Get payment status
  getPaymentStatus: async (orderId: string): Promise<ApiResponse<{
    orderStatus: string;
    paymentIntent: {
      status: string;
      amount: number;
      currency: string;
      created: number;
    } | null;
    paymentReleased: boolean;
    releaseDate: string | null;
    fees: {
      platformFee: number;
      sellerAmount: number;
      platformFeePercent: number;
    };
  }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payments/payment-status/${orderId}`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch payment status');
    }
  },

  // Request refund
  requestRefund: async (data: {
    orderId: string;
    reason?: string;
  }): Promise<ApiResponse<{
    refundId: string;
    order: Order;
    success: boolean;
    message: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/payments/request-refund`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to process refund');
    }
  },

  // Create offer payment intent (specific for offers)
  createOfferPaymentIntent: async (offerId: string): Promise<ApiResponse<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    orderId: string;
  }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/payments/create-payment-intent`,
        { offerId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create offer payment');
    }
  },

  // Update offer payment status
  updateOfferPayment: async (data: {
    offerId: string;
    paymentIntentId: string;
    status: string;
  }): Promise<ApiResponse<{
    offer: Offer;
    success: boolean;
    message: string;
  }>> => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/offers/${data.offerId}/payment`,
        data,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to update payment status');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency
export const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  const valueInDollars = (amount || 0) / 100;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(valueInDollars);
};

export const formatCurrencyshow = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
};

// Calculate platform fee (10%)
export const calculatePlatformFee = (amount: number): number => {
  return parseFloat((amount * 0.10).toFixed(2));
};

// Calculate seller payout
export const calculateSellerPayout = (amount: number): number => {
  return parseFloat((amount - calculatePlatformFee(amount)).toFixed(2));
};

// Check if user is authenticated
export const checkAuth = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

// Get current user from token
export const getCurrentUser = (): any => {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get API base URL
export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};

// Format bytes for file sizes
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Format date
export const formatDate = (dateString: string, includeTime: boolean = false): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

// Get days remaining until date
export const getDaysRemaining = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Validate offer amount
export const validateOfferAmount = (amount: number, listingPrice: number): {
  isValid: boolean;
  message: string;
  minAmount: number;
  maxAmount: number;
} => {
  const minAmount = 0.50;
  const maxAmount = listingPrice * 2;
  
  if (amount < minAmount) {
    return {
      isValid: false,
      message: `Offer must be at least $${minAmount}`,
      minAmount,
      maxAmount
    };
  }
  
  if (amount > maxAmount) {
    return {
      isValid: false,
      message: `Offer cannot exceed $${maxAmount.toFixed(2)}`,
      minAmount,
      maxAmount
    };
  }
  
  return {
    isValid: true,
    message: 'Valid offer amount',
    minAmount,
    maxAmount
  };
};

// ============================================
// ✅ EXPORT ALL APIs
// ============================================

const marketplaceApi = {
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  payments: paymentsApi,
  stripe: stripeApi, // ✅ NEW: Added stripe API
  utils: {
    formatCurrency,
    calculatePlatformFee,
    formatCurrencyshow,
    calculateSellerPayout,
    checkAuth,
    getCurrentUser,
    getApiBaseUrl,
    formatBytes,
    formatDate,
    getDaysRemaining,
    validateOfferAmount
  }
};
// Add this to your marketplaceApi.ts file, in the utils section
export const getOrderStatusInfo = (status: string) => {
  const statusConfig: Record<string, { icon: string; text: string; color: string; bgColor: string }> = {
    pending: { icon: '⏳', text: 'Pending', color: '#f39c12', bgColor: '#fef9e7' },
    pending_payment: { icon: '💳', text: 'Pending Payment', color: '#3498db', bgColor: '#ebf5fb' },
    paid: { icon: '✅', text: 'Paid', color: '#27ae60', bgColor: '#eafaf1' },
    processing: { icon: '🔄', text: 'Processing', color: '#3498db', bgColor: '#ebf5fb' },
    in_progress: { icon: '⚡', text: 'In Progress', color: '#f39c12', bgColor: '#fef9e7' },
    delivered: { icon: '📦', text: 'Delivered', color: '#8e44ad', bgColor: '#f4ecf7' },
    in_revision: { icon: '✏️', text: 'In Revision', color: '#e74c3c', bgColor: '#fdedec' },
    completed: { icon: '🎉', text: 'Completed', color: '#27ae60', bgColor: '#eafaf1' },
    cancelled: { icon: '❌', text: 'Cancelled', color: '#e74c3c', bgColor: '#fdedec' },
    refunded: { icon: '💰', text: 'Refunded', color: '#7f8c8d', bgColor: '#f2f3f4' },
    disputed: { icon: '⚖️', text: 'Disputed', color: '#e74c3c', bgColor: '#fdedec' }
  };

  return statusConfig[status] || { icon: '❓', text: 'Unknown', color: '#95a5a6', bgColor: '#ecf0f1' };
};
export default marketplaceApi;