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
  const [activeChart, setActiveChart] = useState<number | null>(null);

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
            
            // Get top 4 genres by total count
            const genreTotals = Object.keys(genreData).map(genre => ({
              genre,
              total: Object.values(genreData[genre]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 4);

            const datasets = genreTotals.map(({ genre }, index) => ({
              label: genre,
              data: labels.map((date: string) => genreData[genre][date]?.count || 0),
              borderColor: getChartColor(index, 'primary'),
              backgroundColor: getChartColor(index, 'gradient'),
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getChartColor(index, 'primary'),
              pointBorderWidth: 2,
              fill: true,
              fillOpacity: 0.1,
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
            
            // Get top 4 themes by total count
            const themeTotals = Object.keys(themeData).map(theme => ({
              theme,
              total: Object.values(themeData[theme]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 4);

            const datasets = themeTotals.map(({ theme }, index) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getChartColor(index + 4, 'primary'),
              backgroundColor: getChartColor(index + 4, 'gradient'),
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getChartColor(index + 4, 'primary'),
              pointBorderWidth: 2,
              fill: true,
              fillOpacity: 0.1,
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
                label: "Average Rating",
                data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderWidth: 4,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 7,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#f59e0b',
                pointBorderWidth: 2,
                fill: true,
                fillOpacity: 0.05,
              },
              {
                label: "Total Ratings",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                fill: true,
                fillOpacity: 0.05,
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

  // Modern color palette
  const getChartColor = (index: number, type: 'primary' | 'gradient') => {
    const colors = [
      '#f59e0b', // Amber
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f97316', // Orange
      '#06b6d4', // Cyan
      '#84cc16', // Lime
    ];
    
    const color = colors[index % colors.length];
    
    if (type === 'gradient') {
      return `linear-gradient(180deg, ${color}20 0%, transparent 100%)`;
    }
    
    return color;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  // Modern chart options
  const chartOptions = (chartIndex: number): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#e2e8f0",
          font: { 
            size: 11,
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            weight: '600' as const
          },
          usePointStyle: true,
          boxWidth: 8,
          padding: 15,
          pointStyle: 'circle',
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > 14 ? dataset.label.substring(0, 14) + '...' : dataset.label,
              fillStyle: dataset.borderColor as string,
              strokeStyle: dataset.borderColor as string,
              lineWidth: 3,
              hidden: !chart.isDatasetVisible(i),
              index: i,
              pointStyle: 'circle'
            }));
          }
        },
        onClick: (e, legendItem, legend) => {
          const index = legendItem.datasetIndex!;
          const ci = legend.chart;
          if (ci.isDatasetVisible(index)) {
            ci.hide(index);
            legendItem.hidden = true;
          } else {
            ci.show(index);
            legendItem.hidden = false;
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        backdropColor: "rgba(0, 0, 0, 0.5)",
        titleColor: "#fbbf24",
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
        padding: 14,
        cornerRadius: 12,
        borderColor: "rgba(245, 158, 11, 0.3)",
        borderWidth: 1,
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              const value = context.parsed.y;
              if (value >= 1000) {
                label += (value / 1000).toFixed(1) + 'k';
              } else {
                label += value.toFixed(1);
              }
            }
            return label;
          },
          labelColor: function(context) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
              borderWidth: 2,
              borderRadius: 6,
            };
          },
          title: function(tooltipItems) {
            const date = new Date(tooltipItems[0].label);
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          }
        }
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
          drawOnChartArea: true,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 10,
            family: "'Inter', -apple-system, sans-serif",
            weight: '500' as const
          },
          padding: 12,
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
        title: {
          display: false
        }
      },
      x: {
        reverse: true,
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 10,
            family: "'Inter', -apple-system, sans-serif",
            weight: '500' as const
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          padding: 12,
        },
        border: {
          display: false,
        },
        title: {
          display: false
        }
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 3,
        fill: true,
        capBezierPoints: true,
      },
      point: { 
        radius: 0,
        hoverRadius: 6,
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
    animations: {
      tension: {
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    },
    onHover: (event, chartElements) => {
      if (chartElements && chartElements.length > 0) {
        setActiveChart(chartIndex);
      } else {
        setActiveChart(null);
      }
    },
  });

  if (loading) {
    return (
      <div className="charts-loading-modern">
        <div className="loading-container">
          <div className="loading-spinner-modern">
            <div className="spinner-ring"></div>
            <div className="spinner-dot"></div>
          </div>
          <div className="loading-content">
            <h3 className="loading-title">Loading Insights</h3>
            <p className="loading-subtitle">Fetching real-time analytics data...</p>
            <div className="loading-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Genre Popularity", 
      description: "Top genres trending over time",
      icon: "🎬",
      color: "#f59e0b"
    },
    { 
      data: themeChartData, 
      title: "Theme Analysis", 
      description: "Most engaging themes & patterns",
      icon: "🎯",
      color: "#3b82f6"
    },
    { 
      data: ratingChartData, 
      title: "Ratings Overview", 
      description: "User ratings & engagement metrics",
      icon: "⭐",
      color: "#10b981"
    },
  ];

  return (
    <div className="charts-grid-modern">
      {charts.map((chart, idx) => (
        <div 
          key={idx} 
          className={`chart-card-modern ${activeChart === idx ? 'active' : ''}`}
          onMouseEnter={() => setActiveChart(idx)}
          onMouseLeave={() => setActiveChart(null)}
        >
          <div className="chart-header-modern">
            <div className="chart-title-section">
              <div className="chart-icon" style={{ backgroundColor: `${chart.color}20` }}>
                <span className="icon-text">{chart.icon}</span>
              </div>
              <div>
                <h3 className="chart-title-modern">{chart.title}</h3>
                <p className="chart-description-modern">{chart.description}</p>
              </div>
            </div>
            <div className="chart-actions">
              <div className="chart-status">
                <span className="status-dot"></span>
                <span className="status-text">Live</span>
              </div>
              <button className="chart-action-btn" title="View details">
                <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="chart-wrapper-modern">
            {chart.data ? (
              <div className="chart-canvas-modern">
                <Line data={chart.data} options={chartOptions(idx)} />
              </div>
            ) : (
              <div className="no-data-modern">
                <div className="no-data-icon-modern">📊</div>
                <div className="no-data-content">
                  <h4 className="no-data-title">No Data Available</h4>
                  <p className="no-data-subtitle">Data will appear here once available</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="chart-footer-modern">
            <div className="chart-stats">
              <div className="stat-item-modern">
                <span className="stat-icon">📈</span>
                <div>
                  <span className="stat-label-modern">Trend</span>
                  <span className="stat-value-modern">
                    {idx === 2 ? 'Growing' : 'Stable'}
                  </span>
                </div>
              </div>
              <div className="stat-item-modern">
                <span className="stat-icon">🕐</span>
                <div>
                  <span className="stat-label-modern">Period</span>
                  <span className="stat-value-modern">330 days</span>
                </div>
              </div>
              <div className="stat-item-modern">
                <span className="stat-icon">🔢</span>
                <div>
                  <span className="stat-label-modern">Data Points</span>
                  <span className="stat-value-modern">
                    {chart.data?.labels.length || 0}
                  </span>
                </div>
              </div>
            </div>
            <div className="chart-trend">
              <span className="trend-label">Current Trend</span>
              <span className={`trend-value ${idx === 2 ? 'up' : 'neutral'}`}>
                {idx === 2 ? '↗ Positive' : '→ Stable'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;