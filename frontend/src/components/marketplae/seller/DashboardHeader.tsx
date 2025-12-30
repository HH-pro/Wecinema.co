// components/marketplace/seller/DashboardHeader.tsx - FIXED
import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  earnings: string;
  onRefresh: () => void;
  refreshing: boolean;
  stripeStatus?: {
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    status?: string;
    payoutsEnabled?: boolean;
  };
  onCheckStripe?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  earnings,
  onRefresh,
  refreshing,
  stripeStatus,
  onCheckStripe
}) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">{subtitle}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Earnings Card */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl px-4 py-3 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg flex-shrink-0">
                <span className="text-xl">💰</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-600 truncate">Total Earnings</p>
                <p className="text-xl font-bold text-gray-900 truncate">{earnings}</p>
              </div>
            </div>
          </div>

          {/* Stripe Status & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Stripe Status Badge */}
            {stripeStatus?.chargesEnabled ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-green-800 whitespace-nowrap">Payments Active</span>
                </div>
              </div>
            ) : stripeStatus?.connected && !stripeStatus?.chargesEnabled ? (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-yellow-800 whitespace-nowrap">Verification Pending</span>
                </div>
              </div>
            ) : null}

            {/* Check Stripe Status Button */}
            {stripeStatus?.connected && onCheckStripe && (
              <button
                onClick={onCheckStripe}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap text-sm"
                title="Check Stripe account status"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Check Stripe
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-3 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap text-sm"
              title="Refresh dashboard data"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 flex-shrink-0"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stripe Setup Reminder - Only show if not connected */}
      {!stripeStatus?.connected && (
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-blue-600 text-xl">💳</span>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Set up payments to start earning</h3>
                <p className="text-sm text-blue-700">Connect your Stripe account to accept payments and withdraw earnings</p>
              </div>
            </div>
            <button
              onClick={onCheckStripe}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition duration-200 text-sm whitespace-nowrap"
            >
              Connect Stripe Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;