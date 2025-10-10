// api.ts - Clean & Organized Version
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

const api = axios.create({
  baseURL: "http://localhost:3000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
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
const handleApiRequest = async <T>(
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
    
    // Show toast for non-GET requests
    if (!error.config?.method || error.config.method !== 'get') {
      toast.error(errorMessage);
    }
    
    throw new Error(errorMessage);
  } finally {
    setLoading?.(false);
  }
};

// Core CRUD operations
export const getRequest = <T>(url: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>): Promise<T> =>
  handleApiRequest(api.get<T>(url), setLoading);

export const postRequest = <T>(
  url: string, 
  data: any, 
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>, 
  successMessage?: string
): Promise<T> => handleApiRequest(api.post<T>(url, data), setLoading, successMessage);

export const putRequest = <T>(
  url: string, 
  data: any, 
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>, 
  successMessage?: string
): Promise<T> => handleApiRequest(api.put<T>(url, data), setLoading, successMessage);

export const patchRequest = <T>(
  url: string, 
  data: any, 
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>, 
  successMessage?: string
): Promise<T> => handleApiRequest(api.patch<T>(url, data), setLoading, successMessage);

export const deleteRequest = <T>(
  url: string, 
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>, 
  successMessage?: string
): Promise<T> => handleApiRequest(api.delete<T>(url), setLoading, successMessage);

// ========================
// API GROUPS
// ========================

// Auth APIs
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

// Marketplace Listing APIs
export const listingAPI = {
  getListings: (params?: {
    type?: string; category?: string; minPrice?: number; maxPrice?: number;
    tags?: string[]; status?: string; page?: number; limit?: number;
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

  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/${listingId}`, setLoading),

  getMyListings: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/my-listings', setLoading),

  createListing: (formData: FormData, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading?.(true);
      const token = localStorage.getItem("token");
      
      fetch('http://localhost:3000/marketplace/listings/create-listing', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create listing');
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

  updateListing: (listingId: string, data: any, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/listings/${listingId}`, data, setLoading, "Listing updated"),

  deleteListing: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}`, setLoading, "Listing deleted")
};

// Offer APIs
export const offerAPI = {
  makeOffer: (offerData: { listingId: string; amount: number; message?: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/offers/make-offer', {
      listingId: offerData.listingId,
      amount: parseFloat(offerData.amount.toString()),
      message: offerData.message || ''
    }, setLoading, "Offer sent successfully"),

  getMyOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/my-offers', setLoading),

  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/seller-offers', setLoading),

  acceptOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/accept`, {}, setLoading, "Offer accepted"),

  rejectOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/reject`, {}, setLoading, "Offer rejected"),

  cancelOffer: (offerId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/${offerId}/cancel`, {}, setLoading, "Offer cancelled")
};

// Order APIs
export const orderAPI = {
  createOrder: (orderData: {
    listingId: string; orderType: string; amount: number;
    requirements?: string; expectedDelivery?: string;
  }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest('/marketplace/orders/create-order', orderData, setLoading, "Order created successfully"),

  getMyOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/my-orders', setLoading),

  getSellerOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/seller-orders', setLoading),

  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}`, setLoading),

  updateOrderStatus: (orderId: string, status: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/status`, { status }, setLoading, "Order status updated"),

  deliverOrder: (orderId: string, deliveryData: { deliveryMessage: string; deliveryFiles: string[] }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  requestRevision: (orderId: string, revisionNotes: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested")
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
      pending_payment: 'Payment Pending', paid: 'Paid', in_progress: 'In Progress',
      delivered: 'Delivered', in_revision: 'Revision Requested', completed: 'Completed',
      cancelled: 'Cancelled', disputed: 'Disputed'
    };
    return statusMap[status] || status;
  },

  getStatusColor: (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending_payment: 'bg-yellow-100 text-yellow-800', paid: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800',
      in_revision: 'bg-orange-100 text-orange-800', completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800', disputed: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  },

  validateListingData: (data: { title: string; price: number; type: string }) => {
    const errors: string[] = [];
    if (!data.title || data.title.length < 5) errors.push('Title must be at least 5 characters long');
    if (!data.price || data.price <= 0) errors.push('Price must be greater than 0');
    if (!data.type) errors.push('Please select a listing type');
    return errors;
  },

  validateOrderData: (data: { listingId: string; orderType: string; amount: number }) => {
    const errors: string[] = [];
    if (!data.listingId) errors.push('Listing ID is required');
    if (!data.orderType) errors.push('Order type is required');
    if (!data.amount || data.amount <= 0) errors.push('Amount must be greater than 0');
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

  formatMilliseconds: (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`,

  formatCurrency: (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
  }).format(amount || 0),

  formatDate: (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }
};

// ========================
// LEGACY INDIVIDUAL EXPORTS (Backward Compatibility)
// ========================

// Auth exports
export const loginUser = authAPI.login;
export const registerUser = authAPI.register;
export const getCurrentUser = authAPI.getCurrentUser;
export const updateProfile = authAPI.updateProfile;
export const isAuthenticated = authAPI.isAuthenticated;
export const logout = authAPI.logout;

// Marketplace exports
export const getListings = listingAPI.getListings;
export const getListingById = listingAPI.getListingById;
export const getMyListings = listingAPI.getMyListings;
export const createListing = listingAPI.createListing;
export const updateListing = listingAPI.updateListing;
export const deleteListing = listingAPI.deleteListing;

export const makeOffer = offerAPI.makeOffer;
export const getMyOffers = offerAPI.getMyOffers;
export const getReceivedOffers = offerAPI.getReceivedOffers;
export const acceptOffer = offerAPI.acceptOffer;
export const rejectOffer = offerAPI.rejectOffer;
export const cancelOffer = offerAPI.cancelOffer;

export const createOrder = orderAPI.createOrder;
export const getMyOrders = orderAPI.getMyOrders;
export const getSellerOrders = orderAPI.getSellerOrders;
export const getOrderDetails = orderAPI.getOrderDetails;
export const updateOrderStatus = orderAPI.updateOrderStatus;
export const deliverOrder = orderAPI.deliverOrder;
export const requestRevision = orderAPI.requestRevision;

export const getSellerStats = dashboardAPI.getSellerStats;
export const getBuyerStats = dashboardAPI.getBuyerStats;

// Utility exports
export const calculatePlatformFee = marketplaceUtils.calculatePlatformFee;
export const formatOrderStatus = marketplaceUtils.formatOrderStatus;
export const getStatusColor = marketplaceUtils.getStatusColor;
export const validateListingData = marketplaceUtils.validateListingData;
export const validateOrderData = marketplaceUtils.validateOrderData;

export const formatBytes = utils.formatBytes;
export const formatMilliseconds = utils.formatMilliseconds;
export const formatCurrency = utils.formatCurrency;
export const formatDate = utils.formatDate;

export default api;