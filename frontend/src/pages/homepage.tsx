import React, { useEffect, useState, useRef, useCallback } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import TermsAndConditionsPopup from "../pages/TermsAndConditionsPopup";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler
} from "chart.js";
import LoadingBar from 'react-top-loading-bar';
import { Expand, Minimize2, Filter, Download, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import "../App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
  const [expand, setExpand] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30days");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [showCharts, setShowCharts] = useState(true);
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Add smooth scroll to charts section
  const scrollToCharts = () => {
    const chartsSection = document.querySelector('.charts-section');
    chartsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  // Chart toggle function
  const toggleChartExpansion = (chartId: string) => {
    if (expandedChart === chartId) {
      setExpandedChart(null);
    } else {
      setExpandedChart(chartId);
      // Scroll to the expanded chart
      setTimeout(() => {
        const chartElement = chartRefs.current.find(ref => ref?.id === chartId);
        chartElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Download chart as image
  const downloadChart = (chartId: string) => {
    const canvas = document.querySelector(`#${chartId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${chartId}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  // Improved color generation with better contrast
  const getRandomColor = () => {
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#8b5cf6', // Violet
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#f97316', // Orange
      '#ec4899', // Pink
      '#6366f1', // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      const fromDate = new Date();
      
      // Set date range based on selection
      switch (timeRange) {
        case "7days":
          fromDate.setDate(today.getDate() - 7);
          break;
        case "30days":
          fromDate.setDate(today.getDate() - 30);
          break;
        case "90days":
          fromDate.setDate(today.getDate() - 90);
          break;
        default:
          fromDate.setDate(today.getDate() - 30);
      }

      const from = fromDate.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      // Fetch all data in parallel
      const [genreData, themeData, ratingData, scriptsData] = await Promise.all([
        getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading),
        getRequest("video/author/scripts", setLoading)
      ]);

      // Process genre data
      if (genreData && Object.keys(genreData).length > 0) {
        const labels = Object.keys(genreData[Object.keys(genreData)[0]]);
        const datasets = Object.keys(genreData).slice(0, 5).map((genre: string) => ({
          label: genre,
          data: labels.map((date: string) => genreData[genre][date]?.count || 0),
          borderColor: getRandomColor(),
          backgroundColor: chartType === "line" ? 'transparent' : getRandomColor() + '40',
          fill: chartType === "line",
          tension: 0.4,
          borderWidth: 2,
        }));
        setGenreChartData({ labels, datasets });
      }

      // Process theme data
      if (themeData && Object.keys(themeData).length > 0) {
        const labels = Object.keys(themeData[Object.keys(themeData)[0]]);
        const datasets = Object.keys(themeData).slice(0, 5).map((theme: string) => ({
          label: theme,
          data: labels.map((date: string) => themeData[theme][date]?.count || 0),
          borderColor: getRandomColor(),
          backgroundColor: chartType === "line" ? 'transparent' : getRandomColor() + '40',
          fill: chartType === "line",
          tension: 0.4,
          borderWidth: 2,
        }));
        setThemeChartData({ labels, datasets });
      }

      // Process rating data
      if (ratingData && Object.keys(ratingData).length > 0) {
        const labels = Object.keys(ratingData);
        const datasets = [
          {
            label: "Average Rating",
            data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
            borderColor: '#10b981',
            backgroundColor: chartType === "line" ? 'transparent' : '#10b98140',
            fill: chartType === "line",
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: "Total Ratings",
            data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
            borderColor: '#3b82f6',
            backgroundColor: chartType === "line" ? 'transparent' : '#3b82f640',
            fill: chartType === "line",
            tension: 0.4,
            borderWidth: 2,
          },
        ];
        setRatingChartData({ labels, datasets });
      }

      // Process scripts
      if (scriptsData) {
        setScripts(scriptsData.map((res: any) => res.script));
        setData(scriptsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, chartType]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const chartOptions = (title: string, isExpanded: boolean): ChartOptions<"line" | "bar"> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#e5e7eb",
          font: { 
            size: isExpanded ? 12 : 10,
            family: "'Inter', sans-serif" 
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: true,
        text: title,
        color: "#ffffff",
        font: { 
          size: isExpanded ? 18 : 14, 
          weight: "bold",
          family: "'Inter', sans-serif" 
        },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#f3f4f6',
        borderColor: '#4b5563',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        bodyFont: { size: 12 },
        titleFont: { size: 12 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: { 
          color: "#d1d5db", 
          font: { size: isExpanded ? 12 : 10 } 
        },
      },
      x: {
        reverse: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: { 
          color: "#d1d5db", 
          font: { size: isExpanded ? 12 : 10 },
          maxRotation: isExpanded ? 0 : 45,
        },
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: isExpanded ? 3 : 2 
      },
      point: { 
        radius: isExpanded ? 5 : 3, 
        hoverRadius: isExpanded ? 8 : 5,
        backgroundColor: 'white',
        borderWidth: 2,
      },
      bar: {
        borderRadius: isExpanded ? 8 : 4,
        borderWidth: 0,
      },
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'linear'
      }
    },
  });

  const handleScriptMouseEnter = (index: number) => {
    setShowMoreIndex(index);
  };

  const handleScriptMouseLeave = () => {
    setShowMoreIndex(null);
  };

  const charts = [
    { id: 'genre', title: "Genres Popularity Over Time", data: genreChartData },
    { id: 'theme', title: "Themes Popularity Over Time", data: themeChartData },
    { id: 'rating', title: "Ratings Over Time", data: ratingChartData },
  ];

  return (
    <Layout expand={expand} setExpand={setExpand}>
      <LoadingBar color="#3b82f6" progress={progress} height={3} />
      
      {/* Charts Section */}
      <div className="charts-section min-h-screen textured-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                WECINEMA
              </h1>
              <p className="text-gray-300 mt-2">Genre, Theme, and Rating Popularity Over Time</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Chart Toggle */}
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {showCharts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                {showCharts ? "Hide Charts" : "Show Charts"}
              </button>
              
              {/* Time Range Filter */}
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-gray-800 text-gray-200 px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
              
              {/* Chart Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType("line")}
                  className={`px-3 py-2 rounded-lg ${chartType === "line" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
                >
                  Line
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-3 py-2 rounded-lg ${chartType === "bar" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          {showCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {charts.map((chart, idx) => (
                <div
                  key={chart.id}
                  id={chart.id}
                  ref={el => chartRefs.current[idx] = el}
                  className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 transition-all duration-300 ${
                    expandedChart === chart.id 
                      ? "lg:col-span-2 lg:row-span-2" 
                      : "hover:border-gray-600 hover:shadow-xl hover:shadow-blue-500/10"
                  }`}
                >
                  {/* Chart Header with Actions */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-white">{chart.title}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadChart(chart.id)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title="Download chart"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => toggleChartExpansion(chart.id)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        title={expandedChart === chart.id ? "Minimize" : "Expand"}
                      >
                        {expandedChart === chart.id ? <Minimize2 size={18} /> : <Expand size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Chart Container */}
                  <div 
                    className={`relative ${expandedChart === chart.id ? "h-[500px]" : "h-[300px]"}`}
                  >
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      </div>
                    ) : chart.data ? (
                      chartType === "line" ? (
                        <Line data={chart.data} options={chartOptions(chart.title, expandedChart === chart.id)} />
                      ) : (
                        <Bar data={chart.data} options={chartOptions(chart.title, expandedChart === chart.id)} />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No data available
                      </div>
                    )}
                  </div>

                  {/* Chart Info */}
                  {!expandedChart && chart.data && (
                    <div className="mt-4 text-sm text-gray-400">
                      {chart.id === 'rating' ? 'Double click legend items to isolate' : 'Hover over lines for details'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats (Optional) */}
          {showCharts && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-6 rounded-2xl border border-blue-500/30">
                <h4 className="text-gray-300 text-sm mb-2">Total Genres Tracked</h4>
                <p className="text-2xl font-bold text-white">
                  {genreChartData?.datasets?.length || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 p-6 rounded-2xl border border-purple-500/30">
                <h4 className="text-gray-300 text-sm mb-2">Total Themes Tracked</h4>
                <p className="text-2xl font-bold text-white">
                  {themeChartData?.datasets?.length || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-6 rounded-2xl border border-emerald-500/30">
                <h4 className="text-gray-300 text-sm mb-2">Avg. Rating</h4>
                <p className="text-2xl font-bold text-white">
                  {ratingChartData?.datasets?.[0]?.data?.slice(-1)[0]?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          )}

          {/* Scroll to content button */}
          {showCharts && (
            <div className="flex justify-center mb-8">
              <button
                onClick={() => document.querySelector('.theme-bar')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                Explore Content Below
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rest of your content */}
      <div className="theme-bar bg-gradient-to-r from-gray-900 to-gray-800 py-4 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto overflow-x-auto">
          <div className="flex space-x-2 min-w-max">
            {theme.map((val, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${val.toLowerCase()}`)}
                className="theme-button bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white px-4 py-2 rounded-full transition-all hover:scale-105"
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Galleries */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Gallery title="Action" category="Action" length={5} isFirst />
        <Gallery title="Comedy" length={5} category="Comedy" />
        <Gallery title="Adventure" length={5} category="Adventure" />
        <Gallery title="Horror" length={5} category="Horror" />
        <Gallery title="Drama" length={5} category="Drama" />
        
        {/* Scripts Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Latest Scripts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden hover:border-gray-600 hover:shadow-xl transition-all duration-300 group"
                onMouseEnter={() => handleScriptMouseEnter(index)}
                onMouseLeave={handleScriptMouseLeave}
                onClick={() =>
                  nav(`/script/${data[index]._id}`, {
                    state: JSON.stringify(data[index]),
                  })
                }
              >
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    {data[index].title}
                  </h3>
                  <div className="text-gray-300 text-sm mb-4 line-clamp-3">
                    <Render htmlString={script} />
                  </div>
                  <button
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium transition-all transform group-hover:scale-105"
                  >
                    Read Full Script
                  </button>
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