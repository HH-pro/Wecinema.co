// api.ts - Updated & Enhanced Version
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: "http://localhost:3000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Call: ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success: ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// ========================
// TYPES & INTERFACES
// ========================

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  listings?: T[];
  orders?: T[];
  offers?: T[];
  user?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  status: 'active' | 'sold' | 'draft' | 'inactive';
  mediaUrls: string[];
  tags: string[];
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Offer {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    price: number;
  };
  buyerId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  createdAt: string;
}

interface Order {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    price: number;
  };
  buyerId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  sellerId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  amount: number;
  status: string;
  shippingAddress?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========================
// CORE REQUEST FUNCTIONS
// ========================

const handleSuccess = <T>(
  response: AxiosResponse<ApiResponse<T>>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): ApiResponse<T> => {
  setLoading(false);
  
  if (message && (method === 'post' || method === 'put' || method === 'patch' || method === 'delete')) {
    toast.success(message);
  }
  
  return response.data;
};

const handleError = (
  error: AxiosError<ApiResponse>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<string> => {
  setLoading(false);

  let errorMessage = "An unexpected error occurred.";

  if (error.response) {
    errorMessage = error.response.data?.error || 
                  error.response.data?.message || 
                  `Server error: ${error.response.status}`;
  } else if (error.request) {
    errorMessage = "No response from server. Please check your connection.";
  } else {
    errorMessage = error.message;
  }

  if (method === "post" || method === "put" || method === "patch" || method === "delete") {
    toast.error(errorMessage);
  }

  return Promise.reject(errorMessage);
};

// Core CRUD operations with proper typing
export const postRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<ApiResponse<T>> =>
  api
    .post<ApiResponse<T>>(url, data)
    .then((response) => handleSuccess(response, "post", setLoading, message))
    .catch((error) => handleError(error, "post", setLoading));

export const getRequest = async <T>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<ApiResponse<T>> => {
  try {
    setLoading?.(true);
    const response = await api.get<ApiResponse<T>>(url);
    setLoading?.(false);
    return response.data;
  } catch (error) {
    setLoading?.(false);
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.error || `API Error: ${error.response?.status}`
      );
    }
    throw new Error('Network error occurred');
  }
};

export const putRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<ApiResponse<T>> =>
  api
    .put<ApiResponse<T>>(url, data)
    .then((response) => handleSuccess(response, "put", setLoading, message))
    .catch((error) => handleError(error, "put", setLoading));

