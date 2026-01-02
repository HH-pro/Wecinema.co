// src/api/marketplaceApi.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

// ============================================
// ✅ TYPE DEFINITIONS
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
  status: 'active' | 'sold' | 'pending' | 'draft';
  mediaUrls: string[];
  category: string;
  tags: string[];
  views: number;
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
    phoneNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  thumbnail?: string;
  createdAtFormatted?: string;
  statusColor?: string;
  type?: string;
}

export interface Order {
  _id: string;
  listingId: Listing;
  buyerId: {
    _id: string;
    username: string;
    email: string;
  };
  sellerId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  _id: string;
  listingId: Listing;
  buyerId: {
    _id: string;
    username: string;
    email: string;
  };
  sellerId: string;
  offeredPrice: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripeAccount {
  accountId?: string;
  isEnabled: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  accountLink?: string;
}

// ============================================
// ✅ API CONFIGURATION
// ============================================

// ✅ FIXED: Use hardcoded URL or window.location for client-side
const API_BASE_URL = 'http://localhost:3000'; // For development
// For production, you might want to use:
// const API_BASE_URL = window.location.origin; // Same origin
// OR
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // For Vite

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
// ✅ LISTINGS API
// ============================================

export const listingsApi = {
  // Get all active listings (public)
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
  }): Promise<ApiResponse<{ listings: Listing[] }>> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings`, {
        params
      });
      return normalizeResponse(response);
    } catch (error) {
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
  }): Promise<ApiResponse<{ listings: Listing[] }>> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/marketplace/listings/my-listings`, {
        params,
        ...getHeaders()
      });
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch your listings');
    }
  },

  // Create new listing
  createListing: async (listingData: {
    title: string;
    description: string;
    price: number;
    category: string;
    tags?: string[];
    mediaUrls?: string[];
    status?: 'active' | 'draft';
    type?: string;
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
  }): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      console.log('📝 Edit API call:', { listingId, updateData });
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        updateData,
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Edit API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to update listing');
      console.error('❌ Edit API error:', errorResponse);
      return errorResponse;
    }
  },

  // Toggle listing status
  toggleListingStatus: async (listingId: string): Promise<ApiResponse<{ listing: Listing }>> => {
    try {
      console.log('🔄 Toggle API call:', listingId);
      
      const response = await axios.patch(
        `${API_BASE_URL}/marketplace/listings/${listingId}/toggle-status`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Toggle API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to toggle listing status');
      console.error('❌ Toggle API error:', errorResponse);
      return errorResponse;
    }
  },

  // Delete listing
  deleteListing: async (listingId: string): Promise<ApiResponse> => {
    try {
      console.log('🗑️ Delete API call:', listingId);
      
      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Delete API response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to delete listing');
      console.error('❌ Delete API error:', errorResponse);
      return errorResponse;
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
        `${API_BASE_URL}/marketplace/user/${userId}/listings`,
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
// ✅ ORDERS API
// ============================================

export const ordersApi = {
  // Get seller's orders/sales
  getMySales: async (): Promise<Order[]> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        getHeaders()
      );
      
      const data = response.data;
      let orders: Order[] = [];
      
      if (Array.isArray(data)) {
        orders = data;
      } else if (data?.sales && Array.isArray(data.sales)) {
        orders = data.sales;
      } else if (data?.orders && Array.isArray(data.orders)) {
        orders = data.orders;
      } else if (data?.data && Array.isArray(data.data)) {
        orders = data.data;
      } else if (data?.success && Array.isArray(data.data)) {
        orders = data.data;
      }
      
      return orders;
      
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      return [];
    }
  },

  // Create order for direct purchase
  createOrder: async (listingId: string, orderData?: {
    amount?: number;
    paymentMethod?: string;
    shippingAddress?: any;
  }): Promise<ApiResponse<{ order: Order; clientSecret?: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/create`,
        { listingId, ...orderData },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create order');
    }
  },

  // Update order status
  updateOrderStatus: async (
    orderId: string, 
    status: Order['status'],
    additionalData: any = {}
  ): Promise<ApiResponse<{ order: Order }>> => {
    try {
      console.log('📦 Update order status:', { orderId, status });
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status, ...additionalData },
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Order status update response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to update order status');
      console.error('❌ Order status update error:', errorResponse);
      return errorResponse;
    }
  },

  // Get order details
  getOrderDetails: async (orderId: string): Promise<ApiResponse<{ order: Order }>> => {
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

  // Get my orders (as buyer)
  getMyOrders: async (): Promise<ApiResponse<{ orders: Order[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-orders`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch your orders');
    }
  },

  // Confirm payment for order
  confirmPayment: async (orderId: string, paymentIntentId: string): Promise<ApiResponse<{ order: Order }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/orders/${orderId}/confirm-payment`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to confirm payment');
    }
  }
};

// ============================================
// ✅ OFFERS API
// ============================================

export const offersApi = {
  // Get received offers
  getReceivedOffers: async (): Promise<ApiResponse<{ offers: Offer[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch offers');
    }
  },

  // Get sent offers
  getSentOffers: async (): Promise<ApiResponse<{ offers: Offer[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/sent-offers`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch sent offers');
    }
  },

  // Create offer
  createOffer: async (listingId: string, offerData: {
    offeredPrice: number;
    message?: string;
    requirements?: string;
    expectedDelivery?: string;
  }): Promise<ApiResponse<{ offer: Offer; clientSecret?: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/make-offer`,
        { listingId, ...offerData },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create offer');
    }
  },

  // Accept offer
  acceptOffer: async (offerId: string): Promise<ApiResponse<{ offer: Offer; order?: Order }>> => {
    try {
      console.log('✅ Accept offer API call:', offerId);
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/accept`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Accept offer response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to accept offer');
      console.error('❌ Accept offer error:', errorResponse);
      return errorResponse;
    }
  },

  // Reject offer
  rejectOffer: async (offerId: string): Promise<ApiResponse<{ offer: Offer }>> => {
    try {
      console.log('❌ Reject offer API call:', offerId);
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/reject`,
        {},
        getHeaders()
      );
      
      const normalized = normalizeResponse(response);
      console.log('✅ Reject offer response:', normalized);
      return normalized;
      
    } catch (error) {
      const errorResponse = handleApiError(error as AxiosError, 'Failed to reject offer');
      console.error('❌ Reject offer error:', errorResponse);
      return errorResponse;
    }
  },

  // Confirm offer payment
  confirmOfferPayment: async (offerId: string, paymentIntentId: string): Promise<ApiResponse<{ offer: Offer }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/offers/${offerId}/confirm-payment`,
        { paymentIntentId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to confirm offer payment');
    }
  }
};

