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

// Storage Keys Constants
const STORAGE_KEYS = {
  TOKEN: "token",
  USER_ID: "userId", 
  USER: "user",
  AUTH: "auth"
} as const;

// Cache Configuration
const CACHE_CONFIG = {
  USER_ID_TTL: 5 * 60 * 1000, // 5 minutes
  DEBOUNCE_DELAY: 300, // 300ms
} as const;

// Cache Store
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// Utility Functions

/**
 * Generate slug from text
 */
export const generateSlug = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

/**
 * Truncate text to a specific length
 */
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

/**
 * Safe storage getter with error handling
 */
const getFromStorage = (key: string, useSessionStorage = false): string | null => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    return storage.getItem(key);
  } catch (error) {
    console.warn(`Failed to get ${key} from storage:`, error);
    return null;
  }
};

/**
 * Safe storage setter with error handling
 */
const setToStorage = (key: string, value: string, useSessionStorage = false): boolean => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to set ${key} in storage:`, error);
    return false;
  }
};

/**
 * Remove item from storage safely
 */
const removeFromStorage = (key: string, useSessionStorage = false): boolean => {
  try {
    const storage = useSessionStorage ? sessionStorage : localStorage;
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove ${key} from storage:`, error);
    return false;
  }
};

/**
 * Set cache with timestamp
 */
const setCache = (key: string, data: any, ttl: number = CACHE_CONFIG.USER_ID_TTL): void => {
  memoryCache.set(key, {
    data,
    timestamp: Date.now() + ttl
  });
};

/**
 * Get cache if not expired
 */
const getCache = (key: string): any => {
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.timestamp) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
};

/**
 * Clear specific cache
 */
const clearCache = (key: string): void => {
  memoryCache.delete(key);
};

/**
 * Enhanced token decoding with proper error handling
 */
export const decodeToken = (token: string): Itoken | null => {
  if (!token || typeof token !== 'string') {
    console.warn('Invalid token provided');
    return null;
  }

  try {
    const decodedToken = jwtDecode<Itoken>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check token expiration
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      console.warn("Token has expired");
      clearAuthData();
      return null;
    }
    
    return decodedToken;
  } catch (error) {
    console.error("❌ JWT decode failed:", error);
    
    // Fallback: Try to extract basic info without proper JWT validation
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return {
          userId: payload.userId || payload.sub || '',
          avatar: payload.avatar || '',
          hasPaid: payload.hasPaid || false,
          username: payload.username,
          id: payload.id,
          sub: payload.sub
        };
      }
    } catch (fallbackError) {
      console.error("❌ Token fallback parsing also failed:", fallbackError);
    }
    
    return null;
  }
};

/**
 * Get current user ID with caching and multiple fallback methods
 */
export const getCurrentUserId = (): string | null => {
  // Check memory cache first
  const cachedUserId = getCache('currentUserId');
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    // Method 1: Direct from localStorage/sessionStorage
    const directUserId = getFromStorage(STORAGE_KEYS.USER_ID) || getFromStorage(STORAGE_KEYS.USER_ID, true);
    if (directUserId) {
      setCache('currentUserId', directUserId);
      return directUserId;
    }

    // Method 2: From token decoding
    const token = getFromStorage(STORAGE_KEYS.TOKEN) || getFromStorage(STORAGE_KEYS.TOKEN, true);
    if (token) {
      const tokenData = decodeToken(token);
      if (tokenData) {
        const userId = tokenData.userId || tokenData.id || tokenData.sub;
        if (userId) {
          setToStorage(STORAGE_KEYS.USER_ID, userId); // Cache for future
          setCache('currentUserId', userId);
          return userId;
        }
      }
    }

    // Method 3: From user object in storage
    const userData = getFromStorage(STORAGE_KEYS.USER) || getFromStorage(STORAGE_KEYS.USER, true);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userId = user.id || user._id || user.userId;
        if (userId) {
          setToStorage(STORAGE_KEYS.USER_ID, userId);
          setCache('currentUserId', userId);
          return userId;
        }
      } catch (parseError) {
        console.error("Error parsing user data:", parseError);
      }
    }

    return null;
  } catch (error) {
    console.error("💥 Error in getCurrentUserId:", error);
    return null;
  }
};

/**
 * Validate token and get user ID in one call
 */
export const validateTokenAndGetUserId = (): { isValid: boolean; userId: string | null; tokenData: Itoken | null } => {
  const token = getFromStorage(STORAGE_KEYS.TOKEN) || getFromStorage(STORAGE_KEYS.TOKEN, true);
  
  if (!token) {
    return { isValid: false, userId: null, tokenData: null };
  }

  const tokenData = decodeToken(token);
  const userId = getCurrentUserId();

  return { 
    isValid: !!tokenData && !!userId, 
    userId, 
    tokenData 
  };
};

/**
 * Store user authentication data consistently
 */
