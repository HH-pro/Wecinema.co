// components/marketplace/seller/EarningsOverview.tsx
import React from 'react';
import { formatCurrency } from '../../../utils/formatters';

interface EarningsOverviewProps {
  stripeStatus: any;
  orderStats: any;
  balanceData?: {
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalWithdrawn: number;
    thisMonthRevenue: number;
  };
}

const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  stripeStatus,
  orderStats,
  balanceData
}) => {
  // Calculate from orderStats if balanceData not provided
  const totalRevenue = balanceData?.totalEarnings || 
    (orderStats?.totals?.totalRevenue || 0) * 100; // Convert to cents
  
  const completedRevenue = balanceData?.availableBalance || 
    (orderStats?.totals?.completedRevenue || 0) * 100; // Convert to cents
  
  const pendingRevenue = balanceData?.pendingBalance || 
    (orderStats?.totals?.pendingRevenue || 0) * 100; // Convert to cents

  const stats = [
    {
      title: 'Total Earnings (USD)',
      value: formatCurrency(totalRevenue),
      description: 'All-time income from orders',
      icon: '💰',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Available Balance',
      value: formatCurrency(completedRevenue),
      description: 'Ready to withdraw',
      icon: '💳',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Pending Balance',
      value: formatCurrency(pendingRevenue),
      description: 'Processing earnings',
      icon: '⏳',
      color: 'from-yellow-500 to-amber-500'
    },
    {
      title: 'This Month (USD)',
      value: formatCurrency(balanceData?.thisMonthRevenue || 0),
      description: 'Earnings this month',
      icon: '📅',
      color: 'from-blue-500 to-cyan-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className={`bg-gradient-to-br ${stat.color} rounded-2xl p-6 text-white shadow-lg`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">{stat.title}</p>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              <p className="text-sm opacity-80 mt-1">{stat.description}</p>
            </div>
            <div className="text-3xl">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EarningsOverview;