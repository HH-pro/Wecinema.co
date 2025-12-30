import React from 'react';

interface EarningsStatsProps {
  orderStats: any;
  stripeStatus: any;
}

const EarningsStats: React.FC<EarningsStatsProps> = ({ orderStats, stripeStatus }) => {
  const formatToRupees = (amountInCents: number) => {
    const amountInRupees = amountInCents / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
            <span className="text-blue-500">🔄</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed Orders</p>
            <p className="text-lg font-semibold text-gray-900">{orderStats.completed || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mr-3">
            <span className="text-green-500">📊</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Orders</p>
            <p className="text-lg font-semibold text-gray-900">{orderStats.activeOrders || 0}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mr-3">
            <span className="text-purple-500">💸</span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending Revenue</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatToRupees(stripeStatus?.pendingBalance || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsStats;