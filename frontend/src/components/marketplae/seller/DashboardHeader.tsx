// src/components/marketplace/seller/DashboardHeader.tsx

import React from 'react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  earnings: string; // Total earnings string (already formatted)
  totalEarnings?: string; // ✅ New prop for total earnings
  onRefresh: () => void;
  refreshing: boolean;
  stripeStatus: {
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    status: string;
    availableBalance: number; // Amount in cents
  };
  onCheckStripe: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  earnings,
  totalEarnings, // ✅ New prop
  onRefresh,
  refreshing,
  stripeStatus,
  onCheckStripe
}) => {
  
  // ✅ Helper function to convert cents to dollars and format
  const formatCentsToDollars = (cents: number | undefined): string => {
    if (cents === undefined || cents === null || isNaN(cents)) {
      return '$0.00';
    }
    
    const dollars = cents / 100;
    return `$${dollars.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // ✅ Function to parse and validate earnings string
  const parseEarningsString = (earningsStr: string | undefined): string => {
    if (!earningsStr) return '$0.00';
    
    // If it already starts with $, return as is
    if (earningsStr.startsWith('$')) return earningsStr;
    
    // If it's a number string, convert to dollar format
    const num = parseFloat(earningsStr);
    if (!isNaN(num)) {
      // Check if it might be in cents (typically large numbers)
      if (num >= 100 && num % 100 === 0) {
        // Likely in cents
        return formatCentsToDollars(num);
      } else {
        // Likely already in dollars
        return `$${num.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}`;
      }
    }
    
    return earningsStr;
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            {refreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
          
          {/* ✅ Stripe Status Badge */}
          {stripeStatus.connected && (
            <div className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Stripe Connected
            </div>
          )}
        </div>
      </div>

      {/* Earnings Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center flex-1">
            <div className="bg-yellow-100 p-3 rounded-xl mr-4">
              <span className="text-2xl text-yellow-600">💰</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg">Total Earnings</h3>
              <p className="text-gray-700">
                {/* ✅ Display totalEarnings with proper formatting */}
                <span className="text-3xl font-bold text-gray-900 mr-2">
                  {parseEarningsString(totalEarnings || earnings)}
                </span>
                <span className="text-gray-600 text-sm">all-time revenue</span>
              </p>
              
              {/* ✅ Debug info for development */}
              {(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && (
                <div className="mt-2 text-xs text-gray-500">
                  <span>Raw: {totalEarnings || earnings}</span>
                  <span className="ml-3">Parsed: {parseEarningsString(totalEarnings || earnings)}</span>
                </div>
              )}
            </div>
          </div>
          
          {stripeStatus.connected && stripeStatus.chargesEnabled && (
            <div className="text-right bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCentsToDollars(stripeStatus.availableBalance)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Ready to withdraw</p>
              
              {/* ✅ Debug info for development */}
              {(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && (
                <div className="mt-2 text-xs text-gray-500">
                  <span>Raw balance: {stripeStatus.availableBalance} cents</span>
                </div>
              )}
              
              <button
                onClick={onCheckStripe}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition duration-200 shadow-sm"
              >
                Check Balance
              </button>
            </div>
          )}
          
          {!stripeStatus.connected && (
            <div className="text-right bg-white p-4 rounded-xl border border-yellow-200 shadow-sm">
              <p className="text-sm text-gray-600 font-medium">Payment Setup</p>
              <p className="text-lg font-bold text-amber-600">
                Not Connected
              </p>
              <p className="text-sm text-gray-500 mt-1">Connect Stripe to withdraw</p>
              
              <button
                onClick={onCheckStripe}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition duration-200 shadow-sm"
              >
                Setup Payments
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* ✅ Additional Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Stripe Status</p>
          <div className="flex items-center mt-1">
            {stripeStatus.connected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-700 font-medium">Connected</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-red-700 font-medium">Not Connected</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stripeStatus.connected 
              ? 'Payments are enabled' 
              : 'Connect to receive payments'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Account Details</p>
          <p className="text-gray-900 font-medium mt-1">
            {stripeStatus.detailsSubmitted ? 'Submitted' : 'Not Submitted'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stripeStatus.detailsSubmitted 
              ? 'All required details provided' 
              : 'Complete setup to withdraw'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 font-medium">Payouts</p>
          <p className="text-gray-900 font-medium mt-1">
            {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stripeStatus.chargesEnabled 
              ? 'Ready to receive payments' 
              : 'Complete Stripe setup'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;