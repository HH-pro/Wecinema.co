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

interface ChartsProps {
  showAll?: boolean;
}

const Charts: React.FC<ChartsProps> = ({ showAll = false }) => {
  const [loading, setLoading] = useState(false);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGenreChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 330);
        const fromDate = sevenDaysAgo.toISOString().split("T")[0];
        const toDate = today.toISOString().split("T")[0];
        
        const genreData: any = await getRequest(
          `/video/genres/graph?from=${fromDate}&to=${toDate}`,
          setLoading
        );
    
        if (isMounted && genreData && Object.keys(genreData).length > 0) {
          const labels = Object.keys(genreData[Object.keys(genreData)[0]]);
          const datasets = Object.keys(genreData).map((genre: string) => ({
            label: genre,
            data: labels.map((date: string) => genreData[genre][date]?.count || 0),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(),
            lineTension: 0.4,
          }));
    
          setGenreChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching genre chart data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchThemeChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];
    
        const themeData: any = await getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading);
    
        if (isMounted && themeData && Object.keys(themeData).length > 0) {
          const labels = Object.keys(themeData[Object.keys(themeData)[0]]);
          const datasets = Object.keys(themeData).map((theme: string) => ({
            label: theme,
            data: labels.map((date: string) => themeData[theme][date]?.count || 0),
            borderColor: getRandomColor(),
            backgroundColor: getRandomColor(),
            lineTension: 0.4,
          }));
    
          setThemeChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching theme chart data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchRatingChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        fromDate.setDate(today.getDate() - 330);
        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];
    
        const ratingData: any = await getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading);
    
        if (isMounted && ratingData && Object.keys(ratingData).length > 0) {
          const labels = Object.keys(ratingData);
          const datasets = [
            {
              label: "Average Rating",
              data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
            },
            {
              label: "Total Ratings",
              data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
              borderColor: getRandomColor(),
              backgroundColor: getRandomColor(),
              lineTension: 0.4,
            },
          ];
    
          setRatingChartData({ labels, datasets });
        }
      } catch (error) {
        console.error("Error fetching rating chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGenreChartData();
    fetchThemeChartData();
    fetchRatingChartData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const chartTitles = ["Genres Popularity Over Time", "Themes Popularity Over Time", "Ratings Over Time"];

  const chartOptions = (title: string): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "white",
          font: { size: 8 },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: title,
        color: "white",
        font: { size: 12, weight: "bold" },
        padding: { top: 1, bottom: 10 },
      },
      tooltip: {
        enabled: true,
        bodyFont: { size: 10 },
        titleFont: { size: 10 },
        padding: 8,
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          color: "white",
          font: { size: 10 },
        },
        ticks: { color: "white", font: { size: 9 } },
      },
      x: {
        reverse: true,
        title: {
          display: true,
          text: "Time (Weeks)",
          color: "white",
          font: { size: 10 },
          padding: { bottom: 10 },
        },
        ticks: { color: "white", font: { size: 10 } },
      },
    },
    elements: {
      line: { tension: 0.4, borderWidth: 1 },
      point: { radius: 3, hoverRadius: 3 },
    },
  });

  if (loading) {
    return (
      <div className="charts-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  const charts = [
    { data: genreChartData, title: chartTitles[0] },
    { data: themeChartData, title: chartTitles[1] },
    { data: ratingChartData, title: chartTitles[2] },
  ];

  return (
    <div className="analytics-charts">
      {showAll ? (
        <div className="charts-grid-full">
          {charts.map((chart, idx) => (
            chart.data && (
              <div key={idx} className="chart-card-full">
                <Line data={chart.data} options={chartOptions(chart.title)} />
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="charts-grid-summary">
          {charts.slice(0, 2).map((chart, idx) => (
            chart.data && (
              <div key={idx} className="chart-card-summary">
                <Line data={chart.data} options={chartOptions(chart.title)} />
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default Charts;