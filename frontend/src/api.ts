// api.ts - UPDATED WITH ALL NEW BUYER ROUTES
import axios, { AxiosResponse, AxiosError, Method } from "axios";
import { toast } from "react-toastify";

// ========================
// CONFIGURATION & INTERCEPTORS
// ========================

// Create an axios instance with default configurations

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? "http://localhost:3000"
    : "https://wecinema-co.onrender.com",
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
      window.location.href = '/';
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
// api.ts - Update your postRequest function
export const postRequest = async (
  endpoint: string,
  payload: any,
  setLoading?: (loading: boolean) => void
) => {
  if (setLoading) setLoading(true);
  
  try {
    const response = await axios.post(
      `https://wecinema.co/api/${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    if (setLoading) setLoading(false);
    return response.data;
  } catch (error: any) {
    if (setLoading) setLoading(false);
    
    if (error.response) {
      // Server responded with error
      console.error(`API Error (${error.response.status}):`, error.response.data);
      throw error;
    } else if (error.request) {
      // No response received
      console.error('No response received:', error.request);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      throw error;
    }
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
// DATE UTILITIES
// ========================

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const calculateEstimatedDelivery = (orderDate: Date, expectedDays: number) => {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + expectedDays);
  return date;
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

export const getUserRole = () => {
  const user = getCurrentUserFromToken();
  return user?.role || 'buyer';
};


export default api;