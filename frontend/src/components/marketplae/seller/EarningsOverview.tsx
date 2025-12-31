// components/marketplace/seller/EarningsOverview.tsx - UPDATED
import React from 'react';

interface EarningsOverviewProps {
  stripeStatus: any;
  orderStats: any;
  balanceData: any;
  thisMonthRevenue: number;
  realTimeMetrics: any;
  formatCurrency: (amount: number) => string;
  userId: string | null;
  earningsApi: any;
}

const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  stripeStatus,
  orderStats,
  balanceData,
  thisMonthRevenue,
  realTimeMetrics,
  formatCurrency,
  userId,
  earningsApi
}) => {
  // Calculate metrics
  const metrics = [
    {
      title: 'Total Orders',
      value: orderStats?.totalOrders || 0,
      change: '+12%',
      trend: 'up',
      icon: '📦',
      color: 'blue'
    },
    {
      title: 'Completed Orders',
      value: orderStats?.completed || 0,
      change: '+8%',
      trend: 'up',
      icon: '✅',
      color: 'green'
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(realTimeMetrics.avgOrderValue),
      change: realTimeMetrics.monthOverMonthGrowth > 0 ? `+${realTimeMetrics.monthOverMonthGrowth.toFixed(1)}%` : `${realTimeMetrics.monthOverMonthGrowth.toFixed(1)}%`,
      trend: realTimeMetrics.monthOverMonthGrowth > 0 ? 'up' : 'down',
      icon: '💰',
      color: 'yellow'
    },
    {
      title: 'Completion Rate',
      value: `${realTimeMetrics.completionRate.toFixed(1)}%`,
      change: '+5%',
      trend: 'up',
      icon: '📊',
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Earnings Overview</h2>
          <p className="text-gray-600 mt-1">
            Performance metrics and insights for your sales
          </p>
        </div>
        <div className="text-sm text-gray-500">
          User: {userId?.slice(-6)}...
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${getColorClasses(metric.color)}`}>
                <span className="text-xl">{metric.icon}</span>
              </div>
              <div className={`text-sm font-medium px-2 py-1 rounded ${
                metric.trend === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                {metric.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            <p className="text-sm text-gray-500 mt-1">{metric.title}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-5 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Revenue Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Lifetime Revenue</span>
                <span className="font-medium">{formatCurrency(realTimeMetrics.lifetimeRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Withdrawn</span>
                <span className="font-medium text-green-600">{formatCurrency(realTimeMetrics.totalWithdrawn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net Earnings</span>
                <span className="font-bold text-blue-600">{formatCurrency(realTimeMetrics.netEarnings)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">This Month</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Month Revenue</span>
                <span className="font-medium">{formatCurrency(thisMonthRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Growth Rate</span>
                <span className={`font-medium ${
                  realTimeMetrics.monthOverMonthGrowth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {realTimeMetrics.monthOverMonthGrowth > 0 ? '+' : ''}{realTimeMetrics.monthOverMonthGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Orders</span>
                <span className="font-medium">{realTimeMetrics.pendingOrders}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-5 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Account Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Stripe Status</span>
                <span className={`font-medium ${
                  stripeStatus?.chargesEnabled ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {stripeStatus?.chargesEnabled ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payouts Enabled</span>
                <span className={`font-medium ${
                  stripeStatus?.payoutsEnabled ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stripeStatus?.payoutsEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type</span>
                <span className="font-medium">
                  {stripeStatus?.accountType || 'Standard'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsOverview;