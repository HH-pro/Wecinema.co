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
  const [loading, setLoading] = useState(false);
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

        // Fetch all data in parallel for better performance
        const [genreData, themeData, ratingData] = await Promise.all([
          getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading)
        ]);

        if (isMounted) {
          // Process Genre Chart Data
          if (genreData && Object.keys(genreData).length > 0) {
            const labels = Object.keys(genreData[Object.keys(genreData)[0]]);
            const datasets = Object.keys(genreData).map((genre: string) => ({
              label: genre,
              data: labels.map((date: string) => genreData[genre][date]?.count || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
              borderWidth: 2,
            }));
            setGenreChartData({ labels, datasets });
          }

          // Process Theme Chart Data
          if (themeData && Object.keys(themeData).length > 0) {
            const labels = Object.keys(themeData[Object.keys(themeData)[0]]);
            const datasets = Object.keys(themeData).map((theme: string) => ({
              label: theme,
              data: labels.map((date: string) => themeData[theme][date]?.count || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
              borderWidth: 2,
            }));
            setThemeChartData({ labels, datasets });
          }

          // Process Rating Chart Data
          if (ratingData && Object.keys(ratingData).length > 0) {
            const labels = Object.keys(ratingData);
            const datasets = [
              {
                label: "Average Rating",
                data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                lineTension: 0.4,
                borderWidth: 2,
              },
              {
                label: "Total Ratings",
                data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
                borderColor: "#10b981",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                lineTension: 0.4,
                borderWidth: 2,
              },
            ];
            setRatingChartData({ labels, datasets });
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

  const getRandomColor = () => {
    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
      "#ec4899", "#14b8a6", "#f97316", "#84cc16", "#06b6d4"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const chartOptions = (title: string): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#e2e8f0",
          font: { size: 10 },
          usePointStyle: true,
          boxWidth: 8,
          padding: 15,
        },
      },
      title: {
        display: false, // We'll handle title separately
      },
      tooltip: {
        enabled: true,
        bodyFont: { size: 11 },
        titleFont: { size: 11 },
        padding: 10,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#cbd5e1",
        bodyColor: "#e2e8f0",
        borderColor: "#334155",
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
        },
        ticks: { 
          color: "#94a3b8", 
          font: { size: 10 },
          padding: 8,
        },
        beginAtZero: true,
      },
      x: {
        reverse: true,
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
        },
        ticks: { 
          color: "#94a3b8", 
          font: { size: 10 },
          maxRotation: 45,
        },
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: 2,
      },
      point: { 
        radius: 3, 
        hoverRadius: 5,
        backgroundColor: "#ffffff",
        borderWidth: 2,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  });

  if (loading) {
    return (
      <div className="charts-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  const charts = [
    { 
      data: genreChartData, 
      title: "Genres Popularity", 
      description: "Genre trends over time" 
    },
    { 
      data: themeChartData, 
      title: "Themes Popularity", 
      description: "Theme trends over time" 
    },
    { 
      data: ratingChartData, 
      title: "Ratings Trend", 
      description: "Average & total ratings" 
    },
  ];

  return (
    <div className="charts-grid">
      {charts.map((chart, idx) => (
        <div key={idx} className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">{chart.title}</h3>
            <p className="chart-description">{chart.description}</p>
          </div>
          <div className="chart-wrapper">
            {chart.data ? (
              <Line data={chart.data} options={chartOptions(chart.title)} />
            ) : (
              <div className="no-data">
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