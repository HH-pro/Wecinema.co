// src/api/marketplaceApi.ts
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
  status: 'active' | 'sold' | 'pending' | 'draft' | 'inactive';
  mediaUrls: string[];
  thumbnail?: string;
  category: string;
  tags: string[];
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
  };
  sellerEmail?: string;
  type: string;
  currency: string;
  isDigital: boolean;
  createdAt: string;
  updatedAt: string;
  createdAtFormatted?: string;
  statusColor?: string;
  seller?: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email?: string;
  };
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

// ============================================
// ✅ API CONFIGURATION (FIXED)
// ============================================

// ✅ FIXED: No process.env issues
const API_BASE_URL = 'http://localhost:3000';

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
// ✅ LISTINGS API (UPDATED)
// ============================================

export const listingsApi = {
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
    console.log('📡 Fetching listings with params:', params);
    
    const response = await axios.get(`${API_BASE_URL}/marketplace/listings`, {
      params
    });
    
    const data = response.data;
    
    // ✅ Enhanced debugging
    console.log('🎯 API Response Full Analysis:', {
      status: response.status,
      dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
      isArray: Array.isArray(data),
      hasSuccess: !!(data?.success),
      hasListings: !!(data?.listings),
      hasDataProperty: !!(data?.data),
      listingsIsArray: Array.isArray(data?.listings),
      dataListingsIsArray: Array.isArray(data?.data?.listings),
      responseStructure: data
    });
    
    // ✅ Handle ALL possible response structures
    let listings: Listing[] = [];
    let pagination = undefined;
    let message = '';
    let currency = 'USD';
    let filters = undefined;
    
    if (data && typeof data === 'object') {
      // Check if API returned error
      if (data.success === false) {
        console.error('❌ API returned error:', data.error);
        return {
          success: false,
          error: data.error || 'API request failed',
          status: data.status,
          message: data.message
        };
      }
      
      // ✅ CASE 1: Direct listings array (most common)
      if (data.listings && Array.isArray(data.listings)) {
        listings = data.listings;
        console.log(`✅ Found ${listings.length} listings in data.listings`);
      }
      // ✅ CASE 2: Nested listings in data property
      else if (data.data && data.data.listings && Array.isArray(data.data.listings)) {
        listings = data.data.listings;
        console.log(`✅ Found ${listings.length} listings in data.data.listings`);
      }
      // ✅ CASE 3: Direct data array
      else if (data.data && Array.isArray(data.data)) {
        listings = data.data;
        console.log(`✅ Found ${listings.length} listings in data.data array`);
      }
      // ✅ CASE 4: Response itself is the array
      else if (Array.isArray(data)) {
        listings = data;
        console.log(`✅ Response is direct array with ${listings.length} listings`);
      }
      // ✅ CASE 5: Try to find any array in the response
      else {
        const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));
        if (arrayKeys.length > 0) {
          listings = data[arrayKeys[0]];
          console.log(`✅ Found ${listings.length} listings in key: ${arrayKeys[0]}`);
        }
      }
      
      // Extract additional metadata
      pagination = data.pagination || data.data?.pagination;
      message = data.message || `Found ${listings.length} listing${listings.length !== 1 ? 's' : ''}`;
      currency = data.currency || 'USD';
      filters = data.filters;
      
      // Log first listing for debugging
      if (listings.length > 0) {
        console.log('📝 Sample listing structure:', {
          id: listings[0]._id,
          title: listings[0].title,
          price: listings[0].price,
          formattedPrice: listings[0].formattedPrice,
          seller: listings[0].sellerId,
          mediaUrls: listings[0].mediaUrls,
          hasThumbnail: !!listings[0].thumbnail
        });
      }
    }
    
    console.log(`✅ Final: Returning ${listings.length} listings`);
    
    // ✅ Return the standardized response
    return {
      success: true,
      data: { listings },
      pagination,
      message,
      currency,
      filters
    };
    
  } catch (error) {
    console.error('❌ Error fetching listings:', error);
    
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('Axios Error Details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    }
    
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
    type: string;
    tags?: string[];
    mediaUrls?: string[];
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

// Get API base URL
export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};

// ============================================
// ✅ EXPORT ALL APIs
// ============================================

const marketplaceApi = {
  listings: listingsApi,
  orders: ordersApi,
  utils: {
    formatCurrency,
    checkAuth,
    getCurrentUser,
    getApiBaseUrl
  }
};

export default marketplaceApi;