// components/marketplace/seller/EarningsStats.tsx
import React from 'react';
import { formatCurrency } from '../../../utils/marketplace';

interface EarningsStatsProps {
  orderStats: any;
  stripeStatus: any;
  monthlyEarnings?: any[];
}

const EarningsStats: React.FC<EarningsStatsProps> = ({
  orderStats,
  stripeStatus,
  monthlyEarnings = []
}) => {
  // Format monthly earnings for chart
  const chartData = monthlyEarnings.slice(0, 6).reverse().map(item => ({
    month: `${item._id?.month}/${item._id?.year?.toString().slice(2)}`,
    earnings: item.earnings || 0
  }));

  // Get status breakdown from orderStats
  const statusBreakdown = orderStats?.statsByStatus?.map((stat: any) => ({
    status: stat._id,
    count: stat.count,
    amount: (stat.totalAmount || 0) * 100 // Convert to cents
  })) || [];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Earnings Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Earnings Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Monthly Earnings (USD)</h3>
          <div className="space-y-4">
            {chartData.length > 0 ? (
              chartData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1">
                    <div className="h-8 bg-gradient-to-r from-blue-100 to-blue-300 rounded-lg flex items-center px-3">
                      <div 
                        className="h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded"
                        style={{ 
                          width: `${Math.min(100, (item.earnings / Math.max(...chartData.map(d => d.earnings))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.earnings)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📊</div>
                <p>No earnings data for the last 6 months</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {statusBreakdown.length > 0 ? (
              statusBreakdown.map((stat: any) => (
                <div key={stat.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      stat.status === 'completed' ? 'bg-green-500' :
                      stat.status === 'pending' ? 'bg-yellow-500' :
                      stat.status === 'in_progress' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {stat.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {stat.count} orders
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(stat.amount)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-3xl mb-2">📦</div>
                <p>No orders yet</p>
              </div>
            )}
          </div>
          
          {/* Summary */}
          {statusBreakdown.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-lg font-bold text-gray-900">
                    {orderStats?.totals?.totalOrders || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Value (USD)</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency((orderStats?.totals?.totalRevenue || 0) * 100)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningsStats;