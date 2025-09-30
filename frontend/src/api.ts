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