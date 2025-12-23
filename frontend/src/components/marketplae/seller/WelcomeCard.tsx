// src/components/marketplace/seller/WelcomeCard.tsx
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
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-3xl shadow-2xl p-8 text-white overflow-hidden border border-gray-800/50">
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-start space-x-4 mb-6">
              
              <div>
                <h2 className="text-3xl font-bold text-white mb-3">{title}</h2>
                <p className="text-gray-300 text-lg">{subtitle}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={primaryAction.onClick}
                className="px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center"
              >
                
                {primaryAction.label}
              </button>
              
              {secondaryAction?.visible && (
                <button
                  onClick={secondaryAction.onClick}
                  className="px-6 py-3.5 bg-gray-800/50 text-white font-semibold rounded-xl hover:bg-gray-700/50 transition-all duration-300 border border-gray-700 hover:border-gray-600 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {secondaryAction.label}
                </button>
              )}
            </div>
          </div>
          
          <div className="lg:w-72">
            <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl flex items-center justify-center mr-3 border border-yellow-500/30">
                  <span className="text-yellow-300 text-lg">🎯</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Seller Progress</p>
                  <div className="flex items-center mt-2">
                    <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 w-3/4"></div>
                    </div>
                    <span className="text-sm text-yellow-300 font-medium ml-3">75%</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-200">Live</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Dashboard active</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-200">Growing</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Sales increasing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;