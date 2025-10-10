// api.ts - Well Organized Version
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: "http://localhost:3000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================
// INTERCEPTORS
// ========================

// Request interceptor for adding token
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
}

// Generic request handler
const handleRequest = async <T>(
  request: Promise<AxiosResponse<T>>,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => {
  try {
    setLoading?.(true);
    const response = await request;
    
    if (successMessage) {
      toast.success(successMessage);
    }
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Request failed';
    
    // Only show toast for non-GET requests or specific errors
    if (!error.config?.method || error.config.method !== 'get') {
      toast.error(errorMessage);
    }
    
    throw new Error(errorMessage);
  } finally {
    setLoading?.(false);
  }
};

// Core CRUD operations
export const getRequest = <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<T> => handleRequest(api.get<T>(url), setLoading);

export const postRequest = <T>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => handleRequest(api.post<T>(url, data), setLoading, successMessage);

export const putRequest = <T>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => handleRequest(api.put<T>(url, data), setLoading, successMessage);

export const patchRequest = <T>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => handleRequest(api.patch<T>(url, data), setLoading, successMessage);

export const deleteRequest = <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): Promise<T> => handleRequest(api.delete<T>(url), setLoading, successMessage);

// ========================
// AUTH APIs
// ========================

export const authAPI = {
  login: (credentials: { email: string; password: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/login", credentials, setLoading, "Login successful"),

  register: (userData: { username: string; email: string; password: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/register", userData, setLoading, "Registration successful"),

  getCurrentUser: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/me", setLoading),

  updateProfile: (userData: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/profile", userData, setLoading, "Profile updated"),

  isAuthenticated: () => !!localStorage.getItem("token"),

  getToken: () => localStorage.getItem("token"),

  logout: () => {
    localStorage.removeItem("token");
    window.location.href = '/login';
  }
};

// ========================
// MARKETPLACE APIs
// ========================

// Listing APIs
export const listingAPI = {
  // Get all listings with optional filters
  getListings: (params?: {
    type?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    status?: string;
    page?: number;
    limit?: number;
  }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
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

  // Get listing by ID
  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/${listingId}`, setLoading),

  // Get current user's listings
  getMyListings: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/my-listings', setLoading),

  // Create new listing
  createListing: (formData: FormData, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading?.(true);
      const token = localStorage.getItem("token");
      
      fetch('http://localhost:3000/marketplace/listings/create-listing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create listing');
        }
        return data;
      })
      .then(data => {
        setLoading?.(false);
        toast.success("Listing created successfully!");
        resolve(data);
      })
      .catch(error => {
        setLoading?.(false);
        toast.error(error.message || "Failed to create listing");
        reject(error);
      });
    });
  },

  // Update listing
  updateListing: (listingId: string, data: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/listings/${listingId}`, data, setLoading, "Listing updated"),

  // Delete listing
  deleteListing: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}`, setLoading, "Listing deleted")
};

// Offer APIs
export const offerAPI = {
  // Make an offer
  makeOffer: (offerData: {
    listingId: string;
    amount: number;
    message?: string;
  }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/offers/make-offer', {
      listingId: offerData.listingId,
      amount: parseFloat(offerData.amount.toString()),
      message: offerData.message || ''
    }, setLoading, "Offer sent successfully"),

  // Get user's offers
  getMyOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/my-offers', setLoading),

  // Get received offers (for sellers)
  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/seller-offers', setLoading),

  // Accept offer
  acceptOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/accept`, {}, setLoading, "Offer accepted"),

  // Reject offer
  rejectOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/reject`, {}, setLoading, "Offer rejected"),

  // Cancel offer
  cancelOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/cancel`, {}, setLoading, "Offer cancelled")
};

// Order APIs
export const orderAPI = {
  // Create order
  createOrder: (orderData: {
    listingId: string;
    orderType: string;
    amount: number;
    requirements?: string;
    expectedDelivery?: string;
  }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/orders/create-order', orderData, setLoading, "Order created successfully"),

  // Get user's orders
  getMyOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/my-orders', setLoading),

  // Get seller's orders
  getSellerOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/seller-orders', setLoading),

  // Get order details
  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}`, setLoading),

  // Update order status
  updateOrderStatus: (orderId: string, status: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/status`, { status }, setLoading, "Order status updated"),

  // Deliver order
  deliverOrder: (orderId: string, deliveryData: {
    deliveryMessage: string;
    deliveryFiles: string[];
  }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  // Request revision
  requestRevision: (orderId: string, revisionNotes: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested")
};

// Payment APIs
export const paymentAPI = {
  createPaymentIntent: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/payments/create-payment-intent', { orderId }, setLoading),

  confirmPayment: (orderId: string, paymentIntentId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/payments/confirm-payment', { orderId, paymentIntentId }, setLoading, "Payment confirmed"),

  capturePayment: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/payments/capture-payment', { orderId }, setLoading, "Payment released to seller"),

  cancelPayment: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/payments/cancel-payment', { orderId }, setLoading, "Payment cancelled"),

  getPaymentStatus: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/payments/payment-status/${orderId}`, setLoading)
};

// Dashboard APIs
export const dashboardAPI = {
  getSellerStats: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/dashboard/seller-stats', setLoading),

  getBuyerStats: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/dashboard/buyer-stats', setLoading)
};

// ========================
// UTILITY FUNCTIONS
// ========================

// Marketplace Utilities
export const marketplaceUtils = {
  calculatePlatformFee: (amount: number, feePercent: number = 0.15) => {
    const platformFee = amount * feePercent;
    const sellerAmount = amount - platformFee;
    return {
      platformFee: Math.round(platformFee * 100) / 100,
      sellerAmount: Math.round(sellerAmount * 100) / 100,
      originalAmount: amount,
      feePercent
    };
  },

  formatOrderStatus: (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending_payment: 'Payment Pending',
      paid: 'Paid',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      in_revision: 'Revision Requested',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed'
    };
    return statusMap[status] || status;
  },

  getStatusColor: (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      in_revision: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      disputed: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  },

  validateListingData: (data: {
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
  },

  validateOrderData: (data: {
    listingId: string;
    orderType: string;
    amount: number;
  }) => {
    const errors: string[] = [];

    if (!data.listingId) {
      errors.push('Listing ID is required');
    }

    if (!data.orderType) {
      errors.push('Order type is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    return errors;
  }
};

// General Utilities
export const utils = {
  formatBytes: (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  },

  formatMilliseconds: (ms: number) => {
    return ms >= 1000 
      ? `${(ms / 1000).toFixed(2)}s`
      : `${Math.round(ms)}ms`;
  },

  formatCurrency: (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  },

  formatDate: (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }
};

// ========================
// LEGACY EXPORTS (for backward compatibility)
// ========================

// Individual exports
export {
  getRequest,
  postRequest,
  putRequest,
  patchRequest,
  deleteRequest
};

// Auth exports
export const {
  login: loginUser,
  register: registerUser,
  getCurrentUser,
  updateProfile: updateProfile,
  isAuthenticated,
  logout
} = authAPI;

// Marketplace individual exports
export const {
  getListings,
  getListingById,
  getMyListings,
  createListing,
  updateListing,
  deleteListing
} = listingAPI;

export const {
  makeOffer,
  getMyOffers,
  getReceivedOffers,
  acceptOffer,
  rejectOffer,
  cancelOffer
} = offerAPI;

export const {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getOrderDetails,
  updateOrderStatus,
  deliverOrder,
  requestRevision
} = orderAPI;

export const {
  getSellerStats,
  getBuyerStats
} = dashboardAPI;

// Utility exports
export const {
  calculatePlatformFee,
  formatOrderStatus,
  getStatusColor,
  validateListingData,
  validateOrderData
} = marketplaceUtils;

export const {
  formatBytes,
  formatMilliseconds,
  formatCurrency,
  formatDate
} = utils;

export default api;