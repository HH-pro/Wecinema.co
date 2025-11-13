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
}

type MongooseId = string;

// Utility Functions

// Generate slug from text
export const generateSlug = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// Truncate text to a specific length
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

// Enhanced token decoding with multiple fallback methods
export const decodeToken = (token: any) => {
  if (!token) {
    return null;
  }
  
  try {
    const decodedToken: any = jwtDecode(token) as Itoken;
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      console.error("Token has expired");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("userId");
      return null;
    }
    
    return decodedToken;
  } catch (error) {
    console.error("❌ JWT decode failed:", error);
    
    // Manual JWT decoding as fallback
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decodedPayload = JSON.parse(atob(paddedBase64));
      
      return decodedPayload;
    } catch (manualError) {
      console.error("❌ Manual token decode also failed:", manualError);
      return null;
    }
  }
};

// DIRECT USER ID EXTRACTION - Multiple reliable methods
export const getCurrentUserId = (): string | null => {
  try {
    // Method 1: Direct from localStorage/sessionStorage
    const directUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
    if (directUserId) {
      return directUserId;
    }

    // Method 2: From user object in storage
    const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const userId = user.id || user._id || user.userId;
        if (userId) {
          // Store for future quick access
          localStorage.setItem("userId", userId);
          return userId;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }

    // Method 3: Decode from token
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      const tokenData = decodeToken(token);
      
      if (tokenData) {
        // Try multiple possible locations for user ID in token
        const userId = tokenData.userId || tokenData.id || tokenData.user?.id || 
                      tokenData.user?._id || tokenData.user?.userId || tokenData.sub;
        
        if (userId) {
          // Store for future quick access
          localStorage.setItem("userId", userId);
          return userId;
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
          localStorage.setItem("userId", userId);
          return userId;
        }
      } catch (e) {
        console.error("Error parsing auth data:", e);
      }
    }

    return null;
  } catch (error) {
    console.error("💥 Error in getCurrentUserId:", error);
    return null;
  }
};

// Enhanced token validation with user ID extraction
export const validateTokenAndGetUserId = (): { isValid: boolean; userId: string | null } => {
  try {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (!token) {
      return { isValid: false, userId: null };
    }

    const tokenData = decodeToken(token);
    if (!tokenData) {
      return { isValid: false, userId: null };
    }

    const userId = getCurrentUserId();
    if (!userId) {
      return { isValid: false, userId: null };
    }

    return { isValid: true, userId };
  } catch (error) {
    console.error("Error validating token:", error);
    return { isValid: false, userId: null };
  }
};

// Store user ID for quick access
export const storeUserId = (userId: string): void => {
  try {
    localStorage.setItem("userId", userId);
  } catch (error) {
    console.error("Error storing user ID:", error);
  }
};

// Clear all auth data
export const clearAuthData = (): void => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("userId");
  sessionStorage.removeItem("userId");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  localStorage.removeItem("auth");
  sessionStorage.removeItem("auth");
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return false;
  
  const tokenData = decodeToken(token);
  return !!tokenData;
};

// Get user info with fallbacks
export const getUserInfo = (): { userId: string | null; username: string | null } => {
  const userId = getCurrentUserId();
  
  // Try to get username
  let username = null;
  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      username = user.username || user.name || null;
    } catch (e) {
      console.error("Error parsing user data for username:", e);
    }
  }

  return { userId, username };
};

// Check if an object is empty
export const isObjectEmpty = (obj: Record<string, any>): boolean =>
  !Object.keys(obj).length;

// Format date as "time ago"
export const formatDateAgo = (dateTime: string): string => {
  const now = moment();
  const then = moment(dateTime);
  const secondsDiff = now.diff(then, "seconds");
  const minutesDiff = now.diff(then, "minutes");
  const hoursDiff = now.diff(then, "hours");
  const daysDiff = now.diff(then, "days");

  if (secondsDiff < 60) return "just now";
  if (minutesDiff < 60) return `${minutesDiff} minute${minutesDiff !== 1 ? "s" : ""} ago`;
  if (hoursDiff < 24) return `${hoursDiff} hour${hoursDiff !== 1 ? "s" : ""} ago`;
  if (daysDiff === 1) return "yesterday";
  if (daysDiff < 365) return `${daysDiff} day${daysDiff !== 1 ? "s" : ""} ago`;

  return moment(dateTime).format("MMM D, YYYY [at] h:mm A");
};

// Check if a user ID is present in an array
export const isUserIdInArray = (userId: MongooseId, idArray: MongooseId[]): boolean =>
  idArray.includes(userId);

// Enhanced logout function
export const logout = () => {
  clearAuthData();
  window.location.href = "/admin"; // Redirect to sign-in page
};

// Capitalize the first letter of a string
export const capitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

// Get only the first letter capitalized
export const getCapitalizedFirstLetter = (str: string): string =>
  str?.charAt(0).toUpperCase();

// Toggle an item in an array (add or remove it)
export const toggleItemInArray = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter(i => i !== item) : [...array, item];

// Chart options generator
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
        weight: 'bold',
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
          bottom : 20,
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