// ============================================
// ✅ STRIPE API
// ============================================

export const stripeApi = {
  // Get Stripe account status
  getStripeStatus: async (): Promise<ApiResponse<StripeAccount>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch Stripe status');
    }
  },

  // Create Stripe account link
  createStripeAccountLink: async (): Promise<ApiResponse<{ url: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-account-link`,
        {},
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create Stripe link');
    }
  },

  // Get Stripe dashboard link
  getStripeDashboardLink: async (): Promise<ApiResponse<{ url: string }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/dashboard-link`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to get Stripe dashboard link');
    }
  },

  // Create payment intent
  createPaymentIntent: async (amount: number, metadata?: any): Promise<ApiResponse<{ clientSecret: string }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/stripe/create-payment-intent`,
        { amount, metadata },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create payment intent');
    }
  }
};

// ============================================
// ✅ CHAT API
// ============================================

export const chatApi = {
  // Get conversations
  getConversations: async (): Promise<ApiResponse<{ conversations: any[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/chat/conversations`,
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch conversations');
    }
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ messages: any[] }>> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/chat/conversations/${conversationId}/messages`,
        {
          params,
          ...getHeaders()
        }
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to fetch messages');
    }
  },

  // Send message
  sendMessage: async (conversationId: string, message: string): Promise<ApiResponse<{ message: any }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/chat/conversations/${conversationId}/messages`,
        { message },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to send message');
    }
  },

  // Create or get conversation
  getOrCreateConversation: async (userId: string): Promise<ApiResponse<{ conversation: any }>> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/marketplace/chat/conversations`,
        { userId },
        getHeaders()
      );
      return normalizeResponse(response);
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to create conversation');
    }
  }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount || 0);
};

// Format INR currency
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Test API connectivity
export const testApiConnection = async (): Promise<ApiResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/marketplace/health`);
    return {
      success: true,
      message: 'API connection successful',
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: 'API connection failed',
      error: (error as Error).message
    };
  }
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
    
    // Decode JWT token
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

// Helper to handle file upload
export const uploadFile = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `${API_BASE_URL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getHeaders().headers
        }
      }
    );
    
    return response.data.url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error('Failed to upload file');
  }
};

// Get API base URL (useful for other parts of the app)
export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};

// ============================================
// ✅ EXPORT ALL APIs
// ============================================

const marketplaceApi = {
  listings: listingsApi,
  orders: ordersApi,
  offers: offersApi,
  stripe: stripeApi,
  chat: chatApi,
  utils: {
    formatCurrency,
    formatINR,
    testApiConnection,
    checkAuth,
    getCurrentUser,
    uploadFile,
    getApiBaseUrl
  }
};

export default marketplaceApi;

// ============================================
// ✅ ENVIRONMENT CONFIGURATION FOR REACT APP
// ============================================

/*
To use environment variables in your React app:

1. Create `.env` file in your React app root:
   REACT_APP_API_URL=http://localhost:3000
   REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...

2. Update the API_BASE_URL:
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

3. For Create React App, environment variables are automatically loaded.

4. For Vite, use import.meta.env:
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
*/