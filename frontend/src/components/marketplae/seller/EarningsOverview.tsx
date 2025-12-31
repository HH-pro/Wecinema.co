import React from 'react';

interface LiveEarnings {
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
}

interface EarningsData {
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  thisMonthRevenue: number;
  totalRevenue: number;
}

interface EarningsStatsProps {
  orderStats: any;
  stripeStatus: any;
  earningsData: EarningsData;
  liveEarnings: LiveEarnings;
}

const EarningsStats: React.FC<EarningsStatsProps> = ({
  orderStats,
  stripeStatus,
  earningsData,
  liveEarnings
}) => {
  // Format currency helper
  const formatCurrency = (amount: number) => {
    const amountInRupees = amount / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate percentages
  const completedPercentage = liveEarnings.totalEarnings > 0 
    ? Math.round((liveEarnings.completedEarnings / liveEarnings.totalEarnings) * 100)
    : 0;
  
  const pendingPercentage = liveEarnings.totalEarnings > 0
    ? Math.round((liveEarnings.pendingEarnings / liveEarnings.totalEarnings) * 100)
    : 0;

  const withdrawnPercentage = liveEarnings.totalEarnings > 0
    ? Math.round(((earningsData.totalWithdrawn || 0) / liveEarnings.totalEarnings) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Earnings Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Earnings Distribution */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Distribution</h3>
          <div className="space-y-6">
            {/* Available Earnings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Available Now</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(liveEarnings.completedEarnings)}
                  </p>
                  <p className="text-xs text-gray-500">{completedPercentage}% of total</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completedPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Pending Earnings */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Pending</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(liveEarnings.pendingEarnings)}
                  </p>
                  <p className="text-xs text-gray-500">{pendingPercentage}% of total</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${pendingPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Withdrawn */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700">Withdrawn</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(earningsData.totalWithdrawn || 0)}
                  </p>
                  <p className="text-xs text-gray-500">{withdrawnPercentage}% of total</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${withdrawnPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Total Earnings */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
                  <span className="text-sm font-bold text-gray-900">Total Earnings</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(liveEarnings.totalEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Order Stats */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{orderStats.totalOrders || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Total Orders</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{orderStats.completed || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Completed</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{orderStats.activeOrders || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Active Orders</p>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{orderStats.thisMonthOrders || 0}</p>
                <p className="text-xs text-gray-600 mt-1">This Month</p>
              </div>
            </div>
          </div>

          {/* Revenue Stats */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Revenue</p>
                <p className="text-xs text-gray-500">From all completed orders</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(earningsData.totalRevenue * 100)}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">This Month</p>
                <p className="text-xs text-gray-500">Current month earnings</p>
              </div>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(earningsData.thisMonthRevenue * 100)}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Average Order Value</p>
                <p className="text-xs text-gray-500">Across all orders</p>
              </div>
              <p className="text-lg font-bold text-yellow-600">
                {orderStats.totalOrders > 0
                  ? formatCurrency(liveEarnings.totalEarnings / orderStats.totalOrders)
                  : formatCurrency(0)
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Status */}
      {stripeStatus?.connected && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Withdrawal Status</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stripeStatus.payoutsEnabled 
                  ? 'Payouts are enabled. You can withdraw funds to your bank account.'
                  : 'Payouts are not yet enabled. Please complete your Stripe setup.'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stripeStatus.payoutsEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`text-sm font-medium ${stripeStatus.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                {stripeStatus.payoutsEnabled ? 'Active' : 'Setup Required'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsStats;