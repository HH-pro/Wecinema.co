// src/components/marketplae/seller/WelcomeCard.tsx
import React from 'react';

interface WelcomeCardProps {
  title: string;
  subtitle: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    visible: boolean;
  };
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  title,
  subtitle,
  primaryAction,
  secondaryAction
}) => {
  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-gray-300">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={primaryAction.onClick}
            className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {primaryAction.label}
          </button>
          {secondaryAction?.visible && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;