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
    <div className="bg-gradient-to-br from-[#0a1929] via-[#102a43] to-[#0a1929] rounded-3xl shadow-2xl p-8 text-white overflow-hidden border border-[#1e3a5f]/30">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-5"></div>
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg mb-6">
                <span className="text-3xl">🚀</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">{subtitle}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={primaryAction.onClick}
                className="px-7 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center group hover:-translate-y-1 active:translate-y-0"
              >
                <svg className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {primaryAction.label}
              </button>
              
              {secondaryAction?.visible && (
                <button
                  onClick={secondaryAction.onClick}
                  className="px-7 py-4 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20 flex items-center group hover:-translate-y-1 active:translate-y-0 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-3 text-amber-300 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  {secondaryAction.label}
                </button>
              )}
            </div>
          </div>
          
          <div className="lg:w-80">
            <div className="bg-gradient-to-br from-[#0f2741]/80 to-[#0a1c33]/80 rounded-2xl border border-[#1e3a5f]/40 p-6 backdrop-blur-sm">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                    <span className="text-amber-300">📈</span>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Profile Completion</span>
                    <span className="text-amber-300 font-medium">75%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1e3a5f] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 w-3/4"></div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f2741]/60 rounded-xl p-4 border border-[#1e3a5f]/50 hover:border-amber-500/30 transition-all duration-300">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-white">Active</span>
                  </div>
                  <p className="text-xs text-gray-400">Dashboard live</p>
                </div>
                <div className="bg-[#0f2741]/60 rounded-xl p-4 border border-[#1e3a5f]/50 hover:border-amber-500/30 transition-all duration-300">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-white">Optimized</span>
                  </div>
                  <p className="text-xs text-gray-400">Ready for sales</p>
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