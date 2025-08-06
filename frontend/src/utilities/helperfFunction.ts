// utils/helpers.ts
import { jwtDecode } from "jwt-decode";
import moment from "moment";

// Interface and Types
export interface Itoken {
  userId: string;
  avatar: string;
  hasPaid: boolean;
  username?: string;
}

type MongooseId = string;

// Utility Functions

// Generate slug from text
export const generateSlug = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// Truncate text to a specific length
export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 3) + "...";

// Decode and validate JWT token
export const decodeToken = (token: any) => {
  // console.log(token);
  if (!token) return null;
  try {
    const decodedToken: any = jwtDecode(token) as Itoken;
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedToken.exp && decodedToken.exp < currentTime) {
      console.error("Token has expired");
      localStorage.removeItem("token");
      return null;
    }
    return decodedToken;
  } catch (error) {}
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

// src/utils/auth.ts
export const logout = () => {
  localStorage.removeItem("token"); // Clear the token
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
        
        usePointStyle: true, // This will show point-style indicators instead of the color block
        pointStyleWidth: 0, // This will hide the point style altogether
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