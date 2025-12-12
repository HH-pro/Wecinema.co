// src/components/marketplace/seller/QuickActionCard.tsx
import React from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  color: 'yellow' | 'green' | 'purple' | 'blue' | 'amber' | 'red';
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  color,
  actions
}) => {
  const colorConfig = {
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      iconBg: 'from-yellow-500 to-yellow-600',
      text: 'text-yellow-700'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-200',
      iconBg: 'from-green-500 to-green-600',
      text: 'text-green-700'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
      border: 'border-purple-200',
      iconBg: 'from-purple-500 to-purple-600',
      text: 'text-purple-700'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      iconBg: 'from-blue-500 to-blue-600',
      text: 'text-blue-700'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      border: 'border-amber-200',
      iconBg: 'from-amber-500 to-amber-600',
      text: 'text-amber-700'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-red-200',
      iconBg: 'from-red-500 to-red-600',
      text: 'text-red-700'
    }
  };

  const config = colorConfig[color] || colorConfig.yellow;

  return (
    <div className={`${config.bg} rounded-2xl border ${config.border} p-6 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start gap-4 mb-5">
        <div className={`p-3 bg-gradient-to-br ${config.iconBg} rounded-xl shadow-md`}>
          <span className="text-2xl text-white">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">{title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow ${
              action.variant === 'primary' 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                : `bg-white ${config.text} hover:bg-gradient-to-r hover:from-white hover:to-gray-50 border ${config.border}`
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionCard;