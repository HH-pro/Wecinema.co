import React, { useEffect, useState, useCallback, memo } from "react";
import { Gallery, Layout, Render } from "../components/";
import { getRequest } from "../api";
import { useNavigate } from "react-router-dom";
import LoadingBar from 'react-top-loading-bar';
import {
  TrendingUp,
  Users,
  Film,
  Star,
  Calendar,
  BarChart3,
  ChevronRight,
  RefreshCw,
  Zap,
  Activity,
  Eye,
  Download,
  MoreVertical,
  PlayCircle,
  Clock,
  Heart,
  MessageSquare,
  Share2,
  Filter,
  Grid,
  List
} from "lucide-react";
import "../App.css";

// Mock data generator for development
const generateMockChartData = (type: 'genre' | 'theme' | 'rating') => {
  const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  
  switch(type) {
    case 'genre':
      return {
        categories,
        series: [
          { name: 'Action', data: [65, 78, 90, 82, 95, 110, 98] },
          { name: 'Comedy', data: [45, 62, 75, 58, 69, 85, 72] },
          { name: 'Drama', data: [32, 45, 52, 48, 61, 55, 58] },
          { name: 'Horror', data: [28, 35, 42, 38, 45, 52, 48] }
        ]
      };
    case 'theme':
      return {
        categories,
        series: [
          { name: 'Love', data: [85, 92, 88, 94, 96, 98, 95] },
          { name: 'Redemption', data: [62, 68, 72, 75, 78, 82, 79] },
          { name: 'Justice', data: [45, 52, 58, 61, 65, 70, 68] }
        ]
      };
    case 'rating':
      return {
        categories,
        series: [
          { name: 'Average Rating', data: [4.2, 4.3, 4.5, 4.4, 4.6, 4.7, 4.8] },
          { name: 'Total Reviews', data: [120, 145, 162, 158, 185, 210, 198] }
        ]
      };
  }
};

// Stats card component
const StatCard = memo(({ 
  title, 
  value, 
  change, 
  icon: Icon,
  color = 'blue' 
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: any;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) => {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
    red: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <Icon size={24} />
        <span className="text-xs font-medium px-2 py-1 bg-white/10 rounded-full">
          {change}%
        </span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-white/70">{title}</p>
    </div>
  );
});

