// api.ts - Complete & Organized Version with marketplaceAPI export
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: "http://localhost:3000/", // Base URL for all requests
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for adding tokens
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
  success?: boolean;
  message?: string;
  error?: string;
  data?: any;
}

const handleSuccess = <T extends ApiResponse>(
  response: AxiosResponse<T>,
  method: Method,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  message?: string
): T => {
  setLoading(false);
  
  if (method !== "get" && response.data.message) {
    toast.success(response.data.message || message || "Successful");
  }
  
  return response.data;
};

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

    if (method !== "get") {
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

// CRUD operations
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
      const errorMsg = error.response?.data?.error || error.message;
      throw new Error(errorMsg);
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
// AUTH APIs
// ========================

export const authAPI = {
  login: (credentials: { email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/login", credentials, setLoading, "Login successful"),

  register: (userData: { username: string; email: string; password: string }, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    postRequest("/api/auth/register", userData, setLoading, "Registration successful"),

  getCurrentUser: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest("/api/auth/me", setLoading),

  updateProfile: (userData: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest("/api/auth/profile", userData, setLoading, "Profile updated"),

  logout: () => {
    localStorage.removeItem("token");
    window.location.href = '/';
  },

  isAuthenticated: () => !!localStorage.getItem("token"),
  getToken: () => localStorage.getItem("token"),
};

// ========================
// STRIPE & PAYMENT APIs
// ========================

export const checkStripeStatus = async (): Promise<{
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
    return {
      connected: false,
      status: 'error'
    };
  }
};

export const createStripeAccount = async (): Promise<{ url: string }> => {
  try {
    const response = await api.post('/marketplace/stripe/onboard-seller');
    
    if (response.data.success && response.data.url) {
      return { url: response.data.url };
    } else {
      throw new Error(response.data.error || 'Failed to create Stripe account');
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to connect Stripe account');
  }
};

export const completeOnboarding = (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/stripe/complete-onboarding", {}, setLoading, "Stripe account connected successfully");

export const confirmOfferPayment = async (offerId: string, paymentIntentId: string) => {
  try {
    const response = await api.post('/marketplace/offers/confirm-offer-payment', {
      offerId,
      paymentIntentId
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Payment confirmation failed');
  }
};

export const createPaymentIntents = (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
  }>("/marketplace/stripe/create-payment-intent", { orderId }, setLoading);

export const confirmPayments = (paymentIntentId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/stripe/confirm-payment", { paymentIntentId }, setLoading, "Payment confirmed successfully");

export const getSellerBalance = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest<{
    available: number;
    pending: number;
    currency: string;
  }>("/marketplace/stripe/balance", setLoading);

export const createPayout = (amount: number, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest("/marketplace/stripe/create-payout", { amount }, setLoading, "Payout initiated successfully");

export const getPayouts = (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
  getRequest("/marketplace/stripe/payouts", setLoading);

export const createLoginLink = (setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
  postRequest<{ url: string }>("/marketplace/stripe/create-login-link", {}, setLoading);

// ========================
// MARKETPLACE LISTING APIs
// ========================

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
      sort?: string;
      order?: string;
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
    return getRequest(`/marketplace/listings/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Get single listing by ID
  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/listing/${listingId}`, setLoading),

  // Get user's own listings
  getMyListings: (params?: { status?: string; page?: number; limit?: number }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/my-listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Create new listing
  createListing: (formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      fetch('http://localhost:3000/api/marketplace/listings/create-listing', {
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

  // Update existing listing
  updateListing: (listingId: string, data: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/listings/listing/${listingId}`, data, setLoading, "Listing updated successfully"),

  // Delete listing
  deleteListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/listing/${listingId}`, setLoading, "Listing deleted successfully"),

  // Toggle listing status
  toggleListingStatus: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    patchRequest(`/marketplace/listings/listing/${listingId}/toggle-status`, {}, setLoading, "Listing status updated"),

  // Get listings by user ID
  getUserListings: (userId: string, params?: { status?: string; page?: number; limit?: number }, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/user/${userId}/listings${queryString ? `?${queryString}` : ''}`, setLoading);
  },

  // Search listings
  searchListings: (
    params: {
      query?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      tags?: string[];
      page?: number;
      limit?: number;
    },
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    const queryString = queryParams.toString();
    return getRequest(`/marketplace/listings/search${queryString ? `?${queryString}` : ''}`, setLoading);
  }
};

// ========================
// OFFER APIs
// ========================

export const offerAPI = {
  makeOffer: async (
    offerData: {
      listingId: string;
      amount: number;
      message?: string;
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      setLoading(true);
      
      const requestData = {
        listingId: offerData.listingId,
        amount: parseFloat(offerData.amount.toString()),
        message: offerData.message || ''
      };

      const response = await api.post('/marketplace/offers/make-offer', requestData);
      
      toast.success("Offer sent successfully!");
      return response.data;
    } catch (error: any) {
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
    putRequest(`/marketplace/offers/accept-offer/${offerId}`, {}, setLoading, "Offer accepted successfully"),

  rejectOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/reject-offer/${offerId}`, {}, setLoading, "Offer rejected successfully"),

  cancelOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/cancel-offer/${offerId}`, {}, setLoading, "Offer cancelled successfully")
};

// ========================
// ORDER APIs
// ========================

export const orderAPI = {
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
  ) => {
    try {
      setLoading?.(true);
      
      const response = await api.post('/marketplace/orders/create', orderData);
      
      toast.success("Order created successfully!");
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create order';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading?.(false);
    }
  },

  getMyOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/my-orders', setLoading),

  getSellerOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/orders/my-sales', setLoading),

  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}`, setLoading),

  updateOrderStatus: (orderId: string, status: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/status`, { status }, setLoading, "Order status updated"),

  startWork: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/start-work`, {}, setLoading, "Work started on order"),

  deliverOrder: (
    orderId: string,
    deliveryData: {
      deliveryMessage: string;
      deliveryFiles: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  requestRevision: (
    orderId: string,
    revisionNotes: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested"),

  completeOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/complete`, {}, setLoading, "Order completed"),

  getOrderTimeline: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/orders/${orderId}/timeline`, setLoading),

  cancelOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/orders/${orderId}/cancel`, {}, setLoading, "Order cancelled")
};

// ========================
// PAYMENT APIs
// ========================

export const paymentAPI = {
  createPaymentIntent: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/marketplace/payments/create-payment-intent', { orderId }, setLoading),

  confirmPayment: (
    orderId: string,
    paymentIntentId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/marketplace/payments/confirm-payment', { orderId, paymentIntentId }, setLoading, "Payment confirmed"),

  capturePayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/marketplace/payments/capture-payment', { orderId }, setLoading, "Payment released to seller"),

  cancelPayment: (
    orderId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/marketplace/payments/cancel-payment', { orderId }, setLoading, "Payment cancelled"),

  getPaymentStatus: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/marketplace/payments/payment-status/${orderId}`, setLoading)
};

// ========================
// MESSAGE APIs
// ========================

export const messageAPI = {
  getOrderMessages: (
    orderId: string,
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/marketplace/messages/${orderId}`, setLoading),

  sendMessage: (
    messageData: {
      orderId: string;
      message: string;
      receiverId: string;
      attachments?: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => postRequest('/marketplace/messages/send', messageData, setLoading, "Message sent"),

  markMessageAsRead: (
    messageId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/marketplace/messages/${messageId}/read`, {}, setLoading)
};

// ========================
// DASHBOARD APIs
// ========================

export const dashboardAPI = {
  getSellerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/marketplace/dashboard/seller-stats', setLoading),

  getBuyerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/marketplace/dashboard/buyer-stats', setLoading)
};

// ========================
// MARKETPLACE API GROUP (Main export)
// ========================

export const marketplaceAPI = {
  listings: {
    get: listingAPI.getListings,
    getById: listingAPI.getListingById,
    getMy: listingAPI.getMyListings,
    getUser: listingAPI.getUserListings,
    search: listingAPI.searchListings,
    create: listingAPI.createListing,
    update: listingAPI.updateListing,
    delete: listingAPI.deleteListing,
    toggleStatus: listingAPI.toggleListingStatus
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
    getBuyerStats: dashboardAPI.getBuyerStats
  },
  stripe: {
    checkStatus: checkStripeStatus,
    createAccount: createStripeAccount,
    completeOnboarding,
    createPaymentIntents,
    confirmPayment: confirmPayments,
    getBalance: getSellerBalance,
    createPayout,
    getPayouts,
    createLoginLink
  }
};

// ========================
// UTILITY FUNCTIONS
// ========================

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
    confirmed: 'Confirmed'
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
    confirmed: 'var(--info)'
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
// LEGACY INDIVIDUAL EXPORTS (for backward compatibility)
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

// Payment exports
export const createPaymentIntent = paymentAPI.createPaymentIntent;
export const confirmPayment = paymentAPI.confirmPayment;
export const capturePayment = paymentAPI.capturePayment;
export const cancelPayment = paymentAPI.cancelPayment;
export const getPaymentStatus = paymentAPI.getPaymentStatus;

// Message exports
export const getOrderMessages = messageAPI.getOrderMessages;
export const sendMessage = messageAPI.sendMessage;
export const markMessageAsRead = messageAPI.markMessageAsRead;

// Dashboard exports
export const getSellerStats = dashboardAPI.getSellerStats;
export const getBuyerStats = dashboardAPI.getBuyerStats;

export default api;