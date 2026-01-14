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
              const colors = getRandomColorSet(index);
              return {
                label: genre,
                data: labels.map((date: string) => genreData[genre][date]?.count || 0),
                borderColor: colors.lineColor,
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: colors.pointColor,
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
              const colors = getRandomColorSet(index + 3);
              return {
                label: theme,
                data: labels.map((date: string) => themeData[theme][date]?.count || 0),
                borderColor: colors.lineColor,
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: colors.pointColor,
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
                borderColor: '#FF4757', // Bright Red
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#FF4757',
                pointBorderWidth: 3,
                fill: false,
                cubicInterpolationMode: 'monotone' as const,
              },
              {
                label: "Total Ratings",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: '#2ED573', // Bright Green
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2ED573',
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

  // Random vibrant colors for chart lines
  const getRandomColorSet = (index: number) => {
    const colorSets = [
      { lineColor: '#FF6B8B', pointColor: '#FF4757' }, // Pink-Red
      { lineColor: '#2ED573', pointColor: '#1DD1A1' }, // Green
      { lineColor: '#1E90FF', pointColor: '#3742FA' }, // Blue
      { lineColor: '#FFA502', pointColor: '#FF7F00' }, // Orange
      { lineColor: '#9B59B6', pointColor: '#8E44AD' }, // Purple
      { lineColor: '#FF3838', pointColor: '#FF0000' }, // Bright Red
      { lineColor: '#32FF7E', pointColor: '#0BE370' }, // Lime Green
      { lineColor: '#18DCFF', pointColor: '#17C0EB' }, // Cyan
      { lineColor: '#FF9F1A', pointColor: '#FF8C00' }, // Dark Orange
      { lineColor: '#7158E2', pointColor: '#5F27CD' }, // Violet
      { lineColor: '#3AE374', pointColor: '#26DE81' }, // Emerald
      { lineColor: '#FF3838', pointColor: '#FF0000' }, // Scarlet
      { lineColor: '#67E6DC', pointColor: '#3DC7BE' }, // Teal
      { lineColor: '#FFB8B8', pointColor: '#FF9F9F' }, // Light Pink
      { lineColor: '#C56CF0', pointColor: '#AE2CFF' }, // Bright Purple
      { lineColor: '#FFAF40', pointColor: '#FF9F00' }, // Amber
      { lineColor: '#3D3D3D', pointColor: '#FFFFFF' }, // Black (for contrast)
      { lineColor: '#7BED9F', pointColor: '#55E6C1' }, // Mint
      { lineColor: '#70A1FF', pointColor: '#1B9CFC' }, // Sky Blue
      { lineColor: '#FF9FF3', pointColor: '#F368E0' }, // Magenta
      { lineColor: '#FECA57', pointColor: '#FF9F43' }, // Yellow-Orange
      { lineColor: '#48DBFB', pointColor: '#0ABDE3' }, // Light Blue
      { lineColor: '#D6A2E8', pointColor: '#BD8AE8' }, // Lavender
      { lineColor: '#FF6B81', pointColor: '#EE5A52' }, // Coral
      { lineColor: '#00D2D3', pointColor: '#01A3A4' }, // Turquoise
      { lineColor: '#54A0FF', pointColor: '#2E86DE' }, // Deep Blue
      { lineColor: '#FF9A76', pointColor: '#FF7F50' }, // Salmon
      { lineColor: '#58B19F', pointColor: '#3B8D73' }, // Sea Green
      { lineColor: '#FD7272', pointColor: '#FC5C65' }, // Watermelon
      { lineColor: '#9AECDB', pointColor: '#81ECEC' },
    ];
    return colorSets[index % colorSets.length];
  };

  // Icon colors for chart cards
  const getIconColors = (index: number) => {
    const colors = [
      { color1: '#FF6B8B', color2: '#FF4757' },
      { color1: '#2ED573', color2: '#1DD1A1' },
      { color1: '#1E90FF', color2: '#3742FA' },
      { color1: '#FFA502', color2: '#FF7F00' },
      { color1: '#9B59B6', color2: '#8E44AD' },
      { color1: '#FF3838', color2: '#FF0000' },
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
          color: "#fffff",
          font: { 
            size: isMobile ? 10 : 11,
            family: "'Inter', -apple-system, sans-serif",
          },
          usePointStyle: true,
          boxWidth: 8,
          padding: 12,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > (isMobile ? 8 : 12) ? 
                dataset.label.substring(0, isMobile ? 8 : 12) + '...' : 
                dataset.label,
              fillStyle: dataset.pointBorderColor as string,
              strokeStyle: dataset.pointBorderColor as string,
              lineWidth: 4,
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
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        titleColor: "#2c3e50",
        bodyColor: "#34495e",
        titleFont: {
          size: isMobile ? 11 : 12,
          family: "'Inter', -apple-system, sans-serif",
        },
        bodyFont: {
          size: isMobile ? 10 : 11,
          family: "'Inter', -apple-system, sans-serif",
        },
        padding: 14,
        cornerRadius: 6,
        borderColor: "rgba(0, 0, 0, 0.08)",
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
          color: "rgba(255, 255, 255, 0.06)",
          drawBorder: false,
          lineWidth: 1.5,
        },
        ticks: { 
          color: "#ffffff", 
          font: { 
            size: isMobile ? 9 : 10,
            family: "'Inter', -apple-system, sans-serif",
            weight: '500' as const
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
          color: "rgba(0, 0, 0, 0.06)",
          drawBorder: false,
          lineWidth: 1.5,
        },
        ticks: { 
          color: "#ffffff", 
          font: { 
            size: isMobile ? 9 : 10,
            family: "'Inter', -apple-system, sans-serif",
            weight: '500' as const
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 5 : 6,
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
        borderWidth: 2,
        fill: false,
      },
      point: { 
        radius: 2,
        hoverRadius: 9,
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
                <span className="yellow-info-label">Data Points:</span>
                <span className="yellow-info-value">{chart.data?.labels.length || 0}</span>
              </span>
              <span className="yellow-info-item">
                <span className="yellow-info-label">Status:</span>
                <span className="yellow-info-trend" style={{
                  backgroundColor: idx === 0 ? 'rgba(255, 107, 139, 0.15)' : 
                                   idx === 1 ? 'rgba(46, 213, 115, 0.15)' : 
                                   'rgba(30, 144, 255, 0.15)',
                  color: idx === 0 ? '#FF4757' : 
                         idx === 1 ? '#1DD1A1' : 
                         '#3742FA'
                }}>
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