export const storeUserData = (userData: { 
  token: string; 
  userId: string; 
  user?: any;
  useSessionStorage?: boolean;
}): void => {
  try {
    const { token, userId, user, useSessionStorage = false } = userData;
    
    setToStorage(STORAGE_KEYS.TOKEN, token, useSessionStorage);
    setToStorage(STORAGE_KEYS.USER_ID, userId, useSessionStorage);
    
    if (user) {
      setToStorage(STORAGE_KEYS.USER, JSON.stringify(user), useSessionStorage);
    }
    
    // Update memory cache
    setCache('currentUserId', userId);
    
    console.log("✅ User data stored successfully");
  } catch (error) {
    console.error("❌ Error storing user data:", error);
    throw new Error("Failed to store user data");
  }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      removeFromStorage(key);
      removeFromStorage(key, true);
    });
    
    // Clear memory cache
    memoryCache.clear();
    
    console.log("✅ Auth data cleared successfully");
  } catch (error) {
    console.error("❌ Error clearing auth data:", error);
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const { isValid } = validateTokenAndGetUserId();
  return isValid;
};

/**
 * Get complete user info
 */
export const getUserInfo = (): { 
  userId: string | null; 
  username: string | null;
  avatar: string | null;
  hasPaid: boolean;
} => {
  const userId = getCurrentUserId();
  let username = null;
  let avatar = null;
  let hasPaid = false;

  // Try to get user data from storage
  const userData = getFromStorage(STORAGE_KEYS.USER) || getFromStorage(STORAGE_KEYS.USER, true);
  if (userData) {
    try {
      const user = JSON.parse(userData);
      username = user.username || user.name || null;
      avatar = user.avatar || user.profilePicture || null;
      hasPaid = user.hasPaid || user.premium || false;
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }

  // Fallback to token data
  if (!username || !avatar) {
    const token = getFromStorage(STORAGE_KEYS.TOKEN) || getFromStorage(STORAGE_KEYS.TOKEN, true);
    if (token) {
      const tokenData = decodeToken(token);
      if (tokenData) {
        username = username || tokenData.username || null;
        avatar = avatar || tokenData.avatar || null;
        hasPaid = hasPaid || tokenData.hasPaid || false;
      }
    }
  }

  return { userId, username, avatar, hasPaid };
};

/**
 * Debounce function to prevent multiple rapid calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = CACHE_CONFIG.DEBOUNCE_DELAY
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Throttle function to limit call frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Check if an object is empty
 */
export const isObjectEmpty = (obj: Record<string, any>): boolean =>
  !obj || Object.keys(obj).length === 0;

/**
 * Format date as "time ago" with improved accuracy
 */
export const formatDateAgo = (dateTime: string | Date): string => {
  if (!dateTime) return "Unknown";
  
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
 * Check if a user ID is present in an array
 */
export const isUserIdInArray = (userId: MongooseId, idArray: MongooseId[]): boolean =>
  !!(userId && idArray && idArray.includes(userId));

/**
 * Enhanced logout function with redirect options
 */
export const logout = (redirectTo: string = "/admin"): void => {
  clearAuthData();
  console.log("🚪 User logged out");
  window.location.href = redirectTo;
};

/**
 * Capitalize the first letter of a string
 */
export const capitalizeFirstLetter = (str: string): string =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

/**
 * Get only the first letter capitalized
 */
export const getCapitalizedFirstLetter = (str: string): string =>
  str ? str.charAt(0).toUpperCase() : "?";

/**
 * Toggle an item in an array (add or remove it)
 */
export const toggleItemInArray = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter(i => i !== item) : [...array, item];

/**
 * Safe JSON parse with default value
 */
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Generate random ID
 */
export const generateId = (length: number = 8): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * Check if running in browser
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Wait for specified time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Chart options generator
 */
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
 * API call wrapper with error handling
 */
export const apiCall = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300',
        ...options.headers,
      },
      ...options,
    });

    if (response.status === 304) {
      return { data: null, fromCache: true };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data, fromCache: false };
  } catch (error) {
    console.error(`API call failed for ${url}:`, error);
    throw error;
  }
};

// Export storage functions for external use
export const storage = {
  get: getFromStorage,
  set: setToStorage,
  remove: removeFromStorage,
};

// Export cache functions for external use  
export const cache = {
  set: setCache,
  get: getCache,
  clear: clearCache,
};

export default {
  generateSlug,
  truncateText,
  decodeToken,
  getCurrentUserId,
  validateTokenAndGetUserId,
  storeUserData,
  clearAuthData,
  isAuthenticated,
  getUserInfo,
  debounce,
  throttle,
  isObjectEmpty,
  formatDateAgo,
  isUserIdInArray,
  logout,
  capitalizeFirstLetter,
  getCapitalizedFirstLetter,
  toggleItemInArray,
  safeJsonParse,
  generateId,
  isBrowser,
  wait,
  chartOptions,
  apiCall,
  storage,
  cache,
};