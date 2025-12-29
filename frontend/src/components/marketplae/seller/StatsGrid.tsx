// src/components/marketplae/seller/StatsGrid.tsx
import React from 'react';
import { formatCurrency, formatCurrencyAmount, formatCurrencyShort } from '../../../api/marketplaceApi';

interface StatsGridProps {
  stats: {
    totalRevenue: number; // Already in dollars from order stats
    totalOrders: number;
    activeOrders: number;
    pendingOffers: number;
    totalListings: number;
    activeListings: number;
    thisMonthRevenue: number; // Added for live earnings
    thisMonthOrders: number;
    availableBalance?: number; // In cents
    totalWithdrawn?: number; // In cents
  };
  onTabChange: (tab: string) => void;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, onTabChange }) => {
  // Calculate derived stats
  const availableBalanceInRupees = stats.availableBalance ? stats.availableBalance / 100 : 0;
  const totalWithdrawnInRupees = stats.totalWithdrawn ? stats.totalWithdrawn / 100 : 0;
  const totalRevenueInRupees = stats.totalRevenue;
  const thisMonthRevenueInRupees = stats.thisMonthRevenue;
  
  // Calculate conversion rates (these would come from API in production)
  const usdToInrRate = 83.5; // Example conversion rate
  
  const statCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(totalRevenueInRupees * 100), // Convert to cents
      icon: '💰',
      color: 'from-yellow-50 to-yellow-100',
      iconBg: 'from-yellow-500 to-yellow-600',
      borderColor: 'border-yellow-200',
      trend: `${stats.thisMonthOrders} this month`,
      description: `All-time completed orders (${stats.totalOrders} total)`,
      onClick: () => onTabChange('withdraw'),
      showTrend: true,
      secondaryValue: `₹${(totalRevenueInRupees * usdToInrRate).toLocaleString('en-IN')}`,
      secondaryLabel: 'INR Value'
    },
    {
      title: 'Available Balance',
      value: formatCurrency(stats.availableBalance || 0),
      icon: '💵',
      color: 'from-green-50 to-green-100',
      iconBg: 'from-green-500 to-green-600',
      borderColor: 'border-green-200',
      trend: 'Ready to withdraw',
      description: 'From completed orders',
      onClick: () => onTabChange('withdraw'),
      showTrend: true,
      showAction: stats.availableBalance && stats.availableBalance > 0,
      actionLabel: 'Withdraw',
      secondaryValue: `${formatCurrencyAmount(stats.availableBalance || 0)}`,
      secondaryLabel: 'Amount'
    },
    {
      title: 'Total Withdrawn',
      value: formatCurrency(stats.totalWithdrawn || 0),
      icon: '🏦',
      color: 'from-purple-50 to-purple-100',
      iconBg: 'from-purple-500 to-purple-600',
      borderColor: 'border-purple-200',
      trend: 'Transferred to bank',
      description: 'Successfully withdrawn',
      onClick: () => onTabChange('withdraw'),
      showTrend: true,
      secondaryValue: `${formatCurrencyShort(stats.totalWithdrawn || 0)}`,
      secondaryLabel: 'Short'
    },
    {
      title: 'This Month',
      value: formatCurrency(thisMonthRevenueInRupees * 100),
      icon: '📈',
      color: 'from-blue-50 to-blue-100',
      iconBg: 'from-blue-500 to-blue-600',
      borderColor: 'border-blue-200',
      trend: `${stats.thisMonthOrders} orders`,
      description: 'Current month earnings',
      onClick: () => onTabChange('orders'),
      showTrend: true,
      secondaryValue: `₹${(thisMonthRevenueInRupees * usdToInrRate).toLocaleString('en-IN')}`,
      secondaryLabel: 'INR Value'
    }
  ];

  const bottomStatCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: '📦',
      color: 'from-indigo-50 to-indigo-100',
      iconBg: 'from-indigo-500 to-indigo-600',
      borderColor: 'border-indigo-200',
      trend: `${stats.activeOrders} Active`,
      description: 'All orders placed',
      onClick: () => onTabChange('orders'),
      showTrend: true
    },
    {
      title: 'Pending Offers',
      value: stats.pendingOffers,
      icon: '💼',
      color: 'from-amber-50 to-amber-100',
      iconBg: 'from-amber-500 to-amber-600',
      borderColor: 'border-amber-200',
      description: 'Offers waiting review',
      onClick: () => onTabChange('offers'),
      showTrend: false,
      badgeColor: stats.pendingOffers > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
    },
    {
      title: 'Active Listings',
      value: stats.activeListings,
      icon: '🏠',
      color: 'from-pink-50 to-pink-100',
      iconBg: 'from-pink-500 to-pink-600',
      borderColor: 'border-pink-200',
      trend: `${stats.totalListings} Total`,
      description: 'Items available for sale',
      onClick: () => onTabChange('listings'),
      showTrend: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Earnings Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            onClick={card.onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border ${card.borderColor} hover:shadow-md transition-all duration-200 ${card.onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-yellow-300' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-gradient-to-br ${card.iconBg} rounded-xl shadow-sm`}>
                <span className="text-2xl text-white">{card.icon}</span>
              </div>
              {card.showTrend && card.trend && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  card.title.includes('Earnings') ? 'text-yellow-600 bg-yellow-50' :
                  card.title.includes('Balance') ? 'text-green-600 bg-green-50' :
                  card.title.includes('Withdrawn') ? 'text-purple-600 bg-purple-50' :
                  card.title.includes('Month') ? 'text-blue-600 bg-blue-50' :
                  'text-gray-600 bg-gray-50'
                }`}>
                  {card.trend}
                </span>
              )}
              {!card.showTrend && card.badgeColor && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${card.badgeColor}`}>
                  {card.value > 0 ? 'Action Needed' : 'All Clear'}
                </span>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
            <p className="text-gray-500 text-sm font-medium">{card.title}</p>
            
            {card.description && (
              <p className="text-gray-400 text-xs mt-1">{card.description}</p>
            )}
            
            {card.secondaryValue && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{card.secondaryLabel}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {card.secondaryValue}
                  </span>
                </div>
              </div>
            )}
            
            {card.showAction && card.actionLabel && (
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabChange('withdraw');
                  }}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-sm font-medium rounded-lg transition duration-200 shadow-sm hover:shadow"
                >
                  {card.actionLabel}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Business Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bottomStatCards.map((card, index) => (
          <div
            key={index}
            onClick={card.onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border ${card.borderColor} hover:shadow-md transition-all duration-200 ${card.onClick ? 'cursor-pointer hover:scale-[1.02] hover:border-yellow-300' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-gradient-to-br ${card.iconBg} rounded-xl shadow-sm`}>
                <span className="text-2xl text-white">{card.icon}</span>
              </div>
              {card.showTrend && card.trend && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  card.title.includes('Orders') ? 'text-indigo-600 bg-indigo-50' :
                  card.title.includes('Listings') ? 'text-pink-600 bg-pink-50' :
                  'text-gray-600 bg-gray-50'
                }`}>
                  {card.trend}
                </span>
              )}
              {!card.showTrend && card.badgeColor && (
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${card.badgeColor}`}>
                  {stats.pendingOffers > 0 ? `${stats.pendingOffers} pending` : 'No offers'}
                </span>
              )}
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
            <p className="text-gray-500 text-sm font-medium">{card.title}</p>
            
            {card.description && (
              <p className="text-gray-400 text-xs mt-1">{card.description}</p>
            )}
            
            {card.onClick && (
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabChange(card.title.includes('Orders') ? 'orders' : 
                               card.title.includes('Offers') ? 'offers' : 
                               card.title.includes('Listings') ? 'listings' : 'overview');
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition duration-200"
                >
                  View Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Performance Summary</h3>
            <p className="text-sm text-gray-600">
              Based on your recent activity and completed orders
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{formatCurrencyShort(totalRevenueInRupees * 100)}</div>
              <div className="text-xs text-gray-500">Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{formatCurrencyShort(stats.availableBalance || 0)}</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{stats.thisMonthOrders}</div>
              <div className="text-xs text-gray-500">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{formatCurrencyShort(stats.totalWithdrawn || 0)}</div>
              <div className="text-xs text-gray-500">Withdrawn</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsGrid;