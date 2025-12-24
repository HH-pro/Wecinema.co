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
  ChartOptions
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Charts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);

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
            
            // Get top 5 genres by total count
            const genreTotals = Object.keys(genreData).map(genre => ({
              genre,
              total: Object.values(genreData[genre]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 5);

            const datasets = genreTotals.map(({ genre }) => ({
              label: genre,
              data: labels.map((date: string) => genreData[genre][date]?.count || 0),
              borderColor: getGenreColor(genre),
              backgroundColor: getGenreColor(genre, true),
              borderWidth: 2.5,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getGenreColor(genre),
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
            
            // Get top 5 themes by total count
            const themeTotals = Object.keys(themeData).map(theme => ({
              theme,
              total: Object.values(themeData[theme]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 5);

            const datasets = themeTotals.map(({ theme }) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getThemeColor(theme),
              backgroundColor: getThemeColor(theme, true),
              borderWidth: 2.5,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getThemeColor(theme),
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
                label: "Average Rating",
                data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.05)",
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                fill: false,
              },
              {
                label: "Total Ratings",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: "#10b981",
                backgroundColor: "rgba(16, 185, 129, 0.05)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                fill: false,
                borderDash: [5, 5],
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

  // Color schemes for genres
  const getGenreColor = (genre: string, transparent: boolean = false) => {
    const colors: { [key: string]: string } = {
      'Action': '#ef4444',
      'Comedy': '#f59e0b',
      'Drama': '#3b82f6',
      'Horror': '#8b5cf6',
      'Adventure': '#10b981',
      'Romance': '#ec4899',
      'Sci-Fi': '#06b6d4',
      'Thriller': '#f97316',
      'Fantasy': '#84cc16',
      'Animation': '#6366f1'
    };
    
    const color = colors[genre] || '#64748b';
    return transparent ? color + '20' : color;
  };

  // Color schemes for themes
  const getThemeColor = (theme: string, transparent: boolean = false) => {
    const colors: { [key: string]: string } = {
      'Love': '#ec4899',
      'Redemption': '#8b5cf6',
      'Family': '#10b981',
      'Oppression': '#ef4444',
      'Corruption': '#f59e0b',
      'Survival': '#f97316',
      'Revenge': '#dc2626',
      'Death': '#64748b',
      'Justice': '#3b82f6',
      'Perseverance': '#84cc16',
      'War': '#ef4444',
      'Bravery': '#f59e0b',
      'Freedom': '#06b6d4',
      'Friendship': '#ec4899',
      'Hope': '#84cc16',
      'Society': '#8b5cf6',
      'Isolation': '#64748b',
      'Peace': '#10b981'
    };
    
    const color = colors[theme] || '#64748b';
    return transparent ? color + '20' : color;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  // Chart options
  const chartOptions = (title: string): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#e2e8f0",
          font: { 
            size: 10,
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            weight: '500' as const
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 12,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > 12 ? dataset.label.substring(0, 12) + '...' : dataset.label,
              fillStyle: dataset.borderColor as string,
              strokeStyle: dataset.borderColor as string,
              lineWidth: 2,
              hidden: !chart.isDatasetVisible(i),
              index: i
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
        titleColor: "#d1d5db",
        bodyColor: "#f3f4f6",
        titleFont: {
          size: 11,
          family: "'Inter', -apple-system, sans-serif",
          weight: '500' as const
        },
        bodyFont: {
          size: 10,
          family: "'Inter', -apple-system, sans-serif",
          weight: '400' as const
        },
        padding: 10,
        cornerRadius: 8,
        borderColor: "rgba(59, 130, 246, 0.2)",
        borderWidth: 1,
        displayColors: true,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2
              });
            }
            return label;
          },
          title: function(tooltipItems) {
            const date = new Date(tooltipItems[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'long',
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
          color: "rgba(148, 163, 184, 0.08)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 9,
            family: "'Inter', -apple-system, sans-serif",
            weight: '400' as const
          },
          padding: 8,
          callback: function(value) {
            const numValue = Number(value);
            if (numValue >= 1000) {
              return (numValue / 1000).toFixed(1) + 'k';
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
          color: "rgba(148, 163, 184, 0.08)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#94a3b8", 
          font: { 
            size: 9,
            family: "'Inter', -apple-system, sans-serif",
            weight: '400' as const
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          padding: 8,
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
        borderWidth: 2.5,
        fill: false,
        capBezierPoints: true,
      },
      point: { 
        radius: 0,
        hoverRadius: 5,
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
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    },
  });

  if (loading) {
    return (
      <div className="charts-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading analytics data...</p>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Top Genres Trend", 
      description: "Popularity over time" 
    },
    { 
      data: themeChartData, 
      title: "Top Themes Trend", 
      description: "Theme engagement metrics" 
    },
    { 
      data: ratingChartData, 
      title: "Ratings Analysis", 
      description: "Average & total ratings" 
    },
  ];

  return (
    <div className="charts-grid">
      {charts.map((chart, idx) => (
        <div key={idx} className="chart-card">
          <div className="chart-header">
            <div className="chart-title-wrapper">
              <h3 className="chart-title">{chart.title}</h3>
              <div className="chart-indicator">
                <div 
                  className="indicator-dot" 
                  style={{ 
                    backgroundColor: idx === 0 ? '#ef4444' : 
                                   idx === 1 ? '#8b5cf6' : 
                                   '#3b82f6' 
                  }}
                ></div>
                <span className="indicator-text">Live</span>
              </div>
            </div>
            <p className="chart-description">{chart.description}</p>
          </div>
          
          <div className="chart-wrapper">
            {chart.data ? (
              <div className="chart-canvas">
                <Line data={chart.data} options={chartOptions(chart.title)} />
              </div>
            ) : (
              <div className="no-data">
                <div className="no-data-icon">📊</div>
                <span className="no-data-text">No data available</span>
                <span className="no-data-subtext">Check back later for updates</span>
              </div>
            )}
          </div>
          
          <div className="chart-footer">
            {chart.data && (
              <div className="data-stats">
                <div className="stat-item">
                  <span className="stat-label">Period</span>
                  <span className="stat-value">11 months</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Points</span>
                  <span className="stat-value">
                    {chart.data.labels.length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Trend</span>
                  <span className={`stat-trend ${idx === 2 ? 'up' : 'stable'}`}>
                    {idx === 2 ? '↗ Up' : '→ Stable'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;