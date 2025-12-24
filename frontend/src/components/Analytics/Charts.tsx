import React, { useEffect, useState } from "react";
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

const Charts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const [hoveredChart, setHoveredChart] = useState<number | null>(null);

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

            const datasets = genreTotals.map(({ genre }, index) => ({
              label: genre,
              data: labels.map((date: string) => genreData[genre][date]?.count || 0),
              borderColor: getGradientColor(index),
              backgroundColor: 'transparent',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getSolidColor(index),
              pointBorderWidth: 2,
              fill: false,
            }));

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

            const datasets = themeTotals.map(({ theme }, index) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getGradientColor(index + 3),
              backgroundColor: 'transparent',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getSolidColor(index + 3),
              pointBorderWidth: 2,
              fill: false,
            }));

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
                borderColor: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#f59e0b',
                pointBorderWidth: 2,
                fill: false,
              },
              {
                label: "Total",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                fill: false,
                borderDash: [5, 3],
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

  // Gradient colors for stylish lines
  const getGradientColor = (index: number) => {
    const gradients = [
      'linear-gradient(90deg, #3b82f6, #8b5cf6)',
      'linear-gradient(90deg, #10b981, #06b6d4)',
      'linear-gradient(90deg, #f59e0b, #f97316)',
      'linear-gradient(90deg, #ec4899, #8b5cf6)',
      'linear-gradient(90deg, #06b6d4, #3b82f6)',
      'linear-gradient(90deg, #84cc16, #10b981)',
    ];
    return gradients[index % gradients.length];
  };

  // Solid colors for points
  const getSolidColor = (index: number) => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4'
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

  // Stylish chart options
  const chartOptions = (): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#e2e8f0",
          font: { 
            size: 11,
            family: "'Inter', -apple-system, sans-serif",
            weight: '600' as const
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 12,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > 10 ? dataset.label.substring(0, 10) + '...' : dataset.label,
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
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#d1d5db",
        bodyColor: "#f3f4f6",
        titleFont: {
          size: 12,
          family: "'Inter', -apple-system, sans-serif",
          weight: '600' as const
        },
        bodyFont: {
          size: 11,
          family: "'Inter', -apple-system, sans-serif",
          weight: '500' as const
        },
        padding: 12,
        cornerRadius: 10,
        borderColor: "rgba(255, 255, 255, 0.1)",
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
          color: "rgba(255, 255, 255, 0.05)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 10,
            family: "'Inter', -apple-system, sans-serif"
          },
          padding: 10,
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
          color: "rgba(255, 255, 255, 0.05)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 10,
            family: "'Inter', -apple-system, sans-serif"
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          padding: 10,
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 3,
        fill: false,
      },
      point: { 
        radius: 0,
        hoverRadius: 6,
        backgroundColor: "#ffffff",
        borderWidth: 2,
        hoverBorderWidth: 3,
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
      <div className="stylish-loading">
        <div className="loading-spinner-stylish">
          <div className="spinner-ring"></div>
          <div className="spinner-core"></div>
        </div>
        <p className="loading-text">Loading visual data...</p>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Genre Trends", 
      description: "Popularity over time",
      icon: "🎬",
      color: "#3b82f6"
    },
    { 
      data: themeChartData, 
      title: "Theme Analysis", 
      description: "Engagement metrics",
      icon: "🎯",
      color: "#10b981"
    },
    { 
      data: ratingChartData, 
      title: "Ratings Overview", 
      description: "Average & total ratings",
      icon: "⭐",
      color: "#f59e0b"
    },
  ];

  return (
    <div className="charts-grid-stylish">
      {charts.map((chart, idx) => (
        <div 
          key={idx} 
          className={`chart-card-stylish ${hoveredChart === idx ? 'hovered' : ''}`}
          onMouseEnter={() => setHoveredChart(idx)}
          onMouseLeave={() => setHoveredChart(null)}
        >
          <div className="chart-header-stylish">
            <div className="chart-title-section">
              <div className="chart-icon-stylish" style={{ 
                background: `linear-gradient(135deg, ${chart.color}20, ${chart.color}10)`,
                borderColor: `${chart.color}30`
              }}>
                <span>{chart.icon}</span>
              </div>
              <div>
                <h3 className="chart-title">{chart.title}</h3>
                <p className="chart-description">{chart.description}</p>
              </div>
            </div>
            <div className="chart-status">
              <span className="status-dot"></span>
              <span className="status-text">Live</span>
            </div>
          </div>
          
          <div className="chart-wrapper-stylish">
            {chart.data ? (
              <Line data={chart.data} options={chartOptions()} />
            ) : (
              <div className="no-data-stylish">
                <div className="no-data-icon">📊</div>
                <span>No data available</span>
              </div>
            )}
          </div>
          
          <div className="chart-footer-stylish">
            <div className="footer-info">
              <span className="info-item">
                <span className="info-label">Points:</span>
                <span className="info-value">{chart.data?.labels.length || 0}</span>
              </span>
              <span className="info-item">
                <span className="info-label">Trend:</span>
                <span className="info-trend">
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