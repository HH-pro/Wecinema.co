import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getRequest } from "../api";
import { ClockIcon, CloudArrowDownIcon, DocumentTextIcon, ChartBarIcon, CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

interface PerformanceData {
  timestamp: string;
  duration_p75: number;
  request_count: number;
  lcp_p75: number;
  fid_p75: number;
  cls_p75: number;
}

interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
}

interface StorageMetrics {
  total: number;
  request_size: number;
  response_size: number;
}

interface PageLoadTime {
  page: string;
  load_time: number;
}

interface PerformanceResponse {
  performance: PerformanceData[];
  page_load_times: PageLoadTime[];
  storage: StorageMetrics;
  web_vitals: WebVitals;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700">
        <p className="text-sm text-gray-300 font-mono">{formatTime(label)}</p>
        <p className="text-sm mt-1 font-mono">
          <span className="text-white font-semibold">{payload[0].value}</span>
          <span className="text-gray-400 ml-1">{payload[0].unit || ''}</span>
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceMetrics = ({ compact = false }: { compact?: boolean }) => {
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getRequest<PerformanceResponse>(`/sentry/performance?period=${timeRange}`);
      
      if (!response) {
        throw new Error("No performance data returned");
      }

      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch performance data");
      console.error("Performance data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  if (loading) return (
    <div className="text-center py-6 bg-gray-800 rounded-xl animate-pulse">
      <p className="text-gray-400 font-mono">Loading AI performance metrics...</p>
    </div>
  );

  if (error) return (
    <div className="text-red-400 bg-gray-800 p-4 rounded-xl border border-red-500/30">
      <p className="text-center font-mono">{error}</p>
    </div>
  );

  if (!data) return (
    <div className="text-gray-400 bg-gray-800 p-4 rounded-xl border border-gray-700">
      <p className="text-center font-mono">No performance data available</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 ${compact ? '' : 'hover:shadow-xl transition-all'}`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <CpuChipIcon className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white font-mono">AI Performance Metrics</h2>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-300 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all font-mono"
        >
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Transaction Duration */}
        <motion.div 
          className="bg-gray-700 p-4 rounded-xl border border-gray-600 group"
          whileHover={!compact ? { y: -3 } : {}}
        >
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-purple-400" />
            <h4 className="text-base font-semibold text-white font-mono">Transaction Duration (p75)</h4>
            <SparklesIcon className="w-4 h-4 ml-auto text-purple-400 opacity-70 group-hover:opacity-100" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4B5563" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  minTickGap={20}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                />
                <YAxis 
                  unit="ms" 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: '#374151' }}
                />
                <Bar 
                  dataKey="duration_p75" 
                  fill="#8B5CF6" 
                  name="Duration (ms)"
                  radius={[4, 4, 0, 0]}
                  animationDuration={300}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Request Volume */}
        <motion.div 
          className="bg-gray-700 p-4 rounded-xl border border-gray-600 group"
          whileHover={!compact ? { y: -3 } : {}}
        >
          <div className="flex items-center gap-2 mb-4">
            <CloudArrowDownIcon className="w-5 h-5 text-blue-400" />
            <h4 className="text-base font-semibold text-white font-mono">Request Volume</h4>
            <SparklesIcon className="w-4 h-4 ml-auto text-blue-400 opacity-70 group-hover:opacity-100" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4B5563" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  minTickGap={20}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: '#374151' }}
                />
                <Bar 
                  dataKey="request_count" 
                  fill="#60A5FA" 
                  name="Requests"
                  radius={[4, 4, 0, 0]}
                  animationDuration={300}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div 
          className="p-4 bg-gray-700 rounded-xl border border-gray-600 group"
          whileHover={!compact ? { scale: 1.02 } : {}}
        >
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-sm text-purple-300 mb-1 font-mono">Avg. Largest Contentful Paint</p>
              <p className="text-2xl font-bold text-white font-mono">
                {Math.round(data.web_vitals.lcp)}ms
              </p>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity" 
            style={{ background: `radial-gradient(circle at center, #8B5CF6 0%, transparent 70%)` }} />
        </motion.div>
        
        <motion.div 
          className="p-4 bg-gray-700 rounded-xl border border-gray-600 group"
          whileHover={!compact ? { scale: 1.02 } : {}}
        >
          <div className="flex items-center gap-3">
            <CloudArrowDownIcon className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm text-blue-300 mb-1 font-mono">Total Data Transfer</p>
              <p className="text-2xl font-bold text-white font-mono">
                {(data.storage.total / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity" 
            style={{ background: `radial-gradient(circle at center, #60A5FA 0%, transparent 70%)` }} />
        </motion.div>

        <motion.div 
          className="p-4 bg-gray-700 rounded-xl border border-gray-600 group"
          whileHover={!compact ? { scale: 1.02 } : {}}
        >
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-sm text-cyan-300 mb-1 font-mono">Avg Page Load Time</p>
              <p className="text-2xl font-bold text-white font-mono">
                {Math.round(
                  data.page_load_times.reduce((acc, curr) => acc + curr.load_time, 0) /
                  data.page_load_times.length
                )}ms
              </p>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity" 
            style={{ background: `radial-gradient(circle at center, #06B6D4 0%, transparent 70%)` }} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PerformanceMetrics;