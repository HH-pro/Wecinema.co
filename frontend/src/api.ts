// api.ts - Complete & Organized Version with all marketplace APIs
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding auth token
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
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========================
// CORE REQUEST FUNCTIONS
// ========================

interface ApiResponse {
  message?: string;
  error?: string;
  data?: any;
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
  const successMessage = response.data.message || message || "Operation successful";
  
  if (method === "delete" || method === "post" || method === "put" || method === "patch") {
    toast.success(successMessage);
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
    const response = await api.get<T>(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `API Error: ${error.response?.status} - ${error.response?.data?.error || 'Unknown error'}`
      );
    }
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
// FILE UPLOAD FUNCTIONS
// ========================

export const uploadFileRequest = async <T>(
  url: string,
  formData: FormData,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  onProgress?: (progress: number) => void
): Promise<T> => {
  setLoading(true);
  try {
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    setLoading(false);
    toast.success("File uploaded successfully");
    return response.data;
  } catch (error) {
    setLoading(false);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || "File upload failed";
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    toast.error("File upload failed");
    throw error;
  }
};

// ========================
// API GROUPS
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

// Stripe/Payment APIs
export const stripeAPI = {
  checkStatus: async (): Promise<{
    connected: boolean;
    status: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    stripeAccountId?: string;
  }> => {
    try {
      const response = await api.get('/marketplace/stripe/account-status');
      
      if (response.data.connected) {
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
      console.error('Error checking Stripe status:', error);
      return {
        connected: false,
        status: 'error'
      };
    }
  },

  createAccount: async (): Promise<{ url: string }> => {
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
  },

  completeOnboarding: (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/stripe/complete-onboarding", {}, setLoading, "Stripe account connected successfully"),

  confirmOfferPayment: async (offerId: string, paymentIntentId: string) => {
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
  },

  createPaymentIntent: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest<{
      clientSecret: string;
      paymentIntentId: string;
      amount: number;
      currency: string;
    }>("/stripe/create-payment-intent", { orderId }, setLoading),

  confirmPayment: (paymentIntentId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/stripe/confirm-payment", { paymentIntentId }, setLoading, "Payment confirmed successfully"),

  getSellerBalance: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<{
      available: number;
      pending: number;
      currency: string;
    }>("/stripe/balance", setLoading),

  createPayout: (amount: number, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/stripe/create-payout", { amount }, setLoading, "Payout initiated successfully"),

  getPayouts: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/stripe/payouts", setLoading),

  createLoginLink: (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest<{ url: string }>("/stripe/create-login-link", {}, setLoading)
};

// Marketplace Listing APIs
export const listingAPI = {
  // Get all listings with filters
  getListings: (
    params?: {
      type?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      status?: string;
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      sellerId?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
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

  // Get user's listings
  getUserListings: (
    userId: string,
    params?: {
      status?: string;
      category?: string;
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
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/user/${userId}/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get current user's listings
  getMyListings: (
    params?: {
      status?: string;
      category?: string;
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
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/my-listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Create listing with FormData
  createListing: (formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      api.post('/marketplace/listings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        }
      })
      .then((response) => {
        setLoading(false);
        toast.success("Listing created successfully!");
        resolve(response.data);
      })
      .catch((error) => {
        setLoading(false);
        const errorMessage = error.response?.data?.error || "Failed to create listing";
        toast.error(errorMessage);
        reject(new Error(errorMessage));
      });
    });
  },

  // Update listing with FormData
  updateListing: (listingId: string, formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      api.put(`/marketplace/listings/${listingId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        }
      })
      .then((response) => {
        setLoading(false);
        toast.success("Listing updated successfully!");
        resolve(response.data);
      })
      .catch((error) => {
        setLoading(false);
        const errorMessage = error.response?.data?.error || "Failed to update listing";
        toast.error(errorMessage);
        reject(new Error(errorMessage));
      });
    });
  },

  // Quick update listing (simple fields only)
  quickUpdateListing: (
    listingId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      category?: string;
      condition?: string;
      tags?: string[];
      stockQuantity?: number;
      deliveryTime?: string;
      shippingCost?: number;
      returnsAccepted?: boolean;
      brand?: string;
      color?: string;
      size?: string;
      weight?: number;
      dimensions?: string;
      warranty?: string;
      features?: string[];
      specifications?: any;
      metaTitle?: string;
      metaDescription?: string;
      slug?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(`/marketplace/listings/${listingId}/quick-update`, data, setLoading, "Listing updated successfully"),

  // Delete listing
  deleteListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}`, setLoading, "Listing deleted successfully"),

  // Update listing status
  updateListingStatus: (
    listingId: string, 
    status: 'active' | 'inactive' | 'sold' | 'reserved' | 'draft',
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    patchRequest(
      `/marketplace/listings/${listingId}/status`, 
      { status }, 
      setLoading, 
      `Listing status updated to ${status}`
    ),

  // Toggle video status
  toggleVideoStatus: (
    listingId: string,
    status: 'activated' | 'deactivated',
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    patchRequest(
      `/marketplace/listings/${listingId}/video-status`,
      { status },
      setLoading,
      `Video ${status === 'activated' ? 'activated' : 'deactivated'} successfully`
    ),

  // Delete specific media from listing
  deleteMedia: (
    listingId: string,
    mediaId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    deleteRequest(
      `/marketplace/listings/${listingId}/media/${mediaId}`,
      setLoading,
      "Media deleted successfully"
    ),

  // Duplicate listing
  duplicateListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest(
      `/marketplace/listings/${listingId}/duplicate`,
      {},
      setLoading,
      "Listing duplicated successfully"
    ),

  // Bulk actions
  bulkActions: (
    action: 'delete' | 'update_status' | 'update_category',
    listingIds: string[],
    data?: any,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest(
      '/marketplace/listings/bulk-actions',
      { action, listingIds, data },
      setLoading || (() => {}),
      `Bulk ${action} completed successfully`
    ),

  // Export listings
  exportListings: (
    params?: {
      format?: 'csv' | 'json';
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/export${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Search listings
  searchListings: (
    query: string,
    filters?: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      condition?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return getRequest(`/marketplace/listings/search?${queryParams.toString()}`, setLoading);
  },

  // Get listing analytics
  getAnalytics: (
    listingId: string,
    period?: 'day' | 'week' | 'month' | 'year',
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const query = period ? `?period=${period}` : '';
    return getRequest(`/marketplace/listings/${listingId}/analytics${query}`, setLoading);
  },

  // Get similar listings
  getSimilarListings: (
    listingId: string,
    limit?: number,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const query = limit ? `?limit=${limit}` : '';
    return getRequest(`/marketplace/listings/${listingId}/similar${query}`, setLoading);
  },

  // Favorite/Unfavorite listing
  toggleFavorite: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest(`/marketplace/listings/${listingId}/favorite`, {}, setLoading),

  // Get favorite listings
  getFavorites: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/favorites', setLoading),

  // Report listing
  reportListing: (
    listingId: string,
    reason: string,
    description?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest(
      `/marketplace/listings/${listingId}/report`,
      { reason, description },
      setLoading || (() => {}),
      "Report submitted successfully"
    )
};

// Offer APIs
export const offerAPI = {
  makeOffer: (
    offerData: {
      listingId: string;
      amount: number;
      message?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/offers/make-offer', offerData, setLoading, "Offer sent successfully"),

  getMyOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/my-offers', setLoading),

  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/received-offers', setLoading),

  acceptOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/accept-offer/${offerId}`, {}, setLoading, "Offer accepted"),

  rejectOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/reject-offer/${offerId}`, {}, setLoading, "Offer rejected"),

  cancelOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/cancel-offer/${offerId}`, {}, setLoading, "Offer cancelled"),

  negotiateOffer: (
    offerId: string,
    counterAmount: number,
    message?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(
      `/marketplace/offers/negotiate/${offerId}`,
      { counterAmount, message },
      setLoading || (() => {}),
      "Counter offer sent"
    ),

  getOfferHistory: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/offers/${offerId}/history`, setLoading)
};

// Order APIs
export const orderAPI = {
  createOrder: (
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
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setLoading?.(true);
    return postRequest('/marketplace/orders/create', orderData, setLoading || (() => {}), "Order created successfully")
      .catch(error => {
        setLoading?.(false);
        throw error;
      });
  },

  getMyOrders: (
    params?: {
      status?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/orders/my-orders${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  getSellerOrders: (
    params?: {
      status?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/orders/seller-orders${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}`, setLoading),

  updateOrderStatus: (
    orderId: string,
    status: string,
    notes?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(
      `/marketplace/orders/${orderId}/status`,
      { status, notes },
      setLoading || (() => {}),
      "Order status updated"
    ),

  startWork: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/start-work`, {}, setLoading, "Work started on order"),

  deliverOrder: (
    orderId: string,
    deliveryData: {
      deliveryMessage: string;
      deliveryFiles: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(`/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  requestRevision: (
    orderId: string,
    revisionNotes: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(`/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested"),

  completeOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/complete`, {}, setLoading, "Order completed"),

  getOrderTimeline: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/timeline`, setLoading),

  cancelOrder: (orderId: string, reason?: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(
      `/marketplace/orders/${orderId}/cancel`,
      { reason },
      setLoading || (() => {}),
      "Order cancelled"
    ),

  rateOrder: (
    orderId: string,
    rating: number,
    review?: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest(
      `/marketplace/orders/${orderId}/rate`,
      { rating, review },
      setLoading || (() => {}),
      "Rating submitted"
    ),

  getOrderMessages: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/messages`, setLoading)
};

// Payment APIs
export const paymentAPI = {
  createPaymentIntent: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/payments/create-payment-intent', { orderId }, setLoading),

  confirmPayment: (
    orderId: string,
    paymentIntentId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/payments/confirm-payment', { orderId, paymentIntentId }, setLoading, "Payment confirmed"),

  capturePayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/payments/capture-payment', { orderId }, setLoading, "Payment released to seller"),

  cancelPayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/payments/cancel-payment', { orderId }, setLoading, "Payment cancelled"),

  getPaymentStatus: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    getRequest(`/marketplace/payments/status/${orderId}`, setLoading),

  getTransactionHistory: (
    params?: {
      type?: 'payment' | 'payout' | 'refund';
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/payments/history${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  requestRefund: (
    orderId: string,
    reason: string,
    amount?: number,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest(
      `/marketplace/payments/${orderId}/refund`,
      { reason, amount },
      setLoading || (() => {}),
      "Refund requested"
    )
};

// Message APIs
export const messageAPI = {
  getOrderMessages: (
    orderId: string,
    params?: {
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/messages/${orderId}${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  sendMessage: (
    messageData: {
      orderId: string;
      message: string;
      receiverId: string;
      attachments?: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    postRequest('/marketplace/messages/send', messageData, setLoading, "Message sent"),

  markMessageAsRead: (
    messageId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    putRequest(`/marketplace/messages/${messageId}/read`, {}, setLoading),

  getConversations: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/messages/conversations', setLoading),

  getUnreadCount: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/messages/unread-count', setLoading)
};

// Dashboard APIs
export const dashboardAPI = {
  getSellerStats: (
    period?: 'day' | 'week' | 'month' | 'year',
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const query = period ? `?period=${period}` : '';
    return getRequest(`/marketplace/dashboard/seller-stats${query}`, setLoading);
  },

  getBuyerStats: (
    period?: 'day' | 'week' | 'month' | 'year',
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const query = period ? `?period=${period}` : '';
    return getRequest(`/marketplace/dashboard/buyer-stats${query}`, setLoading);
  },

  getRevenueAnalytics: (
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) =>
    getRequest(`/marketplace/dashboard/revenue-analytics?period=${period}`, setLoading),

  getTopListings: (
    limit?: number,
    period?: 'day' | 'week' | 'month' | 'year',
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (period) params.append('period', period);
    
    const queryString = params.toString();
    return getRequest(`/marketplace/dashboard/top-listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  getActivityFeed: (
    limit?: number,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const query = limit ? `?limit=${limit}` : '';
    return getRequest(`/marketplace/dashboard/activity-feed${query}`, setLoading);
  }
};

// ========================
// MARKETPLACE API GROUP
// ========================

export const marketplaceAPI = {
  auth: authAPI,
  stripe: stripeAPI,
  listings: listingAPI,
  offers: offerAPI,
  orders: orderAPI,
  payments: paymentAPI,
  messages: messageAPI,
  dashboard: dashboardAPI
};

// ========================
// MONITORING SYSTEM APIs
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
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/errors?${new URLSearchParams(params as any)}`, setLoading),

  getPerformanceMetrics: (
    timeRange: string = "24h",
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/performance?range=${timeRange}`, setLoading),

  getServerStatus: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/monitoring/status", setLoading),

  getUptimeStats: (
    timeRange: string = "7d",
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/uptime?range=${timeRange}`, setLoading)
};

// ========================
// ALERT SYSTEM APIs
// ========================

export const alertAPI = {
  getAlertConfigs: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/alerts/configs", setLoading),

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
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/alerts/history?${new URLSearchParams(params as any)}`, setLoading)
};

// ========================
// DOMAIN MONITORING APIs
// ========================

export const domainAPI = {
  getDomains: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/domains", setLoading),

  checkDomainExpiry: (
    domainId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/domains/${domainId}/check-expiry`, setLoading),

  sendDomainAlert: (
    domainId: string,
    channel: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest(`/api/domains/${domainId}/alert`, { channel }, setLoading, "Alert sent")
};

// ========================
// BOOKMARK & HISTORY APIs
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
    params?: {
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/bookmarks", setLoading),

  getVideoHistory: (
    params?: {
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/video/history", setLoading)
};

// ========================
// UTILITY FUNCTIONS
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
    await api.post('/api/log-error', errorData);
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
    await api.post('/api/log-performance', data);
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
    paid: 'Paid',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    in_revision: 'Revision Requested',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    confirmed: 'Confirmed',
    draft: 'Draft'
  };
  return statusMap[status] || status;
};

export const getStatusColor = (status: string) => {
  const statusColors: { [key: string]: string } = {
    pending_payment: 'var(--warning)',
    paid: 'var(--info)',
    in_progress: 'var(--primary)',
    delivered: 'var(--success)',
    in_revision: 'var(--warning)',
    completed: 'var(--success)',
    cancelled: 'var(--danger)',
    disputed: 'var(--danger)',
    confirmed: 'var(--info)',
    draft: 'var(--secondary)'
  };
  return statusColors[status] || 'var(--secondary)';
};

export const validateListingData = (data: {
  title: string;
  price: number;
  type: string;
}) => {
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

// ========================
// LEGACY INDIVIDUAL EXPORTS
// ========================

// Auth exports
export const loginUser = authAPI.login;
export const registerUser = authAPI.register;
export const getCurrentUser = authAPI.getCurrentUser;
export const updateProfile = authAPI.updateProfile;

// Marketplace exports
export const getListings = listingAPI.getListings;
export const getListingById = listingAPI.getListingById;
export const getMyListings = listingAPI.getMyListings;
export const getUserListings = listingAPI.getUserListings;
export const createListing = listingAPI.createListing;
export const updateListing = listingAPI.updateListing;
export const quickUpdateListing = listingAPI.quickUpdateListing;
export const deleteListing = listingAPI.deleteListing;
export const updateListingStatus = listingAPI.updateListingStatus;
export const toggleVideoStatus = listingAPI.toggleVideoStatus;
export const deleteMedia = listingAPI.deleteMedia;
export const duplicateListing = listingAPI.duplicateListing;
export const bulkActions = listingAPI.bulkActions;
export const exportListings = listingAPI.exportListings;
export const searchListings = listingAPI.searchListings;
export const getAnalytics = listingAPI.getAnalytics;
export const getSimilarListings = listingAPI.getSimilarListings;
export const toggleFavorite = listingAPI.toggleFavorite;
export const getFavorites = listingAPI.getFavorites;
export const reportListing = listingAPI.reportListing;

// Offer exports
export const makeOffer = offerAPI.makeOffer;
export const getMyOffers = offerAPI.getMyOffers;
export const getReceivedOffers = offerAPI.getReceivedOffers;
export const acceptOffer = offerAPI.acceptOffer;
export const rejectOffer = offerAPI.rejectOffer;
export const cancelOffer = offerAPI.cancelOffer;
export const negotiateOffer = offerAPI.negotiateOffer;
export const getOfferHistory = offerAPI.getOfferHistory;

// Order exports
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
export const rateOrder = orderAPI.rateOrder;

// Payment exports
export const createPaymentIntent = paymentAPI.createPaymentIntent;
export const confirmPayment = paymentAPI.confirmPayment;
export const capturePayment = paymentAPI.capturePayment;
export const cancelPayment = paymentAPI.cancelPayment;
export const getPaymentStatus = paymentAPI.getPaymentStatus;
export const getTransactionHistory = paymentAPI.getTransactionHistory;
export const requestRefund = paymentAPI.requestRefund;

// Message exports
export const getOrderMessages = messageAPI.getOrderMessages;
export const sendMessage = messageAPI.sendMessage;
export const markMessageAsRead = messageAPI.markMessageAsRead;
export const getConversations = messageAPI.getConversations;
export const getUnreadCount = messageAPI.getUnreadCount;

// Dashboard exports
export const getSellerStats = dashboardAPI.getSellerStats;
export const getBuyerStats = dashboardAPI.getBuyerStats;
export const getRevenueAnalytics = dashboardAPI.getRevenueAnalytics;
export const getTopListings = dashboardAPI.getTopListings;
export const getActivityFeed = dashboardAPI.getActivityFeed;

// Monitoring exports
export const logError = monitoringAPI.logError;
export const getErrorLogs = monitoringAPI.getErrorLogs;
export const getPerformanceMetrics = monitoringAPI.getPerformanceMetrics;
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

// Stripe exports
export const checkStripeStatus = stripeAPI.checkStatus;
export const createStripeAccount = stripeAPI.createAccount;
export const completeOnboarding = stripeAPI.completeOnboarding;
export const confirmOfferPayment = stripeAPI.confirmOfferPayment;
export const createPaymentIntents = stripeAPI.createPaymentIntent;
export const confirmPayments = stripeAPI.confirmPayment;
export const getSellerBalance = stripeAPI.getSellerBalance;
export const createPayout = stripeAPI.createPayout;
export const getPayouts = stripeAPI.getPayouts;
export const createLoginLink = stripeAPI.createLoginLink;

export default api;