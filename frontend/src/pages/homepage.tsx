import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
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
  Filler,
  TimeScale
} from "chart.js";
import 'chartjs-adapter-date-fns';
import LoadingBar from 'react-top-loading-bar';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  BarChart3,
  LineChart,
  TrendingUp,
  X,
  Settings,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
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
  Filler,
  TimeScale
);

// Optimized chart component
const ChartCard = memo(({
  title,
  data,
  loading,
  isExpanded,
  onExpand,
  onDownload,
  chartType = 'line',
  height = 200
}: {
  title: string;
  data: any;
  loading: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onDownload: () => void;
  chartType?: 'line' | 'bar';
  height?: number;
}) => {
  const [hovered, setHovered] = useState(false);
  const ChartComponent = chartType === 'line' ? Line : Bar;

  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 10,
            family: "'Inter', sans-serif"
          },
          padding: 15,
          usePointStyle: true,
        },
        display: !isExpanded
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 5,
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 9
          },
          maxRotation: isExpanded ? 0 : 45,
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 9
          },
          padding: 5,
        },
        border: {
          display: false
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 1.5,
      },
      point: {
        radius: 1.5,
        hoverRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      },
      bar: {
        borderRadius: 2,
        borderWidth: 0,
      }
    },
    animations: {
      tension: {
        duration: 500,
        easing: 'easeOutQuad'
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        isExpanded 
          ? 'col-span-full row-span-2 bg-gradient-to-br from-gray-900/90 to-gray-900/50' 
          : 'bg-gray-900/40 hover:bg-gray-900/60'
      } rounded-xl border border-gray-800/50 backdrop-blur-sm`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" />
          <h3 className="text-sm font-medium text-gray-200 truncate">{title}</h3>
          {loading && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {(hovered || isExpanded) && (
            <>
              <button
                onClick={onDownload}
                className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                title="Download"
              >
                <Download size={14} className="text-gray-400" />
              </button>
              <button
                onClick={onExpand}
                className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? (
                  <Minimize2 size={14} className="text-gray-400" />
                ) : (
                  <Maximize2 size={14} className="text-gray-400" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-2" style={{ height: isExpanded ? 300 : height }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-xs text-gray-400">Loading chart...</span>
            </div>
          </div>
        ) : data ? (
          <ChartComponent data={data} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">No data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Mini Stats Footer */}
      {!isExpanded && data && data.datasets && (
        <div className="px-3 py-2 border-t border-gray-800/50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="truncate">
              {data.datasets.length} dataset{data.datasets.length !== 1 ? 's' : ''}
            </span>
            {data.labels && (
              <span>{data.labels.length} period{data.labels.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ChartCard.displayName = 'ChartCard';

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
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7days");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [showCharts, setShowCharts] = useState(true);
  const [activeTab, setActiveTab] = useState<'charts' | 'videos'>('videos');
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);

  const chartColors = [
    { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)' },
    { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },
    { border: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' },
    { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },
    { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' },
  ];

  // Initialize progress
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();
      const fromDate = new Date();
      
      switch (timeRange) {
        case "7days": fromDate.setDate(today.getDate() - 7); break;
        case "30days": fromDate.setDate(today.getDate() - 30); break;
        case "90days": fromDate.setDate(today.getDate() - 90); break;
      }

      const from = fromDate.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      const [genreData, themeData, ratingData, scriptsData] = await Promise.all([
        getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading),
        getRequest("video/author/scripts", setLoading)
      ]);

      // Process data
      if (genreData) {
        const labels = Object.keys(genreData[Object.keys(genreData)[0]] || {}).reverse();
        const datasets = Object.keys(genreData).slice(0, 3).map((genre, idx) => ({
          label: genre,
          data: labels.map(date => genreData[genre][date]?.count || 0),
          borderColor: chartColors[idx % chartColors.length].border,
          backgroundColor: chartType === 'line' ? 'transparent' : chartColors[idx % chartColors.length].background,
          fill: chartType === 'line',
          tension: 0.4,
        }));
        setGenreChartData({ labels, datasets });
      }

      if (themeData) {
        const labels = Object.keys(themeData[Object.keys(themeData)[0]] || {}).reverse();
        const datasets = Object.keys(themeData).slice(0, 3).map((theme, idx) => ({
          label: theme,
          data: labels.map(date => themeData[theme][date]?.count || 0),
          borderColor: chartColors[idx % chartColors.length].border,
          backgroundColor: chartType === 'line' ? 'transparent' : chartColors[idx % chartColors.length].background,
          fill: chartType === 'line',
          tension: 0.4,
        }));
        setThemeChartData({ labels, datasets });
      }

      if (ratingData) {
        const labels = Object.keys(ratingData).reverse();
        const datasets = [
          {
            label: "Avg Rating",
            data: labels.map(date => ratingData[date]?.averageRating || 0),
            borderColor: '#10b981',
            backgroundColor: chartType === 'line' ? 'transparent' : 'rgba(16, 185, 129, 0.1)',
            fill: chartType === 'line',
            tension: 0.4,
          }
        ];
        setRatingChartData({ labels, datasets });
      }

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

  const charts = [
    { id: 'genre', title: "Top Genres", data: genreChartData },
    { id: 'theme', title: "Popular Themes", data: themeChartData },
    { id: 'rating', title: "Rating Trends", data: ratingChartData },
  ];

  const downloadChart = (chartId: string) => {
    const canvas = document.querySelector(`#${chartId} canvas`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${chartId}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <Layout>
      <LoadingBar color="#3b82f6" progress={progress} height={2} />

      {/* Header with Tabs */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                WECINEMA
              </h1>
              
              {/* Main Tabs */}
              <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'videos' 
                      ? 'bg-gray-700 text-white shadow' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Videos
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'charts' 
                      ? 'bg-gray-700 text-white shadow' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Analytics
                </button>
              </div>
            </div>

            {/* Chart Controls */}
            {activeTab === 'charts' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setIsChartSettingsOpen(!isChartSettingsOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    <Settings size={14} />
                    <span>Settings</span>
                  </button>
                  
                  {isChartSettingsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 z-50">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Time Range</label>
                          <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded focus:border-blue-500 focus:outline-none"
                          >
                            <option value="7days">Last 7 days</option>
                            <option value="30days">Last 30 days</option>
                            <option value="90days">Last 90 days</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Chart Type</label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setChartType('line')}
                              className={`flex-1 px-2 py-1.5 text-xs rounded ${
                                chartType === 'line' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              Line
                            </button>
                            <button
                              onClick={() => setChartType('bar')}
                              className={`flex-1 px-2 py-1.5 text-xs rounded ${
                                chartType === 'bar' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              Bar
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            fetchChartData();
                            setIsChartSettingsOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          <RefreshCw size={12} />
                          Refresh Data
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                  title={showCharts ? "Hide charts" : "Show charts"}
                >
                  {showCharts ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Analytics Panel (Collapsible) */}
        {activeTab === 'charts' && showCharts && (
          <div className="mb-8 animate-fadeIn">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Active Genres</p>
                    <p className="text-2xl font-bold text-white">
                      {genreChartData?.datasets?.length || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-900/30 rounded-lg">
                    <BarChart3 size={20} className="text-blue-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 border border-purple-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Avg Rating</p>
                    <p className="text-2xl font-bold text-white">
                      {ratingChartData?.datasets?.[0]?.data?.slice(-1)[0]?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-900/30 rounded-lg">
                    <TrendingUp size={20} className="text-purple-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border border-emerald-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Data Points</p>
                    <p className="text-2xl font-bold text-white">
                      {genreChartData?.labels?.length || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-900/30 rounded-lg">
                    <Sparkles size={20} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className={`grid gap-3 ${
              expandedChart 
                ? 'grid-cols-1' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {charts.map((chart) => (
                <ChartCard
                  key={chart.id}
                  title={chart.title}
                  data={chart.data}
                  loading={loading}
                  isExpanded={expandedChart === chart.id}
                  onExpand={() => setExpandedChart(
                    expandedChart === chart.id ? null : chart.id
                  )}
                  onDownload={() => downloadChart(chart.id)}
                  chartType={chartType}
                  height={expandedChart === chart.id ? 300 : 180}
                />
              ))}
            </div>
          </div>
        )}

        {/* Video Content (Always visible) */}
        <div className={`${activeTab === 'charts' ? 'mt-8' : ''}`}>
          {/* Genre Sections */}
          <div className="space-y-8">
            <Gallery 
              title="Trending Now" 
              category="Action" 
              length={4} 
              isFirst 
              compact
            />
            <Gallery 
              title="Popular Comedies" 
              category="Comedy" 
              length={4} 
              compact
            />
            <Gallery 
              title="Adventure & Fantasy" 
              category="Adventure" 
              length={4} 
              compact
            />
          </div>

          {/* Featured Scripts Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Featured Scripts</h2>
              <button
                onClick={() => nav('/scripts')}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all →
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scripts?.slice(0, 3).map((script: string, index: number) => (
                <div
                  key={index}
                  className="group relative bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-300 hover:shadow-lg"
                  onClick={() => nav(`/script/${data[index]._id}`, {
                    state: JSON.stringify(data[index]),
                  })}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                        {data[index]?.title || 'Untitled Script'}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
                        New
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-400 line-clamp-3 mb-4">
                      <Render htmlString={script.substring(0, 150) + '...'} />
                    </div>
                    
                    <button className="w-full py-2.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      Read Script
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Homepage;