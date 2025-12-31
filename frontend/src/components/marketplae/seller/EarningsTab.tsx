// src/components/marketplae/seller/EarningsTab.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import paymentsApi from '../../../api/paymentsApi';


interface EarningsTabProps {
  earningsBalance: any;
  monthlyEarnings: any[];
  earningsHistory: any[];
  orderStats: any;
  onWithdrawRequest: (amount: number) => Promise<void>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  formatCurrency?: (amount: number) => string;
  formatCurrencyShort?: (amount: number) => string;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  earningsBalance,
  monthlyEarnings,
  earningsHistory,
  orderStats,
  onWithdrawRequest,
  loading,
  onRefresh,
  formatCurrency = paymentsApi.formatCurrency, // ✅ DEFAULT TO PAYMENTS API
  formatCurrencyShort = paymentsApi.formatCurrencyShort // ✅ DEFAULT TO PAYMENTS API
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('monthly');
  const [detailedEarnings, setDetailedEarnings] = useState<any>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  // ✅ FETCH DETAILED EARNINGS FROM PAYMENTS API
  const fetchDetailedEarnings = async () => {
    try {
      setDetailedLoading(true);
      const response = await paymentsApi.getEarningsHistory({ page: 1, limit: 50 });
      
      if (response.success && response.data) {
        setDetailedEarnings(response.data);
      }
    } catch (error) {
      console.error('Error fetching detailed earnings:', error);
    } finally {
      setDetailedLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedEarnings();
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setWithdrawing(true);
    try {
      await onWithdrawRequest(parseFloat(withdrawAmount));
      setWithdrawAmount('');
      setError('');
      await Promise.all([onRefresh(), fetchDetailedEarnings()]);
    } catch (err: any) {
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  // ✅ CALCULATE EARNINGS GROWTH
  const calculateGrowth = () => {
    if (!monthlyEarnings || monthlyEarnings.length < 2) return { percent: 0, amount: 0 };
    
    const currentMonth = monthlyEarnings[monthlyEarnings.length - 1]?.earnings || 0;
    const previousMonth = monthlyEarnings[monthlyEarnings.length - 2]?.earnings || 0;
    
    if (previousMonth === 0) return { percent: 100, amount: currentMonth };
    
    const growthPercent = ((currentMonth - previousMonth) / previousMonth) * 100;
    const growthAmount = currentMonth - previousMonth;
    
    return {
      percent: Math.round(growthPercent),
      amount: growthAmount
    };
  };

  const growth = calculateGrowth();

  // ✅ GET MONTH NAME
  const getMonthName = (monthIndex: number) => {
    const date = new Date();
    date.setMonth(monthIndex);
    return date.toLocaleString('default', { month: 'short' });
  };

  // ✅ GET EARNINGS BY TYPE
  const getEarningsByType = () => {
    if (!detailedEarnings?.earnings) return { completed: 0, pending: 0, withdrawn: 0 };
    
    const completed = detailedEarnings.earnings
      .filter((item: any) => item.type === 'earning' && item.status === 'completed')
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    
    const pending = detailedEarnings.earnings
      .filter((item: any) => item.type === 'earning' && item.status === 'pending')
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    
    const withdrawn = detailedEarnings.earnings
      .filter((item: any) => item.type === 'withdrawal' && item.status === 'completed')
      .reduce((sum: number, item: any) => sum + item.amount, 0);
    
    return { completed, pending, withdrawn };
  };

  const earningsByType = getEarningsByType();

  // ✅ FORMAT DATE
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ GET TRANSACTION ICON
  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'earning') {
      return status === 'completed' ? '💰' : '⏳';
    } else if (type === 'withdrawal') {
      return status === 'completed' ? '💸' : '⏳';
    }
    return '📊';
  };

  // ✅ GET TRANSACTION COLOR
  const getTransactionColor = (type: string) => {
    if (type === 'earning') return 'text-green-600';
    if (type === 'withdrawal') return 'text-blue-600';
    return 'text-gray-600';
  };

  // ✅ GET TRANSACTION SIGN
  const getTransactionSign = (type: string) => {
    if (type === 'earning') return '+';
    if (type === 'withdrawal') return '-';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available Balance</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatCurrency(earningsBalance?.availableBalance || 0)}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Ready to withdraw
              </p>
            </div>
            <div className="text-4xl text-green-600">💰</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Pending Balance</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {formatCurrency(earningsBalance?.pendingBalance || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                From active orders
              </p>
            </div>
            <div className="text-4xl text-blue-600">⏳</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-violet-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Earnings</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {formatCurrency(earningsBalance?.totalEarnings || orderStats.totalRevenue * 100 || 0)}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                All-time earnings
              </p>
            </div>
            <div className="text-4xl text-purple-600">📈</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">Monthly Growth</p>
              <p className={`text-3xl font-bold ${growth.percent >= 0 ? 'text-green-900' : 'text-red-900'} mt-2`}>
                {growth.percent >= 0 ? '+' : ''}{growth.percent}%
              </p>
              <p className="text-sm text-amber-700 mt-2">
                vs last month
              </p>
            </div>
            <div className="text-4xl text-amber-600">
              {growth.percent >= 0 ? '📈' : '📉'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Earnings Overview</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track your earnings performance over time
            </p>
          </div>
          <div className="flex space-x-2 mt-2 md:mt-0">
            <button
              onClick={() => setActiveChart('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeChart === 'monthly'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setActiveChart('detailed')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeChart === 'detailed'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {activeChart === 'monthly' ? (
          <div className="space-y-4">
            {/* Monthly Earnings Chart */}
            <div className="h-64 flex items-end space-x-2 md:space-x-4">
              {monthlyEarnings.map((monthData, index) => {
                const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings || 0));
                const height = maxEarnings > 0 ? (monthData.earnings / maxEarnings) * 100 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full max-w-20 mx-auto">
                      <div 
                        className="bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-t-lg transition-all duration-300"
                        style={{ height: `${Math.max(10, height)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-gray-700">
                        {getMonthName(monthData._id.month)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrencyShort(monthData.earnings || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {monthData.orders || 0} orders
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-100">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Monthly Earnings</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gradient-to-t from-blue-400 to-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Order Count</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Earnings Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <span className="text-green-600">💰</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Completed Earnings</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      {formatCurrency(earningsByType.completed)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <span className="text-blue-600">⏳</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Pending Earnings</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {formatCurrency(earningsByType.pending)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <span className="text-purple-600">💸</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Total Withdrawn</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      {formatCurrency(earningsByType.withdrawn)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Withdrawal</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter amount"
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="1"
                    step="1"
                  />
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawing || loading || (earningsBalance?.availableBalance || 0) < 500}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow"
              >
                {withdrawing ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  'Withdraw'
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Available: {formatCurrency(earningsBalance?.availableBalance || 0)} • Minimum: ₹500
            </p>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[500, 1000, 2500, 5000, 10000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setWithdrawAmount(amount.toString())}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
              >
                ₹{amount.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWithdrawAmount(((earningsBalance?.availableBalance || 0) / 100).toString())}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 transition-colors duration-200"
            >
              Withdraw All
            </button>
          </div>
        </div>
      </div>

      {/* Earnings History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your earnings and withdrawal history
            </p>
          </div>
          <button
            onClick={() => Promise.all([onRefresh(), fetchDetailedEarnings()])}
            disabled={loading || detailedLoading}
            className="px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading || detailedLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {detailedLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading earnings history...</p>
            </div>
          </div>
        ) : detailedEarnings?.earnings?.length > 0 ? (
          <div className="space-y-4">
            {detailedEarnings.earnings.slice(0, 10).map((transaction: any) => (
              <div key={transaction._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {getTransactionIcon(transaction.type, transaction.status)}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.date)}
                      {transaction.balanceAfter && (
                        <span className="ml-2">
                          • Balance: {formatCurrency(transaction.balanceAfter)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${getTransactionColor(transaction.type)}`}>
                  {getTransactionSign(transaction.type)}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
            
            {detailedEarnings.pagination?.total > 10 && (
              <div className="text-center pt-4">
                <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                  View All Transactions ({detailedEarnings.pagination.total})
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 text-gray-300">💰</div>
            <h3 className="text-lg font-medium text-gray-900">No Transactions Yet</h3>
            <p className="mt-2 text-gray-500 mb-6">
              Complete orders to start earning!
            </p>
            <button
              onClick={onRefresh}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
            >
              Check for New Earnings
            </button>
          </div>
        )}
      </div>

      {/* Earnings Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Payout Schedule</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Payout Date</span>
                <span className="font-medium text-gray-900">
                  {earningsBalance?.nextPayoutDate 
                    ? new Date(earningsBalance.nextPayoutDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payout Frequency</span>
                <span className="font-medium text-gray-900">Weekly</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Processing Time</span>
                <span className="font-medium text-gray-900">2-3 business days</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Platform Fees</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Service Fee</span>
                <span className="font-medium text-gray-900">10% per order</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Withdrawal Fee</span>
                <span className="font-medium text-gray-900">Free</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Processing</span>
                <span className="font-medium text-gray-900">2.9% + ₹3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;