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
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 md:p-8 text-white">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl border border-yellow-400/30 mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-blue-100 text-lg">{subtitle}</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={primaryAction.onClick}
              className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
            >
              {primaryAction.label}
            </button>
            
            {secondaryAction?.visible && (
              <button
                onClick={secondaryAction.onClick}
                className="px-5 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center backdrop-blur-sm"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        </div>
        
        <div className="lg:w-64">
          <div className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 rounded-xl border border-blue-700/50 p-4 backdrop-blur-sm">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3 border border-yellow-500/30">
                <span className="text-yellow-300">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Your Progress</p>
                <div className="flex items-center mt-1">
                  <div className="w-24 h-1.5 bg-blue-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 w-3/4"></div>
                  </div>
                  <span className="text-xs text-blue-200 ml-2">75%</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                <span className="text-blue-200">Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                <span className="text-blue-200">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;