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
    <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-3xl shadow-2xl p-8 text-white overflow-hidden">
      {/* Removed background pattern balls */}
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-2xl">👋</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-3">{title}</h2>
                <p className="text-gray-300 text-lg opacity-90">{subtitle}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <button
                onClick={primaryAction.onClick}
                className="px-6 py-3.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {primaryAction.label}
              </button>
              
              {secondaryAction?.visible && (
                <button
                  onClick={secondaryAction.onClick}
                  className="px-6 py-3.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 border border-white/30 hover:border-white/50 flex items-center backdrop-blur-sm hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {secondaryAction.label}
                </button>
              )}
            </div>
          </div>
          
          <div className="lg:w-72">
            <div className="bg-gradient-to-br from-gray-900/50 to-slate-900/50 rounded-2xl border border-gray-800/50 p-5 backdrop-blur-sm">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl flex items-center justify-center mr-3 border border-yellow-500/30">
                  <span className="text-yellow-300 text-lg">📊</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Dashboard Stats</p>
                  <div className="flex items-center mt-2">
                    <div className="w-32 h-2 bg-gray-800/70 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 w-3/4"></div>
                    </div>
                    <span className="text-sm text-yellow-300 font-medium ml-3">75%</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-800/40">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm text-gray-200">Online</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Ready to sell</p>
                </div>
                <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-800/40">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-200">Active</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">24/7 Support</p>
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