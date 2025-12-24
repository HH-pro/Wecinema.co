import React, { useEffect, useState } from "react";
import { Layout } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { Line } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import "../App.css";

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

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const nav = useNavigate();
  const [expand, setExpand] = useState(false);

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

  return (
    <Layout expand={expand} setExpand={setExpand}>
      <div className="analytics-container">
        <div className="analytics-header">
          <h1 className="analytics-title">Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Track trends and performance metrics over time
          </p>
          <button 
            className="back-to-home"
            onClick={() => nav("/")}
          >
            ← Back to Home
          </button>
        </div>

        {window.innerWidth < 768 ? (
          <div className="mobile-swiper">
            <Swiper
              modules={[Pagination, Navigation]}
              pagination={{
                clickable: true,
                dynamicBullets: true,
                renderBullet: (index, className) => {
                  return `<span class="${className} swiper-pagination-bullet-custom"></span>`;
                }
              }}
              navigation={{
                prevEl: ".custom-prev",
                nextEl: ".custom-next"
              }}
              spaceBetween={20}
              slidesPerView={1}
              centeredSlides={true}
              loop={true}
              watchSlidesProgress={true}
              className="h-full"
            >
              {[genreChartData, themeChartData, ratingChartData].map((chartData, idx) => (
                <SwiperSlide key={idx}>
                  <div className="chart-container">
                    <div className="chart-title">{chartTitles[idx]}</div>
                    {!loading && chartData && (
                      <Line data={chartData} options={chartOptions(chartTitles[idx])} />
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            
            <div className="custom-prev">❮</div>
            <div className="custom-next">❯</div>
          </div>
        ) : (
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Genres Popularity</h3>
              {!loading && genreChartData && (
                <Line data={genreChartData} options={chartOptions(chartTitles[0])} />
              )}
            </div>
            
            <div className="analytics-card">
              <h3>Themes Popularity</h3>
              {!loading && themeChartData && (
                <Line data={themeChartData} options={chartOptions(chartTitles[1])} />
              )}
            </div>
            
            <div className="analytics-card">
              <h3>Ratings Trend</h3>
              {!loading && ratingChartData && (
                <Line data={ratingChartData} options={chartOptions(chartTitles[2])} />
              )}
            </div>
          </div>
        )}

        <div className="analytics-summary">
          <h2>Summary</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <h4>Data Period</h4>
              <p>Last 330 days</p>
            </div>
            <div className="summary-item">
              <h4>Charts</h4>
              <p>3 Interactive Charts</p>
            </div>
            <div className="summary-item">
              <h4>Data Points</h4>
              <p>Real-time updates</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;