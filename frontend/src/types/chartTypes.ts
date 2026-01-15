/**
 * Mobile Charts Type Definitions
 * Complete TypeScript types for all chart components
 */

// ============================================
// CHART DATA TYPES
// ============================================

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface ProcessedChartData {
  title: string;
  labels: string[];
  values: number[];
  color: string;
  icon: string;
}

export interface AdvancedChartData {
  id: string;
  title: string;
  icon: string;
  type: 'bar' | 'line' | 'donut' | 'area';
  data: ChartDataPoint[];
  color: string;
  backgroundColor?: string;
  totalValue: number;
  averageValue: number;
  maxValue: number;
  minValue: number;
  changePercent?: number;
}

export interface GenreData {
  [genre: string]: {
    [date: string]: {
      count: number;
    };
  };
}

export interface ThemeData {
  [theme: string]: {
    [date: string]: {
      count: number;
    };
  };
}

export interface RatingData {
  [date: string]: {
    averageRating: number;
    totalRatings: number;
  };
}

export interface ChartApiResponse {
  genre?: GenreData;
  theme?: ThemeData;
  rating?: RatingData;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface MobileSwipeChartsProps {
  // No required props - uses defaults
}

export interface AdvancedMobileChartsProps {
  maxCharts?: number;
  autoRotate?: boolean;
  rotationInterval?: number;
}

export interface ResponsiveChartsProps {
  breakpoint?: number;
}

// ============================================
// HOOK TYPES
// ============================================

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface SwipeOptions {
  threshold?: number;
  timeThreshold?: number;
}

export interface SwipeReturn {
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  swiping: boolean;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface Statistics {
  min: number;
  max: number;
  avg: number;
  total: number;
  median: number;
}

export interface TrendData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

export interface DataSeries {
  name: string;
  data: number[];
  color: string;
}

// ============================================
// COLOR TYPES
// ============================================

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  light: string;
  dark: string;
}

export interface GradientColor {
  start: string;
  end: string;
  steps?: number;
}

// ============================================
// ANIMATION TYPES
// ============================================

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
}

export interface BarAnimation {
  height: number | string;
  opacity: number;
  duration: number;
  delay: number;
}

// ============================================
// DEVICE TYPES
// ============================================

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

// ============================================
// TIME PERIOD TYPES
// ============================================

export type TimePeriod = 'day' | 'week' | 'month' | 'year';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface GroupedTimeData {
  period: string;
  value: number;
  count: number;
}

// ============================================
// ERROR TYPES
// ============================================

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export interface ChartError {
  type: 'data' | 'render' | 'api';
  message: string;
  details?: any;
}

// ============================================
// UTILITY FUNCTION RETURN TYPES
// ============================================

export interface NormalizedData {
  original: number[];
  normalized: number[];
  min: number;
  max: number;
}

export interface ColorScale {
  colors: string[];
  steps: number;
}

// ============================================
// COMPONENT STATE TYPES
// ============================================

export interface ChartState {
  loading: boolean;
  error: ChartError | null;
  data: AdvancedChartData[];
  currentIndex: number;
  chartType: 'bar' | 'line' | 'area';
}

export interface SwipeState {
  swiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

// ============================================
// EXPORT
// ============================================

export default {
  ChartDataPoint,
  ProcessedChartData,
  AdvancedChartData,
  GenreData,
  ThemeData,
  RatingData,
  ChartApiResponse,
  MobileSwipeChartsProps,
  AdvancedMobileChartsProps,
  ResponsiveChartsProps,
  SwipeHandlers,
  SwipeOptions,
  SwipeReturn,
  Statistics,
  TrendData,
  DataSeries,
  ColorPalette,
  GradientColor,
  AnimationConfig,
  BarAnimation,
  DeviceType,
  ResponsiveConfig,
  TimePeriod,
  DateRange,
  GroupedTimeData,
  ApiError,
  ChartError,
  NormalizedData,
  ColorScale,
  ChartState,
  SwipeState
};
