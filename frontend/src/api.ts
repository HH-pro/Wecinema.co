// api.ts - Complete & Organized Version with marketplaceAPI export
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
interface ApiResponse {
  message?: string;
  error?: string;
  data?: any;
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
    window.location.href = '/login';
  }
};

// Marketplace Listing APIs
export const listingAPI = {
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

  getListingById: (listingId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/marketplace/listings/listings/${listingId}`, setLoading),

  getMyListings: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/listings/my-listings', setLoading),

  createListing: (formData: FormData, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      fetch('http://localhost:3000/api/marketplace/create-listing', {
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

  updateListing: (listingId: string, data: any, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/listings/${listingId}`, data, setLoading, "Listing updated"),

  deleteListing: (listingId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    deleteRequest(`/marketplace/listings/${listingId}`, setLoading, "Listing deleted")
};

// Offer APIs
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
      
      // Ensure we're sending proper JSON
      const requestData = {
        listingId: offerData.listingId,
        amount: parseFloat(offerData.amount.toString()), // Ensure it's a number
        message: offerData.message || ''
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
    getRequest('/api/marketplace/offers/my-offers', setLoading),

  getReceivedOffers: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/marketplace/offers/received-offers', setLoading),

  acceptOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/marketplace/offers/accept-offer/${offerId}`, {}, setLoading, "Offer accepted"),

  rejectOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/marketplace/offers/reject-offer/${offerId}`, {}, setLoading, "Offer rejected"),

  cancelOffer: (offerId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/marketplace/offers/cancel-offer/${offerId}`, {}, setLoading, "Offer cancelled")
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
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    try {
      setLoading(true);
      
      console.log("🛒 Creating order with data:", orderData);

      const response = await api.post('/orders/create', orderData);
      
      toast.success("Order created successfully!");
      return response.data;
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create order';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  },

  // Get orders for buyer
  getMyOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/api/orders/my-orders', setLoading),

  // Get orders for seller
  getSellerOrders: (setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest('/api/orders/my-sales', setLoading),

  // Get order details
  getOrderDetails: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/orders/${orderId}`, setLoading),

  // Update order status
  updateOrderStatus: (orderId: string, status: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/orders/${orderId}/status`, { status }, setLoading, "Order status updated"),

  // Seller starts work on order
  startWork: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/orders/${orderId}/start-work`, {}, setLoading, "Work started on order"),

  // Seller delivers order
  deliverOrder: (
    orderId: string,
    deliveryData: {
      deliveryMessage: string;
      deliveryFiles: string[];
    },
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/api/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered"),

  // Buyer requests revision
  requestRevision: (
    orderId: string,
    revisionNotes: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => putRequest(`/api/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested"),

  // Buyer completes order
  completeOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/orders/${orderId}/complete`, {}, setLoading, "Order completed"),

  // Get order timeline
  getOrderTimeline: (orderId: string, setLoading?: React.Dispatch<React.SetStateAction<boolean>>) =>
    getRequest(`/api/orders/${orderId}/timeline`, setLoading),

  // Cancel order
  cancelOrder: (orderId: string, setLoading: React.Dispatch<React.SetStateAction<boolean>>) =>
    putRequest(`/api/orders/${orderId}/cancel`, {}, setLoading, "Order cancelled")
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
  ) => getRequest(`/api/marketplace/payments/payment-status/${orderId}`, setLoading)
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
  ) => putRequest(`/api/marketplace/messages/${messageId}/read`, {}, setLoading)
};

// Dashboard APIs
export const dashboardAPI = {
  getSellerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/seller-stats', setLoading),

  getBuyerStats: (
    setLoading?: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest('/api/marketplace/dashboard/buyer-stats', setLoading)
};

// ========================
// MARKETPLACE API GROUP (Added for MarketplaceContext)
// ========================

export const marketplaceAPI = {
  listings: {
    get: listingAPI.getListings,
    getById: listingAPI.getListingById,
    getMy: listingAPI.getMyListings,
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
    getBuyerStats: dashboardAPI.getBuyerStats
  }
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
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/monitoring/errors?${new URLSearchParams(params as any)}`, setLoading),

  getPerformanceMetrics: (
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
// ALERT SYSTEM APIs
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
// DOMAIN MONITORING APIs
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
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest("/api/bookmarks", setLoading),

  getVideoHistory: (
    userId: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) => getRequest(`/api/video/history/${userId}`, setLoading)
};

// ========================
// UTILITY FUNCTIONS (All Preserved)
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

// ========================
// LEGACY INDIVIDUAL EXPORTS (All Preserved)
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

export default api;