import React, { useEffect, useState, useCallback, useRef } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, Autoplay } from "swiper/modules";
import { Line, Bar } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import LoadingBar from 'react-top-loading-bar';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  LineChart,
  Download,
  ChevronRight,
  ChevronLeft,
  Zap,
  Star,
  Film,
  Users,
  Eye,
  Clock,
  MoreVertical,
  PlayCircle,
  Heart,
  MessageSquare,
  Share2,
  X
} from "lucide-react";
import "../App.css";

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
  const [progress, setProgress] = useState(0);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [timeRange, setTimeRange] = useState("30days");
  const [showChartControls, setShowChartControls] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Color palette with yellow theme
  const colorPalette = {
    primary: '#f59e0b', // amber-500
    light: '#fbbf24', // amber-400
    dark: '#d97706', // amber-600
    bg: '#fef3c7', // amber-50
    gradientFrom: '#f59e0b',
    gradientTo: '#fbbf24',
    chartColors: [
      '#f59e0b', // amber-500
      '#10b981', // emerald-500
      '#3b82f6', // blue-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#f97316', // orange-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
    ]
  };

  // Initialize progress
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  // Enhanced chart options with yellow theme
  const getChartOptions = (title: string, isExpanded: boolean): ChartOptions<"line" | "bar"> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: isExpanded ? '#1f2937' : '#ffffff',
          font: {
            size: isExpanded ? 12 : 10,
            family: "'Inter', sans-serif",
            weight: '500'
          },
          padding: 20,
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      title: {
        display: true,
        text: title,
        color: isExpanded ? '#1f2937' : '#ffffff',
        font: {
          size: isExpanded ? 18 : 14,
          weight: "bold",
          family: "'Inter', sans-serif"
        },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fbbf24',
        bodyColor: '#f9fafb',
        borderColor: '#f59e0b',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        boxPadding: 6,
        bodyFont: {
          size: 12,
          family: "'Inter', sans-serif"
        },
        titleFont: {
          size: 12,
          family: "'Inter', sans-serif",
          weight: '600'
        },
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isExpanded ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: isExpanded ? '#6b7280' : 'rgba(255, 255, 255, 0.6)',
          font: {
            size: isExpanded ? 12 : 10,
            family: "'Inter', sans-serif"
          },
          padding: 8,
        },
        border: {
          display: false
        }
      },
      x: {
        grid: {
          color: isExpanded ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: isExpanded ? '#6b7280' : 'rgba(255, 255, 255, 0.6)',
          font: {
            size: isExpanded ? 12 : 10,
            family: "'Inter', sans-serif"
          },
          maxRotation: isExpanded ? 0 : 45,
        },
        border: {
          display: false
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: isExpanded ? 3 : 2,
        fill: chartType === 'line' ? {
          target: 'origin',
          above: 'rgba(245, 158, 11, 0.05)'
        } : false
      },
      point: {
        radius: isExpanded ? 5 : 3,
        hoverRadius: isExpanded ? 8 : 6,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: (context) => {
          const index = context.datasetIndex || 0;
          return colorPalette.chartColors[index % colorPalette.chartColors.length];
        }
      },
      bar: {
        borderRadius: isExpanded ? 6 : 3,
        borderWidth: 0,
        borderSkipped: false,
      }
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeOutQuad'
      }
    }
  });

  // Fetch data with enhanced error handling
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      const fromDate = new Date();
      
      // Calculate date range
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
        const labels = Object.keys(genreData[Object.keys(genreData)[0]]).reverse();
        const datasets = Object.keys(genreData).slice(0, 4).map((genre: string, index) => ({
          label: genre,
          data: labels.map((date: string) => genreData[genre][date]?.count || 0),
          borderColor: colorPalette.chartColors[index % colorPalette.chartColors.length],
          backgroundColor: chartType === 'bar' 
            ? colorPalette.chartColors[index % colorPalette.chartColors.length] + '40'
            : 'transparent',
          tension: 0.4,
          fill: chartType === 'line',
          borderWidth: 2,
          pointBackgroundColor: 'white',
        }));
        setGenreChartData({ labels, datasets });
      }

      // Process theme data
      if (themeData && Object.keys(themeData).length > 0) {
        const labels = Object.keys(themeData[Object.keys(themeData)[0]]).reverse();
        const datasets = Object.keys(themeData).slice(0, 4).map((theme: string, index) => ({
          label: theme,
          data: labels.map((date: string) => themeData[theme][date]?.count || 0),
          borderColor: colorPalette.chartColors[index % colorPalette.chartColors.length],
          backgroundColor: chartType === 'bar' 
            ? colorPalette.chartColors[index % colorPalette.chartColors.length] + '40'
            : 'transparent',
          tension: 0.4,
          fill: chartType === 'line',
          borderWidth: 2,
          pointBackgroundColor: 'white',
        }));
        setThemeChartData({ labels, datasets });
      }

      // Process rating data
      if (ratingData && Object.keys(ratingData).length > 0) {
        const labels = Object.keys(ratingData).reverse();
        const datasets = [
          {
            label: "Average Rating",
            data: labels.map((date: string) => ratingData[date]?.averageRating || 0),
            borderColor: colorPalette.primary,
            backgroundColor: chartType === 'bar' 
              ? colorPalette.primary + '40'
              : 'transparent',
            fill: chartType === 'line',
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: 'white',
          },
          {
            label: "Total Ratings",
            data: labels.map((date: string) => ratingData[date]?.totalRatings || 0),
            borderColor: '#10b981',
            backgroundColor: chartType === 'bar' 
              ? '#10b98140'
              : 'transparent',
            fill: chartType === 'line',
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: 'white',
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
      // Set fallback data for demonstration
      setGenreChartData(generateFallbackData('genre'));
      setThemeChartData(generateFallbackData('theme'));
      setRatingChartData(generateFallbackData('rating'));
    } finally {
      setLoading(false);
    }
  }, [timeRange, chartType]);

  // Generate fallback data for demonstration
  const generateFallbackData = (type: 'genre' | 'theme' | 'rating') => {
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
    
    if (type === 'genre') {
      return {
        labels,
        datasets: [
          {
            label: "Action",
            data: [65, 78, 90, 82, 95, 110],
            borderColor: colorPalette.primary,
            backgroundColor: chartType === 'bar' ? colorPalette.primary + '40' : 'transparent',
            tension: 0.4,
            fill: chartType === 'line',
          },
          {
            label: "Comedy",
            data: [45, 62, 75, 58, 69, 85],
            borderColor: '#10b981',
            backgroundColor: chartType === 'bar' ? '#10b98140' : 'transparent',
            tension: 0.4,
            fill: chartType === 'line',
          },
        ]
      };
    } else if (type === 'theme') {
      return {
        labels,
        datasets: [
          {
            label: "Love",
            data: [85, 92, 88, 94, 96, 98],
            borderColor: colorPalette.primary,
            backgroundColor: chartType === 'bar' ? colorPalette.primary + '40' : 'transparent',
            tension: 0.4,
            fill: chartType === 'line',
          },
          {
            label: "Justice",
            data: [45, 52, 58, 61, 65, 70],
            borderColor: '#8b5cf6',
            backgroundColor: chartType === 'bar' ? '#8b5cf640' : 'transparent',
            tension: 0.4,
            fill: chartType === 'line',
          },
        ]
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: "Average Rating",
            data: [4.2, 4.3, 4.5, 4.4, 4.6, 4.8],
            borderColor: colorPalette.primary,
            backgroundColor: chartType === 'bar' ? colorPalette.primary + '40' : 'transparent',
            tension: 0.4,
            fill: chartType === 'line',
          },
        ]
      };
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart component with expand functionality
  const ChartCard = ({ 
    id, 
    title, 
    chartData, 
    chartIndex 
  }: { 
    id: string; 
    title: string; 
    chartData: any; 
    chartIndex: number 
  }) => {
    const isExpanded = expandedChart === id;
    const ChartComponent = chartType === 'line' ? Line : Bar;

    const handleDownload = () => {
      const canvas = document.querySelector(`#chart-${id} canvas`) as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    const handleExpand = () => {
      if (isExpanded) {
        setExpandedChart(null);
      } else {
        setExpandedChart(id);
        setTimeout(() => {
          chartContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    };

    return (
      <div 
        id={`chart-${id}`}
        className={`relative overflow-hidden transition-all duration-500 ${
          isExpanded 
            ? 'fixed inset-4 md:inset-10 z-50 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-2xl'
            : 'bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl hover:shadow-lg hover:shadow-amber-500/10'
        }`}
        style={{
          gridColumn: isExpanded ? '1 / -1' : 'auto',
          gridRow: isExpanded ? 'span 2' : 'auto'
        }}
      >
        {/* Chart Header */}
        <div className={`flex items-center justify-between p-4 ${
          isExpanded ? 'border-b border-amber-200' : 'border-b border-gray-700/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isExpanded 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {chartIndex === 0 ? <Film size={20} /> : 
               chartIndex === 1 ? <TrendingUp size={20} /> : 
               <Star size={20} />}
            </div>
            <div>
              <h3 className={`font-bold ${
                isExpanded ? 'text-gray-900 text-lg' : 'text-white text-sm'
              }`}>
                {title}
              </h3>
              <p className={`text-xs ${
                isExpanded ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Last {timeRange.replace('days', ' days')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className={`p-2 rounded-lg transition-colors ${
                isExpanded 
                  ? 'hover:bg-amber-100 text-gray-700' 
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
              title="Download chart"
            >
              <Download size={18} />
            </button>
            <button
              onClick={handleExpand}
              className={`p-2 rounded-lg transition-colors ${
                isExpanded 
                  ? 'hover:bg-amber-100 text-gray-700' 
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
              title={isExpanded ? "Minimize chart" : "Expand chart"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            {isExpanded && (
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 rounded-lg hover:bg-amber-100 text-gray-700 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Chart Container */}
        <div className={`relative ${isExpanded ? 'p-6 h-[calc(100vh-200px)]' : 'p-4 h-64'}`}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className={`text-sm ${
                  isExpanded ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Loading chart data...
                </p>
              </div>
            </div>
          ) : chartData ? (
            <ChartComponent 
              data={chartData} 
              options={getChartOptions(title, isExpanded)} 
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={40} className={`mx-auto mb-4 ${
                  isExpanded ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <p className={`${
                  isExpanded ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  No data available for this chart
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Chart Footer */}
        {!isExpanded && chartData && (
          <div className="px-4 py-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {chartData.datasets?.length || 0} data series
              </span>
              <button
                onClick={() => nav(chartIndex === 0 ? '/genres' : chartIndex === 1 ? '/themes' : '/ratings')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                View details <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const charts = [
    { id: 'genre', title: "Genre Popularity Trends", data: genreChartData },
    { id: 'theme', title: "Theme Engagement Analysis", data: themeChartData },
    { id: 'rating', title: "Rating Performance", data: ratingChartData },
  ];

  const stats = [
    { label: "Total Views", value: "12.4M", icon: Eye, change: "+24.5%" },
    { label: "Active Users", value: "845K", icon: Users, change: "+18.2%" },
    { label: "Avg Watch Time", value: "4.7m", icon: Clock, change: "+12.8%" },
    { label: "Engagement Rate", value: "68%", icon: TrendingUp, change: "+8.4%" },
  ];

  return (
    <Layout>
      <LoadingBar color={colorPalette.primary} progress={progress} height={3} />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-amber-900/20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
                <Zap size={16} className="text-amber-400" />
                <span className="text-sm text-amber-300">Live Analytics Dashboard</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                WECINEMA
                <span className="block bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  Visual Insights
                </span>
              </h1>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl">
                Track genre popularity, theme engagement, and rating trends with our interactive analytics dashboard.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowChartControls(!showChartControls)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-amber-500/25"
                >
                  {showChartControls ? (
                    <>
                      <Minimize2 size={20} />
                      Hide Controls
                    </>
                  ) : (
                    <>
                      <BarChart3 size={20} />
                      Show Chart Controls
                    </>
                  )}
                </button>
                
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex-1 max-w-md">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon size={20} className="text-amber-400" />
                      <span className="text-xs font-medium px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full">
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      {showChartControls && (
        <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-amber-400" />
                  <span className="text-sm text-gray-300">Chart Type:</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType("line")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      chartType === "line" 
                        ? "bg-amber-500 text-white" 
                        : "bg-gray-800 text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LineChart size={16} />
                      Line Chart
                    </div>
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      chartType === "bar" 
                        ? "bg-amber-500 text-white" 
                        : "bg-gray-800 text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 size={16} />
                      Bar Chart
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-amber-400" />
                  <span className="text-sm text-gray-300">Time Range:</span>
                </div>
                <div className="flex gap-2">
                  {["7days", "30days", "90days"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timeRange === range 
                          ? "bg-amber-500 text-white" 
                          : "bg-gray-800 text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      {range.replace('days', 'd')}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  Filter by:
                </span>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Data</option>
                  <option value="trending">Trending Only</option>
                  <option value="top5">Top 5 Only</option>
                  <option value="recent">Recent 30 Days</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8" ref={chartContainerRef}>
        {/* Charts Grid */}
        <div className={`grid gap-4 mb-12 ${
          expandedChart 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {charts.map((chart, index) => (
            <ChartCard
              key={chart.id}
              id={chart.id}
              title={chart.title}
              chartData={chart.data}
              chartIndex={index}
            />
          ))}
        </div>

        {/* Theme Navigation */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Explore Themes</h2>
            <button
              onClick={() => nav('/themes')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              View all themes
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="relative">
            <Swiper
              modules={[Navigation, Autoplay]}
              navigation={{
                nextEl: '.theme-swiper-next',
                prevEl: '.theme-swiper-prev',
              }}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              spaceBetween={12}
              slidesPerView="auto"
              className="!py-2"
            >
              {theme.map((themeName, index) => (
                <SwiperSlide key={index} className="!w-auto">
                  <button
                    onClick={() => nav(`/themes/${themeName.toLowerCase()}`)}
                    className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-amber-900/30 hover:to-yellow-900/30 border border-gray-700 hover:border-amber-500/50 text-white rounded-xl font-medium transition-all hover:scale-105 group"
                  >
                    <div className="flex items-center gap-2">
                      <Film size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                      {themeName}
                    </div>
                  </button>
                </SwiperSlide>
              ))}
            </Swiper>
            
            <button className="theme-swiper-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 p-2 bg-gray-900/80 backdrop-blur-sm rounded-full border border-gray-700 text-gray-400 hover:text-white">
              <ChevronLeft size={20} />
            </button>
            <button className="theme-swiper-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 p-2 bg-gray-900/80 backdrop-blur-sm rounded-full border border-gray-700 text-gray-400 hover:text-white">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Video Galleries */}
        <div className="space-y-12">
          <Gallery 
            title="🎬 Trending Action" 
            category="Action" 
            length={4} 
            isFirst 
            compact
          />
          <Gallery 
            title="😂 Top Comedy" 
            category="Comedy" 
            length={4} 
            compact
          />
          <Gallery 
            title="🌌 Adventure & Fantasy" 
            category="Adventure" 
            length={4} 
            compact
          />
        </div>

        {/* Featured Scripts */}
        {scripts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Featured Scripts</h2>
                <p className="text-gray-400">Discover trending stories from our community</p>
              </div>
              <button
                onClick={() => nav('/scripts')}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
              >
                <span>View All</span>
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scripts.slice(0, 3).map((script: string, index: number) => (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/50 to-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer"
                  onClick={() => nav(`/script/${data[index]?._id}`, {
                    state: JSON.stringify(data[index]),
                  })}
                >
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full">
                      Trending
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center">
                        <Film size={24} className="text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 mb-1">
                          {data[index]?.title || 'Untitled Script'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>By {data[index]?.author || 'Anonymous'}</span>
                          <span>•</span>
                          <span>15 min read</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-400 line-clamp-3 mb-6 min-h-[60px]">
                      {script ? (
                        <Render htmlString={script.substring(0, 200) + '...'} />
                      ) : (
                        <span className="text-gray-500">No script content available</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Heart size={16} className="text-rose-500" />
                          <span>2.4K</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <MessageSquare size={16} className="text-blue-500" />
                          <span>148</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Share2 size={16} className="text-green-500" />
                          <span>89</span>
                        </div>
                      </div>
                      
                      <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-medium rounded-lg transition-all group-hover:scale-105">
                        Read Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
};

export default Homepage;