// api.ts - Enhanced with better error handling, retry logic, and TypeScript improvements
import axios, { AxiosResponse, AxiosError, Method, AxiosRequestConfig } from "axios";
import { toast } from "react-toastify";

// ========================
// TYPES & INTERFACES
// ========================

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface RequestOptions {
  showToast?: boolean;
  retryCount?: number;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================
export const API_BASE_URL = "https://wecinema.co/"; // Production
// export const API_BASE_URL = "http://localhost:5000/api"; // Local
// Environment-based configuration
const getBaseURL = () => "https://wecinema-co.onrender.com";
 

// Create an axios instance with default configurations
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Request queue for handling concurrent requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
  config: AxiosRequestConfig;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor for adding tokens and handling retry logic
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing
    config.headers["X-Request-ID"] = crypto.randomUUID();

    // Add timestamp
    config.headers["X-Timestamp"] = Date.now().toString();

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful requests in development
    if (import.meta.env.DEV) {
      console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`API Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    // Handle 401 Unauthorized (token expired/invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
            config: originalRequest
          });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${getBaseURL()}/auth/refresh`, {
            refreshToken
          });

          const { token, refreshToken: newRefreshToken } = response.data;

          // Update tokens
          localStorage.setItem("token", token);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }

          // Update authorization header
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${token}`;

          // Process queued requests
          processQueue(null, token);

          // Retry original request
          return api(originalRequest);
        } else {
          // No refresh token available, clear auth and redirect
          clearAuthAndRedirect();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed, clear auth and redirect
        clearAuthAndRedirect();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error("You don't have permission to perform this action.", {
        toastId: "forbidden-error"
      });
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"] || 60;
      toast.error(`Too many requests. Please try again in ${retryAfter} seconds.`, {
        toastId: "rate-limit-error",
        autoClose: 5000
      });
    }

    // Handle 5xx Server Errors
    if (error.response?.status && error.response.status >= 500) {
      toast.error("Server error. Please try again later.", {
        toastId: "server-error"
      });
    }

    return Promise.reject(error);
  }
);

// ========================
// CORE REQUEST FUNCTIONS WITH RETRY LOGIC
// ========================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  retries: number = 3,
  delay: number = 1000
): Promise<AxiosResponse<T>> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Only retry on network errors or 5xx status codes
      const isNetworkError = !(error as AxiosError).response;
      const isServerError = (error as AxiosError).response?.status && 
                           (error as AxiosError).response!.status >= 500;
      
      if (isNetworkError || isServerError) {
        const waitTime = delay * Math.pow(2, i); // Exponential backoff
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

const handleSuccess = <T extends ApiResponse>(
  response: AxiosResponse<T>,
  method: Method,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  successMessage?: string
): T => {
  setLoading?.(false);

  // Show success toast for non-GET requests if message provided
  if (method !== "GET" && (response.data.message || successMessage)) {
    const message = response.data.message || successMessage || "Operation completed successfully";
    toast.success(message, {
      toastId: `success-${Date.now()}`,
      autoClose: 3000
    });
  }

  return response.data;
};

const handleError = (
  error: AxiosError<ApiResponse>,
  method: Method,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<never> => {
  setLoading?.(false);

  const errorData = error.response?.data;
  const status = error.response?.status;

  // Extract error message
  let errorMessage = "An unexpected error occurred";
  
  if (errorData?.error) {
    errorMessage = errorData.error;
  } else if (errorData?.message) {
    errorMessage = errorData.message;
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Handle validation errors
  if (status === 422 && errorData?.errors) {
    const validationErrors = Object.values(errorData.errors).flat().join(", ");
    errorMessage = `Validation failed: ${validationErrors}`;
  }

  // Show error toast for non-GET requests
  if (method !== "GET") {
    toast.error(errorMessage, {
      toastId: `error-${Date.now()}`,
      autoClose: 5000
    });
  }

  // Throw structured error
  const apiError: ApiError = {
    message: errorMessage,
    status,
    code: error.code,
    errors: errorData?.errors
  };

  return Promise.reject(apiError);
};

// ========================
// CRUD OPERATIONS WITH ENHANCED OPTIONS
// ========================

export const postRequest = async <T = any>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions & { message?: string }
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.post<ApiResponse<T>>(url, data, {
    timeout: options?.timeout,
    headers: options?.headers,
    params: options?.params
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "POST", setLoading, options?.message);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "POST", setLoading);
  }
};

export const getRequest = async <T = any>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.get<ApiResponse<T>>(url, {
    timeout: options?.timeout,
    headers: options?.headers,
    params: options?.params
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "GET", setLoading);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "GET", setLoading);
  }
};

export const putRequest = async <T = any>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions & { message?: string }
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.put<ApiResponse<T>>(url, data, {
    timeout: options?.timeout,
    headers: options?.headers,
    params: options?.params
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "PUT", setLoading, options?.message);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "PUT", setLoading);
  }
};

export const patchRequest = async <T = any>(
  url: string,
  data: any,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions & { message?: string }
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.patch<ApiResponse<T>>(url, data, {
    timeout: options?.timeout,
    headers: options?.headers,
    params: options?.params
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "PATCH", setLoading, options?.message);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "PATCH", setLoading);
  }
};

export const deleteRequest = async <T = any>(
  url: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions & { message?: string }
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.delete<ApiResponse<T>>(url, {
    timeout: options?.timeout,
    headers: options?.headers,
    params: options?.params
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "DELETE", setLoading, options?.message);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "DELETE", setLoading);
  }
};

// Multipart/form-data upload
export const uploadRequest = async <T = any>(
  url: string,
  formData: FormData,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>,
  options?: RequestOptions & { 
    message?: string;
    onUploadProgress?: (progressEvent: ProgressEvent) => void;
  }
): Promise<T> => {
  setLoading?.(true);
  
  const requestFn = () => api.post<ApiResponse<T>>(url, formData, {
    timeout: options?.timeout,
    headers: {
      ...options?.headers,
      "Content-Type": "multipart/form-data",
    },
    params: options?.params,
    onUploadProgress: options?.onUploadProgress
  });

  try {
    const response = await retryRequest(requestFn, options?.retryCount);
    return handleSuccess(response, "POST", setLoading, options?.message);
  } catch (error) {
    return handleError(error as AxiosError<ApiResponse>, "POST", setLoading);
  }
};

// ========================
// AUTH UTILITIES
// ========================

export const clearAuthAndRedirect = (redirectTo: string = "/login") => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("user");
  
  delete api.defaults.headers.common["Authorization"];
  
  // Dispatch auth expired event
  window.dispatchEvent(new CustomEvent("auth-expired"));
  
  // Redirect to login
  if (window.location.pathname !== redirectTo) {
    window.location.href = redirectTo;
  }
};
export const getCurrentUserFromToken = (): any | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  
  try {
    // Decode JWT token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decoded = JSON.parse(jsonPayload);
    console.log("getCurrentUserFromToken decoded:", decoded);
    
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  // Check token expiration
  try {
    const user = getCurrentUserFromToken();
    if (!user || !user.exp) return false;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return user.exp > currentTime;
  } catch (error) {
    return false;
  }
};

export const getUserRole = (): string => {
  const user = getCurrentUserFromToken();
  return user?.isAdmin ? 'admin' : 
         user?.isSubAdmin ? 'subadmin' : 
         user?.userType || 'buyer';
};

export const hasPermission = (requiredRole: string | string[]): boolean => {
  const userRole = getUserRole();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
};

// ========================
// DATE & TIME UTILITIES
// ========================

export const formatDate = (dateString: string, locale: string = 'en-IN'): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateString: string, locale: string = 'en-IN'): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
};

export const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

// ========================
// FINANCIAL & MARKETPLACE UTILITIES
// ========================

export const calculatePlatformFee = (
  amount: number, 
  feePercent: number = 0.15,
  minFee: number = 0.50,
  maxFee?: number
) => {
  let platformFee = amount * feePercent;
  
  // Apply minimum fee
  if (platformFee < minFee) {
    platformFee = minFee;
  }
  
  // Apply maximum fee if specified
  if (maxFee && platformFee > maxFee) {
    platformFee = maxFee;
  }
  
  const sellerAmount = amount - platformFee;
  
  return {
    platformFee: Math.round(platformFee * 100) / 100,
    sellerAmount: Math.round(sellerAmount * 100) / 100,
    originalAmount: amount,
    feePercent,
    minFee,
    maxFee
  };
};

export const validateListingData = (data: {
  title: string;
  price: number;
  type: string;
  description?: string;
  category?: string;
}): string[] => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  if (!data.title || data.title.trim().length > 100) {
    errors.push('Title must be less than 100 characters');
  }

  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (data.price > 1000000) {
    errors.push('Price cannot exceed 1,000,000');
  }

  if (!data.type) {
    errors.push('Please select a listing type');
  }

  if (data.description && data.description.length > 5000) {
    errors.push('Description must be less than 5000 characters');
  }

  return errors;
};

export const formatCurrency = (
  amount: number, 
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const calculateEstimatedDelivery = (
  orderDate: Date | string,
  expectedDays: number,
  businessDaysOnly: boolean = false
): Date => {
  const date = new Date(orderDate);
  let daysAdded = 0;
  
  if (businessDaysOnly) {
    while (daysAdded < expectedDays) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        daysAdded++;
      }
    }
  } else {
    date.setDate(date.getDate() + expectedDays);
  }
  
  return date;
};

// ========================
// STRING & VALIDATION UTILITIES
// ========================

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ''));
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ========================
// STORAGE UTILITIES
// ========================

export const getStorageItem = <T = any>(key: string, defaultValue?: T): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue || null;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return defaultValue || null;
  }
};

export const setStorageItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
  }
};
// ========================
// AUTH FUNCTIONS
// ========================

export const signup = async (
  username: string, 
  email: string, 
  avatar: string, 
  userType: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return await postRequest('/user/signup', {
    username,
    email,
    avatar,
    userType,
    dob: "01-01-2000"
  }, setLoading, {
    message: 'Registration successful!',
    showToast: true
  });
};

// signin function ko update karein
export const signin = async (
  email: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  try {
    console.log("Signin request for email:", email);
    const response = await postRequest('/user/signin', {
      email
    }, setLoading, {
    });
    
    console.log("Signin response:", response);
    console.log("Response structure:", JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error("Signin error details:", error);
    throw error;
  }
};

export const getUser = async (
  userId: string,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return await getRequest(`/user/${userId}`, setLoading, {
    showToast: false
  });
};

export const updatePaymentStatus = async (
  userId: string,
  hasPaid: boolean = true,
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
) => {
  return await putRequest(`/user/${userId}`, {
    hasPaid
  }, setLoading, {
    message: 'Payment status updated!',
    showToast: true
  });
};
export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
  }
};
// ========================
// AUTO REDIRECT LOGIC FOR HYPE MODE
// ========================

/**
 * Check if user is logged in and has paid, then redirect to home
 * This should be called on HypeModeProfile page
 */
export const checkAuthAndRedirect = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found, staying on page");
      return false; // No token, stay on page
    }

    // Decode token to get userId
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const decodedToken = JSON.parse(jsonPayload);
      console.log("Decoded token in checkAuthAndRedirect:", decodedToken);
      
      const userId = decodedToken.userId || decodedToken.id || decodedToken.userID;
      
      if (!userId) {
        console.log("No userId in token, clearing token");
        localStorage.removeItem("token");
        return false;
      }
      
      // Get user data to check payment status
      const user = await getUser(userId);
      console.log("User data in checkAuthAndRedirect:", user);
      
      // Check if user has paid
      const hasPaid = user?.hasPaid || user?.data?.hasPaid || user?.payment?.hasPaid;
      
      console.log("hasPaid in checkAuthAndRedirect:", hasPaid);
      
      if (hasPaid) {
        // User has paid, redirect to home immediately
        console.log('User has paid, redirecting to home...');
        
        // Use both methods to ensure redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
        
        // Also use navigate if available
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        
        return true;
      }
      
      // User hasn't paid, stay on HypeMode page
      console.log("User hasn't paid, staying on page");
      return false;
    } catch (decodeError) {
      console.error("Error decoding token:", decodeError);
      localStorage.removeItem("token");
      return false;
    }
  } catch (error) {
    console.error('Error in checkAuthAndRedirect:', error);
    return false;
  }
};
/**
 * Complete login flow - for use in HypeModeProfile
 * Handles both signin and signup with automatic redirect

/**
 * Complete login flow - for use in HypeModeProfile
 * Handles both signin and signup with automatic redirect
 */
export const completeLoginFlow = async (
  email: string,
  isSignup: boolean = false,
  username?: string,
  avatar?: string,
  userType: string = 'buyer',
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>
): Promise<{success: boolean; userId?: string; shouldRedirect?: boolean; error?: string}> => {
  try {
    setLoading?.(true);
    
    console.log(`Starting ${isSignup ? 'signup' : 'signin'} flow for:`, email);
    
    let response;
    if (isSignup) {
      // Signup flow
      if (!username || !avatar) {
        throw new Error('Username and avatar are required for signup');
      }
      response = await signup(username, email, avatar, userType, setLoading);
      console.log("Signup API response:", response);
    } else {
      // Signin flow
      response = await signin(email, setLoading);
      console.log("Signin API response:", response);
    }
    
    // DEBUG: Log full response structure
    console.log("Full response structure:", JSON.stringify(response, null, 2));
    
    // Extract token from response
    const token = response?.token || response?.data?.token || response?.accessToken;
    
    console.log("Extracted token:", token ? "Yes" : "No");
    
    if (token) {
      // Save token
      localStorage.setItem('token', token);
      console.log("Token saved to localStorage");
      
      // DECODE TOKEN to get userId
      try {
        // Decode JWT token to get userId
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        
        const decodedToken = JSON.parse(jsonPayload);
        console.log("Decoded token:", decodedToken);
        
        const userId = decodedToken.userId || decodedToken.id || decodedToken.userID;
        console.log("Extracted userId from token:", userId);
        
        if (userId) {
          try {
            // Check payment status
            const userData = await getUser(userId);
            console.log("User data from getUser:", userData);
            
            // Check if user has paid
            const hasPaid = userData?.hasPaid || userData?.data?.hasPaid || userData?.payment?.hasPaid;
            
            console.log("hasPaid value:", hasPaid);
            
            if (hasPaid) {
              // Auto redirect to home
              console.log("User has paid, redirecting to home...");
              setTimeout(() => {
                window.location.href = '/';
              }, 100);
              
              return {
                success: true,
                userId,
                shouldRedirect: true
              };
            }
            
            // Not paid, return userId for payment flow
            console.log("User hasn't paid, returning userId for payment");
            return {
              success: true,
              userId,
              shouldRedirect: false
            };
          } catch (error) {
            console.error("Error checking payment status:", error);
            // Continue even if payment check fails
            return {
              success: true,
              userId,
              shouldRedirect: false
            };
          }
        } else {
          console.error("userId not found in decoded token");
          return {
            success: false,
            error: 'User ID not found in token'
          };
        }
      } catch (decodeError) {
        console.error("Error decoding token:", decodeError);
        return {
          success: false,
          error: 'Invalid token format'
        };
      }
    } else {
      console.error("Token missing in response");
      return {
        success: false,
        error: 'Invalid response from server - no token'
      };
    }
  } catch (error: any) {
    console.error('Login flow error:', error);
    setLoading?.(false);
    
    // Return structured error
    return {
      success: false,
      error: error.message || 'Login failed'
    };
  }
};
/**
 * Quick check - returns true if user should be redirected to home
 * Useful for useEffect hooks
 */
export const shouldRedirectToHome = async (): Promise<boolean> => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  try {
    const decoded = getCurrentUserFromToken();
    if (!decoded || (!decoded.userId && !decoded.id)) {
      localStorage.removeItem("token");
      return false;
    }
    
    const userId = decoded.userId || decoded.id;
    const user = await getUser(userId);
    const hasPaid = user?.hasPaid || user?.data?.hasPaid || user?.payment?.hasPaid;
    
    return !!hasPaid;
  } catch (error) {
    console.error('Error in shouldRedirectToHome:', error);
    return false;
  }
};
// ========================
// EXPORT DEFAULT
// ========================

export default api;