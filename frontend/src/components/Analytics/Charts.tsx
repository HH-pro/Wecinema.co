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

        const [genreData, themeData, ratingData] = await Promise.all([
          getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading)
        ]);

        if (isMounted) {
          // Genre Chart Data
          if (genreData && Object.keys(genreData).length > 0) {
            const firstKey = Object.keys(genreData)[0];
            const labels = Object.keys(genreData[firstKey]).reverse();
            
            const genreTotals = Object.keys(genreData).map(genre => ({
              genre,
              total: Object.values(genreData[genre]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 3);

            const datasets = genreTotals.map(({ genre }, index) => ({
              label: genre,
              data: labels.map((date: string) => genreData[genre][date]?.count || 0),
              borderColor: getColor(index),
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 3,
              fill: false,
            }));

            setGenreChartData({ 
              labels: labels.map(date => formatDate(date)),
              datasets 
            });
          }

          // Theme Chart Data
          if (themeData && Object.keys(themeData).length > 0) {
            const firstKey = Object.keys(themeData)[0];
            const labels = Object.keys(themeData[firstKey]).reverse();
            
            const themeTotals = Object.keys(themeData).map(theme => ({
              theme,
              total: Object.values(themeData[theme]).reduce((sum: number, val: any) => sum + (val?.count || 0), 0)
            })).sort((a, b) => b.total - a.total).slice(0, 3);

            const datasets = themeTotals.map(({ theme }, index) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getColor(index + 3),
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 3,
              fill: false,
            }));

            setThemeChartData({ 
              labels: labels.map(date => formatDate(date)),
              datasets 
            });
          }

          // Rating Chart Data
          if (ratingData && Object.keys(ratingData).length > 0) {
            const labels = Object.keys(ratingData).reverse();
            
            const datasets = [
              {
                label: "Avg Rating",
                data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
                borderColor: "#3b82f6",
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 3,
                fill: false,
              },
              {
                label: "Total",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: "#10b981",
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 3,
                fill: false,
                borderDash: [3, 3],
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

  const getColor = (index: number) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[index % colors.length];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  const chartOptions = (): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#6b7280",
          font: { 
            size: 9,
            family: "'Inter', -apple-system, sans-serif",
            weight: '500' as const
          },
          usePointStyle: true,
          boxWidth: 6,
          padding: 8,
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#374151",
        bodyColor: "#4b5563",
        titleFont: { size: 10 },
        bodyFont: { size: 9 },
        padding: 8,
        cornerRadius: 6,
        borderColor: "rgba(209, 213, 219, 0.5)",
        borderWidth: 1,
        displayColors: true,
        boxPadding: 3,
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(229, 231, 235, 0.5)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#6b7280", 
          font: { size: 9 },
          padding: 6,
          callback: function(value) {
            const numValue = Number(value);
            if (numValue >= 1000) return (numValue / 1000).toFixed(0) + 'k';
            return numValue;
          }
        },
        beginAtZero: true,
        border: { display: false },
      },
      x: {
        reverse: true,
        grid: {
          color: "rgba(229, 231, 235, 0.5)",
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: { 
          color: "#6b7280", 
          font: { size: 9 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          padding: 6,
        },
        border: { display: false },
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 1.5,
        fill: false,
      },
      point: { 
        radius: 0,
        hoverRadius: 3,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  });

  if (loading) {
    return (
      <div className="compact-charts-loading">
        <div className="compact-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  const charts = [
    { data: genreChartData, title: "Genres", description: "Trend" },
    { data: themeChartData, title: "Themes", description: "Trend" },
    { data: ratingChartData, title: "Ratings", description: "Avg & Total" },
  ];

  return (
    <div className="compact-charts-grid">
      {charts.map((chart, idx) => (
        <div key={idx} className="compact-chart-card">
          <div className="compact-chart-header">
            <h3 className="compact-chart-title">{chart.title}</h3>
            <p className="compact-chart-description">{chart.description}</p>
          </div>
          
          <div className="compact-chart-wrapper">
            {chart.data ? (
              <Line data={chart.data} options={chartOptions()} />
            ) : (
              <div className="compact-no-data">No data</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Charts;