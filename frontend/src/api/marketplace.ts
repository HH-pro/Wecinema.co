// API Response Types
interface ApiResponse<T = any> {
  success: boolean;
  status?: number;
  data?: T;
  error?: string;
  details?: any;
  headers?: Headers;
  isNetworkError?: boolean;
}

// Listing Types
interface Listing {
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

interface User {
  _id: string;
  username: string;
  avatar?: string;
  sellerRating?: number;
  email?: string;
  phone?: string;
}

// Request Types
interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  type: 'product' | 'service' | 'digital' | 'rental';
  category?: string;
  tags?: string[];
  mediaUrls?: string[];
}

interface EditListingRequest extends Partial<CreateListingRequest> {}

interface ListingFilters {
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MyListingsResponse {
  listings: Listing[];
  pagination: PaginationInfo;
}

interface UserListingsResponse extends MyListingsResponse {
  user: {
    id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
  };
}

// API Base URL
const API_BASE_URL: string = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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
    const url = `${API_BASE_URL}/marketplace${endpoint}`;
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
// PUBLIC LISTINGS APIs (No authentication required)
// ===================================================

/**
 * Get all active listings (Public)
 * @param params - Query parameters
 * @returns Promise with listings data
 */
export const getListings = async (params: ListingFilters = {}): Promise<ApiResponse<Listing[]>> => {
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<Listing[]>(`/listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Get single listing details by ID (Public)
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
  return await apiCall<{ listing: Listing }>(`/listing/${id}`);
};

/**
 * Get listings by specific user ID (Public)
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
  return await apiCall<UserListingsResponse>(`/user/${userId}/listings${queryParams ? `?${queryParams}` : ''}`);
};

// ===================================================
// AUTHENTICATED LISTING APIs (Require authentication)
// ===================================================

/**
 * Get current user's listings
 * @param params - Query parameters
 * @returns Promise with user's listings
 */
export const getMyListings = async (params: Omit<ListingFilters, 'search' | 'minPrice' | 'maxPrice'> = {}): Promise<ApiResponse<MyListingsResponse>> => {
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<MyListingsResponse>(`/my-listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Create a new listing
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
  
  return await apiCall('/create-listing', {
    method: 'POST',
    body: JSON.stringify(listingData)
  });
};

/**
 * Edit/Update an existing listing
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
  
  return await apiCall<{ message: string; listing: Listing }>(`/listing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};

/**
 * Toggle listing status between active and inactive
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
  
  return await apiCall(`/listing/${id}/toggle-status`, {
    method: 'PATCH'
  });
};

/**
 * Delete a listing
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
  
  return await apiCall(`/listing/${id}`, {
    method: 'DELETE'
  });
};

// ===================================================
// ADVANCED LISTING APIs
// ===================================================

/**
 * Search listings with filters
 * @param filters - Search filters
 * @returns Promise with search results
 */
export const searchListings = async (filters: ListingFilters = {}): Promise<ApiResponse<Listing[]>> => {
  const queryParams = new URLSearchParams(filters as Record<string, string>).toString();
  return await apiCall<Listing[]>(`/listings/search${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Upload listing images
 * @param listingId - Listing ID
 * @param files - Array of image files
 * @returns Promise with upload response
 */
export const uploadListingImages = async (
  listingId: string, 
  files: File[]
): Promise<ApiResponse<{ urls: string[] }>> => {
  if (!listingId || !files || files.length === 0) {
    return {
      success: false,
      error: 'Listing ID and files are required'
    };
  }
  
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append('images', file);
  });
  
  return await apiCall<{ urls: string[] }>(`/listing/${listingId}/upload-images`, {
    method: 'POST',
    body: formData
  });
};

/**
 * Update listing views count
 * @param listingId - Listing ID
 * @returns Promise with view count response
 */
export const incrementListingViews = async (listingId: string): Promise<ApiResponse<{ views: number }>> => {
  if (!listingId) {
    return {
      success: false,
      error: 'Listing ID is required'
    };
  }
  
  return await apiCall<{ views: number }>(`/listing/${listingId}/view`, {
    method: 'POST'
  });
};

// ===================================================
// ADMIN APIs (Require admin privileges)
// ===================================================

interface AdminListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Admin: Get all listings (including inactive)
 * @param params - Query parameters
 * @returns Promise with all listings
 */
export const adminGetAllListings = async (params: ListingFilters = {}): Promise<ApiResponse<AdminListingsResponse>> => {
  const queryParams = new URLSearchParams(params as Record<string, string>).toString();
  return await apiCall<AdminListingsResponse>(`/admin/listings${queryParams ? `?${queryParams}` : ''}`);
};

/**
 * Admin: Update any listing
 * @param id - Listing ID
 * @param updateData - Update data
 * @returns Promise with update response
 */
export const adminUpdateListing = async (
  id: string, 
  updateData: EditListingRequest
): Promise<ApiResponse<{ listing: Listing }>> => {
  return await apiCall<{ listing: Listing }>(`/admin/listing/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};

/**
 * Admin: Delete any listing
 * @param id - Listing ID
 * @returns Promise with deletion response
 */
export const adminDeleteListing = async (id: string): Promise<ApiResponse<{ message: string }>> => {
  return await apiCall<{ message: string }>(`/admin/listing/${id}`, {
    method: 'DELETE'
  });
};

/**
 * Admin: Delete ALL listings (⚠️ Dangerous!)
 * @returns Promise with deletion response
 */
export const adminDeleteAllListings = async (): Promise<ApiResponse<{
  success: boolean;
  message: string;
  deletedCount: number;
  beforeCount: number;
  warning: string;
}>> => {
  const confirm = window.confirm(
    '⚠️ WARNING: This will delete ALL listings permanently!\n\nAre you sure you want to continue?'
  );
  
  if (!confirm) {
    return {
      success: false,
      error: 'Operation cancelled by user'
    };
  }
  
  return await apiCall('/admin/delete-all-listings', {
    method: 'DELETE'
  });
};

// ===================================================
// UTILITY FUNCTIONS
// ===================================================

interface ValidationResult {
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

type StatusType = 'active' | 'inactive' | 'pending' | 'sold' | 'deleted';

/**
 * Format price for display
 * @param price - Price to format
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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

// ===================================================
// EXPORT ALL FUNCTIONS
// ===================================================

const marketplaceAPI = {
  // Public APIs
  getListings,
  getListingById,
  getUserListings,
  
  // Authenticated APIs
  getMyListings,
  createListing,
  editListing,
  toggleListingStatus,
  deleteListing,
  
  // Advanced APIs
  searchListings,
  uploadListingImages,
  incrementListingViews,
  
  // Admin APIs
  adminGetAllListings,
  adminUpdateListing,
  adminDeleteListing,
  adminDeleteAllListings,
  
  // Utility functions
  validateListingData,
  formatPrice,
  getStatusColor,
  parseTags,
  prepareListingData
};

export type {
  Listing,
  User,
  CreateListingRequest,
  EditListingRequest,
  ListingFilters,
  ApiResponse,
  ValidationResult,
  StatusType
};

export default marketplaceAPI;