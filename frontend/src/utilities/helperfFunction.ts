// utils/helpers.ts
import jwtDecode from "jwt-decode";
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

// Cache for decoded token
let cachedToken: Itoken | null = null;

// Utility Functions

export const generateSlug = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

// Decode token once and cache
export const decodeToken = (token: string | null): Itoken | null => {
  if (!token) return null;
  if (cachedToken) return cachedToken;

  try {
    const decodedToken = jwtDecode<Itoken>(token);

    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      clearAuthData();
      return null;
    }

    cachedToken = decodedToken;
    return decodedToken;
  } catch {
    try {
      // Manual JWT decode fallback
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
      cachedToken = JSON.parse(atob(padded));
      return cachedToken;
    } catch {
      return null;
    }
  }
};

// Get current user ID
export const getCurrentUserId = (): string | null => {
  // Try cached userId
  const storedId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
  if (storedId) return storedId;

  // Try from user object
  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      const userId = user.id || user._id || user.userId;
      if (userId) {
        localStorage.setItem("userId", userId);
        return userId;
      }
    } catch {}
  }

  // Try from token
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    const tokenData = decodeToken(token);
    if (tokenData) {
      const userId = tokenData.userId || tokenData.id || tokenData.user?.id || tokenData.user?._id || tokenData.sub;
      if (userId) {
        localStorage.setItem("userId", userId);
        return userId;
      }
    }
  }

  return null;
};

// Validate token and get user ID
export const validateTokenAndGetUserId = (): { isValid: boolean; userId: string | null } => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return { isValid: false, userId: null };

  const tokenData = decodeToken(token);
  if (!tokenData) return { isValid: false, userId: null };

  const userId = getCurrentUserId();
  if (!userId) return { isValid: false, userId: null };

  return { isValid: true, userId };
};

// Store user ID
export const storeUserId = (userId: string) => localStorage.setItem("userId", userId);

// Clear all auth data
export const clearAuthData = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("userId");
  sessionStorage.removeItem("userId");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  localStorage.removeItem("auth");
  sessionStorage.removeItem("auth");
  cachedToken = null;
};

// Check authentication
export const isAuthenticated = (): boolean => !!decodeToken(localStorage.getItem("token") || sessionStorage.getItem("token"));

// Get user info
export const getUserInfo = (): { userId: string | null; username: string | null } => {
  const userId = getCurrentUserId();
  let username: string | null = null;

  const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      username = user.username || user.name || null;
    } catch {}
  }

  return { userId, username };
};

// Other helpers
export const isObjectEmpty = (obj: Record<string, any>): boolean => !Object.keys(obj).length;

export const formatDateAgo = (dateTime: string): string => {
  const now = moment();
  const then = moment(dateTime);
  const diffDays = now.diff(then, "days");
  const diffHours = now.diff(then, "hours");
  const diffMinutes = now.diff(then, "minutes");

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 365) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return moment(dateTime).format("MMM D, YYYY [at] h:mm A");
};

export const isUserIdInArray = (userId: string, idArray: string[]): boolean => idArray.includes(userId);

export const logout = () => {
  clearAuthData();
  window.location.href = "/admin";
};

export const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const getCapitalizedFirstLetter = (str: string) => str?.charAt(0).toUpperCase();

export const toggleItemInArray = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter(i => i !== item) : [...array, item];

// Chart options (unchanged)
export const chartOptions = { /* keep your existing chartOptions */ };
