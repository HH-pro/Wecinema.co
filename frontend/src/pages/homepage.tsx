import React, { useEffect, useState, useRef } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import LoadingBar from 'react-top-loading-bar';
import {
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Calendar,
  X,
  Download,
  BarChart3,
  TrendingUp,
  Eye,
  RefreshCw,
  Grid,
  List,
  MoreVertical,
  PlayCircle,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  Info,
  ExternalLink,
  Filter,
  ChevronRight
} from "lucide-react";
import "./homepage.css";
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
  "Love", "Redemption", "Family", "Oppression", "Corruption",
  "Survival", "Revenge", "Death", "Justice", "Perseverance",
  "War", "Bravery", "Freedom", "Friendship", "Hope",
  "Society", "Isolation", "Peace"
];

const Homepage: React.FC = () => {
  // State Management
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any>([]);
  const [genreChartData, setGenreChartData] = useState<any>(null);
  const [themeChartData, setThemeChartData] = useState<any>(null);
  const [ratingChartData, setRatingChartData] = useState<any>(null);
  const [data, setData] = useState<any>([]);
  const [showMoreIndex, setShowMoreIndex] = useState<number | null>(null);
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  const [showCharts, setShowCharts] = useState(false); // Start with charts hidden
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30days");
  const [chartView, setChartView] = useState<"grid" | "carousel">("grid");
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Refs
  const chartRefs = useRef<(HTMLDivElement | null)[]>([]);
  const swiperRef = useRef<any>(null);

  // Colors
  const colors = {
    primary: "#f59e0b",
    primaryLight: "#fbbf24",
    primaryDark: "#d97706",
    bgDark: "#0f172a",
    bgCard: "#1e293b",
    text: "#ffffff",
    textSecondary: "#94a3b8",
    border: "#334155",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444"
  };

  // Progress initialization
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  // Generate demo data if API fails
  const generateDemoData = (type: 'genre' | 'theme' | 'rating') => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    
    if (type === 'genre') {
      return {
        labels,
        datasets: [
          {
            label: "Action",
            data: [65, 78, 90, 82, 95, 110, 98],
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b20",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          },
          {
            label: "Comedy",
            data: [45, 62, 75, 58, 69, 85, 72],
            borderColor: "#fbbf24",
            backgroundColor: "#fbbf2420",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          },
          {
            label: "Drama",
            data: [32, 45, 52, 48, 61, 55, 58],
            borderColor: "#fcd34d",
            backgroundColor: "#fcd34d20",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          }
        ]
      };
    } else if (type === 'theme') {
      return {
        labels,
        datasets: [
          {
            label: "Love",
            data: [85, 92, 88, 94, 96, 98, 95],
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f620",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          },
          {
            label: "Justice",
            data: [62, 68, 72, 75, 78, 82, 79],
            borderColor: "#8b5cf6",
            backgroundColor: "#8b5cf620",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          },
          {
            label: "Freedom",
            data: [45, 52, 58, 61, 65, 70, 68],
            borderColor: "#06b6d4",
            backgroundColor: "#06b6d420",
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          }
        ]
      };
    } else {
      return {
        labels,
        datasets: [
          {
            label: "Average Rating",
            data: [4.2, 4.3, 4.5, 4.4, 4.6, 4.7, 4.8],
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}20`,
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          }
        ]
      };
    }
  };

  // Chart options
  const getChartOptions = (title: string, isExpanded: boolean): ChartOptions<"line"> => ({
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
          color: isExpanded ? colors.bgDark : colors.text,
          font: { 
            size: isExpanded ? 12 : 10,
            family: "'Inter', system-ui, sans-serif"
          },
          padding: 20,
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      title: {
        display: true,
        text: title,
        color: isExpanded ? colors.bgDark : colors.text,
        font: { 
          size: isExpanded ? 18 : 14, 
          weight: "bold",
          family: "'Inter', system-ui, sans-serif"
        },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
        titleColor: isExpanded ? colors.bgDark : colors.text,
        bodyColor: isExpanded ? colors.bgDark : colors.text,
        borderColor: colors.primary,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        boxPadding: 5,
        bodyFont: { 
          size: 12,
          family: "'Inter', system-ui, sans-serif"
        },
        titleFont: { 
          size: 12,
          family: "'Inter', system-ui, sans-serif",
          weight: '600'
        },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`
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
          color: isExpanded ? colors.textSecondary : colors.textSecondary,
          font: {
            size: isExpanded ? 12 : 10,
            family: "'Inter', system-ui, sans-serif"
          },
          padding: 8,
        },
        border: { display: false }
      },
      x: {
        grid: {
          color: isExpanded ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: isExpanded ? colors.textSecondary : colors.textSecondary,
          font: {
            size: isExpanded ? 12 : 10,
            family: "'Inter', system-ui, sans-serif"
          },
          maxRotation: isExpanded ? 0 : 45,
        },
        border: { display: false }
      },
    },
    elements: {
      line: { 
        tension: 0.4, 
        borderWidth: isExpanded ? 3 : 2,
        fill: {
          target: 'origin',
          above: `${colors.primary}10`
        }
      },
      point: { 
        radius: isExpanded ? 6 : 3, 
        hoverRadius: isExpanded ? 10 : 6,
        backgroundColor: colors.text,
        borderWidth: 2,
        borderColor: (ctx) => {
          const colors = [
            "#f59e0b", "#fbbf24", "#fcd34d", "#10b981", "#3b82f6", "#8b5cf6"
          ];
          return colors[ctx.datasetIndex || 0] || "#f59e0b";
        }
      },
    },
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeOutQuad'
      }
    }
  });

  // Data fetching
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
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

        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        const [genreData, themeData, ratingData, scriptsData] = await Promise.all([
          getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
          getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading),
          getRequest("video/author/scripts", setLoading)
        ]);

        if (!isMounted) return;

        // Process data with fallback
        if (genreData && Object.keys(genreData).length > 0) {
          try {
            const firstKey = Object.keys(genreData)[0];
            const labels = Object.keys(genreData[firstKey] || {}).reverse();
            const datasets = Object.keys(genreData).slice(0, 4).map((genre, idx) => ({
              label: genre,
              data: labels.map(date => genreData[genre]?.[date]?.count || 0),
              borderColor: ["#f59e0b", "#fbbf24", "#fcd34d", "#10b981"][idx] || "#f59e0b",
              backgroundColor: `${["#f59e0b", "#fbbf24", "#fcd34d", "#10b981"][idx] || "#f59e0b"}20`,
              tension: 0.4,
              fill: true,
              borderWidth: 2,
            }));
            setGenreChartData({ labels, datasets });
          } catch (error) {
            console.log("Using demo genre data");
            setGenreChartData(generateDemoData('genre'));
          }
        } else {
          setGenreChartData(generateDemoData('genre'));
        }

        if (themeData && Object.keys(themeData).length > 0) {
          try {
            const firstKey = Object.keys(themeData)[0];
            const labels = Object.keys(themeData[firstKey] || {}).reverse();
            const datasets = Object.keys(themeData).slice(0, 4).map((theme, idx) => ({
              label: theme,
              data: labels.map(date => themeData[theme]?.[date]?.count || 0),
              borderColor: ["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"][idx] || "#3b82f6",
              backgroundColor: `${["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"][idx] || "#3b82f6"}20`,
              tension: 0.4,
              fill: true,
              borderWidth: 2,
            }));
            setThemeChartData({ labels, datasets });
          } catch (error) {
            console.log("Using demo theme data");
            setThemeChartData(generateDemoData('theme'));
          }
        } else {
          setThemeChartData(generateDemoData('theme'));
        }

        if (ratingData && Object.keys(ratingData).length > 0) {
          try {
            const labels = Object.keys(ratingData).reverse();
            const datasets = [
              {
                label: "Average Rating",
                data: labels.map(date => ratingData[date]?.averageRating || 0),
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}20`,
                tension: 0.4,
                fill: true,
                borderWidth: 2,
              }
            ];
            setRatingChartData({ labels, datasets });
          } catch (error) {
            console.log("Using demo rating data");
            setRatingChartData(generateDemoData('rating'));
          }
        } else {
          setRatingChartData(generateDemoData('rating'));
        }

        if (scriptsData) {
          setScripts(scriptsData.map((res: any) => res.script));
          setData(scriptsData);
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Set demo data on error
        setGenreChartData(generateDemoData('genre'));
        setThemeChartData(generateDemoData('theme'));
        setRatingChartData(generateDemoData('rating'));
        setDataLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  // Chart data
  const charts = [
    { 
      id: 'genre', 
      title: "Genre Trends", 
      subtitle: "Popularity over time",
      data: genreChartData, 
      icon: TrendingUp,
      color: "#f59e0b"
    },
    { 
      id: 'theme', 
      title: "Theme Analysis", 
      subtitle: "Engagement metrics",
      data: themeChartData, 
      icon: BarChart3,
      color: "#3b82f6"
    },
    { 
      id: 'rating', 
      title: "Rating Insights", 
      subtitle: "User feedback trends",
      data: ratingChartData, 
      icon: Eye,
      color: "#10b981"
    }
  ];

  // Chart actions
  const toggleChartExpansion = (chartId: string) => {
    if (expandedChart === chartId) {
      setExpandedChart(null);
    } else {
      setExpandedChart(chartId);
      setTimeout(() => {
        const element = chartRefs.current.find(ref => ref?.id === chartId);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const refreshData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - 30);
      
      const from = fromDate.toISOString().split("T")[0];
      const to = today.toISOString().split("T")[0];

      await Promise.all([
        getRequest(`/video/genres/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/themes/graph?from=${from}&to=${to}`, setLoading),
        getRequest(`/video/ratings/graph?from=${from}&to=${to}`, setLoading)
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToVideos = () => {
    document.querySelector('.theme-bar')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Toggle charts with loading indicator
  const handleToggleCharts = () => {
    if (!showCharts && !dataLoaded) {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }
    setShowCharts(!showCharts);
  };

  return (
    <Layout>
      <LoadingBar color={colors.primary} progress={progress} height={3} />
      
      {/* Hero Section */}
      <div className="homepage-hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Discover Amazing Content
              <span className="hero-highlight"> with Smart Analytics</span>
            </h1>
            <p className="hero-subtitle">
              Explore videos, track trends, and gain insights with our interactive dashboard
            </p>
            
            <div className="hero-actions">
              <button
                onClick={handleToggleCharts}
                className="hero-btn primary-btn"
              >
                {showCharts ? (
                  <>
                    <Eye size={20} />
                    Hide Analytics
                  </>
                ) : (
                  <>
                    <BarChart3 size={20} />
                    Show Analytics Dashboard
                  </>
                )}
              </button>
              
              <button
                onClick={scrollToVideos}
                className="hero-btn secondary-btn"
              >
                <PlayCircle size={20} />
                Browse Videos
              </button>
            </div>
          </div>
          
          <div className="hero-stats">
            <div className="stat-card">
              <TrendingUp className="stat-icon" />
              <div>
                <h3>24.5K</h3>
                <p>Views Today</p>
              </div>
            </div>
            <div className="stat-card">
              <Heart className="stat-icon" />
              <div>
                <h3>18.2K</h3>
                <p>Engagements</p>
              </div>
            </div>
            <div className="stat-card">
              <Clock className="stat-icon" />
              <div>
                <h3>4.7</h3>
                <p>Avg Watch Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Toggle Bar */}
      <div className="analytics-toggle-bar">
        <div className="toggle-bar-container">
          <div className="toggle-bar-left">
            <div className="analytics-indicator">
              <div className={`indicator-dot ${showCharts ? 'active' : ''}`} />
              <span>Analytics {showCharts ? 'Active' : 'Hidden'}</span>
            </div>
            
            {showCharts && (
              <div className="time-range-selector">
                <Calendar className="time-range-icon" />
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="time-range-select"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="toggle-bar-right">
            {showCharts && (
              <button
                onClick={refreshData}
                disabled={loading}
                className="refresh-btn"
              >
                <RefreshCw className={loading ? 'spinning' : ''} />
                Refresh Data
              </button>
            )}
            
            <button
              onClick={handleToggleCharts}
              className="toggle-btn"
            >
              {showCharts ? (
                <>
                  <ChevronUp size={16} />
                  Hide Analytics
                </>
              ) : (
                <>
                  <BarChart3 size={16} />
                  Show Analytics
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard (Collapsed by default) */}
      {showCharts && (
        <div className="analytics-section">
          <div className="analytics-container">
            {/* Header */}
            <div className="analytics-header">
              <div>
                <h2 className="analytics-title">Analytics Dashboard</h2>
                <p className="analytics-subtitle">Interactive charts and insights</p>
              </div>
              
              <div className="analytics-actions">
                <div className="view-toggle">
                  <button
                    onClick={() => setChartView('grid')}
                    className={`view-toggle-btn ${chartView === 'grid' ? 'active' : ''}`}
                    title="Grid View"
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setChartView('carousel')}
                    className={`view-toggle-btn ${chartView === 'carousel' ? 'active' : ''}`}
                    title="Carousel View"
                  >
                    <List size={18} />
                  </button>
                </div>
                
                <div className="analytics-info">
                  <Info size={18} />
                  <span>Click charts to expand</span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            {chartView === 'grid' ? (
              <div className="charts-grid">
                {charts.map((chart, idx) => (
                  <div
                    key={chart.id}
                    id={chart.id}
                    ref={el => chartRefs.current[idx] = el}
                    className={`chart-card ${expandedChart === chart.id ? 'expanded' : ''}`}
                    style={{ borderLeftColor: chart.color }}
                  >
                    {/* Chart Header */}
                    <div className="chart-header">
                      <div className="chart-header-left">
                        <div 
                          className="chart-icon-wrapper"
                          style={{ backgroundColor: `${chart.color}20`, color: chart.color }}
                        >
                          <chart.icon size={20} />
                        </div>
                        <div>
                          <h3 className="chart-title">{chart.title}</h3>
                          <p className="chart-subtitle">{chart.subtitle}</p>
                        </div>
                      </div>
                      
                      <div className="chart-actions">
                        <button
                          onClick={() => downloadChart(chart.id)}
                          className="chart-action-btn"
                          title="Download chart"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          className="chart-action-btn expand-btn"
                          title={expandedChart === chart.id ? "Minimize" : "Expand"}
                        >
                          {expandedChart === chart.id ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div className={`chart-content ${expandedChart === chart.id ? 'expanded' : ''}`}>
                      {loading ? (
                        <div className="chart-loading">
                          <div className="spinner"></div>
                          <p>Loading chart data...</p>
                        </div>
                      ) : chart.data ? (
                        <Line 
                          data={chart.data} 
                          options={getChartOptions(chart.title, expandedChart === chart.id)} 
                        />
                      ) : (
                        <div className="chart-empty">
                          <div className="chart-empty-icon">
                            <BarChart3 size={40} />
                          </div>
                          <p>No data available</p>
                        </div>
                      )}
                    </div>

                    {/* Chart Footer */}
                    <div className="chart-footer">
                      <div className="chart-footer-left">
                        <span className="chart-footer-text">
                          {chart.data?.datasets?.length || 0} datasets • {timeRange.replace('days', ' days')}
                        </span>
                        {chart.data && (
                          <button
                            onClick={() => toggleChartExpansion(chart.id)}
                            className="view-details-btn"
                          >
                            {expandedChart === chart.id ? "Close Full View" : "Expand for Details"}
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                      
                      {expandedChart === chart.id && (
                        <button
                          onClick={() => setExpandedChart(null)}
                          className="close-expanded-btn"
                          title="Close"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Carousel View
              <div className="charts-carousel">
                <div className="carousel-container">
                  {charts.map((chart, idx) => (
                    <div
                      key={chart.id}
                      className={`carousel-slide ${idx === activeChartIndex ? 'active' : ''}`}
                      onClick={() => setActiveChartIndex(idx)}
                    >
                      <div className="carousel-chart" style={{ borderColor: chart.color }}>
                        <div className="carousel-chart-header">
                          <div className="carousel-chart-title">
                            <div 
                              className="carousel-icon-wrapper"
                              style={{ backgroundColor: `${chart.color}20`, color: chart.color }}
                            >
                              <chart.icon size={24} />
                            </div>
                            <div>
                              <h3>{chart.title}</h3>
                              <p>{chart.subtitle}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadChart(chart.id);
                            }}
                            className="carousel-download-btn"
                          >
                            <Download size={20} />
                          </button>
                        </div>
                        
                        <div className="carousel-chart-content">
                          {loading ? (
                            <div className="carousel-loading">
                              <div className="spinner"></div>
                            </div>
                          ) : chart.data ? (
                            <div className="carousel-chart-wrapper">
                              <Line data={chart.data} options={getChartOptions(chart.title, true)} />
                            </div>
                          ) : (
                            <div className="carousel-empty">
                              <p>No data available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="carousel-indicators">
                  {charts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveChartIndex(idx)}
                      className={`carousel-indicator ${idx === activeChartIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="analytics-quick-actions">
              <button
                onClick={scrollToVideos}
                className="quick-action-btn primary-action"
              >
                <PlayCircle size={18} />
                Continue to Videos
              </button>
              
              <div className="analytics-tips">
                <Info size={16} />
                <span>Tip: Expand charts for detailed analysis</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Navigation */}
      <div className="theme-bar">
        <div className="theme-bar-container">
          <div className="theme-bar-header">
            <h2 className="theme-bar-title">Browse Content</h2>
            <button
              onClick={() => nav('/themes')}
              className="view-all-btn"
            >
              View All
              <ExternalLink size={16} />
            </button>
          </div>
          <div className="theme-buttons">
            {theme.slice(0, 8).map((val, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${val.toLowerCase()}`)}
                className="theme-button"
                style={{
                  background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.bgDark})`
                }}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Galleries */}
      <div className="video-galleries">
        <div className="galleries-container">
          <Gallery title="Action" category="Action" length={5} isFirst />
          <Gallery title="Comedy" length={5} category="Comedy" />
          <Gallery title="Adventure" length={5} category="Adventure" />
          <Gallery title="Horror" length={5} category="Horror" />
          <Gallery title="Drama" length={5} category="Drama" />
        </div>
      </div>

      {/* Scripts Section */}
      {scripts.length > 0 && (
        <div className="scripts-section">
          <div className="scripts-header">
            <div>
              <h2 className="scripts-title">Featured Scripts</h2>
              <p className="scripts-subtitle">Discover stories from our community</p>
            </div>
            <button
              onClick={() => nav('/scripts')}
              className="view-all-btn"
            >
              View All Scripts
              <ExternalLink size={16} />
            </button>
          </div>
          
          <div className="scripts-grid">
            {scripts?.slice(0, 3).map((script: string, index: number) => (
              <div
                key={index}
                className="script-card"
                onMouseEnter={() => setShowMoreIndex(index)}
                onMouseLeave={() => setShowMoreIndex(null)}
                onClick={() => nav(`/script/${data[index]?._id}`, {
                  state: JSON.stringify(data[index]),
                })}
              >
                <div className="script-card-content">
                  {/* Header */}
                  <div className="script-card-header">
                    <div>
                      <h3 className="script-title">
                        {data[index]?.title || 'Untitled Script'}
                      </h3>
                      <div className="script-meta">
                        <span className="script-genre">
                          {data[index]?.genre || 'Drama'}
                        </span>
                        <span className="script-time">15 min read</span>
                      </div>
                    </div>
                    <button 
                      className="script-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        nav(`/script/${data[index]?._id}`, {
                          state: JSON.stringify(data[index]),
                        });
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  
                  {/* Preview */}
                  <div className="script-preview">
                    {script ? (
                      <Render htmlString={script.substring(0, 150) + '...'} />
                    ) : (
                      'No content available'
                    )}
                  </div>
                  
                  {/* Stats & Actions */}
                  <div className="script-footer">
                    <div className="script-stats">
                      <div className="script-stat">
                        <Heart size={14} />
                        <span>2.4K</span>
                      </div>
                      <div className="script-stat">
                        <MessageSquare size={14} />
                        <span>148</span>
                      </div>
                      <div className="script-stat">
                        <Share2 size={14} />
                        <span>89</span>
                      </div>
                    </div>
                    
                    <button className="read-now-btn">
                      Read Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Homepage;