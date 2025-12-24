import React, { useEffect, useState, useCallback, memo, lazy, Suspense } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
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
  TrendingUp,
  X,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle
} from "lucide-react";
import "../App.css";

// Lazy load chart components for better performance
const Chart = lazy(() => import('react-apexcharts'));

// Fallback component for lazy loading
const ChartFallback = () => (
  <div className="h-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      <span className="text-xs text-gray-400">Loading chart...</span>
    </div>
  </div>
);

// Simple chart card component using ApexCharts for better performance
const SimpleChartCard = memo(({
  title,
  data,
  loading,
  isExpanded,
  onExpand,
  type = 'line'
}: {
  title: string;
  data: { categories: string[]; series: { name: string; data: number[] }[] };
  loading: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  type?: 'line' | 'bar';
}) => {
  const [hovered, setHovered] = useState(false);

  const options = {
    chart: {
      type: type,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      strokeDashArray: 3
    },
    xaxis: {
      categories: data?.categories || [],
      labels: {
        style: {
          colors: 'rgba(255, 255, 255, 0.5)',
          fontSize: '11px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'rgba(255, 255, 255, 0.5)',
          fontSize: '11px'
        }
      }
    },
    legend: {
      show: !isExpanded,
      labels: {
        colors: 'rgba(255, 255, 255, 0.7)',
        useSeriesColors: false
      },
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif'
    },
    tooltip: {
      theme: 'dark',
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }
    },
    colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
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
      style={{ height: isExpanded ? '350px' : '200px' }}
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

      {/* Chart Content */}
      <div className="p-2 h-[calc(100%-52px)]">
        {loading ? (
          <ChartFallback />
        ) : data && data.series && data.series.length > 0 ? (
          <Suspense fallback={<ChartFallback />}>
            <Chart
              options={options}
              series={data.series}
              type={type}
              height="100%"
            />
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-4">
              <AlertCircle size={32} className="mx-auto text-gray-600 mb-2" />
              <p className="text-xs text-gray-500">No data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SimpleChartCard.displayName = 'SimpleChartCard';

const Homepage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);
  const [genreChartData, setGenreChartData] = useState<{ categories: string[]; series: { name: string; data: number[] }[] } | null>(null);
  const [themeChartData, setThemeChartData] = useState<{ categories: string[]; series: { name: string; data: number[] }[] } | null>(null);
  const [ratingChartData, setRatingChartData] = useState<{ categories: string[]; series: { name: string; data: number[] }[] } | null>(null);
  const [data, setData] = useState<any[]>([]);
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7days");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [showCharts, setShowCharts] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'analytics'>('videos');

  const themes = [
    "Love", "Redemption", "Family", "Oppression", "Corruption",
    "Survival", "Revenge", "Death", "Justice", "Perseverance",
    "War", "Bravery", "Freedom", "Friendship", "Hope",
    "Society", "Isolation", "Peace"
  ];

  // Initialize progress
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  // Format chart data
  const formatChartData = (apiData: any, limit = 3) => {
    if (!apiData || Object.keys(apiData).length === 0) return null;
    
    const firstKey = Object.keys(apiData)[0];
    const categories = Object.keys(apiData[firstKey] || {}).reverse();
    
    const series = Object.keys(apiData)
      .slice(0, limit)
      .map((key, index) => ({
        name: key,
        data: categories.map(date => apiData[key][date]?.count || 0)
      }));
    
    return { categories, series };
  };

  // Format rating data
  const formatRatingData = (apiData: any) => {
    if (!apiData || Object.keys(apiData).length === 0) return null;
    
    const categories = Object.keys(apiData).reverse();
    
    const series = [
      {
        name: "Average Rating",
        data: categories.map(date => apiData[date]?.averageRating || 0)
      }
    ];
    
    return { categories, series };
  };

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
        getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading).catch(() => null),
        getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading).catch(() => null),
        getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading).catch(() => null),
        getRequest("video/author/scripts", setLoading).catch(() => [])
      ]);

      setGenreChartData(formatChartData(genreData));
      setThemeChartData(formatChartData(themeData));
      setRatingChartData(formatRatingData(ratingData));

      if (scriptsData) {
        setScripts(scriptsData.map((res: any) => res.script));
        setData(scriptsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (showCharts) {
      fetchChartData();
    }
  }, [fetchChartData, showCharts]);

  const charts = [
    { id: 'genre', title: "Top Genres", data: genreChartData },
    { id: 'theme', title: "Popular Themes", data: themeChartData },
    { id: 'rating', title: "Rating Trends", data: ratingChartData },
  ];

  return (
    <Layout>
      <LoadingBar color="#3b82f6" progress={progress} height={2} />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WECINEMA
            </h1>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowCharts(!showCharts);
                  if (!showCharts) {
                    setActiveTab('analytics');
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                {showCharts ? (
                  <>
                    <EyeOff size={14} />
                    <span>Hide Analytics</span>
                  </>
                ) : (
                  <>
                    <BarChart3 size={14} />
                    <span>Show Analytics</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Analytics Section - Only shown when toggled */}
        {showCharts && (
          <div className="mb-8 animate-fadeIn">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-800/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Active Genres</p>
                    <p className="text-2xl font-bold text-white">
                      {genreChartData?.series?.length || 0}
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
                    <p className="text-xs text-gray-400 mb-1">Themes Tracked</p>
                    <p className="text-2xl font-bold text-white">
                      {themeChartData?.series?.length || 0}
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
                    <p className="text-xs text-gray-400 mb-1">Data Periods</p>
                    <p className="text-2xl font-bold text-white">
                      {genreChartData?.categories?.length || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-900/30 rounded-lg">
                    <Sparkles size={20} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => setChartType("line")}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      chartType === "line" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      chartType === "bar" 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Bar
                  </button>
                </div>
              </div>
              
              <button
                onClick={fetchChartData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {/* Charts Grid */}
            <div className={`grid gap-3 ${
              expandedChart 
                ? 'grid-cols-1' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {charts.map((chart) => (
                <SimpleChartCard
                  key={chart.id}
                  title={chart.title}
                  data={chart.data}
                  loading={loading}
                  isExpanded={expandedChart === chart.id}
                  onExpand={() => setExpandedChart(
                    expandedChart === chart.id ? null : chart.id
                  )}
                  type={chartType}
                />
              ))}
            </div>
          </div>
        )}

        {/* Theme Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Explore Themes</h2>
            <button
              onClick={() => nav('/themes')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.slice(0, 8).map((theme, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${theme.toLowerCase()}`)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Video Content */}
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
        {scripts.length > 0 && (
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
              {scripts.slice(0, 3).map((script: string, index: number) => (
                <div
                  key={index}
                  className="group relative bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-300 hover:shadow-lg cursor-pointer"
                  onClick={() => nav(`/script/${data[index]?._id}`, {
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
                    
                    <div className="text-sm text-gray-400 line-clamp-3 mb-4 min-h-[60px]">
                      {script ? (
                        <Render htmlString={script.substring(0, 150) + '...'} />
                      ) : (
                        <span className="text-gray-500">No script content available</span>
                      )}
                    </div>
                    
                    <button className="w-full py-2.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      Read Script
                    </button>
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