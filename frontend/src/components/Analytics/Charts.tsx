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
              borderColor: getChartColor(index),
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getChartColor(index),
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
            
            // Get top 4 themes by total count
            const themeTotals = Object.keys(themeData).map(theme => ({
              theme,
              total: Object.values(themeData[theme]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 4);

            const datasets = themeTotals.map(({ theme }, index) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getChartColor(index + 4),
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 4,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: getChartColor(index + 4),
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
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 2,
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
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointBorderWidth: 2,
                fill: false,
                borderDash: [4, 4],
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

  // Professional color palette
  const getChartColor = (index: number) => {
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
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

  // Professional chart options (clean line graphs)
  const chartOptions = (): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#6b7280",
          font: { 
            size: 11,
            family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            weight: '500' as const
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 10,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, i) => ({
              text: dataset.label?.length > 12 ? dataset.label.substring(0, 12) + '...' : dataset.label,
              fillStyle: dataset.borderColor as string,
              strokeStyle: dataset.borderColor as string,
              lineWidth: 2,
              hidden: !chart.isDatasetVisible(i),
              index: i,
              pointStyle: 'circle'
            }));
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#374151",
        bodyColor: "#4b5563",
        titleFont: {
          size: 12,
          family: "'Inter', -apple-system, sans-serif",
          weight: '600' as const
        },
        bodyFont: {
          size: 11,
          family: "'Inter', -apple-system, sans-serif",
          weight: '400' as const
        },
        padding: 10,
        cornerRadius: 6,
        borderColor: "rgba(209, 213, 219, 0.5)",
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
          color: "rgba(229, 231, 235, 0.5)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#6b7280", 
          font: { 
            size: 10,
            family: "'Inter', -apple-system, sans-serif",
            weight: '400' as const
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
          color: "rgba(229, 231, 235, 0.5)",
          drawBorder: false,
          drawTicks: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#6b7280", 
          font: { 
            size: 10,
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
        hoverRadius: 4,
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
      <div className="charts-loading-compact">
        <div className="loading-spinner-compact"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Genres", 
      description: "Popularity trend"
    },
    { 
      data: themeChartData, 
      title: "Themes", 
      description: "Engagement over time"
    },
    { 
      data: ratingChartData, 
      title: "Ratings", 
      description: "Average & total ratings"
    },
  ];

  return (
    <div className="charts-grid-compact">
      {charts.map((chart, idx) => (
        <div key={idx} className="chart-card-compact">
          <div className="chart-header-compact">
            <h3 className="chart-title-compact">{chart.title}</h3>
            <p className="chart-description-compact">{chart.description}</p>
          </div>
          
          <div className="chart-wrapper-compact">
            {chart.data ? (
              <Line data={chart.data} options={chartOptions()} />
            ) : (
              <div className="no-data-compact">
                <span>No data available</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;