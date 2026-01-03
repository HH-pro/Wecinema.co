// src/components/marketplace/seller/StripeConnectedStatus.tsx
import React from 'react';

interface StripeConnectedStatusProps {
  balance?: number;
  onCheckBalance: () => void;
  onViewEarnings: () => void;
  onWithdraw: () => void;
}

const StripeConnectedStatus: React.FC<StripeConnectedStatusProps> = ({
  balance = 0,
  onCheckBalance,
  onViewEarnings,
  onWithdraw
}) => {
  const balanceInDollars = balance / 100;
  
  return (
    <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
            <span className="text-green-600 text-2xl">💳</span>
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Payment Account Active</h3>
            <p className="text-sm text-green-700 mt-1">
              Your Stripe account is connected and ready to accept payments
            </p>
            {balanceInDollars > 0 && (
              <p className="text-lg font-bold text-green-800 mt-2">
                Available Balance: <span className="text-green-600">${balanceInDollars.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCheckBalance}
            className="px-4 py-2 bg-white border border-green-300 text-green-600 hover:bg-green-50 text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check Status
          </button>
          
          <button
            onClick={onViewEarnings}
            className="px-4 py-2 bg-green-500 text-white hover:bg-green-600 text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Earnings
          </button>
          
          {balanceInDollars > 0 && (
            <button
              onClick={onWithdraw}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 text-sm font-medium rounded-lg transition duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Withdraw
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-green-200">
        <div className="flex flex-wrap gap-4 text-xs text-green-700">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Payments enabled</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Payouts enabled</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>Funds available in 2-3 days</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeConnectedStatus;