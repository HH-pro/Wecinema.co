import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsOverviewProps {
  stripeStatus: any;
  orderStats: any;
  onWithdrawRequest: (amount: number) => void;
  userId?: string; // Add userId to fetch live earnings
}

const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  stripeStatus,
  orderStats,
  onWithdrawRequest,
  userId
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [liveEarnings, setLiveEarnings] = useState<any>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  
  // ✅ Function to fetch live earnings from backend
  const fetchLiveEarnings = async () => {
    if (!userId) return;
    
    try {
      setLoadingEarnings(true);
      // Call your backend API to get live earnings
      const response = await marketplaceApi.getSellerLiveEarnings(userId);
      setLiveEarnings(response.data);
    } catch (error) {
      console.error('Error fetching live earnings:', error);
    } finally {
      setLoadingEarnings(false);
    }
  };

  // ✅ Fetch live earnings on component mount and refresh
  useEffect(() => {
    fetchLiveEarnings();
    
    // Optional: Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchLiveEarnings, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  // ✅ Extract live earnings from SafeDashboardHeader logic
  const extractLiveEarnings = () => {
    // This function extracts the logic from SafeDashboardHeader
    // You'll need to adapt based on how SafeDashboardHeader calculates earnings
    
    const baseEarnings = {
      available: stripeStatus?.availableBalance || 0,
      pending: stripeStatus?.pendingBalance || 0,
      total: stripeStatus?.balance || 0,
      today: 0,
      thisWeek: 0,
      thisMonth: orderStats.thisMonthRevenue || 0
    };

    // If you have liveEarnings data from API, use it
    if (liveEarnings) {
      return {
        available: liveEarnings.available || baseEarnings.available,
        pending: liveEarnings.pending || baseEarnings.pending,
        total: liveEarnings.total || baseEarnings.total,
        today: liveEarnings.today || 0,
        thisWeek: liveEarnings.thisWeek || 0,
        thisMonth: liveEarnings.thisMonth || baseEarnings.thisMonth
      };
    }

    return baseEarnings;
  };

  const earnings = extractLiveEarnings();
  
  const formatToRupees = (amountInCents: number) => {
    const amountInRupees = amountInCents / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatToDollars = (amountInCents: number) => {
    const amountInDollars = amountInCents / 100;
    return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // ✅ Handle refresh (replaces SafeDashboardHeader's onRefresh)
  const handleRefresh = async () => {
    await fetchLiveEarnings();
  };
  
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (amount < 5) {
      alert('Minimum withdrawal amount is $5.00');
      return;
    }
    
    const amountInCents = amount * 100;
    if (amountInCents > (earnings.available || 0)) {
      alert('Insufficient available balance');
      return;
    }
    
    setIsWithdrawing(true);
    try {
      await onWithdrawRequest(amount);
      setWithdrawAmount('');
      setShowWithdrawForm(false);
      // Refresh earnings after withdrawal
      fetchLiveEarnings();
    } catch (error) {
      console.error('Withdrawal error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  return (
    <>
      {/* ✅ Refresh button (moved from SafeDashboardHeader) */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">💰 Your Earnings Overview</h2>
        <button
          onClick={handleRefresh}
          disabled={loadingEarnings}
          className="flex items-center text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-lg transition duration-200"
        >
          {loadingEarnings ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24">
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
              Refresh Earnings
            </>
          )}
        </button>
      </div>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <div className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Ready to withdraw
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Pending
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Today's earnings
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Available to withdraw */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Available to withdraw</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600">💰</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatToRupees(earnings.available || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Ready for withdrawal</p>
            
            {/* ✅ Live update indicator */}
            {liveEarnings && (
              <div className="mt-2 pt-2 border-t border-green-100">
                <div className="flex items-center text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Live
                </div>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-green-100">
              <button
                onClick={() => setShowWithdrawForm(true)}
                disabled={!(stripeStatus?.chargesEnabled) || (earnings.available || 0) < 500}
                className={`w-full py-2 text-sm font-medium rounded-lg transition duration-200 ${
                  stripeStatus?.chargesEnabled && (earnings.available || 0) >= 500
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {stripeStatus?.chargesEnabled && (earnings.available || 0) >= 500 ? 'Withdraw Now' : 'Withdraw Unavailable'}
              </button>
            </div>
          </div>
          
          {/* Pending earnings */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Pending</h3>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600">⏳</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatToRupees(earnings.pending || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Orders in progress</p>
          </div>
          
          {/* Today's earnings */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Today's Earnings</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📈</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatToRupees(earnings.today * 100 || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Live earnings today</p>
            
            {/* ✅ Today's earning trend */}
            {earnings.today > 0 && (
              <div className="mt-2 flex items-center text-xs text-green-600">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Active today
              </div>
            )}
          </div>
          
          {/* This month earnings */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">This Month</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600">📅</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatToRupees((earnings.thisMonth * 100) || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Monthly revenue</p>
          </div>
        </div>
        
        {/* ✅ Additional Earnings Breakdown */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <span className="text-green-600">💳</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total Balance</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatToRupees(earnings.total || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <span className="text-blue-600">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">This Week</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatToRupees((earnings.thisWeek * 100) || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                <span className="text-yellow-600">🎯</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Conversion Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {orderStats.conversionRate || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Withdrawal info bar */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <span className="text-blue-600">ℹ️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Withdrawal Information</p>
                <p className="text-sm text-gray-600">
                  Minimum withdrawal: $5.00 • Processing time: 2-3 business days
                </p>
              </div>
            </div>
            
            {/* ✅ Live status indicator */}
            <div className="flex items-center space-x-2">
              {loadingEarnings ? (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                  Updating earnings...
                </div>
              ) : liveEarnings ? (
                <div className="flex items-center text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Earnings live
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Last updated: Just now
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Withdraw Form Modal */}
      {showWithdrawForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Withdraw Funds</h3>
                <button
                  onClick={() => setShowWithdrawForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-5 h-5 text-blue-600 mr-2">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-blue-800">Available Balance</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatToRupees(earnings.available || 0)}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Minimum withdrawal: $5.00 • Processing time: 2-3 business days
                </p>
              </div>
              
              <form onSubmit={handleWithdrawSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Withdrawal Amount ($)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="5"
                      max={(earnings.available || 0) / 100}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Enter amount between $5.00 and ${((earnings.available || 0) / 100).toFixed(2)}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isWithdrawing}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EarningsOverview;