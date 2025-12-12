// src/components/marketplae/seller/DashboardHeader.tsx
import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  earnings: string;
  onRefresh: () => void;
  refreshing: boolean;
  showStripeButton?: boolean;
  onStripeSetup?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  earnings,
  onRefresh,
  refreshing,
  showStripeButton = false,
  onStripeSetup
}) => {
  return (
    <div className="mb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
              <span className="text-white text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                {title}
              </h1>
              <p className="mt-1 text-gray-600">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            <span className="font-medium">{earnings}</span> total earnings
          </div>
          <div className="flex gap-3">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            >
              <svg 
                className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {showStripeButton && onStripeSetup && (
              <button
                onClick={onStripeSetup}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow"
              >
                💰 Setup Payments
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;