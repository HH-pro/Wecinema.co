import React, { useEffect, useState } from "react";
import { getRequest } from "../../api";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PerformanceMetrics from '../../components/PerformanceMetrics';
import WebVitalsStats from '../../components/WebVitalsStats';
import { UsersIcon, FilmIcon, DocumentTextIcon, ExclamationTriangleIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from "framer-motion";
import SystemStats from '../../components/vps';
import MongoDbStorage from '../../components/mongodb';

const Dashboard: React.FC = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalScripts, setTotalScripts] = useState(0);
  const [userStats, setUserStats] = useState([]);
  const [videoStats, setVideoStats] = useState([]);
  const [scriptStats, setScriptStats] = useState([]);
  const [errorStats, setErrorStats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [usersData, videosData, scriptsData, errorsData] = await Promise.all([
          getRequest("/user", setLoading),
          getRequest("/video/all", setLoading),
          getRequest("/video/author/scripts", setLoading),
          getRequest("/sentry/errors", setLoading)
        ]);

        if (usersData) {
          setTotalUsers(usersData.length);
          setUserStats(generateStats(usersData, "users"));
        }
        if (videosData) {
          setTotalVideos(videosData.length);
          setVideoStats(generateStats(videosData, "videos"));
        }
        if (scriptsData) {
          setTotalScripts(scriptsData.length);
          setScriptStats(generateStats(scriptsData, "scripts"));
        }
        if (errorsData) setErrorStats(errorsData);

      } catch (err) {
        setError("Failed to fetch dashboard data. Please try again later.");
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    const generateStats = (data: any[], yKey: string) => 
      data.map((_, index) => ({
        day: index + 1,
        [yKey]: index + 1,
        size: Math.random() * 30 + 10
      }));

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 animate-pulse">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-t-xl"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-xl border border-red-500/30 shadow-lg">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
          <span className="text-red-400 font-semibold">{error}</span>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-4 sm:p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header with AI theme */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 font-mono flex items-center">
              <CpuChipIcon className="h-8 w-8 text-purple-400 mr-3" />
              AI Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-400 font-mono">
              Real-time insights powered by machine learning
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 bg-gray-800/50 border border-gray-700 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-300 font-mono">SYSTEM ACTIVE</span>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { title: "Total Users", value: totalUsers, icon: UsersIcon, color: "purple" },
            { title: "Total Videos", value: totalVideos, icon: FilmIcon, color: "blue" },
            { title: "Total Scripts", value: totalScripts, icon: DocumentTextIcon, color: "cyan" },
            { title: "Total Errors", value: errorStats.length, icon: ExclamationTriangleIcon, color: "rose" },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard 
                title={stat.title} 
                value={stat.value}
                icon={<stat.icon className={`h-6 w-6 text-${stat.color}-400`} />}
                accentColor={`bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-600`}
              />
            </motion.div>
          ))}
        </div>

        {/* Growth Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <CompactChartCard 
              title="User Growth" 
              data={userStats} 
              color="#a855f7" 
              yKey="users" 
              icon={<SparklesIcon className="h-4 w-4 text-purple-400" />}
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <CompactChartCard 
              title="Video Uploads" 
              data={videoStats} 
              color="#3b82f6" 
              yKey="videos" 
              icon={<SparklesIcon className="h-4 w-4 text-blue-400" />}
            />
          </motion.div>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <CompactChartCard 
              title="Script Uploads" 
              data={scriptStats} 
              color="#06b6d4" 
              yKey="scripts" 
              icon={<SparklesIcon className="h-4 w-4 text-cyan-400" />}
            />
          </motion.div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">

        <SystemStats />
        <MongoDbStorage />

        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 mb-6">
          <motion.div
            className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 hover:shadow-xl transition-all"
            whileHover={{ y: -5 }}
          >
            <h3 className="text-md font-semibold text-white mb-3 flex items-center">
              <span className="mr-2 bg-gradient-to-r from-purple-500 to-blue-500 p-1 rounded">
                <CpuChipIcon className="h-4 w-4" />
              </span>
              AI Performance Metrics
            </h3>
            <PerformanceMetrics compact />
          </motion.div>
          <motion.div
            className="bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-700 hover:shadow-xl transition-all"
            whileHover={{ y: -5 }}
          >
            <h3 className="text-md font-semibold text-white mb-3 flex items-center">
              <span className="mr-2 bg-gradient-to-r from-blue-500 to-cyan-500 p-1 rounded">
                <SparklesIcon className="h-4 w-4" />
              </span>
              Core Web Vitals
            </h3>
            <WebVitalsStats compact />
          </motion.div>
        </div>

        {/* Error Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-800 shadow-lg rounded-xl border border-gray-700 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-rose-400 mr-2" />
              AI Error Monitoring
              <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono">
                {errorStats.length} anomalies detected
              </span>
            </h2>
          </div>
          {errorStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Count</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Last Seen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {errorStats.map((error, index) => {
                    const isCritical = [500, 404].includes(error.statusCode);
                    return (
                      <motion.tr
                        key={error.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate font-mono">{error.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 text-right font-mono">{error.count}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 text-right font-mono">
                          {new Date(error.lastSeen).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {isCritical && (
                              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse mr-2"></div>
                            )}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium font-mono
                              ${isCritical ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-400'}`}>
                              {error.statusCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm capitalize">
                          <span className={`font-mono ${isCritical ? 'text-rose-400 font-medium' : 'text-amber-400'}`}>
                            {error.status}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 font-mono">
              <SparklesIcon className="h-5 w-5 mx-auto text-blue-400 mb-2" />
              No anomalies detected - system nominal
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: number; 
  icon: React.ReactNode;
  accentColor: string;
}> = ({ title, value, icon, accentColor }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 relative overflow-hidden group"
  >
    <div className={`h-2 ${accentColor} rounded-t-xl`}></div>
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-400 mb-1 font-mono">{title}</h2>
          <p className="text-3xl font-semibold text-white">{value}</p>
        </div>
        <motion.div 
          className="bg-gray-700 p-3 rounded-lg group-hover:bg-purple-900/30 transition-all"
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 2 }}
        >
          {icon}
        </motion.div>
      </div>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute bottom-0 right-0 opacity-10">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0C22.4 0 0 22.4 0 50C0 77.6 22.4 100 50 100C77.6 100 100 77.6 100 50C100 22.4 77.6 0 50 0ZM50 90C27.9 90 10 72.1 10 50C10 27.9 27.9 10 50 10C72.1 10 90 27.9 90 50C90 72.1 72.1 90 50 90Z" fill="white"/>
          <path d="M50 20C33.4 20 20 33.4 20 50C20 66.6 33.4 80 50 80C66.6 80 80 66.6 80 50C80 33.4 66.6 20 50 20ZM50 70C39.5 70 30 60.5 30 50C30 39.5 39.5 30 50 30C60.5 30 70 39.5 70 50C70 60.5 60.5 70 50 70Z" fill="white"/>
          <path d="M50 40C44.5 40 40 44.5 40 50C40 55.5 44.5 60 50 60C55.5 60 60 55.5 60 50C60 44.5 55.5 40 50 40Z" fill="white"/>
        </svg>
      </div>
    </div>
  </motion.div>
);

const CompactChartCard: React.FC<{ 
  title: string; 
  data: any[]; 
  color: string; 
  yKey: string;
  icon?: React.ReactNode;
}> = ({ title, data, color, yKey, icon }) => (
  <div className="bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-700 hover:shadow-xl transition-all group">
    <h2 className="text-sm font-semibold text-white mb-2 flex items-center">
      <div 
        className="w-2 h-2 rounded-full mr-2 animate-pulse"
        style={{ backgroundColor: color }}
      />
      {title}
      {icon && <span className="ml-auto opacity-70 group-hover:opacity-100">{icon}</span>}
    </h2>
    <ResponsiveContainer width="100%" height={160}>
      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          type="number"
          dataKey="day"
          name="Day"
          stroke={color}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
        />
        <YAxis
          type="number"
          dataKey={yKey}
          name={title}
          stroke={color}
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3", stroke: color }}
          contentStyle={{
            background: "#1F2937",
            border: `1px solid ${color}`,
            borderRadius: "6px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
            fontSize: "12px",
            color: "white"
          }}
          itemStyle={{ color }}
          labelStyle={{ color: 'white', fontWeight: 'bold' }}
        />
        <Scatter
          name={title}
          data={data}
          fill={color}
          shape="circle"
          stroke={color}
          strokeWidth={1}
          animationEasing="ease-in-out"
          animationDuration={800}
        />
      </ScatterChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity" 
      style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)` }} />
  </div>
);

export default Dashboard;