// Mini chart component
const MiniChart = memo(({ data, color = '#3b82f6' }: { data: number[], color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const normalized = data.map(val => ((val - min) / (max - min)) * 40);

  return (
    <div className="w-full h-10 flex items-end gap-1">
      {normalized.map((height, index) => (
        <div
          key={index}
          className="flex-1"
          style={{
            height: `${height}px`,
            background: `linear-gradient(to top, ${color}40, ${color})`,
            borderRadius: '3px 3px 0 0'
          }}
        />
      ))}
    </div>
  );
});

// Analytics Dashboard Component
const AnalyticsDashboard = memo(({ 
  isExpanded,
  onToggle,
  loading,
  onRefresh 
}: { 
  isExpanded: boolean;
  onToggle: () => void;
  loading: boolean;
  onRefresh: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'genres', label: 'Genres' },
    { id: 'themes', label: 'Themes' },
    { id: 'audience', label: 'Audience' }
  ];

  const topGenres = [
    { name: 'Action', views: '2.4M', growth: 24, color: '#3b82f6' },
    { name: 'Comedy', views: '1.8M', growth: 18, color: '#10b981' },
    { name: 'Drama', views: '1.2M', growth: 12, color: '#8b5cf6' },
    { name: 'Horror', views: '890K', growth: 8, color: '#f59e0b' },
    { name: 'Sci-Fi', views: '750K', growth: 5, color: '#ec4899' }
  ];

  const topVideos = [
    { title: 'The Last Stand', views: '1.2M', likes: '45K', genre: 'Action' },
    { title: 'Comedy Central', views: '980K', likes: '38K', genre: 'Comedy' },
    { title: 'Drama Queen', views: '750K', likes: '32K', genre: 'Drama' },
    { title: 'Horror Night', views: '620K', likes: '28K', genre: 'Horror' }
  ];

  return (
    <div className={`mb-8 transition-all duration-500 ${isExpanded ? 'scale-100 opacity-100' : 'scale-95 opacity-0 max-h-0 overflow-hidden'}`}>
      {/* Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">Track your video performance and audience insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-900/50 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-900/50 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Views"
          value="12.4M"
          change="+24.5"
          icon={Eye}
          color="blue"
        />
        <StatCard
          title="Active Users"
          value="845K"
          change="+18.2"
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Videos"
          value="24,582"
          change="+12.8"
          icon={Film}
          color="purple"
        />
        <StatCard
          title="Avg. Rating"
          value="4.7"
          change="+3.2"
          icon={Star}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Genres Card */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Top Genres Performance</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View details <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            {topGenres.map((genre, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${genre.color}20` }}>
                  <TrendingUp size={16} style={{ color: genre.color }} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium">{genre.name}</span>
                    <span className="text-sm text-gray-300">{genre.views} views</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${genre.growth * 3}%`,
                          background: `linear-gradient(to right, ${genre.color}, ${genre.color}80)`
                        }}
                      />
                    </div>
                    <span className="text-sm" style={{ color: genre.color }}>
                      +{genre.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6">Performance Metrics</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Engagement Rate</span>
                <span className="text-sm font-medium text-green-400">+12.4%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Watch Time</span>
                <span className="text-sm font-medium text-blue-400">+8.7%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Retention</span>
                <span className="text-sm font-medium text-purple-400">+5.2%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Videos Table */}
      <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Top Performing Videos</h3>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <Grid size={18} className="text-gray-400" />
            <List size={18} className="text-gray-400" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50">
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Video Title</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Genre</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Views</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Engagement</th>
                <th className="text-left py-3 px-4 text-sm text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topVideos.map((video, index) => (
                <tr key={index} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                        <PlayCircle size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Clock size={12} />
                          <span>2:45 min</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-900/30 text-blue-400">
                      {video.genre}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-white font-medium">{video.views}</p>
                    <p className="text-xs text-green-400">+12.5% this week</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Heart size={14} className="text-rose-500" />
                        <span className="text-sm text-gray-300">{video.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} className="text-blue-500" />
                        <span className="text-sm text-gray-300">4.2K</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                        <Share2 size={16} className="text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

const Homepage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const nav = useNavigate();
  const [progress, setProgress] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const scriptsData = await getRequest("video/author/scripts", setLoading);
      
      if (scriptsData) {
        setScripts(scriptsData.map((res: any) => res.script));
        setData(scriptsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  return (
    <Layout>
      <LoadingBar color="#3b82f6" progress={progress} height={2} />

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 border-b border-gray-800">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Discover Amazing
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent ml-3">
                  Videos & Stories
                </span>
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-2xl">
                Explore thousands of videos, scripts, and analytics to understand what's trending in the world of cinema.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105"
                >
                  {showAnalytics ? (
                    <>
                      <Activity size={20} />
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
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-3xl border border-gray-800/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center p-8">
                    <Zap size={48} className="text-blue-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Live Analytics</h3>
                    <p className="text-gray-400">Real-time insights at your fingertips</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Analytics Dashboard */}
        <AnalyticsDashboard
          isExpanded={showAnalytics}
          onToggle={() => setShowAnalytics(!showAnalytics)}
          loading={loading}
          onRefresh={handleRefresh}
        />

        {/* Theme Navigation */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Explore by Theme</h2>
            <button
              onClick={() => nav('/themes')}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all themes
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {themes.slice(0, 12).map((theme, index) => {
              const colors = [
                'from-blue-500/20 to-blue-600/10 border-blue-500/30',
                'from-purple-500/20 to-purple-600/10 border-purple-500/30',
                'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
                'from-orange-500/20 to-orange-600/10 border-orange-500/30',
                'from-rose-500/20 to-rose-600/10 border-rose-500/30',
                'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
              ];
              
              const color = colors[index % colors.length];
              
              return (
                <button
                  key={index}
                  onClick={() => nav(`/themes/${theme.toLowerCase()}`)}
                  className={`bg-gradient-to-br ${color} border rounded-xl p-4 hover:scale-105 transition-all duration-300 group`}
                >
                  <div className="text-center">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Film size={20} className="text-white/80" />
                    </div>
                    <span className="text-sm font-medium text-white">{theme}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Categories */}
        <div className="space-y-12">
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
            <div className="ml-6">
              <Gallery 
                title="🔥 Trending Now" 
                category="Action" 
                length={5} 
                isFirst 
                compact
              />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-full"></div>
            <div className="ml-6">
              <Gallery 
                title="😂 Comedy Central" 
                category="Comedy" 
                length={5} 
                compact
              />
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-rose-500 rounded-full"></div>
            <div className="ml-6">
              <Gallery 
                title="🎬 Adventure & Fantasy" 
                category="Adventure" 
                length={5} 
                compact
              />
            </div>
          </div>
        </div>

        {/* Featured Scripts */}
        {scripts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Featured Scripts</h2>
                <p className="text-gray-400">Discover amazing stories from our community</p>
              </div>
              <button
                onClick={() => nav('/scripts')}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <span>View All</span>
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scripts.slice(0, 3).map((script: string, index: number) => (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-gray-900/50 to-gray-900/30 border border-gray-800/50 rounded-2xl overflow-hidden hover:border-gray-700/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer"
                  onClick={() => nav(`/script/${data[index]?._id}`, {
                    state: JSON.stringify(data[index]),
                  })}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 mb-2">
                          {data[index]?.title || 'Untitled Script'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full">
                            {data[index]?.genre || 'Drama'}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">15 min read</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                        <Film size={20} className="text-blue-400" />
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
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium transition-all group-hover:scale-105">
                        Read Full Script
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Heart size={14} />
                          <span>2.4K</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <MessageSquare size={14} />
                          <span>148</span>
                        </div>
                      </div>
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