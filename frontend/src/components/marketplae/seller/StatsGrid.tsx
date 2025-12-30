// src/components/marketplae/seller/StatsGrid.tsx
import React from 'react';
import { formatCurrency } from '../../../api';

interface StatsGridProps {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeOrders: number;
    pendingOffers: number;
    totalListings: number;
    activeListings: number;
  };
  onTabChange: (tab: string) => void;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, onTabChange }) => {
  const statCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(stats.totalRevenue),
      icon: '💰',
      color: 'from-yellow-50 to-yellow-100',
      iconBg: 'from-yellow-500 to-yellow-600',
      trend: '+12%',
      description: 'All-time completed orders'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: '📦',
      color: 'from-blue-50 to-blue-100',
      iconBg: 'from-blue-500 to-blue-600',
      trend: `${stats.activeOrders} Active`,
      description: 'Orders placed',
      onClick: () => onTabChange('orders')
    },
    {
      title: 'Pending Offers',
      value: stats.pendingOffers,
      icon: '💼',
      color: 'from-amber-50 to-amber-100',
      iconBg: 'from-amber-500 to-amber-600',
      description: 'Offers waiting review',
      onClick: () => onTabChange('offers')
    },
    {
      title: 'Active Listings',
      value: stats.activeListings,
      icon: '🏠',
      color: 'from-purple-50 to-purple-100',
      iconBg: 'from-purple-500 to-purple-600',
      trend: `${stats.totalListings} Total`,
      description: 'Items for sale',
      onClick: () => onTabChange('listings')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          onClick={card.onClick}
          className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${card.onClick ? 'cursor-pointer hover:border-yellow-300' : ''}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 bg-gradient-to-br ${card.iconBg} rounded-xl`}>
              <span className="text-2xl text-white">{card.icon}</span>
            </div>
            {card.trend && (
              <span className={`text-sm font-medium px-2 py-1 rounded-lg ${
                card.title.includes('Earnings') ? 'text-green-600 bg-green-50' :
                card.title.includes('Orders') ? 'text-blue-600 bg-blue-50' :
                'text-purple-600 bg-purple-50'
              }`}>
                {card.trend}
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
          <p className="text-gray-500 text-sm">{card.title}</p>
          {card.description && (
            <p className="text-gray-400 text-xs mt-1">{card.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;