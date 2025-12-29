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
              borderColor: getYellowGradient(index),
              backgroundColor: 'transparent',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getYellowColor(index),
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
              borderColor: getYellowGradient(index + 3),
              backgroundColor: 'transparent',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getYellowColor(index + 3),
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
                pointRadius: 2,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#f59e0b',
                pointBorderWidth: 2,
                fill: false,
              },
              {
                label: "Total",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: 'linear-gradient(90deg, #d97706, #b45309)',
                backgroundColor: 'transparent',
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#d97706',
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

  // Yellow theme gradients
  const getYellowGradient = (index: number) => {
    const gradients = [
      'linear-gradient(90deg, #f59e0b, #fbbf24)',
      'linear-gradient(90deg, #d97706, #f59e0b)',
      'linear-gradient(90deg, #fbbf24, #fcd34d)',
      'linear-gradient(90deg, #b45309, #d97706)',
      'linear-gradient(90deg, #fcd34d, #fef3c7)',
      'linear-gradient(90deg, #92400e, #b45309)',
    ];
    return gradients[index % gradients.length];
  };

  // Yellow solid colors
  const getYellowColor = (index: number) => {
    const colors = [
      '#f59e0b', '#fbbf24', '#d97706',
      '#b45309', '#fcd34d', '#92400e'
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

  // Yellow theme chart options
  const chartOptions = (): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#78350f",
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
        backgroundColor: "rgba(254, 243, 199, 0.95)",
        titleColor: "#78350f",
        bodyColor: "#92400e",
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
        borderColor: "rgba(245, 158, 11, 0.3)",
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
          color: "rgba(251, 191, 36, 0.1)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#92400e", 
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
          color: "rgba(251, 191, 36, 0.1)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#92400e", 
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
        radius: 2,
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
      color: "#f59e0b"
    },
    { 
      data: themeChartData, 
      title: "Theme Analysis", 
      description: "Engagement metrics",
      icon: "🎯",
      color: "#d97706"
    },
    { 
      data: ratingChartData, 
      title: "Ratings Overview", 
      description: "Average & total ratings",
      icon: "⭐",
      color: "#b45309"
    },
  ];

  return (
    <div className="yellow-charts-grid">
      {charts.map((chart, idx) => (
        <div 
          key={idx} 
          className={`yellow-chart-card ${hoveredChart === idx ? 'hovered' : ''}`}
          onMouseEnter={() => setHoveredChart(idx)}
          onMouseLeave={() => setHoveredChart(null)}
        >
          <div className="yellow-chart-header">
            <div className="yellow-chart-title-section">
              <div className="yellow-chart-icon" style={{ 
                background: `linear-gradient(135deg, ${chart.color}30, ${chart.color}20)`,
                borderColor: `${chart.color}50`
              }}>
                <span>{chart.icon}</span>
              </div>
              <div>
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
              <Line data={chart.data} options={chartOptions()} />
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