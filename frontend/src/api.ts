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

// Interface for API response
interface ApiResponse {
  message?: string;
  error?: string;
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
// api.ts
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

// Monitoring System APIs
export const logError = (
  errorData: {
    type: string;
    message: string;
    stack?: string;
    url?: string;
    severity?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest("/monitoring/errors", errorData, setLoading);

export const getErrorLogs = (
  params: {
    limit?: number;
    severity?: string;
    timeRange?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/monitoring/errors?${new URLSearchParams(params as any)}`, setLoading);

export const getPerformanceMetrics = (
  timeRange: string = "24h",
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/monitoring/performance?range=${timeRange}`, setLoading);

export const getServerStatus = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/monitoring/status", setLoading);

export const getUptimeStats = (
  timeRange: string = "7d",
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/monitoring/uptime?range=${timeRange}`, setLoading);

// Alert System APIs
export const getAlertConfigs = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/alerts/configs", setLoading);

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
) => postRequest("/alerts/configs", configData, setLoading, "Alert config created");

export const updateAlertConfig = (
  id: string,
  configData: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/alerts/configs/${id}`, configData, setLoading, "Alert config updated");

export const toggleAlertConfig = (
  id: string,
  isActive: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => patchRequest(`/alerts/configs/${id}/toggle`, { isActive }, setLoading, "Alert config updated");

export const getAlertHistory = (
  params: {
    limit?: number;
    status?: string;
    timeRange?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/alerts/history?${new URLSearchParams(params as any)}`, setLoading);

// Domain Monitoring APIs
export const getDomains = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/domains", setLoading);

export const checkDomainExpiry = (
  domainId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/domains/${domainId}/check-expiry`, setLoading);

export const sendDomainAlert = (
  domainId: string,
  channel: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest(`/domains/${domainId}/alert`, { channel }, setLoading, "Alert sent");

// Bookmark APIs
export const addBookmark = (
  videoId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest(`/bookmarks/${videoId}`, {}, setLoading, "Bookmark added");

export const removeBookmark = (
  videoId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => deleteRequest(`/bookmarks/${videoId}`, setLoading, "Bookmark removed");

export const getBookmarks = (
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest("/bookmarks", setLoading);

// Video History APIs
export const getVideoHistory = (
  userId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/video/history/${userId}`, setLoading);

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

// src/utils/errorHandler.ts
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

// src/utils/performanceTracker.ts
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

// src/utils/format.ts
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

// ... your existing imports and code ...

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
  },
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const queryParams = new URLSearchParams(params as any).toString();
  return getRequest(`/api/marketplace/listings?${queryParams}`, setLoading);
};

export const getMyListings = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/my-listings', setLoading);

export const createListing = (
  formData: FormData,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // For FormData, we need to handle differently
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
    .then(response => response.json())
    .then(data => {
      setLoading(false);
      if (data.error) {
        toast.error(data.error);
        reject(data.error);
      } else {
        toast.success("Listing created successfully!");
        resolve(data);
      }
    })
    .catch(error => {
      setLoading(false);
      toast.error("Failed to create listing");
      reject(error);
    });
  });
};

export const updateListing = (
  listingId: string,
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/listing/${listingId}`, data, setLoading, "Listing updated");

export const deleteListing = (
  listingId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => deleteRequest(`/api/marketplace/listing/${listingId}`, setLoading, "Listing deleted");

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
) => postRequest('/api/marketplace/create-order', orderData, setLoading, "Order created");

export const getMyOrders = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/my-orders', setLoading);

export const getSellerOrders = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/seller-orders', setLoading);

export const getOrderDetails = (
  orderId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest(`/api/marketplace/order/${orderId}`, setLoading);

export const updateOrderStatus = (
  orderId: string,
  status: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/order/${orderId}`, { status }, setLoading, "Order status updated");

export const deliverOrder = (
  orderId: string,
  deliveryData: {
    deliveryMessage: string;
    deliveryFiles: string[];
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/order/${orderId}/deliver`, deliveryData, setLoading, "Order delivered");

export const requestRevision = (
  orderId: string,
  revisionNotes: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/order/${orderId}/request-revision`, { revisionNotes }, setLoading, "Revision requested");

// Offer APIs
export const makeOffer = (
  offerData: {
    listingId: string;
    amount: number;
    message?: string;
  },
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => postRequest('/api/marketplace/make-offer', offerData, setLoading, "Offer sent");

export const getReceivedOffers = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/received-offers', setLoading);

export const acceptOffer = (
  offerId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/accept-offer/${offerId}`, {}, setLoading, "Offer accepted");

export const rejectOffer = (
  offerId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/reject-offer/${offerId}`, {}, setLoading, "Offer rejected");

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
) => postRequest('/api/marketplace/send-message', messageData, setLoading, "Message sent");

export const markMessageAsRead = (
  messageId: string,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => putRequest(`/api/marketplace/message-read/${messageId}`, {}, setLoading);

// Dashboard APIs
export const getSellerStats = (
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => getRequest('/api/marketplace/seller-dashboard', setLoading);

// ========================
// MARKETPLACE UTILITIES
// ========================

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

// Export all marketplace APIs as a grouped object
export const marketplaceAPI = {
  listings: {
    get: getListings,
    getMy: getMyListings,
    create: createListing,
    update: updateListing,
    delete: deleteListing
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
  offers: {
    make: makeOffer,
    getReceived: getReceivedOffers,
    accept: acceptOffer,
    reject: rejectOffer
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
    getStats: getSellerStats
  },
  utils: {
    calculateFees: calculatePlatformFee,
    formatStatus: formatOrderStatus,
    getStatusColor: getStatusColor,
    validateListing: validateListingData,
    validateOrder: validateOrderData
  }
};

// ... your existing exports continue ...
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

// services/api.js

export const apiClient = {
  async request(url, options = {}) {
    const token = auth.getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Token expired
      auth.logout();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response;
  }
};