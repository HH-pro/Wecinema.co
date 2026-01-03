// components/marketplace/seller/StatsGrid.tsx (اگر آپ کا ہو)
import React from 'react';

interface StatsGridProps {
  stats: {
    totalEarnings: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    availableBalance: number;
    totalOrders: number;
    activeOrders: number;
    totalListings: number;
    activeListings: number;
    totalWithdrawn: number;
  };
  onTabChange: (tab: string) => void;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, onTabChange }) => {
  const statsCards = [
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      description: 'All-time earnings',
      icon: '💰',
      color: 'bg-gradient-to-r from-green-500 to-emerald-600',
      action: () => onTabChange('earnings'),
      trend: '+12.5%',
      isCurrency: true
    },
    {
      title: 'Available Balance',
      value: `$${stats.availableBalance.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      description: 'Ready to withdraw',
      icon: '💳',
      color: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      action: () => onTabChange('withdraw'),
      trend: '',
      isCurrency: true
    },
    {
      title: 'This Month',
      value: `$${stats.thisMonthRevenue.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      description: 'Revenue this month',
      icon: '📈',
      color: 'bg-gradient-to-r from-purple-500 to-pink-600',
      action: () => onTabChange('earnings'),
      trend: '+8.2%',
      isCurrency: true
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders.toString(),
      description: 'In progress',
      icon: '📦',
      color: 'bg-gradient-to-r from-orange-500 to-red-600',
      action: () => onTabChange('orders'),
      trend: '+3',
      isCurrency: false
    },
    {
      title: 'Total Listings',
      value: stats.totalListings.toString(),
      description: `${stats.activeListings} active`,
      icon: '🏠',
      color: 'bg-gradient-to-r from-cyan-500 to-teal-600',
      action: () => onTabChange('listings'),
      trend: '',
      isCurrency: false
    },
    {
      title: 'Total Withdrawn',
      value: `$${stats.totalWithdrawn.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      description: 'Total withdrawn funds',
      icon: '💸',
      color: 'bg-gradient-to-r from-gray-600 to-gray-800',
      action: () => onTabChange('withdraw'),
      trend: '',
      isCurrency: true
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
            {card.trend && (
              <div className="mt-4 flex items-center">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {card.trend} from last month
                </span>
              </div>
            )}
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