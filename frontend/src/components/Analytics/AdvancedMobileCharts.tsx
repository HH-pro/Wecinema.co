import React, { useEffect, useState, useRef } from "react";
import { getRequest } from "../../api";
import { motion, AnimatePresence } from "framer-motion";
import "./AdvancedMobileCharts.css";

interface ChartDataPoint {
  label: string;
  value: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
}

interface AdvancedChartData {
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

interface AdvancedMobileChartsProps {
  maxCharts?: number;
  autoRotate?: boolean;
  rotationInterval?: number;
}

const AdvancedMobileCharts: React.FC<AdvancedMobileChartsProps> = ({
  maxCharts = 10,
  autoRotate = false,
  rotationInterval = 5000
}) => {
  const [loading, setLoading] = useState(true);
  const [charts, setCharts] = useState<AdvancedChartData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'donut'>('bar');
  const rotationTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        const [genreData, themeData, ratingData] = await Promise.all([
          getRequest(`/video/genres/graph?from=${from}&to=${to}`),
          getRequest(`/video/themes/graph?from=${from}&to=${to}`),
          getRequest(`/video/ratings/graph?from=${from}&to=${to}`)
        ]);

        const processedCharts = processAllChartData({
          genre: genreData,
          theme: themeData,
          rating: ratingData
        });

        setCharts(processedCharts.slice(0, maxCharts));
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [maxCharts]);

  // Auto-rotate charts
  useEffect(() => {
    if (!autoRotate || charts.length === 0) return;

    const rotate = () => {
      setCurrentIndex(prev => (prev + 1) % charts.length);
      rotationTimeoutRef.current = setTimeout(rotate, rotationInterval);
    };

    rotationTimeoutRef.current = setTimeout(rotate, rotationInterval);

    return () => {
      if (rotationTimeoutRef.current) {
        clearTimeout(rotationTimeoutRef.current);
      }
    };
  }, [autoRotate, charts.length, rotationInterval]);

  const processAllChartData = (data: any): AdvancedChartData[] => {
    const processed: AdvancedChartData[] = [];
    const colors = [
      "#FF6B8B", "#2ED573", "#1E90FF", "#FFA502", "#9B59B6",
      "#FF3838", "#00B894", "#0984E3", "#FD79A8", "#6C5CE7"
    ];

    // Process Genres
    if (data.genre && Object.keys(data.genre).length > 0) {
      const firstKey = Object.keys(data.genre)[0];
      const labels = Object.keys(data.genre[firstKey]).reverse();
      const genres = Object.keys(data.genre)
        .map(genre => ({
          genre,
          total: Object.values(data.genre[genre]).reduce(
            (sum: number, val: any) => sum + (val?.count || 0),
            0
          )
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      genres.forEach((item, idx) => {
        const values = labels.map(date => data.genre[item.genre][date]?.count || 0);
        const chartData = processChartData(labels, values);
        
        processed.push({
          id: `genre-${item.genre}`,
          title: item.genre,
          icon: "📊",
          type: idx % 3 === 0 ? 'bar' : idx % 3 === 1 ? 'line' : 'area',
          data: chartData,
          color: colors[idx % colors.length],
          totalValue: values.reduce((a, b) => a + b, 0),
          averageValue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          maxValue: Math.max(...values),
          minValue: Math.min(...values),
        });
      });
    }

    // Process Themes
    if (data.theme && Object.keys(data.theme).length > 0) {
      const firstKey = Object.keys(data.theme)[0];
      const labels = Object.keys(data.theme[firstKey]).reverse();
      const themes = Object.keys(data.theme)
        .map(theme => ({
          theme,
          total: Object.values(data.theme[theme]).reduce(
            (sum: number, val: any) => sum + (val?.count || 0),
            0
          )
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      themes.forEach((item, idx) => {
        const values = labels.map(date => data.theme[item.theme][date]?.count || 0);
        const chartData = processChartData(labels, values);
        
        processed.push({
          id: `theme-${item.theme}`,
          title: item.theme,
          icon: "🎬",
          type: idx % 3 === 0 ? 'bar' : idx % 3 === 1 ? 'line' : 'area',
          data: chartData,
          color: colors[(idx + 5) % colors.length],
          totalValue: values.reduce((a, b) => a + b, 0),
          averageValue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          maxValue: Math.max(...values),
          minValue: Math.min(...values),
        });
      });
    }

    return processed;
  };

  const processChartData = (labels: string[], values: number[]): ChartDataPoint[] => {
    const total = values.reduce((a, b) => a + b, 0);
    return labels.map((label, idx) => ({
      label: formatDate(label),
      value: values[idx],
      percentage: total > 0 ? (values[idx] / total) * 100 : 0,
      trend: idx > 0 ? (values[idx] > values[idx - 1] ? 'up' : values[idx] < values[idx - 1] ? 'down' : 'stable') : 'stable'
    }));
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="advanced-chart-loading">
        <div className="loading-spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="advanced-chart-empty">
        <p>No chart data available</p>
      </div>
    );
  }

  const currentChart = charts[currentIndex];
  const maxValue = currentChart.maxValue;
  const range = maxValue - currentChart.minValue || 1;

  return (
    <div className="advanced-mobile-charts">
      <div className="advanced-chart-header">
        <h2 className="advanced-chart-title">
          {currentChart.icon} {currentChart.title}
        </h2>
        <span className="advanced-chart-counter">{currentIndex + 1}/{charts.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="advanced-chart-content"
        >
          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            {(['bar', 'line', 'area'] as const).map(type => (
              <button
                key={type}
                className={`type-btn ${chartType === type ? 'active' : ''}`}
                onClick={() => setChartType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Chart Display */}
          <div className="advanced-chart-display">
            {chartType === 'bar' && (
              <div className="bar-chart-advanced">
                {currentChart.data.map((item, idx) => (
                  <motion.div
                    key={idx}
                    className="bar-item-advanced"
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.value / maxValue) * 100}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                  >
                    <div
                      className="bar-fill"
                      style={{
                        backgroundColor: currentChart.color,
                        boxShadow: `0 0 15px ${currentChart.color}99`
                      }}
                    />
                    <span className="bar-value-label">{item.value}</span>
                    <span className="bar-label-advanced">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {chartType === 'line' && (
              <div className="line-chart-advanced">
                <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                  <polyline
                    points={currentChart.data
                      .map((item, idx) => `${(idx / (currentChart.data.length - 1)) * 100},${100 - (item.value / maxValue) * 80}`)
                      .join(' ')}
                    style={{
                      stroke: currentChart.color,
                      fill: 'none',
                      strokeWidth: 2
                    }}
                  />
                  {currentChart.data.map((item, idx) => (
                    <circle
                      key={idx}
                      cx={(idx / (currentChart.data.length - 1)) * 100}
                      cy={100 - (item.value / maxValue) * 80}
                      r={2}
                      fill={currentChart.color}
                    />
                  ))}
                </svg>
              </div>
            )}

            {chartType === 'area' && (
              <div className="area-chart-advanced">
                <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={currentChart.color} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={currentChart.color} stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,60 ${currentChart.data
                      .map((item, idx) => `${(idx / (currentChart.data.length - 1)) * 100},${100 - (item.value / maxValue) * 80}`)
                      .join(' ')} 100,60`}
                    fill="url(#areaGradient)"
                    stroke={currentChart.color}
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="advanced-stats-grid">
            <div className="stat-card">
              <span className="stat-icon">📈</span>
              <span className="stat-name">Total</span>
              <span className="stat-val">{currentChart.totalValue}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📊</span>
              <span className="stat-name">Avg</span>
              <span className="stat-val">{currentChart.averageValue}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⬆️</span>
              <span className="stat-name">Max</span>
              <span className="stat-val">{currentChart.maxValue}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⬇️</span>
              <span className="stat-name">Min</span>
              <span className="stat-val">{currentChart.minValue}</span>
            </div>
          </div>

          {/* Data List */}
          <div className="data-list-advanced">
            {currentChart.data.slice(0, 7).map((item, idx) => (
              <div key={idx} className="data-row">
                <span className="data-label">{item.label}</span>
                <div className="data-bar-mini">
                  <motion.div
                    className="data-bar-fill-mini"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    style={{ backgroundColor: currentChart.color }}
                  />
                </div>
                <span className="data-value">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="advanced-chart-footer">
        <motion.button
          className="nav-btn-advanced"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Prev
        </motion.button>

        <div className="progress-advanced">
          <div className="progress-bar-advanced">
            <motion.div
              className="progress-fill-advanced"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / charts.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <motion.button
          className="nav-btn-advanced"
          onClick={() => setCurrentIndex(Math.min(charts.length - 1, currentIndex + 1))}
          disabled={currentIndex === charts.length - 1}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Next →
        </motion.button>
      </div>
    </div>
  );
};

export default AdvancedMobileCharts;
