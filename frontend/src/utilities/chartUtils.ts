/**
 * Mobile Charts Utility Functions
 * Helper functions for chart data processing and formatting
 */

/**
 * Format date string to readable format
 * @param dateString - ISO format date string
 * @param format - Output format ('short' | 'long' | 'time')
 * @returns Formatted date string
 */
export const formatChartDate = (
  dateString: string,
  format: 'short' | 'long' | 'time' = 'short'
): string => {
  try {
    const date = new Date(dateString);

    switch (format) {
      case 'short':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      case 'long':
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      case 'time':
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return dateString;
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

/**
 * Calculate statistics for an array of numbers
 */
export const calculateStats = (values: number[]) => {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, total: 0, median: 0 };
  }

  const total = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / values.length);
  const sorted = [...values].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg,
    total,
    median: Math.round(median)
  };
};

/**
 * Get trending indicator
 * @param current - Current value
 * @param previous - Previous value
 * @returns Trend indicator ('up' | 'down' | 'stable')
 */
export const getTrend = (
  current: number,
  previous: number
): 'up' | 'down' | 'stable' => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
};

/**
 * Get percentage change
 */
export const getPercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * Normalize values to 0-100 range
 */
export const normalizeValues = (values: number[]): number[] => {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map(val => ((val - min) / range) * 100);
};

/**
 * Group data by time period
 */
export const groupByPeriod = (
  data: Array<{ date: string; value: number }>,
  period: 'day' | 'week' | 'month'
): Array<{ period: string; value: number; count: number }> => {
  const grouped: { [key: string]: { sum: number; count: number } } = {};

  data.forEach(({ date, value }) => {
    const d = new Date(date);
    let key: string;

    switch (period) {
      case 'day':
        key = d.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!grouped[key]) {
      grouped[key] = { sum: 0, count: 0 };
    }

    grouped[key].sum += value;
    grouped[key].count += 1;
  });

  return Object.entries(grouped).map(([period, { sum, count }]) => ({
    period,
    value: Math.round(sum / count),
    count
  }));
};

/**
 * Get color for value (gradient)
 */
export const getColorForValue = (
  value: number,
  min: number,
  max: number,
  colorStops?: string[]
): string => {
  const defaultColors = [
    '#2ED573', // Green
    '#FFA502', // Orange
    '#FF4757'  // Red
  ];

  const colors = colorStops || defaultColors;
  const normalized = (value - min) / (max - min);
  const colorIndex = Math.min(
    Math.floor(normalized * colors.length),
    colors.length - 1
  );

  return colors[colorIndex];
};

/**
 * Format large numbers with K, M, B suffix
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B';
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
};

/**
 * Create gradient color scale
 */
export const createGradientScale = (
  startColor: string,
  endColor: string,
  steps: number = 5
): string[] => {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);

  if (!start || !end) return [startColor, endColor];

  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
};

/**
 * Helper: Convert hex to RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

/**
 * Helper: Convert RGB to hex
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

/**
 * Smooth data (moving average)
 */
export const smoothData = (values: number[], windowSize: number = 3): number[] => {
  const smoothed: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    smoothed.push(Math.round(avg));
  }

  return smoothed;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let lastRun = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastRun >= limit) {
      func(...args);
      lastRun = now;
    }
  };
};

/**
 * Get contrast color (white or black) for readability
 */
export const getContrastColor = (hexColor: string): string => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#FFFFFF';
};

/**
 * Validate color hex
 */
export const isValidColor = (color: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

/**
 * Get random color from palette
 */
export const getRandomColor = (palette?: string[]): string => {
  const defaultPalette = [
    '#FF6B8B',
    '#2ED573',
    '#1E90FF',
    '#FFA502',
    '#9B59B6',
    '#FF3838',
    '#00B894',
    '#0984E3',
    '#FD79A8',
    '#6C5CE7'
  ];

  const colors = palette || defaultPalette;
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Check if device is mobile
 */
export const isMobileDevice = (breakpoint: number = 768): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoint;
};

/**
 * Get device type
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < 480) return 'mobile';
  if (width < 768) return 'tablet';
  return 'desktop';
};

/**
 * Format time difference
 */
export const formatTimeDifference = (date1: Date, date2: Date): string => {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
};

export default {
  formatChartDate,
  calculateStats,
  getTrend,
  getPercentageChange,
  normalizeValues,
  groupByPeriod,
  getColorForValue,
  formatLargeNumber,
  createGradientScale,
  smoothData,
  debounce,
  throttle,
  getContrastColor,
  isValidColor,
  getRandomColor,
  isMobileDevice,
  getDeviceType,
  formatTimeDifference
};
