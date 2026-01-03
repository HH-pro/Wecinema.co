// StatsGrid.tsx - Alternative with conditional rendering

import React from 'react';

interface StatsGridProps {
  stats?: {
    totalEarnings?: number;
    totalRevenue?: number;
    thisMonthRevenue?: number;
    availableBalance?: number;
    totalOrders?: number;
    activeOrders?: number;
    totalListings?: number;
    activeListings?: number;
    totalWithdrawn?: number;
  };
  onTabChange: (tab: string) => void;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats = {}, onTabChange }) => {
  // Early return if stats is null/undefined
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Helper function with null safety
  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return `$${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatCount = (count?: number): string => {
    if (count === undefined || count === null || isNaN(count)) {
      return '0';
    }
    return count.toLocaleString('en-US');
  };

  const statsCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(stats.totalEarnings),
      description: 'All-time earnings',
      icon: '💰',
      color: 'bg-gradient-to-r from-green-500 to-emerald-600',
      action: () => onTabChange('earnings')
    },
    {
      title: 'Available Balance',
      value: formatCurrency(stats.availableBalance),
      description: 'Ready to withdraw',
      icon: '💳',
      color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      action: () => onTabChange('withdraw')
    },
    {
      title: 'This Month',
      value: formatCurrency(stats.thisMonthRevenue),
      description: 'Revenue this month',
      icon: '📈',
      color: 'bg-gradient-to-r from-purple-500 to-pink-600',
      action: () => onTabChange('earnings')
    },
    {
      title: 'Active Orders',
      value: formatCount(stats.activeOrders),
      description: 'In progress',
      icon: '📦',
      color: 'bg-gradient-to-r from-orange-500 to-red-600',
      action: () => onTabChange('orders')
    },
    {
      title: 'Total Listings',
      value: formatCount(stats.totalListings),
      description: `${formatCount(stats.activeListings)} active`,
      icon: '🏠',
      color: 'bg-gradient-to-r from-cyan-500 to-teal-600',
      action: () => onTabChange('listings')
    },
    {
      title: 'Total Withdrawn',
      value: formatCurrency(stats.totalWithdrawn),
      description: 'Total withdrawn funds',
      icon: '💸',
      color: 'bg-gradient-to-r from-gray-600 to-gray-800',
      action: () => onTabChange('withdraw')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statsCards.map((card, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={card.action}
        >
          <div className={`${card.color} p-6 text-white`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90 mb-1">{card.title}</p>
                <h3 className="text-2xl font-bold">{card.value}</h3>
                <p className="text-sm opacity-90 mt-2">{card.description}</p>
              </div>
              <div className="text-3xl">{card.icon}</div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">View details →</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;