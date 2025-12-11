// api.ts - Updated with complete listing management APIs
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: "http://localhost:3000/", // Base URL for all requests  https://wecinema.co/api/
  withCredentials: true, // Important for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================
// CORE REQUEST FUNCTIONS
// ========================

// Interface for API response
interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
  success?: boolean;
}

// Handle successful API responses
const handleSuccess = <T extends ApiResponse>(
  response: AxiosResponse<T>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): T => {
  setLoading(false);
  if (method === "delete") {
    toast.success(response.data.message || message || "Successful");
  }
  return response.data;
};

// Handle API errors
const handleError = (
  error: AxiosError<ApiResponse>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<string> => {
  setLoading(false);

  if (error.response) {
    const errorMessage =
      error.response.data.message ||
      error.response.data?.error ||
      "Something went wrong on the server.";

    if (method === "post" || method === "put" || method === "patch" || method === "delete") {
      toast.error(errorMessage);
    }
    return Promise.reject(errorMessage);
  } else if (error.request) {
    toast.error("No response received from the server.");
    return Promise.reject("No response received from the server.");
  } else {
    toast.error(error.message || "An unexpected error occurred.");
    return Promise.reject(error.message || "An unexpected error occurred.");
  }
};

// Core CRUD operations
export const postRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .post(url, data)
    .then((response) => handleSuccess(response, "post", setLoading, message))
    .catch((error) => handleError(error, "post", setLoading));

export const getRequest = async <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await api.get<ApiResponse<T>>(url);
    return response.data.data || response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Unknown error';
      toast.error(errorMessage);
      throw new Error(`API Error: ${error.response?.status} - ${errorMessage}`);
    }
    toast.error('Network error occurred');
    throw new Error('Network error occurred');
  } finally {
    setLoading?.(false);
  }
};

export const putRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .put(url, data)
    .then((response) => handleSuccess(response, "put", setLoading, message))
    .catch((error) => handleError(error, "put", setLoading));

export const patchRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .patch(url, data)
    .then((response) => handleSuccess(response, "patch", setLoading, message))
    .catch((error) => handleError(error, "patch", setLoading));

