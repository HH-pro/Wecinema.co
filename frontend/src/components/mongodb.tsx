import React, { useEffect, useState } from "react";
import { 
  DatabaseIcon, 
  ServerStackIcon, 
  ArrowTrendingUpIcon, 
  CircleStackIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon
} from '@heroicons/react/24/outline';
import { motion } from "framer-motion";

interface StorageData {
  usedBytes: number;
  totalBytes: number;
  dataSize: number;
  indexSize: number;
}

interface OperationsData {
  reads: number;
  writes: number;
  queries: number;
  commands: number;
}

interface ConnectionsData {
  current: number;
  available: number;
}

interface ShardData {
  name: string;
  status: string;
  size: number;
  documents: number;
  chunks: number;
}

interface MongoDbData {
  storage: StorageData;
  operations: OperationsData;
  connections: ConnectionsData;
  status: string;
  shards: ShardData[];
}

const MongoDbStorage = () => {
  const [loading, setLoading] = useState(true);
  const [mongoData, setMongoData] = useState<MongoDbData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Simulate API call to fetch MongoDB data
  const fetchData = async () => {
    setLoading(true);
    
    // In a real app, this would be an API call
    // const data = await getRequest("/sentry/mongodb");
    
    // Simulated data with realistic values
    const simulatedData: MongoDbData = {
      storage: {
        usedBytes: 12884901888, // 12 GB
        totalBytes: 64424509440, // 64 GB
        dataSize: 9663676416,   // 9.66 GB
        indexSize: 3221225472    // 3.22 GB
      },
      operations: {
        reads: 142,
        writes: 86,
        queries: 210,
        commands: 54
      },
      connections: {
        current: 42,
        available: 512
      },
      status: "online",
      shards: [
        {
          name: "shard01",
          status: "active",
          size: 5368709120, // 5.37 GB
          documents: 142567,
          chunks: 42
        },
        {
          name: "shard02",
          status: "active",
          size: 4294967296, // 4.29 GB
          documents: 98542,
          chunks: 32
        },
        {
          name: "shard03",
          status: "active",
          size: 3221225472, // 3.22 GB
          documents: 75231,
          chunks: 24
        }
      ]
    };
    
    setMongoData(simulatedData);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to convert bytes to GB
  const bytesToGB = (bytes: number) => {
    if (bytes === 0) return '0.00';
    return (bytes / 1073741824).toFixed(2);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-6 bg-gray-700 rounded-full"></div>
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="ml-auto h-6 bg-gray-700 rounded w-16"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-24 bg-gray-700 rounded-lg"></div>
            <div className="h-24 bg-gray-700 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!mongoData) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg text-center text-gray-400 font-mono">
        <ServerStackIcon className="h-8 w-8 mx-auto mb-3 text-emerald-400" />
        <p className="mb-4">No MongoDB data available</p>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-emerald-700/30 text-emerald-400 rounded-md hover:bg-emerald-700/50 transition-colors text-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { storage, operations, connections, status, shards } = mongoData;
  
  // Calculate storage values
  const usedGB = bytesToGB(storage.usedBytes);
  const totalGB = bytesToGB(storage.totalBytes);
  const dataSizeGB = bytesToGB(storage.dataSize);
  const indexSizeGB = bytesToGB(storage.indexSize);
  const usagePercent = Math.min(
    (storage.usedBytes / storage.totalBytes) * 100,
    100
  ).toFixed(2);
  
  // Calculate connection percentage
  const connectionPercent = Math.min(
    (connections.current / connections.available) * 100,
    100
  ).toFixed(2);

  // Calculate shard percentages
  const totalShardSize = shards.reduce((sum, shard) => sum + shard.size, 0);
  const shardsWithPercentage = shards.map(shard => ({
    ...shard,
    percentage: ((shard.size / totalShardSize) * 100).toFixed(1)
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ServerStackIcon className="w-6 h-6 text-emerald-400" />
        <h2 className="text-xl font-bold text-white font-mono">MongoDB Cluster</h2>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full font-mono ${
          status === 'online' 
            ? 'bg-emerald-900/30 text-emerald-400' 
            : 'bg-rose-900/30 text-rose-400'
        }`}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Storage Summary */}
      <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CircleStackIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-gray-300">Total Storage</span>
          </div>
          <div className="text-emerald-400 font-mono font-bold text-lg">
            {totalGB} <span className="text-sm text-gray-400">GB</span>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <div className="text-center">
            <p className="text-xs text-emerald-300">Used</p>
            <p className="font-mono text-emerald-400">{usedGB} GB</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-cyan-300">Data</p>
            <p className="font-mono text-cyan-400">{dataSizeGB} GB</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-purple-300">Index</p>
            <p className="font-mono text-purple-400">{indexSizeGB} GB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700 group">
          <div className="flex items-center gap-2 mb-4">
            <ServerStackIcon className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white font-mono">STORAGE USAGE</h3>
          </div>
          
          <div className="mb-3">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <motion.div 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ duration: 1 }}
              ></motion.div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400 font-mono">0 GB</span>
              <span className="text-xs text-gray-400 font-mono">{totalGB} GB</span>
            </div>
            <p className="text-right mt-1 text-sm text-gray-300 font-mono">
              {usagePercent}% used
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <p className="text-xs text-emerald-300 font-mono">DATA SIZE</p>
              </div>
              <p className="text-white font-mono text-lg">{dataSizeGB} GB</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <p className="text-xs text-purple-300 font-mono">INDEX SIZE</p>
              </div>
              <p className="text-white font-mono text-lg">{indexSizeGB} GB</p>
            </div>
          </div>
        </div>

        {/* Operations and Connections */}
        <div className="space-y-4">
          {/* Operations */}
          <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700 group">
            <div className="flex items-center gap-2 mb-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white font-mono">OPERATIONS</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                <p className="text-xs text-purple-300 mb-1 font-mono">READS/SEC</p>
                <p className="text-white text-lg font-mono">{operations.reads}</p>
              </div>
              <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                <p className="text-xs text-purple-300 mb-1 font-mono">WRITES/SEC</p>
                <p className="text-white text-lg font-mono">{operations.writes}</p>
              </div>
              <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                <p className="text-xs text-purple-300 mb-1 font-mono">QUERIES</p>
                <p className="text-white text-lg font-mono">{operations.queries}</p>
              </div>
              <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                <p className="text-xs text-purple-300 mb-1 font-mono">COMMANDS</p>
                <p className="text-white text-lg font-mono">{operations.commands}</p>
              </div>
            </div>
          </div>

          {/* Connections */}
          <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700 group">
            <div className="flex items-center gap-2 mb-2">
              <ServerStackIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white font-mono">CONNECTIONS</h3>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
              <motion.div 
                className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2.5 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${connectionPercent}%` }}
                transition={{ duration: 1 }}
              ></motion.div>
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-cyan-300 font-mono">ACTIVE</p>
                <p className="text-cyan-400 font-mono text-lg">{connections.current}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-mono">AVAILABLE</p>
                <p className="text-gray-300 font-mono text-lg">{connections.available}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shard Information */}
      {shards && shards.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <ServerStackIcon className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white font-mono">SHARD DISTRIBUTION</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shardsWithPercentage.map((shard, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gray-900/30 p-3 rounded-lg border border-gray-700"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-amber-300">
                    {shard.name}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    shard.status === 'active' 
                      ? 'bg-emerald-900/30 text-emerald-400' 
                      : 'bg-amber-900/30 text-amber-400'
                  }`}>
                    {shard.status}
                  </span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-amber-300 font-mono">{bytesToGB(shard.size)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distribution:</span>
                    <span className="text-emerald-300 font-mono">{shard.percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Documents:</span>
                    <span className="text-emerald-300 font-mono">{shard.documents.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chunks:</span>
                    <span className="text-cyan-300 font-mono">{shard.chunks}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-6 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ArrowDownCircleIcon className="w-4 h-4 text-emerald-500" />
          <span className="font-mono">Incoming data</span>
        </div>
        <p className="text-xs text-gray-500 font-mono">
          Updated at: {lastUpdated?.toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
};

export default MongoDbStorage;