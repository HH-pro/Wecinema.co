import { useEffect, useState } from "react";
import { getRequest } from "../api";
import { CpuChipIcon, ServerIcon, ArrowsRightLeftIcon,SparklesIcon } from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

export default function SystemStats() {
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRequest("/sentry/system", setLoading);
        setSystemData(data);
      } catch (error) {
        console.error("Failed to fetch system data:", error);
        setSystemData(null);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-700 rounded w-full"></div>
        ))}
      </div>
    </div>
  );

  if (!systemData) return (
    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 text-center text-gray-400 font-mono">
      <ServerIcon className="h-6 w-6 mx-auto mb-2 text-purple-400" />
      No system data available
    </div>
  );

  const { cpuLoad, memory, disk, network } = systemData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 hover:shadow-xl transition-all"
    >
      <div className="flex items-center gap-3 mb-6">
        <CpuChipIcon className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white font-mono">Hostinger VPS Stats</h2>
        <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-mono">
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU and Memory */}
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 group">
            <div className="flex items-center gap-2 mb-2">
              <CpuChipIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white font-mono">CPU LOAD</h3>
              <SparklesIcon className="w-4 h-4 ml-auto text-purple-400 opacity-70 group-hover:opacity-100" />
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2.5 rounded-full" 
                style={{ width: `${cpuLoad}%` }}
              ></div>
            </div>
            <p className="text-right mt-1 text-sm text-gray-300 font-mono">
              {cpuLoad.toFixed(2)}%
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 group">
            <div className="flex items-center gap-2 mb-2">
              <ServerIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white font-mono">MEMORY USAGE</h3>
              <SparklesIcon className="w-4 h-4 ml-auto text-blue-400 opacity-70 group-hover:opacity-100" />
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full" 
                style={{ width: `${memory.usagePercent}%` }}
              ></div>
            </div>
            <p className="text-right mt-1 text-sm text-gray-300 font-mono">
              {(memory.used / 1e9).toFixed(2)} GB / {(memory.total / 1e9).toFixed(2)} GB
            </p>
          </div>
        </div>

        {/* Network */}
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 group">
          <div className="flex items-center gap-2 mb-4">
            <ArrowsRightLeftIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white font-mono">NETWORK TRAFFIC</h3>
            <SparklesIcon className="w-4 h-4 ml-auto text-cyan-400 opacity-70 group-hover:opacity-100" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-cyan-300 mb-1 font-mono">INCOMING</p>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(network.incomingMB / 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-sm text-gray-300 font-mono">
                {network.incomingMB} MB
              </p>
            </div>
            <div>
              <p className="text-xs text-cyan-300 mb-1 font-mono">OUTGOING</p>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full" 
                  style={{ width: `${Math.min(network.outgoingMB / 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-sm text-gray-300 font-mono">
                {network.outgoingMB} MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disk Usage */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowsRightLeftIcon className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white font-mono">DISK USAGE</h3>
        </div>
        <div className="space-y-3">
          {disk.map((d: any, i: number) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-700 p-3 rounded-lg border border-gray-600 group"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-emerald-300 font-mono">{d.mount}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {d.usedGB} GB / {d.totalGB} GB
                </p>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full" 
                  style={{ width: `${d.usage}%` }}
                ></div>
              </div>
              <p className="text-right mt-1 text-xs text-gray-400 font-mono">
                {d.usage}% used
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}