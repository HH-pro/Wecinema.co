// utils/helpers.ts
import jwtDecode from "jwt-decode";
import moment from "moment";

// ===== Interfaces =====
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

// ===== Cached token =====
let cachedToken: Itoken | null = null;

// ===== Helper Functions =====

// Generate slug from text
export const generateSlug = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// Truncate text
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

// Decode JWT token with fallback and caching
export const decodeToken = (token: string | null): Itoken | null => {
  if (!token) return null;
  if (cachedToken) return cachedToken;

  try {
    const decoded: Itoken = jwtDecode<Itoken>(token);
    const currentTime = Math.floor(Date.now() / 1000);

    if (decoded.exp && decoded.exp < currentTime) {
      clearAuthData();
      return null;
    }

    cachedToken = decoded;
    return decoded;
  } catch {
    // Manual decode fallback
    try {
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

// Get current user ID (from storage or token)
export const getCurrentUserId = (): string | null => {
  const storedId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
  if (storedId) return storedId;

  // From user object
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

  // From token
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) {
    const tokenData = decodeToken(token);
    if (tokenData) {
      const userId =
        tokenData.userId || tokenData.id || tokenData.user?.id || tokenData.user?._id || tokenData.sub;
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

// Check empty object
export const isObjectEmpty = (obj: Record<string, any>): boolean => !Object.keys(obj).length;

// Format date as "time ago"
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

// Check if userId exists in array
export const isUserIdInArray = (userId: string, idArray: string[]): boolean => idArray.includes(userId);

// Logout
export const logout = () => {
  clearAuthData();
  window.location.href = "/admin";
};

// Capitalization helpers
export const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export const getCapitalizedFirstLetter = (str: string) => str?.charAt(0).toUpperCase();

// Toggle item in array
export const toggleItemInArray = <T>(array: T[], item: T): T[] =>
  array.includes(item) ? array.filter(i => i !== item) : [...array, item];

// Chart options (keep existing structure)
export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const, labels: { color: "white", font: { size: 8 }, usePointStyle: true, pointStyleWidth: 0 } },
    title: {
      display: true,
      text: "Rise and Fall of Different Genres/Themes/Ratings Over Time",
      color: "white",
      font: { size: 12, weight: "bold" },
      padding: { top: 1, bottom: 10 },
    },
    tooltip: { enabled: true, bodyFont: { size: 10 }, titleFont: { size: 10 }, padding: 8 },
  },
  scales: {
    y: { title: { display: true, text: "Popularity Metric (Views/Uploads)", color: "white", font: { size: 10 } }, ticks: { color: "white", font: { size: 9 } } },
    x: {
      reverse: true,
      title: { display: true, text: "Time (Weeks)", color: "white", font: { size: 10 }, padding: { bottom: 20 } },
      ticks: { color: "white", font: { size: 10 } },
    },
  },
  elements: { line: { tension: 0.4, borderWidth: 1 }, point: { radius: 3, hoverRadius: 3 } },
};
