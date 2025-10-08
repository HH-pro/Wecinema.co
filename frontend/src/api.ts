import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

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
// AUTH & USER APIs
// ========================

export const loginUser = (
  credentials: { email: string; password: string },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest("/api/auth/login", credentials, setLoading, "Login successful");

export const registerUser = (
  userData: { username: string; email: string; password: string },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest("/api/auth/register", userData, setLoading, "Registration successful");

export const getCurrentUser = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/api/auth/me", setLoading);

export const updateProfile = (
  userData: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest("/api/auth/profile", userData, setLoading, "Profile updated");

// ========================
// MARKETPLACE APIs
// ========================

// Listing APIs
export const getListings = (
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
  return getRequest(`/marketplace/listings${queryString ? `?${queryString}` : ''}`, setLoading);
};

export const getListingById = (
  listingId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/marketplace/listings/${listingId}`, setLoading);

export const getMyListings = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/marketplace/listings/my-listings', setLoading);

export const createListing = (
  formData: FormData,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
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
};

export const updateListing = (
  listingId: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/listings/${listingId}`, data, setLoading, "Listing updated");

export const deleteListing = (
  listingId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => deleteRequest(`/api/marketplace/listings/${listingId}`, setLoading, "Listing deleted");

// Offer APIs
export const makeOffer = async (
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
};

export const getMyOffers = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/marketplace/offers/my-offers', setLoading);

export const getReceivedOffers = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/offers/received-offers', setLoading);

export const acceptOffer = (
  offerId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/offers/accept-offer/${offerId}`, {}, setLoading, "Offer accepted");

export const rejectOffer = (
  offerId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/offers/reject-offer/${offerId}`, {}, setLoading, "Offer rejected");

export const cancelOffer = (
  offerId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/offers/cancel-offer/${offerId}`, {}, setLoading, "Offer cancelled");

// Order APIs
export const createOrder = (
  orderData: {
    listingId: string;
    orderType: string;
    amount: number;
    requirements?: string;
    expectedDelivery?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/orders/create-order', orderData, setLoading, "Order created successfully");

export const getMyOrders = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/orders/my-orders', setLoading);

export const getSellerOrders = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/orders/seller-orders', setLoading);

export const getOrderDetails = (
  orderId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/marketplace/orders/${orderId}`, setLoading);

export const updateOrderStatus = (
  orderId: string,
  status: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/orders/${orderId}/status`, { status }, setLoading, "Order status updated");

export const deliverOrder = (
  orderId: string,
  deliveryData: {
    deliveryMessage: string;
    deliveryFiles: string[];
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/orders/${orderId}/deliver`, deliveryData, setLoading, "Order delivered");

export const requestRevision = (
  orderId: string,
  revisionNotes: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/orders/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested");

// Payment APIs
export const createPaymentIntent = (
  orderId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/payments/create-payment-intent', { orderId }, setLoading);

export const confirmPayment = (
  orderId: string,
  paymentIntentId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/payments/confirm-payment', { orderId, paymentIntentId }, setLoading, "Payment confirmed");

export const capturePayment = (
  orderId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/payments/capture-payment', { orderId }, setLoading, "Payment released to seller");

export const cancelPayment = (
  orderId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/payments/cancel-payment', { orderId }, setLoading, "Payment cancelled");

export const getPaymentStatus = (
  orderId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/marketplace/payments/payment-status/${orderId}`, setLoading);

// Message APIs
export const getOrderMessages = (
  orderId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/marketplace/messages/${orderId}`, setLoading);

export const sendMessage = (
  messageData: {
    orderId: string;
    message: string;
    receiverId: string;
    attachments?: string[];
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/messages/send', messageData, setLoading, "Message sent");

export const markMessageAsRead = (
  messageId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/messages/${messageId}/read`, {}, setLoading);

// Dashboard APIs
export const getSellerStats = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/dashboard/seller-stats', setLoading);

export const getBuyerStats = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/dashboard/buyer-stats', setLoading);

// ========================
// MONITORING SYSTEM APIs
// ========================

export const logError = (
  errorData: {
    type: string;
    message: string;
    stack?: string;
    url?: string;
    severity?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest("/api/monitoring/errors", errorData, setLoading);

export const getErrorLogs = (
  params: {
    limit?: number;
    severity?: string;
    timeRange?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/monitoring/errors?${new URLSearchParams(params as any)}`, setLoading);

export const getPerformanceMetrics = (
  timeRange: string = "24h",
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/monitoring/performance?range=${timeRange}`, setLoading);

export const getServerStatus = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/api/monitoring/status", setLoading);

export const getUptimeStats = (
  timeRange: string = "7d",
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/monitoring/uptime?range=${timeRange}`, setLoading);

// ========================
// ALERT SYSTEM APIs
// ========================

export const getAlertConfigs = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/api/alerts/configs", setLoading);

export const createAlertConfig = (
  configData: {
    alertType: string;
    metric: string;
    threshold: number;
    channel: string;
    recipient: string;
    severity: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest("/api/alerts/configs", configData, setLoading, "Alert config created");

export const updateAlertConfig = (
  id: string,
  configData: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/alerts/configs/${id}`, configData, setLoading, "Alert config updated");

export const toggleAlertConfig = (
  id: string,
  isActive: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => patchRequest(`/api/alerts/configs/${id}/toggle`, { isActive }, setLoading, "Alert config updated");

export const getAlertHistory = (
  params: {
    limit?: number;
    status?: string;
    timeRange?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/alerts/history?${new URLSearchParams(params as any)}`, setLoading);

// ========================
// DOMAIN MONITORING APIs
// ========================

export const getDomains = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/api/domains", setLoading);

export const checkDomainExpiry = (
  domainId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/domains/${domainId}/check-expiry`, setLoading);

export const sendDomainAlert = (
  domainId: string,
  channel: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest(`/api/domains/${domainId}/alert`, { channel }, setLoading, "Alert sent");

// ========================
// BOOKMARK & HISTORY APIs
// ========================

export const addBookmark = (
  videoId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest(`/api/bookmarks/${videoId}`, {}, setLoading, "Bookmark added");

export const removeBookmark = (
  videoId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => deleteRequest(`/api/bookmarks/${videoId}`, setLoading, "Bookmark removed");

export const getBookmarks = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/api/bookmarks", setLoading);

export const getVideoHistory = (
  userId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/video/history/${userId}`, setLoading);

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
    disputed: 'Disputed'
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
    disputed: 'var(--danger)'
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

// Export all marketplace APIs as a grouped object
export const marketplaceAPI = {
  listings: {
    get: getListings,
    getById: getListingById,
    getMy: getMyListings,
    create: createListing,
    update: updateListing,
    delete: deleteListing
  },
  offers: {
    make: makeOffer,
    getMy: getMyOffers,
    getReceived: getReceivedOffers,
    accept: acceptOffer,
    reject: rejectOffer,
    cancel: cancelOffer
  },
  orders: {
    create: createOrder,
    getMy: getMyOrders,
    getSeller: getSellerOrders,
    getDetails: getOrderDetails,
    updateStatus: updateOrderStatus,
    deliver: deliverOrder,
    requestRevision: requestRevision
  },
  payments: {
    createIntent: createPaymentIntent,
    confirm: confirmPayment,
    capture: capturePayment,
    cancel: cancelPayment,
    getStatus: getPaymentStatus
  },
  messages: {
    get: getOrderMessages,
    send: sendMessage,
    markRead: markMessageAsRead
  },
  dashboard: {
    getSellerStats: getSellerStats,
    getBuyerStats: getBuyerStats
  },
  utils: {
    calculateFees: calculatePlatformFee,
    formatStatus: formatOrderStatus,
    getStatusColor: getStatusColor,
    validateListing: validateListingData,
    validateOrder: validateOrderData
  }
};

// Export all auth APIs as a grouped object
export const authAPI = {
  login: loginUser,
  register: registerUser,
  getCurrentUser: getCurrentUser,
  updateProfile: updateProfile,
  isAuthenticated: isAuthenticated,
  getCurrentUserFromToken: getCurrentUserFromToken
};

export default api;