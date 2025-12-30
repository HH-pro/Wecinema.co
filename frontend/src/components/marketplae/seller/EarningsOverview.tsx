import React, { useState } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsOverviewProps {
  stripeStatus: any;
  orderStats: any;
  onWithdrawRequest: (amount: number) => void;
}

const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  stripeStatus,
  orderStats,
  onWithdrawRequest
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const formatToRupees = (amountInCents: number) => {
    const amountInRupees = amountInCents / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatToDollars = (amountInCents: number) => {
    const amountInDollars = amountInCents / 100;
    return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    if (amountInCents > (stripeStatus?.availableBalance || 0)) {
      alert('Insufficient available balance');
      return;
    }
    
    setIsWithdrawing(true);
    try {
      await onWithdrawRequest(amount);
      setWithdrawAmount('');
      setShowWithdrawForm(false);
    } catch (error) {
      console.error('Withdrawal error:', error);
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">💰 Your Earnings Overview</h2>
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <div className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Ready to withdraw
            </div>
            <div className="text-sm text-gray-600 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Pending
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
              {formatToRupees(stripeStatus?.availableBalance || 0)}
            </p>
            <div className="mt-3 pt-3 border-t border-green-100">
              <button
                onClick={() => setShowWithdrawForm(true)}
                disabled={!(stripeStatus?.chargesEnabled) || (stripeStatus?.availableBalance || 0) < 500}
                className={`w-full py-2 text-sm font-medium rounded-lg transition duration-200 ${
                  stripeStatus?.chargesEnabled && (stripeStatus?.availableBalance || 0) >= 500
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {stripeStatus?.chargesEnabled && (stripeStatus?.availableBalance || 0) >= 500 ? 'Withdraw Now' : 'Withdraw Unavailable'}
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
              {formatToRupees(stripeStatus?.pendingBalance || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Orders in progress</p>
          </div>
          
          {/* Total earnings */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Total Earnings</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">📈</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatToRupees(stripeStatus?.balance || 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">All-time earnings</p>
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
              {formatToRupees((orderStats.thisMonthRevenue || 0) * 100)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Monthly revenue</p>
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
                  {formatToRupees(stripeStatus?.availableBalance || 0)}
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
                      max={(stripeStatus?.availableBalance || 0) / 100}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Enter amount between $5.00 and ${((stripeStatus?.availableBalance || 0) / 100).toFixed(2)}
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