export const deleteRequest = <T>(
  url: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<T> =>
  api
    .delete(url)
    .then((response) => handleSuccess(response, "delete", setLoading, message))
    .catch((error) => handleError(error, "delete", setLoading));

// ========================
// API GROUPS (Organized)
// ========================

// Auth APIs
export const authAPI = {
  login: (credentials: { email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/login", credentials, setLoading, "Login successful"),

  register: (userData: { username: string; email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/register", userData, setLoading, "Registration successful"),

  getCurrentUser: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/me", setLoading),

  updateProfile: (userData: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/profile", userData, setLoading, "Profile updated"),

  isAuthenticated: () => !!localStorage.getItem("token"),
  getToken: () => localStorage.getItem("token"),
  logout: () => {
    localStorage.removeItem("token");
    window.location.href = '/';
  }
};

// Updated Stripe status check API
export const checkStripeStatus = async (): Promise<{
  connected: boolean;
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string;
}> => {
  try {
    console.log('🔄 Checking Stripe status...');
    const response = await api.get('/marketplace/stripe/account-status');
    console.log('✅ Stripe status API response:', response.data);
    
    if (response.data.success && response.data.connected) {
      return {
        connected: true,
        status: response.data.chargesEnabled ? 'active' : 'pending',
        chargesEnabled: response.data.chargesEnabled,
        payoutsEnabled: response.data.payoutsEnabled,
        detailsSubmitted: response.data.detailsSubmitted,
        stripeAccountId: response.data.stripeAccountId
      };
    }
    
    return {
      connected: false,
      status: 'not_connected'
    };
  } catch (error: any) {
    console.error('❌ Error checking Stripe status:', error);
    
    // Specific error handling
    if (error.response?.status === 404) {
      return {
        connected: false,
        status: 'not_connected'
      };
    }
    
    return {
      connected: false,
      status: 'error'
    };
  }
};

// Create Stripe account - simplified
export const createStripeAccount = async (): Promise<{ url: string }> => {
  try {
    const response = await api.post('/marketplace/stripe/onboard-seller');
    
    if (response.data.success && response.data.url) {
      return { url: response.data.url };
    } else {
      throw new Error(response.data.error || 'Failed to create Stripe account');
    }
  } catch (error: any) {
    console.error('Stripe account creation error:', error);
    throw new Error(error.response?.data?.error || 'Failed to connect Stripe account');
  }
};

export const completeOnboarding = (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/stripe/complete-onboarding", {}, setLoading, "Stripe account connected successfully");

// Payment APIs
export const confirmOfferPayment = async (offerId: string, paymentIntentId: string): Promise<any> => {
  try {
    const response = await api.post('/marketplace/offers/confirm-offer-payment', {
      offerId,
      paymentIntentId
    });
    return response.data;
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    throw new Error(error.response?.data?.error || 'Payment confirmation failed');
  }
};

export const createPaymentIntents = (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }>("/stripe/create-payment-intent", { orderId }, setLoading);

export const confirmPayments = (paymentIntentId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/stripe/confirm-payment", { paymentIntentId }, setLoading, "Payment confirmed successfully");

export const getSellerBalance = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest<{
    available: number;
    pending: number;
    currency: string;
  }>("/stripe/balance", setLoading);

export const createPayout = (amount: number, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/stripe/create-payout", { amount }, setLoading, "Payout initiated successfully");

export const getPayouts = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/stripe/payouts", setLoading);

export const createLoginLink = (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest<{ url: string }>("/stripe/create-login-link", {}, setLoading);

// ========================
// MARKETPLACE LISTING APIs (UPDATED WITH VIDEO FUNCTIONALITY)
// ========================

// Interface for Media
interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  filename?: string;
  mimeType?: string;
  resolution?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  isPreview?: boolean;
  order?: number;
}

// Interface for Listing
interface ListingData {
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  type: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  brand?: string;
  color?: string;
  size?: string;
  stockQuantity?: number;
  shippingCost?: number;
  deliveryTime?: string;
  returnsAccepted?: boolean;
  warranty?: string;
  licenseType?: string;
  usageRights?: string;
  commissionDetails?: {
    deadline?: Date;
    revisions?: number;
    requirements?: string;
  };
  isDigital?: boolean;
  fileFormat?: string;
  fileSize?: string;
  resolution?: string;
  aspectRatio?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  status?: 'draft' | 'active' | 'inactive' | 'sold' | 'pending_review';
  videoStatus?: 'active' | 'deactivated';
}

// Marketplace Listing APIs with Video Management
export const listingAPI = {
  // Get all listings with filters
  getListings: (
    params?: {
      type?: string;
      category?: string;
      subcategory?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      status?: string;
      isVideoListing?: boolean;
      videoStatus?: string;
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => queryParams.append(key, item));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get single listing by ID
  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/${listingId}`, setLoading),

  // Get listings by slug
  getListingBySlug: (slug: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/slug/${slug}`, setLoading),

  // Get user's listings
  getUserListings: (
    userId?: string,
    params?: {
      status?: string;
      page?: number;
      limit?: number;
      isVideoListing?: boolean;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const userIdParam = userId || 'me';
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/user/${userIdParam}/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get seller's listings (dashboard)
  getSellerListings: (params?: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/seller/listings', setLoading),

  // Create listing with file upload support
  createListing: async (formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>): Promise<any> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await api.post('/marketplace/listings', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Listing created successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error creating listing:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to create listing';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  // Update listing with file upload support
  updateListing: async (listingId: string, formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>): Promise<any> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await api.put(`/marketplace/listings/${listingId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Listing updated successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error updating listing:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to update listing';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  // Update listing without files
  updateListingData: (listingId: string, data: ListingData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/listings/${listingId}`, data, setLoading, "Listing updated successfully"),

  // Delete listing
  deleteListing: async (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>): Promise<any> => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await api.delete(`/marketplace/listings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success("Listing deleted successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to delete listing';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  // ✅ VIDEO MANAGEMENT APIs
  
  // Toggle video status (activate/deactivate)
  toggleVideoStatus: (listingId: string, status: 'activated' | 'deactivated', setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/video-status`, { status }, setLoading, 
      status === 'activated' ? 'Video activated successfully' : 'Video deactivated successfully'),

  // Activate video
  activateVideo: (listingId: string, mediaId?: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/activate-video`, { mediaId }, setLoading as any, 'Video activated successfully'),

  // Deactivate video
  deactivateVideo: (listingId: string, mediaId?: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/deactivate-video`, { mediaId }, setLoading as any, 'Video deactivated successfully'),

  // Set primary video
  setPrimaryVideo: (listingId: string, mediaId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/set-primary-video`, { mediaId }, setLoading, 'Primary video set successfully'),

  // Delete specific media
  deleteMedia: (listingId: string, mediaId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}/media/${mediaId}`, setLoading, 'Media deleted successfully'),

  // Add media to listing
  addMedia: async (listingId: string, mediaFile: File, setLoading: React.Dispatch<React.SetStateAction<boolean>>): Promise<any> => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('media', mediaFile);
      
      const token = localStorage.getItem("token");
      const response = await api.post(`/marketplace/listings/${listingId}/media`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Media added successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error adding media:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add media';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  // ✅ LISTING STATUS MANAGEMENT
  
  // Update listing status
  updateListingStatus: (listingId: string, status: 'active' | 'inactive' | 'sold' | 'reserved', setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/status`, { status }, setLoading, `Listing ${status} successfully`),

  // Mark as sold
  markAsSold: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/status`, { status: 'sold' }, setLoading, 'Listing marked as sold'),

  // Mark as active
  markAsActive: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/status`, { status: 'active' }, setLoading, 'Listing activated successfully'),

  // Mark as inactive
  markAsInactive: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/status`, { status: 'inactive' }, setLoading, 'Listing deactivated successfully'),

  // ✅ ANALYTICS & STATS
  
  // Get listing statistics
  getListingStats: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/${listingId}/stats`, setLoading),

  // Increment view count
  incrementViewCount: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/${listingId}/increment-view`, {}, setLoading as any),

  // Get seller's listing statistics
  getSellerListingStats: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/seller/stats', setLoading),

  // ✅ SEARCH & DISCOVERY
  
  // Search listings
  searchListings: (searchTerm: string, filters?: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    queryParams.append('search', searchTerm);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return getRequest(`/marketplace/listings/search?${queryParams.toString()}`, setLoading);
  },

  // Get featured listings
  getFeaturedListings: (limit?: number, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const params = limit ? `?limit=${limit}` : '';
    return getRequest(`/marketplace/listings/featured${params}`, setLoading);
  },

  // Get video listings
  getVideoListings: (params?: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/videos${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get categories
  getCategories: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/categories', setLoading),

  // ✅ FAVORITES & BOOKMARKS
  
  // Add to favorites
  addToFavorites: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest(`/marketplace/listings/${listingId}/favorite`, {}, setLoading, 'Added to favorites'),

  // Remove from favorites
  removeFromFavorites: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}/favorite`, setLoading, 'Removed from favorites'),

  // Get favorite listings
  getFavoriteListings: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/favorites', setLoading),

  // ✅ CLONE & DUPLICATE
  
  // Clone listing
  cloneListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest(`/marketplace/listings/${listingId}/clone`, {}, setLoading, 'Listing cloned successfully'),

  // ✅ BULK OPERATIONS
  
  // Bulk update listing status
  bulkUpdateStatus: (listingIds: string[], status: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/listings/bulk/status', { listingIds, status }, setLoading, 'Bulk update completed'),

  // Bulk delete listings
  bulkDeleteListings: (listingIds: string[], setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/listings/bulk/delete', { listingIds }, setLoading, 'Bulk delete completed'),

  // ✅ VALIDATION
  
  // Validate listing data
  validateListing: (data: ListingData, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/listings/validate', data, setLoading as any),

  // Check slug availability
  checkSlugAvailability: (slug: string, listingId?: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const params = listingId ? `?listingId=${listingId}` : '';
    return getRequest(`/marketplace/listings/check-slug/${slug}${params}`, setLoading);
  }
};

// Offer APIs
export const offerAPI = {
  makeOffer: async (
    offerData: {
      listingId: string;
      amount: number;
      message?: string;
      requirements?: string;
      expectedDelivery?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      setLoading(true);
      
      const requestData = {
        listingId: offerData.listingId,
        amount: parseFloat(offerData.amount.toString()),
        message: offerData.message || '',
        requirements: offerData.requirements || '',
        expectedDelivery: offerData.expectedDelivery || ''
      };

      console.log("Sending offer data:", requestData);

      const response = await api.post('/marketplace/offers/make-offer', requestData);
      
      toast.success("Offer sent successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error making offer:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send offer';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  getMyOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/my-offers', setLoading),

  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/received-offers', setLoading),

  acceptOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/accept-offer/${offerId}`, {}, setLoading, "Offer accepted"),

  rejectOffer: (offerId: string, reason?: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/reject-offer/${offerId}`, { rejectionReason: reason }, setLoading, "Offer rejected"),

  cancelOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/cancel-offer/${offerId}`, {}, setLoading, "Offer cancelled"),

  // Get offer details
  getOfferDetails: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/offers/${offerId}`, setLoading),

  // Counter offer
  counterOffer: (offerId: string, counterAmount: number, message?: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/counter`, { counterAmount, message }, setLoading as any, "Counter offer sent"),

  // Get offer chat link
  getOfferChatLink: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/offers/${offerId}/chat-link`, setLoading)
};

// Order APIs
export const orderAPI = {
  // Create new order from accepted offer
  createOrder: async (
    orderData: {
      offerId: string;
      listingId: string;
      buyerId: string;
      sellerId: string;
      amount: number;
      shippingAddress?: string;
      paymentMethod?: string;
      notes?: string;
      status?: string;
      requirements?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      setLoading?.(true);
      
      console.log("🛒 Creating order with data:", orderData);

      const response = await api.post('/marketplace/orders/create', orderData);
      
      toast.success("Order created successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create order';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading?.(false);
    }
  },

  // Get orders for buyer
  getMyOrders: (params?: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/orders/my-orders${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get orders for seller
  getSellerOrders: (params?: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/orders/my-sales${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get order details
  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}`, setLoading),

  // Update order status
  updateOrderStatus: (orderId: string, status: string, notes?: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/status`, { status, notes }, setLoading, "Order status updated"),

  // Seller starts work on order
  startWork: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/start-work`, {}, setLoading, "Work started on order"),

  // Seller delivers order
  deliverOrder: (
    orderId: string,
    deliveryData: {
      deliveryMessage: string;
      deliveryFiles: string[];
      attachments?: File[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const formData = new FormData();
    formData.append('deliveryMessage', deliveryData.deliveryMessage);
    deliveryData.deliveryFiles.forEach(file => formData.append('deliveryFiles', file));
    
    if (deliveryData.attachments) {
      deliveryData.attachments.forEach(file => formData.append('attachments', file));
    }
    
    return postRequest(`/marketplace/orders/${orderId}/deliver`, formData, setLoading, "Order delivered");
  },

  // Buyer requests revision
  requestRevision: (
    orderId: string,
    revisionNotes: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested"),

  // Buyer completes order
  completeOrder: (orderId: string, rating?: number, review?: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/complete`, { rating, review }, setLoading, "Order completed"),

  // Get order timeline
  getOrderTimeline: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/timeline`, setLoading),

  // Cancel order
  cancelOrder: (orderId: string, reason?: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/cancel`, { reason }, setLoading, "Order cancelled"),

  // Get order messages/chat
  getOrderMessagesForOrder: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/messages`, setLoading),

  // Send message in order chat
  sendOrderMessage: (
    orderId: string,
    messageData: {
      message: string;
      attachments?: File[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const formData = new FormData();
    formData.append('message', messageData.message);
    
    if (messageData.attachments) {
      messageData.attachments.forEach(file => formData.append('attachments', file));
    }
    
    return postRequest(`/marketplace/orders/${orderId}/messages`, formData, setLoading, "Message sent");
  },

  // Get order statistics
  getOrderStats: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/stats', setLoading),

  // Download order invoice
  downloadInvoice: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/invoice`, setLoading)
};

// Payment APIs
export const paymentAPI = {
  createPaymentIntent: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/create-payment-intent', { orderId }, setLoading),

  confirmPayment: (
    orderId: string,
    paymentIntentId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/confirm-payment', { orderId, paymentIntentId }, setLoading, "Payment confirmed"),

  capturePayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/capture-payment', { orderId }, setLoading, "Payment released to seller"),

  cancelPayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/cancel-payment', { orderId }, setLoading, "Payment cancelled"),

  getPaymentStatus: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/marketplace/payments/payment-status/${orderId}`, setLoading),

  // Stripe specific
  getStripePaymentMethods: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/api/marketplace/payments/payment-methods', setLoading),

  addStripePaymentMethod: (paymentMethodId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/api/marketplace/payments/payment-methods', { paymentMethodId }, setLoading, "Payment method added"),

  removeStripePaymentMethod: (paymentMethodId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/api/marketplace/payments/payment-methods/${paymentMethodId}`, setLoading, "Payment method removed")
};

// Message APIs
export const messageAPI = {
  getOrderMessages: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/marketplace/messages/${orderId}`, setLoading),

  sendMessage: (
    messageData: {
      orderId: string;
      message: string;
      receiverId: string;
      attachments?: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/messages/send', messageData, setLoading, "Message sent"),

  markMessageAsRead: (
    messageId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/api/marketplace/messages/${messageId}/read`, {}, setLoading),

  // Get conversations
  getConversations: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/api/marketplace/messages/conversations', setLoading),

  // Get conversation with user
  getConversation: (userId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/marketplace/messages/conversations/${userId}`, setLoading),

  // Mark conversation as read
  markConversationAsRead: (userId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/marketplace/messages/conversations/${userId}/read`, {}, setLoading),

  // Get unread count
  getUnreadCount: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/api/marketplace/messages/unread-count', setLoading)
};

// Dashboard APIs
export const dashboardAPI = {
  getSellerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/seller-stats', setLoading),

  getBuyerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/buyer-stats', setLoading),

  getSellerDashboard: (
    period?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const params = period ? `?period=${period}` : '';
    return getRequest(`/api/marketplace/dashboard/seller${params}`, setLoading);
  },

  getBuyerDashboard: (
    period?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const params = period ? `?period=${period}` : '';
    return getRequest(`/api/marketplace/dashboard/buyer${params}`, setLoading);
  },

  getRevenueAnalytics: (
    period?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const params = period ? `?period=${period}` : '';
    return getRequest(`/api/marketplace/dashboard/revenue${params}`, setLoading);
  },

  getPerformanceMetrics: (
    period?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const params = period ? `?period=${period}` : '';
    return getRequest(`/api/marketplace/dashboard/performance${params}`, setLoading);
  }
};

// ========================
// MARKETPLACE API GROUP (Updated with all functionalities)
// ========================

export const marketplaceAPI = {
  // Listing APIs with video management
  listings: {
    // Basic CRUD
    get: listingAPI.getListings,
    getById: listingAPI.getListingById,
    getBySlug: listingAPI.getListingBySlug,
    getUserListings: listingAPI.getUserListings,
    getSellerListings: listingAPI.getSellerListings,
    create: listingAPI.createListing,
    update: listingAPI.updateListing,
    updateData: listingAPI.updateListingData,
    delete: listingAPI.deleteListing,
    
    // Video Management
    toggleVideoStatus: listingAPI.toggleVideoStatus,
    activateVideo: listingAPI.activateVideo,
    deactivateVideo: listingAPI.deactivateVideo,
    setPrimaryVideo: listingAPI.setPrimaryVideo,
    deleteMedia: listingAPI.deleteMedia,
    addMedia: listingAPI.addMedia,
    
    // Status Management
    updateStatus: listingAPI.updateListingStatus,
    markAsSold: listingAPI.markAsSold,
    markAsActive: listingAPI.markAsActive,
    markAsInactive: listingAPI.markAsInactive,
    
    // Analytics
    getStats: listingAPI.getListingStats,
    getSellerStats: listingAPI.getSellerListingStats,
    incrementView: listingAPI.incrementViewCount,
    
    // Search & Discovery
    search: listingAPI.searchListings,
    getFeatured: listingAPI.getFeaturedListings,
    getVideoListings: listingAPI.getVideoListings,
    getCategories: listingAPI.getCategories,
    
    // Favorites
    addToFavorites: listingAPI.addToFavorites,
    removeFromFavorites: listingAPI.removeFromFavorites,
    getFavorites: listingAPI.getFavoriteListings,
    
    // Bulk Operations
    bulkUpdateStatus: listingAPI.bulkUpdateStatus,
    bulkDelete: listingAPI.bulkDeleteListings,
    
    // Utilities
    clone: listingAPI.cloneListing,
    validate: listingAPI.validateListing,
    checkSlug: listingAPI.checkSlugAvailability
  },
  
  // Offer APIs
  offers: {
    make: offerAPI.makeOffer,
    getMy: offerAPI.getMyOffers,
    getReceived: offerAPI.getReceivedOffers,
    getDetails: offerAPI.getOfferDetails,
    accept: offerAPI.acceptOffer,
    reject: offerAPI.rejectOffer,
    cancel: offerAPI.cancelOffer,
    counter: offerAPI.counterOffer,
    getChatLink: offerAPI.getOfferChatLink
  },
  
  // Order APIs
  orders: {
    create: orderAPI.createOrder,
    getMy: orderAPI.getMyOrders,
    getSeller: orderAPI.getSellerOrders,
    getDetails: orderAPI.getOrderDetails,
    updateStatus: orderAPI.updateOrderStatus,
    startWork: orderAPI.startWork,
    deliver: orderAPI.deliverOrder,
    requestRevision: orderAPI.requestRevision,
    complete: orderAPI.completeOrder,
    getTimeline: orderAPI.getOrderTimeline,
    cancel: orderAPI.cancelOrder,
    getMessages: orderAPI.getOrderMessagesForOrder,
    sendMessage: orderAPI.sendOrderMessage,
    getStats: orderAPI.getOrderStats,
    downloadInvoice: orderAPI.downloadInvoice
  },
  
  // Payment APIs
  payments: {
    createIntent: paymentAPI.createPaymentIntent,
    confirm: paymentAPI.confirmPayment,
    capture: paymentAPI.capturePayment,
    cancel: paymentAPI.cancelPayment,
    getStatus: paymentAPI.getPaymentStatus,
    getPaymentMethods: paymentAPI.getStripePaymentMethods,
    addPaymentMethod: paymentAPI.addStripePaymentMethod,
    removePaymentMethod: paymentAPI.removeStripePaymentMethod
  },
  
  // Message APIs
  messages: {
    getOrderMessages: messageAPI.getOrderMessages,
    send: messageAPI.sendMessage,
    markRead: messageAPI.markMessageAsRead,
    getConversations: messageAPI.getConversations,
    getConversation: messageAPI.getConversation,
    markConversationRead: messageAPI.markConversationAsRead,
    getUnreadCount: messageAPI.getUnreadCount
  },
  
  // Dashboard APIs
  dashboard: {
    getSellerStats: dashboardAPI.getSellerStats,
    getBuyerStats: dashboardAPI.getBuyerStats,
    getSellerDashboard: dashboardAPI.getSellerDashboard,
    getBuyerDashboard: dashboardAPI.getBuyerDashboard,
    getRevenueAnalytics: dashboardAPI.getRevenueAnalytics,
    getPerformanceMetrics: dashboardAPI.getPerformanceMetrics
  },
  
  // Stripe APIs
  stripe: {
    checkStatus: checkStripeStatus,
    createAccount: createStripeAccount,
    completeOnboarding,
    createPaymentIntent: createPaymentIntents,
    confirmPayment: confirmPayments,
    getBalance: getSellerBalance,
    createPayout,
    getPayouts,
    createLoginLink
  }
};

// ========================
// MONITORING SYSTEM APIs (Keep existing)
// ========================

export const monitoringAPI = {
  logError: (
    errorData: {
      type: string;
      message: string;
      stack?: string;
      url?: string;
      severity?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest("/api/monitoring/errors", errorData, setLoading),

  getErrorLogs: (
    params: {
      limit?: number;
      severity?: string;
      timeRange?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/errors?${new URLSearchParams(params as any)}`, setLoading),

  getPerformanceData: (
    timeRange: string = "24h",
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/performance?range=${timeRange}`, setLoading),

  getServerStatus: (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/monitoring/status", setLoading),

  getUptimeStats: (
    timeRange: string = "7d",
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/uptime?range=${timeRange}`, setLoading)
};

// ========================
// ALERT SYSTEM APIs (Keep existing)
// ========================

export const alertAPI = {
  getAlertConfigs: (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/alerts/configs", setLoading),

  createAlertConfig: (
    configData: {
      alertType: string;
      metric: string;
      threshold: number;
      channel: string;
      recipient: string;
      severity: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest("/api/alerts/configs", configData, setLoading, "Alert config created"),

  updateAlertConfig: (
    id: string,
    configData: any,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/api/alerts/configs/${id}`, configData, setLoading, "Alert config updated"),

  toggleAlertConfig: (
    id: string,
    isActive: boolean,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => patchRequest(`/api/alerts/configs/${id}/toggle`, { isActive }, setLoading, "Alert config updated"),

  getAlertHistory: (
    params: {
      limit?: number;
      status?: string;
      timeRange?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/alerts/history?${new URLSearchParams(params as any)}`, setLoading)
};

// ========================
// DOMAIN MONITORING APIs (Keep existing)
// ========================

export const domainAPI = {
  getDomains: (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/domains", setLoading),

  checkDomainExpiry: (
    domainId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/domains/${domainId}/check-expiry`, setLoading),

  sendDomainAlert: (
    domainId: string,
    channel: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest(`/api/domains/${domainId}/alert`, { channel }, setLoading, "Alert sent")
};

// ========================
// BOOKMARK & HISTORY APIs (Keep existing)
// ========================

export const bookmarkAPI = {
  addBookmark: (
    videoId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest(`/api/bookmarks/${videoId}`, {}, setLoading, "Bookmark added"),

  removeBookmark: (
    videoId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => deleteRequest(`/api/bookmarks/${videoId}`, setLoading, "Bookmark removed"),

  getBookmarks: (
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/bookmarks", setLoading),

  getVideoHistory: (
    userId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/video/history/${userId}`, setLoading)
};

// ========================
// UTILITY FUNCTIONS (Updated with listing utilities)
// ========================

// Domain Notification Utilities
interface Domain {
  id: string;
  name: string;
  date: string;
  hosting: {
    name: string;
    date: string;
  };
}

export const checkExpiryDates = (domains: Domain[]) => {
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  
  const expiringDomains = domains.filter(domain => {
    const domainExpiry = new Date(domain.date);
    const hostingExpiry = new Date(domain.hosting.date);
    
    return domainExpiry <= twoDaysFromNow || hostingExpiry <= twoDaysFromNow;
  });

  return expiringDomains;
};

export const sendWhatsAppNotification = async (domain: Domain, phoneNumber: string) => {
  const domainExpiry = new Date(domain.date);
  const hostingExpiry = new Date(domain.hosting.date);
  const now = new Date();
  
  const domainDaysLeft = Math.ceil((domainExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const hostingDaysLeft = Math.ceil((hostingExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  let message = `🔔 *Domain Expiry Alert* 🔔\n\n`;
  message += `*Domain:* ${domain.name}\n`;
  
  if (domainDaysLeft <= 2) {
    message += `⚠️ Domain expires in ${domainDaysLeft} day(s) (${domainExpiry.toLocaleDateString()})\n`;
  }
  
  if (hostingDaysLeft <= 2) {
    message += `⚠️ Hosting (${domain.hosting.name}) expires in ${hostingDaysLeft} day(s) (${hostingExpiry.toLocaleDateString()})\n`;
  }
  
  message += `\nPlease renew as soon as possible to avoid service interruption.`;
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

export const checkAndNotifyExpiringDomains = (domains: Domain[], phoneNumber: string) => {
  const expiringDomains = checkExpiryDates(domains);
  expiringDomains.forEach(domain => sendWhatsAppNotification(domain, phoneNumber));
  return expiringDomains.length > 0;
};

// Error Handling
export function setupErrorHandling() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const errorData = {
      type: 'uncaught_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
    };
    logErrorToServer(errorData);
  });

  // Handle promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorData = {
      type: 'unhandled_rejection',
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
    };
    logErrorToServer(errorData);
  });
}

async function logErrorToServer(errorData: Record<string, any>) {
  try {
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    });
  } catch (err) {
    console.error('Error logging failed:', err);
  }
}

// Performance Tracking
export function trackPerformance() {
  const perfData = {
    loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
    domReadyTime: window.performance.timing.domComplete - window.performance.timing.domLoading,
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  sendPerformanceData(perfData);
}

export function startPerformanceObserver() {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'longtask') {
        sendPerformanceData({
          type: 'long_task',
          duration: entry.duration,
          startTime: entry.startTime,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  observer.observe({ entryTypes: ['longtask'] });
}

async function sendPerformanceData(data: Record<string, any>) {
  try {
    await fetch('/api/log-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Performance logging failed:', err);
  }
}

// Formatting Utilities
export const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export const formatMilliseconds = (ms: number) => {
  return ms >= 1000 
    ? `${(ms / 1000).toFixed(2)}s`
    : `${Math.round(ms)}ms`;
};

// Marketplace Utilities
export const calculatePlatformFee = (amount: number, feePercent: number = 0.15) => {
  const platformFee = amount * feePercent;
  const sellerAmount = amount - platformFee;
  return {
    platformFee: Math.round(platformFee * 100) / 100,
    sellerAmount: Math.round(sellerAmount * 100) / 100,
    originalAmount: amount,
    feePercent
  };
};

export const formatOrderStatus = (status: string) => {
  const statusMap: { [key: string]: string } = {
    pending_payment: 'Payment Pending',
    pending: 'Pending',
    paid: 'Paid',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    in_revision: 'Revision Requested',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    confirmed: 'Confirmed',
    active: 'Active',
    inactive: 'Inactive',
    draft: 'Draft',
    sold: 'Sold',
    reserved: 'Reserved'
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string) => {
  const statusColors: { [key: string]: string } = {
    pending_payment: 'var(--warning)',
    pending: 'var(--warning)',
    paid: 'var(--info)',
    in_progress: 'var(--primary)',
    delivered: 'var(--success)',
    in_revision: 'var(--warning)',
    completed: 'var(--success)',
    cancelled: 'var(--danger)',
    disputed: 'var(--danger)',
    confirmed: 'var(--info)',
    active: 'var(--success)',
    inactive: 'var(--secondary)',
    draft: 'var(--secondary)',
    sold: 'var(--success)',
    reserved: 'var(--warning)'
  };
  return statusColors[status] || 'var(--secondary)';
};

export const validateListingData = (data: ListingData) => {
  const errors: string[] = [];

  if (!data.title || data.title.length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (!data.type) {
    errors.push('Please select a listing type');
  }

  if (!data.category) {
    errors.push('Category is required');
  }

  if (!data.description || data.description.length < 20) {
    errors.push('Description must be at least 20 characters long');
  }

  return errors;
};

export const validateOrderData = (data: {
  offerId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
}) => {
  const errors: string[] = [];

  if (!data.offerId) {
    errors.push('Offer ID is required');
  }

  if (!data.listingId) {
    errors.push('Listing ID is required');
  }

  if (!data.buyerId) {
    errors.push('Buyer ID is required');
  }

  if (!data.sellerId) {
    errors.push('Seller ID is required');
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return errors;
};

// Payment-specific functions
export const initializeStripe = async () => {
  if (typeof window !== 'undefined' && !window.Stripe) {
    const { loadStripe } = await import('@stripe/stripe-js');
    return loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);
  }
  return null;
};

export const createStripePaymentMethod = async (cardElement: any) => {
  const stripe = await initializeStripe();
  if (!stripe) throw new Error('Stripe not loaded');

  const { error, paymentMethod } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
  });

  if (error) throw new Error(error.message);
  return paymentMethod;
};

// Webhook simulation for development
export const simulateWebhook = async (paymentIntentId: string, eventType: string) => {
  return postRequest('/api/webhook/simulate', {
    paymentIntentId,
    eventType
  }, () => {});
};

// Token utilities
export const getCurrentUserFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  
  try {
    // This assumes you have a decodeToken function in your helperFunctions
    // You might need to import it or implement it here
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

// Listing-specific utilities
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const formatListingPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
};

export const getVideoDurationFormatted = (seconds: number): string => {
  if (!seconds) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const validateMediaFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(maxSize)}`
    };
  }
  
  return { valid: true };
};

// Listing status helpers
export const canEditListing = (status: string): boolean => {
  const editableStatuses = ['draft', 'active', 'inactive', 'pending_review'];
  return editableStatuses.includes(status);
};

export const canDeleteListing = (status: string): boolean => {
  const deletableStatuses = ['draft', 'active', 'inactive', 'pending_review'];
  return deletableStatuses.includes(status);
};

export const canActivateVideo = (listingStatus: string, videoStatus?: string): boolean => {
  return listingStatus === 'active' && videoStatus !== 'active';
};

export const canDeactivateVideo = (videoStatus?: string): boolean => {
  return videoStatus === 'active';
};

// ========================
// LEGACY INDIVIDUAL EXPORTS (Updated with new functions)
// ========================

// Auth exports
export const loginUser = authAPI.login;
export const registerUser = authAPI.register;
export const getCurrentUser = authAPI.getCurrentUser;
export const updateProfile = authAPI.updateProfile;

// Marketplace listing exports (with video functionality)
export const getListings = listingAPI.getListings;
export const getListingById = listingAPI.getListingById;
export const getListingBySlug = listingAPI.getListingBySlug;
export const getUserListings = listingAPI.getUserListings;
export const getSellerListings = listingAPI.getSellerListings;
export const createListing = listingAPI.createListing;
export const updateListing = listingAPI.updateListing;
export const updateListingData = listingAPI.updateListingData;
export const deleteListing = listingAPI.deleteListing;

// Video management exports
export const toggleVideoStatus = listingAPI.toggleVideoStatus;
export const activateVideo = listingAPI.activateVideo;
export const deactivateVideo = listingAPI.deactivateVideo;
export const setPrimaryVideo = listingAPI.setPrimaryVideo;
export const deleteMedia = listingAPI.deleteMedia;
export const addMedia = listingAPI.addMedia;

// Listing status exports
export const updateListingStatus = listingAPI.updateListingStatus;
export const markAsSold = listingAPI.markAsSold;
export const markAsActive = listingAPI.markAsActive;
export const markAsInactive = listingAPI.markAsInactive;

// Analytics exports
export const getListingStats = listingAPI.getListingStats;
export const getSellerListingStats = listingAPI.getSellerListingStats;
export const incrementViewCount = listingAPI.incrementViewCount;

// Search & discovery exports
export const searchListings = listingAPI.searchListings;
export const getFeaturedListings = listingAPI.getFeaturedListings;
export const getVideoListings = listingAPI.getVideoListings;
export const getCategories = listingAPI.getCategories;

// Favorites exports
export const addToFavorites = listingAPI.addToFavorites;
export const removeFromFavorites = listingAPI.removeFromFavorites;
export const getFavoriteListings = listingAPI.getFavoriteListings;

// Bulk operations exports
export const bulkUpdateStatus = listingAPI.bulkUpdateStatus;
export const bulkDeleteListings = listingAPI.bulkDeleteListings;

// Utility exports
export const cloneListing = listingAPI.cloneListing;
export const validateListing = listingAPI.validateListing;
export const checkSlugAvailability = listingAPI.checkSlugAvailability;

// Offer exports
export const makeOffer = offerAPI.makeOffer;
export const getMyOffers = offerAPI.getMyOffers;
export const getReceivedOffers = offerAPI.getReceivedOffers;
export const getOfferDetails = offerAPI.getOfferDetails;
export const acceptOffer = offerAPI.acceptOffer;
export const rejectOffer = offerAPI.rejectOffer;
export const cancelOffer = offerAPI.cancelOffer;
export const counterOffer = offerAPI.counterOffer;
export const getOfferChatLink = offerAPI.getOfferChatLink;

// Order exports - UPDATED
export const createOrder = orderAPI.createOrder;
export const getMyOrders = orderAPI.getMyOrders;
export const getSellerOrders = orderAPI.getSellerOrders;
export const getOrderDetails = orderAPI.getOrderDetails;
export const updateOrderStatus = orderAPI.updateOrderStatus;
export const startWorkOnOrder = orderAPI.startWork;
export const deliverOrder = orderAPI.deliverOrder;
export const requestRevision = orderAPI.requestRevision;
export const completeOrder = orderAPI.completeOrder;
export const getOrderTimeline = orderAPI.getOrderTimeline;
export const cancelOrder = orderAPI.cancelOrder;
export const getOrderMessagesForOrder = orderAPI.getOrderMessagesForOrder;
export const sendOrderMessage = orderAPI.sendOrderMessage;
export const getOrderStats = orderAPI.getOrderStats;
export const downloadInvoice = orderAPI.downloadInvoice;

// Payment exports
export const createPaymentIntent = paymentAPI.createPaymentIntent;
export const confirmPayment = paymentAPI.confirmPayment;
export const capturePayment = paymentAPI.capturePayment;
export const cancelPayment = paymentAPI.cancelPayment;
export const getPaymentStatus = paymentAPI.getPaymentStatus;
export const getStripePaymentMethods = paymentAPI.getStripePaymentMethods;
export const addStripePaymentMethod = paymentAPI.addStripePaymentMethod;
export const removeStripePaymentMethod = paymentAPI.removeStripePaymentMethod;

// Message exports
export const getOrderMessages = messageAPI.getOrderMessages;
export const sendMessage = messageAPI.sendMessage;
export const markMessageAsRead = messageAPI.markMessageAsRead;
export const getConversations = messageAPI.getConversations;
export const getConversation = messageAPI.getConversation;
export const markConversationAsRead = messageAPI.markConversationAsRead;
export const getUnreadCount = messageAPI.getUnreadCount;

// Dashboard exports
export const getSellerStats = dashboardAPI.getSellerStats;
export const getBuyerStats = dashboardAPI.getBuyerStats;
export const getSellerDashboard = dashboardAPI.getSellerDashboard;
export const getBuyerDashboard = dashboardAPI.getBuyerDashboard;
export const getRevenueAnalytics = dashboardAPI.getRevenueAnalytics;
export const getPerformanceMetrics = dashboardAPI.getPerformanceMetrics;

// Monitoring exports
export const logError = monitoringAPI.logError;
export const getErrorLogs = monitoringAPI.getErrorLogs;
export const getPerformanceData = monitoringAPI.getPerformanceData;
export const getServerStatus = monitoringAPI.getServerStatus;
export const getUptimeStats = monitoringAPI.getUptimeStats;

// Alert exports
export const getAlertConfigs = alertAPI.getAlertConfigs;
export const createAlertConfig = alertAPI.createAlertConfig;
export const updateAlertConfig = alertAPI.updateAlertConfig;
export const toggleAlertConfig = alertAPI.toggleAlertConfig;
export const getAlertHistory = alertAPI.getAlertHistory;

// Domain exports
export const getDomains = domainAPI.getDomains;
export const checkDomainExpiry = domainAPI.checkDomainExpiry;
export const sendDomainAlert = domainAPI.sendDomainAlert;

// Bookmark exports
export const addBookmark = bookmarkAPI.addBookmark;
export const removeBookmark = bookmarkAPI.removeBookmark;
export const getBookmarks = bookmarkAPI.getBookmarks;
export const getVideoHistory = bookmarkAPI.getVideoHistory;



export default api;