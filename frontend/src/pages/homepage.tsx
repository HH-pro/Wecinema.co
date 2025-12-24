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

  // Color palette
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

  // Enhanced chart options
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

        // Process data with enhanced colors
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
      <div style={{
        background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e293b 100%)`,
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(10px)',
        backgroundColor: `${colors.bgDark}cc`
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            background: `linear-gradient(to right, ${colors.primary}, ${colors.primaryLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            WECINEMA Analytics
          </h1>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: `${colors.bgCard}`,
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: `1px solid ${colors.border}`
            }}>
              <Calendar size={16} color={colors.primary} />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: colors.text,
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowCharts(!showCharts)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: `${colors.bgCard}`,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.5rem',
                color: colors.text,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bgCard}
            >
              {showCharts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showCharts ? "Hide Charts" : "Show Charts"}
            </button>
            
            <button
              onClick={refreshData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: `${colors.primary}20`,
                border: `1px solid ${colors.primary}40`,
                borderRadius: '0.5rem',
                color: colors.primary,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.5 : 1
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = `${colors.primary}30`)}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}20`)}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.bgDark} 0%, #0c1424 100%)`,
          padding: '2rem 1rem'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {/* View Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: colors.text,
                margin: 0
              }}>
                Analytics Dashboard
              </h2>
              
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                background: colors.bgCard,
                padding: '0.25rem',
                borderRadius: '0.5rem',
                border: `1px solid ${colors.border}`
              }}>
                <button
                  onClick={() => setChartView('grid')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: chartView === 'grid' ? colors.primary : 'transparent',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: chartView === 'grid' ? colors.text : colors.textSecondary,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setChartView('carousel')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: chartView === 'carousel' ? colors.primary : 'transparent',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: chartView === 'carousel' ? colors.text : colors.textSecondary,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Charts Display */}
            {chartView === 'grid' ? (
              // Grid View
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {charts.map((chart, idx) => (
                  <div
                    key={chart.id}
                    id={chart.id}
                    ref={el => chartRefs.current[idx] = el}
                    style={{
                      background: colors.bgCard,
                      borderRadius: '0.75rem',
                      border: `1px solid ${colors.border}`,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      position: expandedChart === chart.id ? 'fixed' : 'relative',
                      ...(expandedChart === chart.id && {
                        position: 'fixed',
                        top: '2rem',
                        left: '2rem',
                        right: '2rem',
                        bottom: '2rem',
                        zIndex: 50,
                        background: colors.text,
                        borderRadius: '1rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                      })
                    }}
                    onMouseEnter={(e) => {
                      if (expandedChart !== chart.id) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (expandedChart !== chart.id) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {/* Chart Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      borderBottom: `1px solid ${colors.border}`,
                      background: expandedChart === chart.id ? '#f8fafc' : 'transparent'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <div style={{
                          padding: '0.5rem',
                          background: `${colors.primary}20`,
                          borderRadius: '0.5rem',
                          color: colors.primary
                        }}>
                          <chart.icon size={20} />
                        </div>
                        <div>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: expandedChart === chart.id ? colors.bgDark : colors.text,
                            margin: 0
                          }}>
                            {chart.title}
                          </h3>
                          <p style={{
                            fontSize: '0.75rem',
                            color: expandedChart === chart.id ? colors.textSecondary : colors.textSecondary,
                            margin: '0.25rem 0 0 0'
                          }}>
                            Last {timeRange.replace('days', ' days')}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <button
                          onClick={() => downloadChart(chart.id)}
                          style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            color: expandedChart === chart.id ? colors.bgDark : colors.textSecondary,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = expandedChart === chart.id ? '#f1f5f9' : '#2d3748'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Download chart"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '0.375rem',
                            color: expandedChart === chart.id ? colors.bgDark : colors.textSecondary,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = expandedChart === chart.id ? '#f1f5f9' : '#2d3748'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title={expandedChart === chart.id ? "Minimize" : "Expand"}
                        >
                          {expandedChart === chart.id ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        {expandedChart === chart.id && (
                          <button
                            onClick={() => setExpandedChart(null)}
                            style={{
                              padding: '0.5rem',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '0.375rem',
                              color: colors.bgDark,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Close"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chart Content */}
                    <div style={{
                      padding: '1rem',
                      height: expandedChart === chart.id ? 'calc(100vh - 180px)' : '280px',
                      position: 'relative'
                    }}>
                      {loading ? (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: expandedChart === chart.id ? colors.text : `${colors.bgCard}cc`,
                          backdropFilter: expandedChart === chart.id ? 'none' : 'blur(4px)',
                          borderRadius: '0.5rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                          }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              border: `3px solid ${colors.primary}20`,
                              borderTopColor: colors.primary,
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            <p style={{
                              color: expandedChart === chart.id ? colors.bgDark : colors.text,
                              fontSize: '0.875rem'
                            }}>
                              Loading chart data...
                            </p>
                          </div>
                        </div>
                      ) : chart.data ? (
                        <Line 
                          data={chart.data} 
                          options={getChartOptions(chart.title, expandedChart === chart.id)} 
                        />
                      ) : (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <BarChart3 size={40} color={expandedChart === chart.id ? colors.textSecondary : colors.textSecondary} />
                            <p style={{
                              color: expandedChart === chart.id ? colors.textSecondary : colors.textSecondary,
                              marginTop: '0.5rem'
                            }}>
                              No data available
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chart Footer */}
                    {!expandedChart && chart.data && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderTop: `1px solid ${colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{
                          fontSize: '0.75rem',
                          color: colors.textSecondary
                        }}>
                          {chart.data.datasets?.length || 0} data series
                        </span>
                        <button
                          onClick={() => toggleChartExpansion(chart.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: colors.primary,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.primary}10`}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
              <div style={{
                position: 'relative',
                marginBottom: '2rem'
              }}>
                <Swiper
                  ref={swiperRef}
                  modules={[Pagination, Navigation, EffectFade]}
                  effect="fade"
                  fadeEffect={{ crossFade: true }}
                  pagination={{
                    clickable: true,
                    dynamicBullets: true,
                    renderBullet: (index, className) => {
                      return `<span class="${className}" style="background: ${colors.primary};"></span>`;
                    }
                  }}
                  navigation={{
                    nextEl: '.chart-next',
                    prevEl: '.chart-prev',
                  }}
                  spaceBetween={20}
                  slidesPerView={1}
                  onSlideChange={(swiper) => setActiveChartIndex(swiper.activeIndex)}
                  style={{ height: '500px' }}
                >
                  {charts.map((chart, idx) => (
                    <SwiperSlide key={chart.id}>
                      <div style={{
                        background: colors.bgCard,
                        borderRadius: '1rem',
                        border: `1px solid ${colors.border}`,
                        height: '100%',
                        padding: '2rem',
                        position: 'relative'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '1.5rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              padding: '0.75rem',
                              background: `${colors.primary}20`,
                              borderRadius: '0.75rem',
                              color: colors.primary
                            }}>
                              <chart.icon size={24} />
                            </div>
                            <div>
                              <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                color: colors.text,
                                margin: 0
                              }}>
                                {chart.title}
                              </h3>
                              <p style={{
                                fontSize: '0.875rem',
                                color: colors.textSecondary,
                                margin: '0.25rem 0 0 0'
                              }}>
                                Interactive visualization
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => downloadChart(chart.id)}
                            style={{
                              padding: '0.5rem',
                              background: `${colors.primary}20`,
                              border: `1px solid ${colors.primary}40`,
                              borderRadius: '0.5rem',
                              color: colors.primary,
                              cursor: 'pointer'
                            }}
                          >
                            <Download size={20} />
                          </button>
                        </div>
                        
                        <div style={{ height: 'calc(100% - 100px)' }}>
                          {loading ? (
                            <div style={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <div style={{
                                width: '48px',
                                height: '48px',
                                border: `4px solid ${colors.primary}20`,
                                borderTopColor: colors.primary,
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }} />
                            </div>
                          ) : chart.data ? (
                            <Line data={chart.data} options={getChartOptions(chart.title, true)} />
                          ) : (
                            <div style={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <p style={{ color: colors.textSecondary }}>No data available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                
                <button
                  className="chart-prev"
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '40px',
                    height: '40px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.text,
                    cursor: 'pointer'
                  }}
                >
                  ←
                </button>
                <button
                  className="chart-next"
                  style={{
                    position: 'absolute',
                    right: '-20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    width: '40px',
                    height: '40px',
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.text,
                    cursor: 'pointer'
                  }}
                >
                  →
                </button>
              </div>
            )}

            {/* Quick Navigation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={scrollToVideos}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: colors.text,
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <PlayCircle size={18} />
                Browse Videos
              </button>
              
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                {charts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (chartView === 'carousel') {
                        swiperRef.current?.swiper.slideTo(idx);
                      }
                    }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: idx === activeChartIndex ? colors.primary : colors.border,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Navigation */}
      <div 
        className="theme-bar"
        style={{
          background: colors.bgCard,
          padding: '1.5rem 1rem',
          position: 'sticky',
          top: showCharts ? '73px' : '0',
          zIndex: 30,
          borderBottom: `1px solid ${colors.border}`
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: '1rem'
          }}>
            Explore Content
          </h2>
          <div style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '0.75rem',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {theme.map((val, index) => (
              <button
                key={index}
                onClick={() => nav(`/themes/${val.toLowerCase()}`)}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: colors.bgDark,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.5rem',
                  color: colors.text,
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.primary;
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.bgDark;
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Galleries */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <Gallery title="Action" category="Action" length={5} isFirst />
          <Gallery title="Comedy" length={5} category="Comedy" />
          <Gallery title="Adventure" length={5} category="Adventure" />
          <Gallery title="Horror" length={5} category="Horror" />
          <Gallery title="Drama" length={5} category="Drama" />
        </div>
      </div>

      {/* Scripts Section */}
      {scripts.length > 0 && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1rem',
          borderTop: `1px solid ${colors.border}`
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: '1.5rem'
          }}>
            Featured Scripts
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {scripts?.map((script: string, index: number) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  borderRadius: '0.75rem',
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => nav(`/script/${data[index]._id}`, {
                  state: JSON.stringify(data[index]),
                })}
              >
                <div style={{ padding: '1.5rem' }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: colors.text,
                        margin: '0 0 0.5rem 0',
                        lineHeight: '1.4'
                      }}>
                        {data[index]?.title || 'Untitled Script'}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.75rem',
                        color: colors.textSecondary
                      }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          background: `${colors.primary}20`,
                          borderRadius: '0.25rem',
                          color: colors.primary
                        }}>
                          {data[index]?.genre || 'Drama'}
                        </span>
                        <span>•</span>
                        <span>15 min read</span>
                      </div>
                    </div>
                    <button
                      style={{
                        padding: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: colors.textSecondary,
                        cursor: 'pointer'
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  
                  {/* Preview */}
                  <div style={{
                    color: colors.textSecondary,
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    marginBottom: '1.5rem',
                    maxHeight: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {script ? (
                      <Render htmlString={script.substring(0, 150) + '...'} />
                    ) : (
                      'No content available'
                    )}
                  </div>
                  
                  {/* Stats & Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '0.875rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: colors.textSecondary }}>
                        <Heart size={14} />
                        <span>2.4K</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: colors.textSecondary }}>
                        <MessageSquare size={14} />
                        <span>148</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: colors.textSecondary }}>
                        <Share2 size={14} />
                        <span>89</span>
                      </div>
                    </div>
                    
                    <button
                      style={{
                        padding: '0.5rem 1rem',
                        background: colors.primary,
                        border: 'none',
                        borderRadius: '0.375rem',
                        color: colors.text,
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Read Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .theme-bar::-webkit-scrollbar {
          display: none;
        }
        
        .swiper-pagination-bullet-active {
          transform: scale(1.2);
        }
      `}</style>
    </Layout>
  );
};

export default Homepage;