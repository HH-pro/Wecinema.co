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
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-2xl">👋</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-gray-600 text-lg">{subtitle}</p>
                
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <button
                    onClick={primaryAction.onClick}
                    className="px-5 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center group"
                  >
                    <svg className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    {primaryAction.label}
                  </button>
                  
                  {secondaryAction?.visible && (
                    <button
                      onClick={secondaryAction.onClick}
                      className="px-5 py-3 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center group"
                    >
                      <svg className="w-5 h-5 mr-2 text-emerald-600 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      {secondaryAction.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className="w-48 h-40 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 p-4 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full opacity-10"></div>
              <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-yellow-500 rounded-full opacity-10"></div>
              
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-lg">💡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Quick Tip</p>
                    <p className="text-xs text-gray-600">Complete profile for more visibility</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span>Active seller</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span>Real-time updates</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span>Growth mode</span>
                  </div>
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