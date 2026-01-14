import React, { useEffect, useState, useRef } from "react";
import { getRequest } from "../../api";
import { Line } from "react-chartjs-2";
import "./Analytics.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartsProps {
  isMobile?: boolean;
}

const Charts: React.FC<ChartsProps> = ({ isMobile = false }) => {
  const [loading, setLoading] = useState(true);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const [hoveredChart, setHoveredChart] = useState<number | null>(null);
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchAllCharts = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        // Fetch all data in parallel
        const [genreData, themeData, ratingData] = await Promise.all([
          getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading)
        ]);

        if (isMounted) {
          // Process Genre Chart Data
          if (genreData && Object.keys(genreData).length > 0) {
            const firstKey = Object.keys(genreData)[0];
            const labels = Object.keys(genreData[firstKey]).reverse();
            
            // Get top 3 genres by total count
            const genreTotals = Object.keys(genreData).map(genre => ({
              genre,
              total: Object.values(genreData[genre]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 3);

            const datasets = genreTotals.map(({ genre }, index) => {
              const gradientColors = getVibrantGradient(index);
              return {
                label: genre,
                data: labels.map((date: string) => genreData[genre][date]?.count || 0),
                borderColor: gradientColors.border,
                backgroundColor: 'transparent',
                borderWidth: 4,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: gradientColors.point,
                pointBorderWidth: 3,
                fill: false,
                cubicInterpolationMode: 'monotone' as const,
              };
            });

            setGenreChartData({ 
              labels: labels.map(date => formatDate(date)),
              datasets 
            });
          }

          // Process Theme Chart Data
          if (themeData && Object.keys(themeData).length > 0) {
            const firstKey = Object.keys(themeData)[0];
            const labels = Object.keys(themeData[firstKey]).reverse();
            
            // Get top 3 themes by total count
            const themeTotals = Object.keys(themeData).map(theme => ({
              theme,
              total: Object.values(themeData[theme]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 3);

            const datasets = themeTotals.map(({ theme }, index) => {
              const gradientColors = getVibrantGradient(index + 3);
              return {
                label: theme,
                data: labels.map((date: string) => themeData[theme][date]?.count || 0),
                borderColor: gradientColors.border,
                backgroundColor: 'transparent',
                borderWidth: 4,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: gradientColors.point,
                pointBorderWidth: 3,
                fill: false,
                cubicInterpolationMode: 'monotone' as const,
              };
            });

            setThemeChartData({ 
              labels: labels.map(date => formatDate(date)),
              datasets 
            });
          }

          // Process Rating Chart Data
          if (ratingData && Object.keys(ratingData).length > 0) {
            const labels = Object.keys(ratingData).reverse();
            
            const datasets = [
              {
                label: "Avg Rating",
                data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
                borderColor: 'linear-gradient(90deg, #FF6B6B, #FF8E53)',
                backgroundColor: 'transparent',
                borderWidth: 4,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 8,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#FF6B6B',
                pointBorderWidth: 3,
                fill: false,
                cubicInterpolationMode: 'monotone' as const,
              },
              {
                label: "Total",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
                backgroundColor: 'transparent',
                borderWidth: 3.5,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 7,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4ECDC4',
                pointBorderWidth: 3,
                fill: false,
                cubicInterpolationMode: 'monotone' as const,
                borderDash: [6, 4],
              },
            ];

            setRatingChartData({ 
              labels: labels.map(date => formatDate(date)),
              datasets 
            });
          }
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCharts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Colorful vibrant gradients for charts
  const getVibrantGradient = (index: number) => {
    const gradients = [
      { border: 'linear-gradient(90deg, #FF6B6B, #FF8E53)', point: '#FF6B6B' },
      { border: 'linear-gradient(90deg, #4ECDC4, #44A08D)', point: '#4ECDC4' },
      { border: 'linear-gradient(90deg, #FFD166, #FFC145)', point: '#FFD166' },
      { border: 'linear-gradient(90deg, #06D6A0, #0CB48A)', point: '#06D6A0' },
      { border: 'linear-gradient(90deg, #118AB2, #0B5F8A)', point: '#118AB2' },
      { border: 'linear-gradient(90deg, #EF476F, #D43A5F)', point: '#EF476F' },
      { border: 'linear-gradient(90deg, #9D4EDD, #7B2CBF)', point: '#9D4EDD' },
      { border: 'linear-gradient(90deg, #FF9E6D, #FF7F50)', point: '#FF9E6D' },
      { border: 'linear-gradient(90deg, #2A9D8F, #1D7873)', point: '#2A9D8F' },
    ];
    return gradients[index % gradients.length];
  };

  // Icon colors for chart cards
  const getIconColors = (index: number) => {
    const colors = [
      { color1: '#FF6B6B', color2: '#FF8E53' },
      { color1: '#4ECDC4', color2: '#44A08D' },
      { color1: '#FFD166', color2: '#FFC145' },
      { color1: '#06D6A0', color2: '#0CB48A' },
      { color1: '#118AB2', color2: '#0B5F8A' },
      { color1: '#EF476F', color2: '#D43A5F' },
    ];
    return colors[index % colors.length];
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  // Chart options with colorful theme
  const chartOptions = (): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#78350f",
          font: { 
            size: isMobile ? 10 : 11,
            family: "'Inter', -apple-system, sans-serif",
            weight: '600' as const
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 10,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > (isMobile ? 8 : 12) ? 
                dataset.label.substring(0, isMobile ? 8 : 12) + '...' : 
                dataset.label,
              fillStyle: dataset.pointBorderColor as string,
              strokeStyle: dataset.pointBorderColor as string,
              lineWidth: 3,
              hidden: !chart.isDatasetVisible(i),
              index: i
            }));
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1a202c",
        bodyColor: "#2d3748",
        titleFont: {
          size: isMobile ? 11 : 12,
          family: "'Inter', -apple-system, sans-serif",
          weight: '600' as const
        },
        bodyFont: {
          size: isMobile ? 10 : 11,
          family: "'Inter', -apple-system, sans-serif",
          weight: '500' as const
        },
        padding: 12,
        cornerRadius: 10,
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        displayColors: true,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1);
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#4a5568", 
          font: { 
            size: isMobile ? 9 : 10,
            family: "'Inter', -apple-system, sans-serif"
          },
          padding: 8,
          callback: function(value) {
            const numValue = Number(value);
            if (numValue >= 1000) {
              return (numValue / 1000).toFixed(0) + 'k';
            }
            return numValue;
          }
        },
        beginAtZero: true,
        border: {
          display: false,
        },
      },
      x: {
        reverse: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#4a5568", 
          font: { 
            size: isMobile ? 9 : 10,
            family: "'Inter', -apple-system, sans-serif"
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 5 : 6,
          padding: 8,
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 4,
        fill: false,
      },
      point: { 
        radius: 3,
        hoverRadius: 8,
        backgroundColor: "#ffffff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBackgroundColor: "#ffffff",
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  });

  if (loading) {
    return (
      <div className="yellow-loading">
        <div className="yellow-loading-spinner">
          <div className="yellow-spinner-ring"></div>
          <div className="yellow-spinner-core"></div>
        </div>
        <p className="yellow-loading-text">Loading visual data...</p>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Genre Trends", 
      description: "Popularity over time",
      icon: "🎬",
      colors: getIconColors(0)
    },
    { 
      data: themeChartData, 
      title: "Theme Analysis", 
      description: "Engagement metrics",
      icon: "🎯",
      colors: getIconColors(1)
    },
    { 
      data: ratingChartData, 
      title: "Ratings Overview", 
      description: "Average & total ratings",
      icon: "⭐",
      colors: getIconColors(2)
    },
  ];

  return (
    <div className="yellow-charts-grid">
      {charts.map((chart, idx) => (
        <div 
          key={idx} 
          className={`yellow-chart-card ${hoveredChart === idx ? 'hovered' : ''}`}
          ref={el => chartRefs.current[idx] = el}
          onMouseEnter={() => setHoveredChart(idx)}
          onMouseLeave={() => setHoveredChart(null)}
          style={{
            '--icon-color-1': chart.colors.color1,
            '--icon-color-2': chart.colors.color2,
          } as React.CSSProperties}
        >
          <div className="yellow-chart-header">
            <div className="yellow-chart-title-section">
              <div className="yellow-chart-icon" style={{ 
                borderColor: `${chart.colors.color1}80`,
                background: `linear-gradient(135deg, ${chart.colors.color1}30, ${chart.colors.color2}20)`
              }}>
                <span>{chart.icon}</span>
              </div>
              <div className="yellow-chart-text">
                <h3 className="yellow-chart-title">{chart.title}</h3>
                <p className="yellow-chart-description">{chart.description}</p>
              </div>
            </div>
            <div className="yellow-chart-status">
              <span className="yellow-status-dot"></span>
              <span className="yellow-status-text">Live</span>
            </div>
          </div>
          
          <div className="yellow-chart-wrapper">
            {chart.data ? (
              <Line 
                data={chart.data} 
                options={chartOptions()} 
                height={isMobile ? 140 : 150}
              />
            ) : (
              <div className="yellow-no-data">
                <div className="yellow-no-data-icon">📊</div>
                <span>No data available</span>
              </div>
            )}
          </div>
          
          <div className="yellow-chart-footer">
            <div className="yellow-footer-info">
              <span className="yellow-info-item">
                <span className="yellow-info-label">Points:</span>
                <span className="yellow-info-value">{chart.data?.labels.length || 0}</span>
              </span>
              <span className="yellow-info-item">
                <span className="yellow-info-label">Trend:</span>
                <span className="yellow-info-trend">
                  {idx === 2 ? '↗ Rising' : '→ Stable'}
                </span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;