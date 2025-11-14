// utils/helpers.ts
import { jwtDecode } from "jwt-decode";
import moment from "moment";

// Interface and Types
export interface Itoken {
  userId: string;
  avatar: string;
  hasPaid: boolean;
  username?: string;
  id?: string;
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
  };
  sub?: string;
  exp?: number;
  iat?: number;
}

type MongooseId = string;

// ===== Global Cache =====
let cachedToken: Itoken | null = null;
let cachedUserId: string | null = null;

// ===== Utility Functions =====

/**
 * Generate URL-friendly slug from text
 */
export const generateSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();

/**
 * Truncate text to specific length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

/**
 * Enhanced token decoding with multiple fallback methods and caching
 */
export const decodeToken = (token: string | null): Itoken | null => {
  if (!token) {
    console.log("❌ No token provided to decodeToken");
    return null;
  }

  // Return cached result if available
  if (cachedToken) {
    console.log("✅ Using cached token data");
    return cachedToken;
  }

  try {
    console.log("🔐 Attempting to decode token using jwt-decode...");
    
    // Method 1: Use jwt-decode library (primary method)
    const decodedToken: Itoken = jwtDecode<Itoken>(token);
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      console.error("❌ Token has expired");
      clearAuthData();
      cachedToken = null;
      return null;
    }

    console.log("✅ JWT decode successful");
    cachedToken = decodedToken;
    return decodedToken;

  } catch (error) {
    console.error("❌ JWT decode failed, trying manual decode:", error);
    
    // Method 2: Manual JWT decoding as fallback
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format: expected 3 parts');
      }
      
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decodedPayload: Itoken = JSON.parse(atob(paddedBase64));
      
      // Check expiration manually
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedPayload.exp && decodedPayload.exp < currentTime) {
        console.error("❌ Token has expired (manual decode)");
        clearAuthData();
        cachedToken = null;
        return null;
      }
      
      console.log("✅ Manual token decode successful");
      cachedToken = decodedPayload;
      return decodedPayload;
    } catch (manualError) {
      console.error("❌ Manual token decode failed:", manualError);
      cachedToken = null;
      return null;
    }
  }
};

/**
 * DIRECT USER ID EXTRACTION - Multiple reliable methods with caching
 */
export const getCurrentUserId = (): string | null => {
  // Return cached user ID if available
  if (cachedUserId) {
    console.log("✅ Using cached user ID:", cachedUserId);
    return cachedUserId;
  }

  try {
    console.log("🆔 Starting user ID extraction...");
    
    // Method 1: Direct from localStorage/sessionStorage
    const directUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (directUserId) {
      console.log("✅ User ID found directly in storage:", directUserId);
      cachedUserId = directUserId;
      return directUserId;
    }

    // Method 2: From user object in storage
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userId = user.id || user._id || user.userId;
        if (userId) {
          console.log("✅ User ID from user object:", userId);
          cachedUserId = userId;
          localStorage.setItem("userId", userId);
          return userId;
        }
      } catch (e) {
        console.error("❌ Error parsing user data:", e);
      }
    }

    // Method 3: Decode from token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      console.log("🔐 Token found, extracting user ID...");
      const tokenData = decodeToken(token);
      
      if (tokenData) {
        // Try multiple possible locations for user ID in token
        const userId = tokenData.userId || tokenData.id || tokenData.user?.id || 
                      tokenData.user?._id || tokenData.user?.userId || tokenData.sub;
        
        if (userId) {
          console.log("✅ User ID extracted from token:", userId);
          cachedUserId = userId;
          localStorage.setItem("userId", userId);
          return userId;
        } else {
          console.warn("⚠️ Token decoded but no user ID found in payload");
        }
      }
    }

    // Method 4: Check common storage patterns
    const storedAuth = localStorage.getItem("auth") || sessionStorage.getItem("auth");
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        const userId = authData.userId || authData.user?.id || authData.user?._id;
        if (userId) {
          console.log("✅ User ID from auth data:", userId);
          cachedUserId = userId;
          localStorage.setItem("userId", userId);
          return userId;
        }
      } catch (e) {
        console.error("❌ Error parsing auth data:", e);
      }
    }

    console.log("❌ No user ID found in any storage location");
    return null;
  } catch (error) {
    console.error("💥 Critical error in getCurrentUserId:", error);
    return null;
  }
};

