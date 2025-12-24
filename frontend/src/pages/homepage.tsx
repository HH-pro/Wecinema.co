import React, { useEffect, useState, useRef } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation, EffectFade } from "swiper/modules";
import { Line } from "react-chartjs-2";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";
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
  Share2
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
  const [showCharts, setShowCharts] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30days");
  const [chartView, setChartView] = useState<"grid" | "carousel">("grid");
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  
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

        // Process data
        if (genreData) {
          const labels = Object.keys(genreData[Object.keys(genreData)[0]] || {}).reverse();
          const datasets = Object.keys(genreData).slice(0, 4).map((genre, idx) => ({
            label: genre,
            data: labels.map(date => genreData[genre][date]?.count || 0),
            borderColor: [
              "#f59e0b", "#fbbf24", "#fcd34d", "#10b981"
            ][idx] || "#f59e0b",
            backgroundColor: `${["#f59e0b", "#fbbf24", "#fcd34d", "#10b981"][idx] || "#f59e0b"}20`,
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          }));
          setGenreChartData({ labels, datasets });
        }

        if (themeData) {
          const labels = Object.keys(themeData[Object.keys(themeData)[0]] || {}).reverse();
          const datasets = Object.keys(themeData).slice(0, 4).map((theme, idx) => ({
            label: theme,
            data: labels.map(date => themeData[theme][date]?.count || 0),
            borderColor: [
              "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"
            ][idx] || "#3b82f6",
            backgroundColor: `${["#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"][idx] || "#3b82f6"}20`,
            tension: 0.4,
            fill: true,
            borderWidth: 2,
          }));
          setThemeChartData({ labels, datasets });
        }

        if (ratingData) {
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
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  // Chart data
  const charts = [
    { id: 'genre', title: "Genre Trends", data: genreChartData, icon: TrendingUp },
    { id: 'theme', title: "Theme Analysis", data: themeChartData, icon: BarChart3 },
    { id: 'rating', title: "Rating Insights", data: ratingChartData, icon: Eye }
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

  return (
    <Layout>
      <LoadingBar color={colors.primary} progress={progress} height={3} />
      
      {/* Header */}
      <div className="homepage-header">
        <div className="header-content">
          <h1 className="header-title">WECINEMA Analytics</h1>
          
          <div className="header-controls">
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
            
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="toggle-charts-btn"
            >
              {showCharts ? <ChevronUp /> : <ChevronDown />}
              {showCharts ? "Hide Charts" : "Show Charts"}
            </button>
            
            <button
              onClick={refreshData}
              disabled={loading}
              className="refresh-btn"
            >
              <RefreshCw className={loading ? 'spinning' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="charts-section">
          <div className="charts-container">
            {/* View Toggle */}
            <div className="charts-header">
              <h2 className="charts-title">Analytics Dashboard</h2>
              
              <div className="view-toggle">
                <button
                  onClick={() => setChartView('grid')}
                  className={`view-toggle-btn ${chartView === 'grid' ? 'active' : ''}`}
                >
                  <Grid />
                </button>
                <button
                  onClick={() => setChartView('carousel')}
                  className={`view-toggle-btn ${chartView === 'carousel' ? 'active' : ''}`}
                >
                  <List />
                </button>
              </div>
            </div>

            {/* Charts Display */}
            {chartView === 'grid' ? (
              // Grid View
              <div className="charts-grid">
                {charts.map((chart, idx) => (
                  <div
                    key={chart.id}
                    id={chart.id}
                    ref={el => chartRefs.current[idx] = el}
                    className={`chart-card ${expandedChart === chart.id ? 'expanded' : ''}`}
                  >
                    {/* Chart Header */}
                    <div className="chart-header">
                      <div className="chart-header-left">
                        <div className="chart-icon-wrapper">
                          <chart.icon />
                        </div>
                        <div>
                          <h3 className="chart-title">{chart.title}</h3>
                          <p className="chart-subtitle">
                            Last {timeRange.replace('days', ' days')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="chart-actions">
                        <button
                          onClick={() => downloadChart(chart.id)}
                          className="chart-action-btn"
                          title="Download chart"
                        >
                          <Download />
                        </button>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          className="chart-action-btn"
                          title={expandedChart === chart.id ? "Minimize" : "Expand"}
                        >
                          {expandedChart === chart.id ? <Minimize2 /> : <Maximize2 />}
                        </button>
                        {expandedChart === chart.id && (
                          <button
                            onClick={() => setExpandedChart(null)}
                            className="chart-action-btn"
                            title="Close"
                          >
                            <X />
                          </button>
                        )}
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
                          <BarChart3 />
                          <p>No data available</p>
                        </div>
                      )}
                    </div>

                    {/* Chart Footer */}
                    {!expandedChart && chart.data && (
                      <div className="chart-footer">
                        <span className="chart-footer-text">
                          {chart.data.datasets?.length || 0} data series
                        </span>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          className="expand-view-btn"
                        >
                          Expand view
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Carousel View
              <div className="charts-carousel">
                <Swiper
                  ref={swiperRef}
                  modules={[Pagination, Navigation, EffectFade]}
                  effect="fade"
                  fadeEffect={{ crossFade: true }}
                  pagination={{
                    clickable: true,
                    dynamicBullets: true,
                  }}
                  navigation={{
                    nextEl: '.chart-next',
                    prevEl: '.chart-prev',
                  }}
                  spaceBetween={20}
                  slidesPerView={1}
                  onSlideChange={(swiper) => setActiveChartIndex(swiper.activeIndex)}
                  className="charts-swiper"
                >
                  {charts.map((chart) => (
                    <SwiperSlide key={chart.id}>
                      <div className="carousel-chart">
                        <div className="carousel-chart-header">
                          <div className="carousel-chart-title">
                            <div className="carousel-icon-wrapper">
                              <chart.icon />
                            </div>
                            <div>
                              <h3>{chart.title}</h3>
                              <p>Interactive visualization</p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadChart(chart.id)}
                            className="carousel-download-btn"
                          >
                            <Download />
                          </button>
                        </div>
                        
                        <div className="carousel-chart-content">
                          {loading ? (
                            <div className="carousel-loading">
                              <div className="spinner"></div>
                            </div>
                          ) : chart.data ? (
                            <Line data={chart.data} options={getChartOptions(chart.title, true)} />
                          ) : (
                            <div className="carousel-empty">
                              <p>No data available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                
                <button className="chart-prev">
                  ←
                </button>
                <button className="chart-next">
                  →
                </button>
              </div>
            )}

            {/* Quick Navigation */}
            <div className="charts-navigation">
              <button
                onClick={scrollToVideos}
                className="browse-videos-btn"
              >
                <PlayCircle />
                Browse Videos
              </button>
              
              <div className="chart-indicators">
                {charts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (chartView === 'carousel') {
                        swiperRef.current?.swiper.slideTo(idx);
                      }
                    }}
                    className={`chart-indicator ${idx === activeChartIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Navigation */}
      <div className="theme-bar">
        <div className="theme-bar-container">
          <h2 className="theme-bar-title">Explore Content</h2>
          <div className="theme-buttons">
            {theme.map((val, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${val.toLowerCase()}`)}
                className="theme-button"
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
          <h2 className="scripts-title">Featured Scripts</h2>
          
          <div className="scripts-grid">
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                className="script-card"
                onMouseEnter={() => setShowMoreIndex(index)}
                onMouseLeave={() => setShowMoreIndex(null)}
                onClick={() => nav(`/script/${data[index]._id}`, {
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
                        <span>•</span>
                        <span>15 min read</span>
                      </div>
                    </div>
                    <button className="script-more-btn">
                      <MoreVertical />
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
                        <Heart />
                        <span>2.4K</span>
                      </div>
                      <div className="script-stat">
                        <MessageSquare />
                        <span>148</span>
                      </div>
                      <div className="script-stat">
                        <Share2 />
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