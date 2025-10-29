import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'gray';
  trend?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'blue',
  trend,
  onClick 
}) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:border-blue-300 transform hover:-translate-y-1' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-xs font-medium mt-1 ${
            trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
        color === 'green' ? 'bg-green-50 border-green-200' :
        color === 'blue' ? 'bg-blue-50 border-blue-200' :
        color === 'purple' ? 'bg-purple-50 border-purple-200' :
        color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        color === 'orange' ? 'bg-orange-50 border-orange-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;