/**
 * Enhanced token validation with user ID extraction
 */
export const validateTokenAndGetUserId = (): { isValid: boolean; userId: string | null; tokenData?: Itoken } => {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (!token) {
      console.log("❌ No token found in storage");
      return { isValid: false, userId: null };
    }

    const tokenData = decodeToken(token);
    if (!tokenData) {
      console.log("❌ Invalid or expired token");
      return { isValid: false, userId: null };
    }

    const userId = getCurrentUserId();
    if (!userId) {
      console.log("❌ Could not extract user ID from token");
      return { isValid: false, userId: null, tokenData };
    }

    console.log("✅ Token validation successful, user ID:", userId);
    return { isValid: true, userId, tokenData };
  } catch (error) {
    console.error("❌ Error validating token:", error);
    return { isValid: false, userId: null };
  }
};

/**
 * Store user ID for quick access
 */
export const storeUserId = (userId: string): void => {
  try {
    localStorage.setItem("userId", userId);
    cachedUserId = userId;
    console.log("💾 User ID stored in cache and storage:", userId);
  } catch (error) {
    console.error("❌ Error storing user ID:", error);
  }
};

/**
 * Store authentication data
 */
export const storeAuthData = (token: string, userId: string, userData?: any): void => {
  try {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    cachedToken = null; // Reset cache to force fresh decode
    cachedUserId = userId;

    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }

    console.log("💾 Auth data stored successfully");
  } catch (error) {
    console.error("❌ Error storing auth data:", error);
  }
};

/**
 * Clear all authentication data and cache
 */
export const clearAuthData = (): void => {
  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("userId");
    sessionStorage.removeItem("userId");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    localStorage.removeItem("auth");
    sessionStorage.removeItem("auth");
    
    // Clear cache
    cachedToken = null;
    cachedUserId = null;
    
    console.log("🧹 All auth data cleared from storage and cache");
  } catch (error) {
    console.error("❌ Error clearing auth data:", error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) {
    return false;
  }
  
  const tokenData = decodeToken(token);
  return !!tokenData;
};

/**
 * Get complete user info with fallbacks
 */
export const getUserInfo = (): { 
  userId: string | null; 
  username: string | null; 
  email?: string;
  avatar?: string;
} => {
  const userId = getCurrentUserId();
  
  let username = null;
  let email = undefined;
  let avatar = undefined;

  // Try to get user data from storage
  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      username = user.username || user.name || null;
      email = user.email;
      avatar = user.avatar || user.profilePicture;
    } catch (e) {
      console.error("❌ Error parsing user data:", e);
    }
  }

  // If no username from user data, try token
  if (!username) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      const tokenData = decodeToken(token);
      if (tokenData) {
        username = tokenData.username || null;
        avatar = tokenData.avatar || avatar;
      }
    }
  }

  return { userId, username, email, avatar };
};

/**
 * Check if object is empty
 */
export const isObjectEmpty = (obj: Record<string, any>): boolean => {
  if (!obj || typeof obj !== 'object') return true;
  return Object.keys(obj).length === 0;
};

/**
 * Format date as human-readable "time ago"
 */
export const formatDateAgo = (dateTime: string | Date): string => {
  if (!dateTime) return "Unknown time";
  
  const now = moment();
  const then = moment(dateTime);
  
  if (!then.isValid()) return "Invalid date";

  const secondsDiff = now.diff(then, "seconds");
  const minutesDiff = now.diff(then, "minutes");
  const hoursDiff = now.diff(then, "hours");
  const daysDiff = now.diff(then, "days");
  const weeksDiff = now.diff(then, "weeks");
  const monthsDiff = now.diff(then, "months");
  const yearsDiff = now.diff(then, "years");

  if (secondsDiff < 60) return "just now";
  if (minutesDiff < 60) return `${minutesDiff} minute${minutesDiff !== 1 ? "s" : ""} ago`;
  if (hoursDiff < 24) return `${hoursDiff} hour${hoursDiff !== 1 ? "s" : ""} ago`;
  if (daysDiff === 1) return "yesterday";
  if (daysDiff < 7) return `${daysDiff} day${daysDiff !== 1 ? "s" : ""} ago`;
  if (weeksDiff < 4) return `${weeksDiff} week${weeksDiff !== 1 ? "s" : ""} ago`;
  if (monthsDiff < 12) return `${monthsDiff} month${monthsDiff !== 1 ? "s" : ""} ago`;
  
  return `${yearsDiff} year${yearsDiff !== 1 ? "s" : ""} ago`;
};

