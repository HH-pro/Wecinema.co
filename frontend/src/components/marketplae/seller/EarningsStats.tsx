// components/marketplace/seller/EarningsStats.tsx - UPDATED
import React from 'react';

interface EarningsStatsProps {
  orderStats: any;
  stripeStatus: any;
  monthlyEarnings: any[];
  realTimeMetrics: any;
  formatCurrency: (amount: number) => string;
  userId: string | null;
  earningsApi: any;
}

const EarningsStats: React.FC<EarningsStatsProps> = ({
  orderStats,
  stripeStatus,
  monthlyEarnings,
  realTimeMetrics,
  formatCurrency,
  userId,
  earningsApi
}) => {
  // Calculate top performing months
  const topMonths = [...monthlyEarnings]
    .sort((a, b) => (b.earnings || 0) - (a.earnings || 0))
    .slice(0, 3);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Performance Statistics</h2>
          <p className="text-gray-600 mt-1">
            Detailed insights and analytics for your earnings
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Order Statistics */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Order Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Total Orders</p>
                  <p className="text-sm text-gray-500">All-time completed orders</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{orderStats?.totalOrders || 0}</p>
                <p className="text-sm text-green-600">+12% from last month</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Completion Rate</p>
                  <p className="text-sm text-gray-500">Successful order ratio</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{realTimeMetrics.completionRate.toFixed(1)}%</p>
                <p className="text-sm text-green-600">+5% improvement</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                  <span className="text-lg">⏳</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pending Orders</p>
                  <p className="text-sm text-gray-500">Active/processing orders</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{realTimeMetrics.pendingOrders}</p>
                <p className="text-sm text-blue-600">In progress</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Average Order Value</p>
                  <p className="text-sm text-gray-500">Revenue per order</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(realTimeMetrics.avgOrderValue)}</p>
                <p className={`text-sm ${realTimeMetrics.monthOverMonthGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {realTimeMetrics.monthOverMonthGrowth > 0 ? '+' : ''}{realTimeMetrics.monthOverMonthGrowth.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Top Months & Insights */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Top Performing Months</h3>
          
          {topMonths.length > 0 ? (
            <div className="space-y-4">
              {topMonths.map((month, index) => {
                const monthName = monthNames[(month._id?.month || 1) - 1];
                const year = month._id?.year?.toString().slice(-2) || '23';
                const earnings = month.earnings || 0;
                const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings || 0));
                const percentage = maxEarnings > 0 ? (earnings / maxEarnings) * 100 : 0;
                
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          <span className="text-lg">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{monthName} '{year}</p>
                          <p className="text-sm text-gray-500">#{index + 1} Best Month</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(earnings)}</p>
                        <p className="text-sm text-gray-500">{percentage.toFixed(0)}% of best</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-500' :
                            'bg-orange-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <p>No monthly data available yet</p>
              <p className="text-sm mt-1">Complete more orders to see statistics</p>
            </div>
          )}

          {/* Insights Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-2">💰 Earnings Insights</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Your best month contributed {topMonths[0] ? `${Math.round((topMonths[0].earnings / realTimeMetrics.lifetimeRevenue) * 100)}%` : '0%'} of total earnings
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Current month is {realTimeMetrics.monthOverMonthGrowth > 0 ? 'ahead' : 'behind'} compared to last month
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                Average order completion takes 2-3 days
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                User ID: {userId?.slice(-8)}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsStats;