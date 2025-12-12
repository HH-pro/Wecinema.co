// Marketplace API Types
export interface ApiResponse<T = any> {
  success: boolean;
  status?: number;
  data?: T;
  error?: string;
  details?: any;
  headers?: Headers;
  isNetworkError?: boolean;
}

// Listing Types
export interface Listing {
  _id: string;
  sellerId: string | User;
  sellerEmail?: string;
  title: string;
  description: string;
  price: number;
  type: 'product' | 'service' | 'digital' | 'rental';
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: 'active' | 'inactive' | 'pending' | 'sold' | 'deleted';
  views?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface User {
  _id: string;
  username: string;
  avatar?: string;
  sellerRating?: number;
  email?: string;
  phone?: string;
}

// Request Types
export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  type: 'product' | 'service' | 'digital' | 'rental';
  category?: string;
  tags?: string[];
  mediaUrls?: string[];
}

export interface EditListingRequest extends Partial<CreateListingRequest> {}

export interface ListingFilters {
  status?: 'active' | 'inactive' | 'pending' | 'sold';
  category?: string;
  type?: 'product' | 'service' | 'digital' | 'rental';
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MyListingsResponse {
  listings: Listing[];
  pagination: PaginationInfo;
}

export interface UserListingsResponse extends MyListingsResponse {
  user: {
    id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
  };
}

// API Base Configuration
const API_BASE_URL = 'http://localhost:3000';

// Get auth token from localStorage or context
const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Common headers for authenticated requests
const getHeaders = (isFormData: boolean = false): HeadersInit => {
  const headers: HeadersInit = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Generic API call function
const apiCall = async <T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: getHeaders(options.body instanceof FormData),
    });
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle successful response
    if (response.ok) {
      return {
        success: true,
        status: response.status,
        data: data as T,
        headers: response.headers
      };
    }
    
    // Handle error response
    return {
      success: false,
      status: response.status,
      error: data.error || `Request failed with status ${response.status}`,
      details: data.details || data
    };
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error. Please check your connection.',
      isNetworkError: true
    };
  }
};

// ===================================================
// NEW MARKETPLACE APIs (using /api/marketplace)
// ===================================================

/**
 * Get current user's listings (NEW API)
 * @param params - Query parameters
 * @returns Promise with user's listings
 */
export const getMyListings = async (params: Omit<ListingFilters, 'search' | 'minPrice' | 'maxPrice'> = {}): Promise<ApiResponse<MyListingsResponse>> => {
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<MyListingsResponse>(`/api/marketplace/my-listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Create a new listing (NEW API)
 * @param listingData - Listing data
 * @returns Promise with created listing
 */
export const createListing = async (listingData: CreateListingRequest): Promise<ApiResponse<{ 
  message: string; 
  listing: {
    id: string;
    title: string;
    price: number;
    type: string;
    category: string;
    status: string;
    createdAt: Date;
    hasSellerEmail: boolean;
  }
}>> => {
  // Basic validation
  if (!listingData.title || !listingData.description || !listingData.price) {
    return {
      success: false,
      error: 'Title, description, and price are required'
    };
  }
  
  return await apiCall('/api/marketplace/create-listing', {
    method: 'POST',
    body: JSON.stringify(listingData)
  });
};

/**
 * Edit/Update an existing listing (NEW API)
 * @param id - Listing ID
 * @param updateData - Fields to update
 * @returns Promise with updated listing
 */
export const editListing = async (
  id: string, 
  updateData: EditListingRequest
): Promise<ApiResponse<{ 
  message: string; 
  listing: Listing 
}>> => {
  if (!id) {
    return {
      success: false,
      error: 'Listing ID is required'
    };
  }
  
  return await apiCall<{ message: string; listing: Listing }>(`/api/marketplace/listing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};

/**
 * Toggle listing status between active and inactive (NEW API)
 * @param id - Listing ID
 * @returns Promise with status change response
 */
export const toggleListingStatus = async (id: string): Promise<ApiResponse<{
  message: string;
  listing: Pick<Listing, 'title' | 'status' | 'updatedAt'>;
  previousStatus: string;
  newStatus: string;
}>> => {
  if (!id) {
    return {
      success: false,
      error: 'Listing ID is required'
    };
  }
  
  return await apiCall(`/api/marketplace/listing/${id}/toggle-status`, {
    method: 'PATCH'
  });
};

/**
 * Delete a listing (NEW API)
 * @param id - Listing ID
 * @returns Promise with deletion response
 */
export const deleteListing = async (id: string): Promise<ApiResponse<{
  message: string;
  listing: {
    _id: string;
    title: string;
    status: string;
  };
}>> => {
  if (!id) {
    return {
      success: false,
      error: 'Listing ID is required'
    };
  }
  
  return await apiCall(`/api/marketplace/listing/${id}`, {
    method: 'DELETE'
  });
};

/**
 * Get single listing details by ID (NEW API)
 * @param id - Listing ID
 * @returns Promise with listing data
 */
export const getListingById = async (id: string): Promise<ApiResponse<{ listing: Listing }>> => {
  if (!id) {
    return {
      success: false,
      error: 'Listing ID is required'
    };
  }
  return await apiCall<{ listing: Listing }>(`/api/marketplace/listing/${id}`);
};

// ===================================================
// EXISTING APIs (using /marketplace)
// ===================================================

/**
 * Get all active listings (EXISTING API)
 * @param params - Query parameters
 * @returns Promise with listings data
 */
export const getAllListings = async (params: ListingFilters = {}): Promise<ApiResponse<Listing[]>> => {
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<Listing[]>(`/marketplace/listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Get listings by specific user ID (EXISTING API)
 * @param userId - User ID
 * @param params - Query parameters
 * @returns Promise with user's listings
 */
export const getUserListings = async (
  userId: string, 
  params: Omit<ListingFilters, 'status'> = {}
): Promise<ApiResponse<UserListingsResponse>> => {
  if (!userId) {
    return {
      success: false,
      error: 'User ID is required'
    };
  }
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<UserListingsResponse>(`/marketplace/user/${userId}/listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Search listings with filters (EXISTING API)
 * @param filters - Search filters
 * @returns Promise with search results
 */
export const searchListings = async (filters: ListingFilters = {}): Promise<ApiResponse<Listing[]>> => {
  const queryParams = new URLSearchParams(filters as Record<string, string>).toString();
  return await apiCall<Listing[]>(`/marketplace/listings/search${queryParams ? `?${queryParams}` : ''}`);
};

// ===================================================
// HYBRID FUNCTIONS (Works with both old and new endpoints)
// ===================================================

/**
 * Get user listings - tries new API first, falls back to old API
 */
export const getUserListingsHybrid = async (userId: string, params: any = {}): Promise<ApiResponse<any>> => {
  try {
    // Try new API first
    const newResponse = await getUserListings(userId, params);
    if (newResponse.success) {
      return newResponse;
    }
    
    // Fallback to old API method
    const token = getAuthToken();
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_BASE_URL}/marketplace/listings/user/${userId}/listings${queryParams ? `?${queryParams}` : ''}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    return {
      success: response.ok,
      data,
      error: response.ok ? undefined : data.error
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ===================================================
// UTILITY FUNCTIONS
// ===================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate listing data before submission
 * @param data - Listing data to validate
 * @returns Validation result
 */
export const validateListingData = (data: Partial<CreateListingRequest>): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  if (!data.price || isNaN(data.price) || data.price <= 0) {
    errors.push('Price must be a positive number');
  }
  
  if (!data.type) {
    errors.push('Type is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export type StatusType = 'active' | 'inactive' | 'pending' | 'sold' | 'deleted';

/**
 * Format price for display
 * @param price - Price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(price);
};

/**
 * Format price in INR (for Indian Rupees)
 */
export const formatPriceINR = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(price);
};

/**
 * Get listing status badge color
 * @param status - Listing status
 * @returns Bootstrap/CSS color class
 */
export const getStatusColor = (status: StatusType): string => {
  const colors: Record<StatusType, string> = {
    active: 'success',
    inactive: 'warning',
    pending: 'info',
    sold: 'secondary',
    deleted: 'danger'
  };
  
  return colors[status] || 'secondary';
};

/**
 * Get status color class for any status string
 */
export const getStatusColorClass = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('active') || statusLower.includes('completed') || statusLower.includes('paid')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (statusLower.includes('pending') || statusLower.includes('waiting')) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
  if (statusLower.includes('inactive') || statusLower.includes('cancelled') || statusLower.includes('rejected')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (statusLower.includes('sold') || statusLower.includes('shipped') || statusLower.includes('delivered')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Extract tags from string
 * @param tagString - Comma separated tags string
 * @returns Array of tags
 */
export const parseTags = (tagString: string): string[] => {
  return tagString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
};

/**
 * Prepare listing data for API submission
 * @param formData - Form data object
 * @returns Cleaned listing data
 */
export const prepareListingData = (formData: any): CreateListingRequest => {
  return {
    title: formData.title?.trim() || '',
    description: formData.description?.trim() || '',
    price: parseFloat(formData.price) || 0,
    type: formData.type || 'product',
    category: formData.category?.trim() || '',
    tags: Array.isArray(formData.tags) 
      ? formData.tags 
      : parseTags(formData.tags || ''),
    mediaUrls: Array.isArray(formData.mediaUrls) 
      ? formData.mediaUrls.filter((url: string) => url.trim() !== '')
      : []
  };
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Get relative time (e.g., "2 days ago")
 */
export const getRelativeTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// ===================================================
// EXPORT ALL FUNCTIONS
// ===================================================

const marketplaceAPI = {
  // New Marketplace APIs
  getMyListings,
  createListing,
  editListing,
  toggleListingStatus,
  deleteListing,
  getListingById,
  
  // Existing APIs
  getAllListings,
  getUserListings,
  searchListings,
  
  // Hybrid Functions
  getUserListingsHybrid,
  
  // Utility functions
  validateListingData,
  formatPrice,
  formatPriceINR,
  getStatusColor,
  getStatusColorClass,
  parseTags,
  prepareListingData,
  formatDate,
  getRelativeTime
};

export default marketplaceAPI;