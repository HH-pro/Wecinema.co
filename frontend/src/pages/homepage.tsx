import React, { useEffect, useState, useRef } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import { Line } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import LoadingBar from 'react-top-loading-bar';
import {
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Filter,
  Calendar,
  X,
  Download,
  BarChart3
} from "lucide-react";
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
  ChartOptions,
  Filler
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
  const [progress, setProgress] = useState(0);
  const [showCharts, setShowCharts] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30days");
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchGenreChartData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const fromDate = new Date();
        
        switch (timeRange) {
          case "7days": fromDate.setDate(today.getDate() - 7); break;
          case "30days": fromDate.setDate(today.getDate() - 30); break;
          case "90days": fromDate.setDate(today.getDate() - 90); break;
          default: fromDate.setDate(today.getDate() - 30);
        }
        
        const genreData: any = await getRequest(
          `/video/genres/graph?from=${fromDate.toISOString().split("T")[0]}&to=${today.toISOString().split("T")[0]}`,
          setLoading
        );
    
        if (isMounted && genreData && Object.keys(genreData).length > 0) {
          const labels = Object.keys(genreData[Object.keys(genreData)[0]]);
          const datasets = Object.keys(genreData).slice(0, 3).map((genre: string, index) => ({
            label: genre,
            data: labels.map((date: string) => genreData[genre][date]?.count || 0),
            borderColor: getColor(index),
            backgroundColor: `rgba(245, 158, 11, ${0.2 + (index * 0.1)})`,
            lineTension: 0.4,
            fill: true,
            borderWidth: 2,
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
        
        switch (timeRange) {
          case "7days": fromDate.setDate(today.getDate() - 7); break;
          case "30days": fromDate.setDate(today.getDate() - 30); break;
          case "90days": fromDate.setDate(today.getDate() - 90); break;
          default: fromDate.setDate(today.getDate() - 30);
        }
    
        const themeData: any = await getRequest(
          `/video/themes/graph?from=${fromDate.toISOString().split("T")[0]}&to=${today.toISOString().split("T")[0]}`,
          setLoading
        );
    
        if (isMounted && themeData && Object.keys(themeData).length > 0) {
          const labels = Object.keys(themeData[Object.keys(themeData)[0]]);
          const datasets = Object.keys(themeData).slice(0, 3).map((theme: string, index) => ({
            label: theme,
            data: labels.map((date: string) => themeData[theme][date]?.count || 0),
            borderColor: getColor(index),
            backgroundColor: `rgba(245, 158, 11, ${0.2 + (index * 0.1)})`,
            lineTension: 0.4,
            fill: true,
            borderWidth: 2,
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
        
        switch (timeRange) {
          case "7days": fromDate.setDate(today.getDate() - 7); break;
          case "30days": fromDate.setDate(today.getDate() - 30); break;
          case "90days": fromDate.setDate(today.getDate() - 90); break;
          default: fromDate.setDate(today.getDate() - 30);
        }
    
        const ratingData: any = await getRequest(
          `/video/ratings/graph?from=${fromDate.toISOString().split("T")[0]}&to=${today.toISOString().split("T")[0]}`,
          setLoading
        );
    
        if (isMounted && ratingData && Object.keys(ratingData).length > 0) {
          const labels = Object.keys(ratingData);
          const datasets = [
            {
              label: "Average Rating",
              data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
              borderColor: "#f59e0b",
              backgroundColor: "rgba(245, 158, 11, 0.2)",
              lineTension: 0.4,
              fill: true,
              borderWidth: 2,
            },
            {
              label: "Total Ratings",
              data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
              borderColor: "#fbbf24",
              backgroundColor: "rgba(251, 191, 36, 0.2)",
              lineTension: 0.4,
              fill: true,
              borderWidth: 2,
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
  }, [timeRange]);

  const getColor = (index: number) => {
    const colors = [
      "#f59e0b", // amber-500
      "#fbbf24", // amber-400
      "#fcd34d", // amber-300
      "#fde68a", // amber-200
      "#fef3c7", // amber-100
    ];
    return colors[index % colors.length];
  };

  const chartTitles = ["Genres Popularity Over Time", "Themes Popularity Over Time", "Ratings Over Time"];
  const chartIds = ["genre", "theme", "rating"];

  const chartOptions = (title: string, isExpanded: boolean): ChartOptions<"line"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: isExpanded ? "#1f2937" : "white",
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
        color: isExpanded ? "#1f2937" : "white",
        font: { 
          size: isExpanded ? 18 : 14, 
          weight: "bold",
          family: "'Inter', sans-serif"
        },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 24, 39, 0.95)',
        titleColor: isExpanded ? '#1f2937' : '#f9fafb',
        bodyColor: isExpanded ? '#4b5563' : '#f9fafb',
        borderColor: '#f59e0b',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        bodyFont: { size: isExpanded ? 12 : 10 },
        titleFont: { size: isExpanded ? 12 : 10 },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          color: isExpanded ? "#4b5563" : "white",
          font: { size: isExpanded ? 12 : 10 },
        },
        grid: {
          color: isExpanded ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        },
        ticks: { 
          color: isExpanded ? "#6b7280" : "white", 
          font: { size: isExpanded ? 11 : 9 } 
        },
      },
      x: {
        reverse: true,
        title: {
          display: true,
          text: "Time Period",
          color: isExpanded ? "#4b5563" : "white",
          font: { size: isExpanded ? 12 : 10 },
          padding: { bottom: 10 },
        },
        grid: {
          color: isExpanded ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
        },
        ticks: { 
          color: isExpanded ? "#6b7280" : "white", 
          font: { size: isExpanded ? 11 : 10 },
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
        radius: isExpanded ? 6 : 3, 
        hoverRadius: isExpanded ? 10 : 6,
        backgroundColor: 'white',
        borderWidth: 2,
      },
    },
  });

  const toggleChartExpansion = (chartId: string) => {
    if (expandedChart === chartId) {
      setExpandedChart(null);
    } else {
      setExpandedChart(chartId);
      setTimeout(() => {
        const chartElement = chartRefs.current.find(ref => ref?.id === chartId);
        chartElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const downloadChart = (chartId: string) => {
    const canvas = document.querySelector(`#${chartId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${chartId}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const charts = [
    { id: 'genre', title: "Genres Popularity Over Time", data: genreChartData },
    { id: 'theme', title: "Themes Popularity Over Time", data: themeChartData },
    { id: 'rating', title: "Ratings Over Time", data: ratingChartData },
  ];

  const handleScriptMouseEnter = (index: number) => {
    setShowMoreIndex(index);
  };

  const handleScriptMouseLeave = () => {
    setShowMoreIndex(null);
  };

  return (
    <Layout>
      <LoadingBar color="#f59e0b" progress={progress} height={3} />
      
      {/* Charts Toggle Header */}
      <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/10 border-b border-amber-800/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold text-white">WECINEMA Analytics</h1>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-amber-400" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
              
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
              >
                {showCharts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showCharts ? "Hide Charts" : "Show Charts"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - Collapsible */}
      {showCharts && (
        <div className="bg-gradient-to-b from-gray-900 to-black">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className={`grid gap-4 ${expandedChart ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {charts.map((chart, idx) => (
                <div
                  key={chart.id}
                  id={chart.id}
                  ref={el => chartRefs.current[idx] = el}
                  className={`bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border ${
                    expandedChart === chart.id 
                      ? 'border-amber-500/50 fixed inset-4 md:inset-20 z-50 bg-gray-900' 
                      : 'border-gray-700/50'
                  } rounded-xl transition-all duration-300 hover:border-amber-500/30`}
                  style={{
                    ...(expandedChart === chart.id && {
                      position: 'fixed',
                      zIndex: 50,
                      top: '2rem',
                      left: '2rem',
                      right: '2rem',
                      bottom: '2rem',
                      borderRadius: '1rem',
                    })
                  }}
                >
                  {/* Chart Header with Controls */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-amber-400" />
                      <h3 className="text-sm font-semibold text-white">{chart.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadChart(chart.id)}
                        className="p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
                        title="Download chart"
                      >
                        <Download size={16} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => toggleChartExpansion(chart.id)}
                        className="p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
                        title={expandedChart === chart.id ? "Minimize" : "Expand"}
                      >
                        {expandedChart === chart.id ? (
                          <Minimize2 size={16} className="text-gray-400" />
                        ) : (
                          <Maximize2 size={16} className="text-gray-400" />
                        )}
                      </button>
                      {expandedChart === chart.id && (
                        <button
                          onClick={() => setExpandedChart(null)}
                          className="p-1.5 hover:bg-gray-800/50 rounded-lg transition-colors"
                          title="Close"
                        >
                          <X size={16} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chart Content */}
                  <div className={`p-4 ${expandedChart === chart.id ? 'h-[calc(100vh-180px)]' : 'h-64'}`}>
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-400">Loading chart...</span>
                        </div>
                      </div>
                    ) : chart.data ? (
                      <Line data={chart.data} options={chartOptions(chart.title, expandedChart === chart.id)} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 size={32} className="mx-auto text-gray-600 mb-2" />
                          <p className="text-gray-500">No data available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chart Footer */}
                  {!expandedChart && chart.data && (
                    <div className="px-4 py-3 border-t border-gray-700/50">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          {chart.data.datasets?.length || 0} data series
                        </span>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          Expand view
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Scroll to Videos Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  document.querySelector('.theme-bar')?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                <ChevronDown size={16} />
                Continue to Videos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Navigation */}
      <div className="theme-bar bg-gradient-to-r from-gray-900 to-gray-800 py-3 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold text-white mb-3">Browse by Theme</h2>
          <div className="flex overflow-x-auto gap-2 pb-2">
            {theme.map((val, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${val.toLowerCase()}`)}
                className="theme-button bg-gray-800 hover:bg-amber-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all whitespace-nowrap"
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Galleries - Always Visible */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Gallery title="Action" category="Action" length={5} isFirst />
        <Gallery title="Comedy" length={5} category="Comedy" />
        <Gallery title="Adventure" length={5} category="Adventure" />
        <Gallery title="Horror" length={5} category="Horror" />
        <Gallery title="Drama" length={5} category="Drama" />
      </div>

      {/* Scripts Section */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="border-t border-gray-800 pt-8">
          <h2 className="text-xl font-bold text-white mb-6">Featured Scripts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                className={`bg-gray-900/50 border rounded-xl overflow-hidden transition-all duration-300 ${
                  showMoreIndex === index
                    ? "border-amber-500 shadow-lg shadow-amber-500/20"
                    : "border-gray-800 hover:border-gray-700"
                }`}
                onMouseEnter={() => handleScriptMouseEnter(index)}
                onMouseLeave={handleScriptMouseLeave}
                onClick={() =>
                  nav(`/script/${data[index]._id}`, {
                    state: JSON.stringify(data[index]),
                  })
                }
              >
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white mb-3 line-clamp-1">
                    {data[index].title}
                  </h3>
                  
                  <div className="text-gray-300 text-sm mb-4 line-clamp-3 min-h-[60px]">
                    <Render htmlString={script} />
                  </div>
                  
                  <button className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-medium rounded-lg transition-all">
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