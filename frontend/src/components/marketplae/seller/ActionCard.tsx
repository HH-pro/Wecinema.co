// src/components/marketplae/seller/ActionCard.tsx
import React from 'react';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  bgGradient: string;
  borderColor: string;
  actions: Action[];
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon,
  iconBg,
  bgGradient,
  borderColor,
  actions
}) => {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} rounded-2xl p-6 border ${borderColor}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 bg-gradient-to-br ${iconBg} rounded-xl`}>
          <span className="text-2xl text-white">{icon}</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm mt-1">{description}</p>
        </div>
      </div>
      <div className="flex gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow ${
              action.variant === 'primary'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionCard;