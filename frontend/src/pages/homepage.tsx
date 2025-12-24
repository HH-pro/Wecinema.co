import React, { useEffect, useState } from "react";
import { Gallery, Layout, Render } from "../components/"; // Replace with actual imports
import { getRequest } from "../api"; // Replace with actual API call
import { useNavigate } from "react-router-dom";
import TermsAndConditionsPopup from "../pages/TermsAndConditionsPopup"; 
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { Line } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import LoadingBar from 'react-top-loading-bar';
import "../App.css"; // Import the chart-specific styles

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

export const theme = [
  "Love",
  "Redemption",
  "Family",
  "Oppression",
  "Corruption",
  "Survival",
  "Revenge",
  "Death",
  "Justice",
  "Perseverance",
  "War",
  "Bravery",
  "Freedom",
  "Friendship",
  "Hope",
  "Society",
  "Isolation",
  "Peace",
];

const Homepage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any>([]);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const [data, setData] = useState<any>([]);
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
  const nav = useNavigate();
  const [expand, setExpand] = useState(false); // Optional toggle
  const [progress, setProgress] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("acceptedTerms");
    if (!hasAcceptedTerms) {
      setShowTermsPopup(true);
    }
  }, []);
  
  useEffect(() => {
    const load = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress < 100) {
          return prevProgress + 10;
        }
        clearInterval(load);
        return 100;
      });
    }, 200);

    return () => clearInterval(load);
  }, []);
  
  const handleAcceptTerms = () => {
    localStorage.setItem("acceptedTerms", "true");
    setShowTermsPopup(false);
  };
  
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowPopup(true);
      const timer = setTimeout(() => setShowPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

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
    
    const fetchScripts = async () => {
      const result: any = await getRequest("video/author/scripts", setLoading);
      if (isMounted && result) {
        setScripts(result.map((res: any) => res.script));
        setData(result);
      }
    };

    fetchGenreChartData();
    fetchThemeChartData();
    fetchRatingChartData();
    fetchScripts();

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
          // text: "Popularity Metric (Views/Uploads)",
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
  
  const handleScriptMouseEnter = (index: number) => {
    setShowMoreIndex(index);
  };

  const handleScriptMouseLeave = () => {
    setShowMoreIndex(null);
  };

  return (
    <Layout expand={expand} setExpand={setExpand}>
      <LoadingBar color="#ffb300" progress={progress} height={3} />
      
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="textured-background">
          <div className="py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="chart-heading text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2">
              WECINEMA
            </h1>
            <p className="chart-subheading text-gray-300 text-base sm:text-lg">
              Genre, Theme, and Rating Popularity Over Time
            </p>
          </div>

          {window.innerWidth < 768 ? (
            <div className="mobile-swiper px-4 py-8">
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
                    <div className="chart-container bg-slate-800 rounded-lg p-4 shadow-2xl border border-slate-700">
                      <div className="chart-title text-amber-400 font-semibold mb-4">{chartTitles[idx]}</div>
                      {!loading && chartData && (
                        <div className="h-64">
                          <Line data={chartData} options={chartOptions(chartTitles[idx])} />
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              
              <div className="custom-prev text-amber-400 text-2xl cursor-pointer hover:text-orange-400 transition">❮</div>
              <div className="custom-next text-amber-400 text-2xl cursor-pointer hover:text-orange-400 transition">❯</div>
            </div>
          ) : (
            <div className={`chart-wrapper gap-6 p-8 ${window.innerWidth >= 1024 ? "chart-wrapper-lg grid grid-cols-3" : "grid grid-cols-1 md:grid-cols-2"}`}>
              {[genreChartData, themeChartData, ratingChartData].map((chartData, idx) => (
                <div key={idx} className="chart-container bg-slate-800 rounded-lg p-6 shadow-2xl border border-slate-700 hover:border-amber-400 transition h-96">
                  {!loading && chartData && <Line data={chartData} options={chartOptions(chartTitles[idx])} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="theme-bar flex flex-wrap gap-3 justify-center py-8 px-4 bg-slate-800/50 border-y border-slate-700">
          {theme.map((val, index) => (
            <button
              key={index}
              onClick={() => nav(`/themes/${val.toLowerCase()}`)}
              className="theme-button px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition transform duration-200"
            >
              {val}
            </button>
          ))}
        </div>

        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <Gallery title="Action" category="Action" length={5} isFirst />
          <Gallery title="Comedy" length={5} category="Comedy" />
          <Gallery title="Adventure" length={5} category="Adventure" />
          <Gallery title="Horror" length={5} category="Horror" />
          <Gallery title="Drama" length={5} category="Drama" />
        </div>
        
        <div className="z-1 relative p-6 sm:p-8 border-t border-slate-700 bg-slate-800/50">
          {!loading && (
            <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-8">
              Scripts
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                className={`rounded-lg border transition duration-300 transform hover:scale-105 cursor-pointer ${
                  showMoreIndex === index
                    ? "script-card-highlighted bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-400 shadow-lg"
                    : "script-card bg-slate-700 border-slate-600 hover:border-amber-400 shadow-md"
                } hide-scrollbar p-4 overflow-hidden`}
                onMouseEnter={() => handleScriptMouseEnter(index)}
                onMouseLeave={handleScriptMouseLeave}
                onClick={() =>
                  nav(`/script/${data[index]._id}`, {
                    state: JSON.stringify(data[index]),
                  })
                }
              >
                <h2 className="text-lg font-bold text-amber-400 mb-2 truncate">{data[index]?.title}</h2>
                {showMoreIndex === index && (
                  <button
                    className="read-more-button w-full mb-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded font-semibold hover:shadow-lg transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/script/${data[index]._id}`, {
                        state: JSON.stringify(data[index]),
                      });
                    }}
                  >
                    Read More
                  </button>
                )}
                <div className="text-gray-300 text-sm line-clamp-3">
                  <Render htmlString={script} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Homepage;