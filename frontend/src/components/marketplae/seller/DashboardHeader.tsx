// components/marketplae/seller/DashboardHeader.tsx
import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  earnings: string;
  onRefresh: () => void;
  refreshing: boolean;
  stripeStatus?: any;
  onCheckStripe?: () => void; // NEW: Add this prop
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  earnings,
  onRefresh,
  refreshing,
  stripeStatus,
  onCheckStripe // NEW
}) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Earnings Card */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold text-gray-900">{earnings}</p>
              </div>
            </div>
          </div>

          {/* Stripe Status Badge */}
          {stripeStatus?.chargesEnabled ? (
            <div className="hidden md:block bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Payments Active</span>
              </div>
            </div>
          ) : stripeStatus?.connected && !stripeStatus?.chargesEnabled ? (
            <div className="hidden md:block bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium text-yellow-800">Verification Pending</span>
              </div>
            </div>
          ) : null}

          {/* Check Stripe Status Button - NEW */}
          {stripeStatus?.connected && onCheckStripe && (
            <button
              onClick={onCheckStripe}
              disabled={refreshing}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Stripe Status
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;