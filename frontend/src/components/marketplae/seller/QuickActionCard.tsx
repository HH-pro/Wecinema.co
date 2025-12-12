// src/components/marketplace/seller/QuickActionCard.tsx
import React from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  actions: Array<{
    label: string;
    onClick: () => void;
  }>;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  color,
  actions
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses] || 'bg-gray-50'} rounded-2xl border p-6`}>
      <div className="flex items-start mb-4">
        <div className="text-2xl mr-3">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionCard;