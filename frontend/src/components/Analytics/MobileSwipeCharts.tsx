import React, { useEffect, useState, useRef, TouchEvent } from "react";
import { getRequest } from "../../api";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import "./MobileSwipeCharts.css";

interface ChartData {
  genre?: { [key: string]: any };
  theme?: { [key: string]: any };
  rating?: { [key: string]: any };
}

interface ProcessedChartData {
  title: string;
  labels: string[];
  values: number[];
  color: string;
  icon: string;
}

const MobileSwipeCharts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [charts, setCharts] = useState<ProcessedChartData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeTimeoutRef = useRef<NodeJS.Timeout>();

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

        const processedCharts = processChartData({
          genre: genreData,
          theme: themeData,
          rating: ratingData
        });

        setCharts(processedCharts);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const processChartData = (data: ChartData): ProcessedChartData[] => {
    const processed: ProcessedChartData[] = [];

    // Process Genre Data
    if (data.genre && Object.keys(data.genre).length > 0) {
      const firstKey = Object.keys(data.genre)[0];
      const labels = Object.keys(data.genre[firstKey]).reverse();
      const topGenres = Object.keys(data.genre)
        .map(genre => ({
          genre,
          total: Object.values(data.genre![genre]).reduce(
            (sum: number, val: any) => sum + (val?.count || 0),
            0
          )
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      topGenres.forEach((item, idx) => {
        const values = labels.map(
          date => data.genre![item.genre][date]?.count || 0
        );
        const colors = [
          "#FF6B8B",
          "#2ED573",
          "#1E90FF",
          "#FFA502",
          "#9B59B6"
        ];
        
        processed.push({
          title: item.genre,
          labels: labels.map(formatDate),
          values,
          color: colors[idx % colors.length],
          icon: "📊"
        });
      });
    }

    // Process Theme Data
    if (data.theme && Object.keys(data.theme).length > 0) {
      const firstKey = Object.keys(data.theme)[0];
      const labels = Object.keys(data.theme[firstKey]).reverse();
      const topThemes = Object.keys(data.theme)
        .map(theme => ({
          theme,
          total: Object.values(data.theme![theme]).reduce(
            (sum: number, val: any) => sum + (val?.count || 0),
            0
          )
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      topThemes.forEach((item, idx) => {
        const values = labels.map(
          date => data.theme![item.theme][date]?.count || 0
        );
        const colors = [
          "#FF6B8B",
          "#2ED573",
          "#1E90FF",
          "#FFA502",
          "#9B59B6"
        ];
        
        processed.push({
          title: item.theme,
          labels: labels.map(formatDate),
          values,
          color: colors[idx % colors.length],
          icon: "🎬"
        });
      });
    }

    // Process Rating Data
    if (data.rating && Object.keys(data.rating).length > 0) {
      const labels = Object.keys(data.rating).reverse();
      const avgRatings = labels.map(
        date => data.rating![date]?.averageRating || 0
      );
      const totalRatings = labels.map(
        date => data.rating![date]?.totalRatings || 0
      );

      processed.push({
        title: "Average Rating",
        labels: labels.map(formatDate),
        values: avgRatings,
        color: "#FF4757",
        icon: "⭐"
      });

      processed.push({
        title: "Total Ratings",
        labels: labels.map(formatDate),
        values: totalRatings,
        color: "#2ED573",
        icon: "📈"
      });
    }

    return processed;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart - touchEnd > 50) {
      // Swiped left
      nextChart();
    }
    if (touchEnd - touchStart > 50) {
      // Swiped right
      prevChart();
    }
  };

  const nextChart = () => {
    if (currentIndex < charts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevChart = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="mobile-swipe-loading">
        <div className="spinner"></div>
        <p>Loading charts...</p>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="mobile-swipe-empty">
        <p>No chart data available</p>
      </div>
    );
  }

  const currentChart = charts[currentIndex];
  const maxValue = Math.max(...currentChart.values);
  const minValue = Math.min(...currentChart.values);
  const range = maxValue - minValue || 1;

  return (
    <div className="mobile-swipe-container">
      <div
        className="mobile-swipe-wrapper"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          className="mobile-chart-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          key={currentIndex}
        >
          {/* Header */}
          <div className="mobile-chart-header">
            <span className="chart-icon">{currentChart.icon}</span>
            <h3 className="chart-title">{currentChart.title}</h3>
            <span className="chart-badge">{currentIndex + 1} / {charts.length}</span>
          </div>

          {/* Bar Chart */}
          <div className="mobile-bar-chart">
            {currentChart.values.map((value, idx) => {
              const normalizedValue = (value - minValue) / range;
              return (
                <div key={idx} className="bar-container">
                  <motion.div
                    className="bar"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(normalizedValue * 100, 5)}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    style={{
                      backgroundColor: currentChart.color,
                      boxShadow: `0 0 10px ${currentChart.color}99`
                    }}
                  >
                    <span className="bar-value">{Math.round(value)}</span>
                  </motion.div>
                  <span className="bar-label">{currentChart.labels[idx]}</span>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mobile-chart-stats">
            <div className="stat-item">
              <span className="stat-label">Max</span>
              <span className="stat-value">{Math.round(maxValue)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Min</span>
              <span className="stat-value">{Math.round(minValue)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg</span>
              <span className="stat-value">
                {Math.round(currentChart.values.reduce((a, b) => a + b, 0) / currentChart.values.length)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="mobile-chart-nav">
        <motion.button
          className="nav-button prev"
          onClick={prevChart}
          disabled={currentIndex === 0}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeftIcon />
        </motion.button>

        <div className="dots-indicator">
          {charts.map((_, idx) => (
            <motion.button
              key={idx}
              className={`dot ${idx === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
              animate={{
                scale: idx === currentIndex ? 1.2 : 1,
                opacity: idx === currentIndex ? 1 : 0.5
              }}
            />
          ))}
        </div>

        <motion.button
          className="nav-button next"
          onClick={nextChart}
          disabled={currentIndex === charts.length - 1}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRightIcon />
        </motion.button>
      </div>
    </div>
  );
};

export default MobileSwipeCharts;