export const patchRequest = <T>(
  url: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<ApiResponse<T>> =>
  api
    .patch<ApiResponse<T>>(url, data)
    .then((response) => handleSuccess(response, "patch", setLoading, message))
    .catch((error) => handleError(error, "patch", setLoading));

export const deleteRequest = <T>(
  url: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): Promise<ApiResponse<T>> =>
  api
    .delete<ApiResponse<T>>(url)
    .then((response) => handleSuccess(response, "delete", setLoading, message))
    .catch((error) => handleError(error, "delete", setLoading));

// ========================
// API GROUPS (Updated Routes)
// ========================

// Auth APIs
export const authAPI = {
  login: (credentials: { email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/login", credentials, setLoading, "Login successful"),

  register: (userData: { username: string; email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/register", userData, setLoading, "Registration successful"),

  getCurrentUser: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<any>("/api/auth/me", setLoading),

  updateProfile: (userData: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/profile", userData, setLoading, "Profile updated"),

  isAuthenticated: () => !!localStorage.getItem("token"),
  getToken: () => localStorage.getItem("token"),
  logout: () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = '/login';
  }
};

// Marketplace Listing APIs - UPDATED ROUTES
export const listingAPI = {
  // Get listings with filters
  getListings: (
    params?: {
      userId?: string;
      type?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      status?: string;
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ): Promise<ApiResponse<Listing[]>> => {
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
    const url = `/api/marketplace/listings${queryString ? `?${queryString}` : ''}`;
    
    return getRequest<Listing[]>(url, setLoading);
  },

  // Get specific listing by ID
  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Listing>(`/api/marketplace/listings/${listingId}`, setLoading),

  // Get current user's listings
  getMyListings: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Listing[]>('/api/marketplace/listings/my/listings', setLoading),

  // Get user's listings by user ID
  getUserListings: (userId: string, params?: { page?: number; limit?: number; status?: string }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    return getRequest<Listing[]>(`/api/marketplace/listings/user/${userId}/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Create new listing
  createListing: (formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise<ApiResponse<Listing>>((resolve, reject) => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      fetch('http://localhost:3000/api/marketplace/listings/create', {
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
        setLoading(false);
        toast.success("Listing created successfully!");
        resolve(data);
      })
      .catch(error => {
        setLoading(false);
        toast.error(error.message || "Failed to create listing");
        reject(error);
      });
    });
  },

  // Update listing
  updateListing: (listingId: string, data: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Listing>(`/api/marketplace/listings/${listingId}`, data, setLoading, "Listing updated"),

  // Delete listing
  deleteListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/api/marketplace/listings/${listingId}`, setLoading, "Listing deleted")
};

// Offer APIs - UPDATED ROUTES
export const offerAPI = {
  makeOffer: async (
    offerData: {
      listingId: string;
      amount: number;
      message?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ): Promise<ApiResponse<Offer>> => {
    try {
      setLoading(true);
      
      const requestData = {
        listingId: offerData.listingId,
        amount: parseFloat(offerData.amount.toString()),
        message: offerData.message || ''
      };

      const response = await api.post<ApiResponse<Offer>>('/api/marketplace/offers/make', requestData);
      
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
    getRequest<Offer[]>('/api/marketplace/offers/my/offers', setLoading),

  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Offer[]>('/api/marketplace/offers/received', setLoading),

  acceptOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Offer>(`/api/marketplace/offers/${offerId}/accept`, {}, setLoading, "Offer accepted"),

  rejectOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Offer>(`/api/marketplace/offers/${offerId}/reject`, {}, setLoading, "Offer rejected"),

  cancelOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Offer>(`/api/marketplace/offers/${offerId}/cancel`, {}, setLoading, "Offer cancelled")
};

// Order APIs - UPDATED ROUTES
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
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ): Promise<ApiResponse<Order>> => {
    try {
      setLoading?.(true);
      
      console.log("🛒 Creating order with data:", orderData);

      const response = await api.post<ApiResponse<Order>>('/api/marketplace/orders/create', orderData);
      
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
  getMyOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Order[]>('/api/marketplace/orders/my/orders', setLoading),

  // Get orders for seller
  getSellerOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Order[]>('/api/marketplace/orders/seller/orders', setLoading),

  // Get order details
  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<Order>(`/api/marketplace/orders/${orderId}`, setLoading),

  // Update order status
  updateOrderStatus: (orderId: string, status: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Order>(`/api/marketplace/orders/${orderId}/status`, { status }, setLoading, "Order status updated"),

  // Seller starts work on order
  startWork: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Order>(`/api/marketplace/orders/${orderId}/start-work`, {}, setLoading, "Work started on order"),

  // Seller delivers order
  deliverOrder: (
    orderId: string,
    deliveryData: {
      deliveryMessage: string;
      deliveryFiles: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest<Order>(`/api/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  // Buyer requests revision
  requestRevision: (
    orderId: string,
    revisionNotes: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest<Order>(`/api/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested"),

  // Buyer completes order
  completeOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Order>(`/api/marketplace/orders/${orderId}/complete`, {}, setLoading, "Order completed"),

  // Get order timeline
  getOrderTimeline: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest<any>(`/api/marketplace/orders/${orderId}/timeline`, setLoading),

  // Cancel order
  cancelOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest<Order>(`/api/marketplace/orders/${orderId}/cancel`, {}, setLoading, "Order cancelled")
};

// Payment APIs - UPDATED ROUTES
export const paymentAPI = {
  createPaymentIntent: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/create-intent', { orderId }, setLoading),

  confirmPayment: (
    orderId: string,
    paymentIntentId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/confirm', { orderId, paymentIntentId }, setLoading, "Payment confirmed"),

  capturePayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/capture', { orderId }, setLoading, "Payment released to seller"),

  cancelPayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/api/marketplace/payments/cancel', { orderId }, setLoading, "Payment cancelled"),

  getPaymentStatus: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/marketplace/payments/status/${orderId}`, setLoading)
};

// Message APIs - UPDATED ROUTES
export const messageAPI = {
  getOrderMessages: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/marketplace/messages/order/${orderId}`, setLoading),

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
  ) => putRequest(`/api/marketplace/messages/${messageId}/read`, {}, setLoading)
};

// Dashboard APIs - UPDATED ROUTES
export const dashboardAPI = {
  getSellerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/seller-stats', setLoading),

  getBuyerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/buyer-stats', setLoading),

  getSellerDashboard: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/seller', setLoading)
};

// ========================
// MARKETPLACE API GROUP
// ========================

export const marketplaceAPI = {
  listings: {
    get: listingAPI.getListings,
    getById: listingAPI.getListingById,
    getMy: listingAPI.getMyListings,
    getUserListings: listingAPI.getUserListings,
    create: listingAPI.createListing,
    update: listingAPI.updateListing,
    delete: listingAPI.deleteListing
  },
  offers: {
    make: offerAPI.makeOffer,
    getMy: offerAPI.getMyOffers,
    getReceived: offerAPI.getReceivedOffers,
    accept: offerAPI.acceptOffer,
    reject: offerAPI.rejectOffer,
    cancel: offerAPI.cancelOffer
  },
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
    cancel: orderAPI.cancelOrder
  },
  payments: {
    createIntent: paymentAPI.createPaymentIntent,
    confirm: paymentAPI.confirmPayment,
    capture: paymentAPI.capturePayment,
    cancel: paymentAPI.cancelPayment,
    getStatus: paymentAPI.getPaymentStatus
  },
  messages: {
    get: messageAPI.getOrderMessages,
    send: messageAPI.sendMessage,
    markRead: messageAPI.markMessageAsRead
  },
  dashboard: {
    getSellerStats: dashboardAPI.getSellerStats,
    getBuyerStats: dashboardAPI.getBuyerStats,
    getSellerDashboard: dashboardAPI.getSellerDashboard
  }
};

// ========================
// UTILITY FUNCTIONS
// ========================

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

// Response handlers for dashboard
export const handleApiResponse = <T>(response: ApiResponse<T>, defaultData: T): T => {
  if (response.success) {
    return response.data || defaultData;
  }
  throw new Error(response.error || 'API request failed');
};

// Error handler for components
export const handleApiError = (error: any, setError?: (message: string) => void) => {
  const errorMessage = error.response?.data?.error || error.message || 'Something went wrong';
  if (setError) {
    setError(errorMessage);
  }
  toast.error(errorMessage);
  return errorMessage;
};

// ========================
// LEGACY INDIVIDUAL EXPORTS (For backward compatibility)
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
export const deleteListing = listingAPI.deleteListing;

export const makeOffer = offerAPI.makeOffer;
export const getMyOffers = offerAPI.getMyOffers;
export const getReceivedOffers = offerAPI.getReceivedOffers;
export const acceptOffer = offerAPI.acceptOffer;
export const rejectOffer = offerAPI.rejectOffer;
export const cancelOffer = offerAPI.cancelOffer;

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

export const createPaymentIntent = paymentAPI.createPaymentIntent;
export const confirmPayment = paymentAPI.confirmPayment;
export const capturePayment = paymentAPI.capturePayment;
export const cancelPayment = paymentAPI.cancelPayment;
export const getPaymentStatus = paymentAPI.getPaymentStatus;

export const getOrderMessages = messageAPI.getOrderMessages;
export const sendMessage = messageAPI.sendMessage;
export const markMessageAsRead = messageAPI.markMessageAsRead;

export const getSellerStats = dashboardAPI.getSellerStats;
export const getBuyerStats = dashboardAPI.getBuyerStats;
export const getSellerDashboard = dashboardAPI.getSellerDashboard;

export default api;