/**
 * Format date to readable string
 */
export const formatDateReadable = (dateTime: string | Date): string => {
  if (!dateTime) return "Unknown date";
  
  const momentDate = moment(dateTime);
  return momentDate.isValid() 
    ? momentDate.format("MMM D, YYYY [at] h:mm A")
    : "Invalid date";
};

/**
 * Check if user ID is present in array
 */
export const isUserIdInArray = (userId: MongooseId, idArray: MongooseId[]): boolean =>
  idArray.includes(userId);

/**
 * Enhanced logout function with redirect
 */
export const logout = (redirectUrl: string = "/admin"): void => {
  console.log("🚪 Logging out user...");
  clearAuthData();
  
  // Optional: Add delay for better UX
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 100);
};

/**
 * Capitalize first letter of string
 */
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Get only the first letter capitalized
 */
export const getCapitalizedFirstLetter = (str: string): string =>
  str?.charAt(0).toUpperCase() || '';

/**
 * Toggle item in array (add if not present, remove if present)
 */
export const toggleItemInArray = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter(i => i !== item) : [...array, item];

/**
 * Remove duplicates from array
 */
export const removeDuplicates = <T>(array: T[]): T[] => 
  Array.from(new Set(array));

/**
 * Generate random ID
 */
export const generateId = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ===== Chart Configuration =====
export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: "white",
        font: {
          size: 8,
        },
        usePointStyle: true,
        pointStyleWidth: 0,
      },
    },
    title: {
      display: true,
      text: "Rise and Fall of Different Genres/Themes/Ratings Over Time",
      color: "white",
      font: {
        size: 12,
        weight: 'bold' as const,
      },
      padding: {
        top: 1,
        bottom: 10,
      },
    },
    tooltip: {
      enabled: true,
      bodyFont: {
        size: 10,
      },
      titleFont: {
        size: 10,
      },
      padding: 8,
    },
  },
  scales: {
    y: {
      title: {
        display: true,
        text: "Popularity Metric (Views/Uploads)",
        color: "white",
        font: {
          size: 10,
        },
      },
      ticks: {
        color: "white",
        font: {
          size: 9,
        },
      },
    },
    x: {
      reverse: true,
      title: {
        display: true,
        text: "Time (Weeks)",
        color: "white",
        font: {
          size: 10,
        },
        padding: {
          bottom: 20,
        },
      },
      ticks: {
        color: "white",
        font: {
          size: 10,
        },
      },
    },
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 1,
    },
    point: {
      radius: 3,
      hoverRadius: 3,
    },
  },
};

/**
 * Get chart data structure
 */
export const getChartData = (labels: string[], datasets: any[]) => ({
  labels,
  datasets: datasets.map(dataset => ({
    ...dataset,
    borderColor: dataset.borderColor || `hsl(${Math.random() * 360}, 70%, 50%)`,
    backgroundColor: dataset.backgroundColor || `hsla(${Math.random() * 360}, 70%, 50%, 0.1)`,
  }))
});

// ===== Export all utilities =====
export default {
  // Token & Auth
  decodeToken,
  getCurrentUserId,
  validateTokenAndGetUserId,
  storeUserId,
  storeAuthData,
  clearAuthData,
  isAuthenticated,
  getUserInfo,
  logout,
  
  // String utilities
  generateSlug,
  truncateText,
  capitalizeFirstLetter,
  capitalizeWords,
  getCapitalizedFirstLetter,
  isValidEmail,
  
  // Array utilities
  toggleItemInArray,
  removeDuplicates,
  isUserIdInArray,
  
  // Date utilities
  formatDateAgo,
  formatDateReadable,
  
  // Number utilities
  formatCurrency,
  formatNumber,
  
  // Validation utilities
  isObjectEmpty,
  
  // General utilities
  generateId,
  debounce,
  
  // Chart utilities
  chartOptions,
  getChartData,
};