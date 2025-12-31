// src/components/marketplae/seller/EarningsTab.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsTabProps {
  earningsBalance: any;
  monthlyEarnings: any[];
  earningsHistory: any[];
  onWithdrawRequest: (amountInDollars: number) => Promise<void>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  formatCurrency?: (amountInCents: number) => string;
  formatCurrencyShort?: (amountInCents: number) => string;
  dollarsToCents?: (dollars: number) => number;
  centsToDollars?: (cents: number) => number;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  earningsBalance,
  monthlyEarnings,
  earningsHistory,
  onWithdrawRequest,
  loading,
  onRefresh,
  formatCurrency = marketplaceApi.formatCurrency,
  formatCurrencyShort = marketplaceApi.formatCurrencyShort,
  dollarsToCents = (dollars: number) => Math.round(dollars * 100),
  centsToDollars = (cents: number) => cents / 100
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('monthly');
  const [detailedEarnings, setDetailedEarnings] = useState<any>(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // ✅ FIXED: Parse earnings balance from props
  const parseEarningsBalance = () => {
    if (!earningsBalance) {
      return {
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        walletBalance: 0,
        lastWithdrawal: null,
        nextPayoutDate: null,
        currency: 'usd'
      };
    }
    
    // If earningsBalance is the full API response
    if (earningsBalance.data) {
      return earningsBalance.data;
    }
    
    // If earningsBalance is already the data object
    return earningsBalance;
  };
  
  const balanceData = parseEarningsBalance();
  
  // ✅ FIXED: Parse monthly earnings
  const parseMonthlyEarnings = () => {
    if (!monthlyEarnings || monthlyEarnings.length === 0) {
      return [];
    }
    
    // If monthlyEarnings is the full API response
    if (monthlyEarnings.data) {
      return monthlyEarnings.data;
    }
    
    // If monthlyEarnings is already the data array
    return monthlyEarnings;
  };
  
  const monthlyData = parseMonthlyEarnings();
  
  // ✅ FIXED: Parse earnings history
  const parseEarningsHistory = () => {
    if (!earningsHistory || earningsHistory.length === 0) {
      return [];
    }
    
    // If earningsHistory is the full API response
    if (earningsHistory.data?.earnings) {
      return earningsHistory.data.earnings;
    }
    
    if (earningsHistory.data) {
      return earningsHistory.data;
    }
    
    // If earningsHistory is already the data array
    return earningsHistory;
  };
  
  const historyData = parseEarningsHistory();

  // ✅ FETCH DETAILED EARNINGS FROM MARKETPLACE API
  const fetchDetailedEarnings = async () => {
    try {
      setDetailedLoading(true);
      
      // Fetch earnings data directly
      const summaryResponse = await marketplaceApi.earnings.getEarningsSummary();
      const monthlyResponse = await marketplaceApi.earnings.getEarningsByPeriod('month');
      
      const detailedData: any = {};
      
      if (summaryResponse.success) {
        detailedData.summary = summaryResponse.data || summaryResponse;
      }
      
      if (monthlyResponse.success) {
        detailedData.monthly = monthlyResponse.data || monthlyResponse;
      }
      
      setDetailedEarnings(detailedData);
      
      // Fetch transactions from orders
      const orders = await marketplaceApi.orders.getMySales();
      const transactionsList = [];
      
      if (Array.isArray(orders)) {
        // Add completed orders as earnings
        orders.forEach(order => {
          if (order.status === 'completed' && order.paymentReleased) {
            transactionsList.push({
              _id: order._id,
              type: 'earning',
              status: 'completed',
              amount: order.sellerAmount || order.amount,
              description: `Order: ${order.listingId?.title || 'Completed Order'}`,
              date: order.completedAt || order.createdAt
            });
          }
        });
      }
      
      setTransactions(transactionsList);
      
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
    
    const amountInDollars = parseFloat(withdrawAmount);
    
    // Validate minimum amount ($1.00)
    if (amountInDollars < 1.00) {
      setError('Minimum withdrawal amount is $1.00');
      return;
    }
    
    // Check available balance
    const availableBalanceInCents = balanceData.availableBalance || 0;
    const availableBalanceInDollars = centsToDollars(availableBalanceInCents);
    const requestedAmountInCents = dollarsToCents(amountInDollars);
    
    if (requestedAmountInCents > availableBalanceInCents) {
      setError(`Insufficient balance. Available: ${formatCurrency(availableBalanceInCents)}`);
      return;
    }
    
    setWithdrawing(true);
    try {
      await onWithdrawRequest(amountInDollars);
      setWithdrawAmount('');
      setError('');
      await Promise.all([onRefresh(), fetchDetailedEarnings()]);
    } catch (err: any) {
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  // ✅ CALCULATE EARNINGS GROWTH FROM MONTHLY EARNINGS
  const calculateGrowth = () => {
    if (!monthlyData || monthlyData.length < 2) return { percent: 0, amount: 0 };
    
    // Sort by date to get correct current and previous month
    const sortedEarnings = [...monthlyData].sort((a, b) => {
      const dateA = a._id ? new Date(a._id.year || 0, (a._id.month || 1) - 1) : new Date();
      const dateB = b._id ? new Date(b._id.year || 0, (b._id.month || 1) - 1) : new Date();
      return dateA.getTime() - dateB.getTime();
    });
    
    const currentMonth = sortedEarnings[sortedEarnings.length - 1]?.earnings || 
                        sortedEarnings[sortedEarnings.length - 1]?.total || 0;
    const previousMonth = sortedEarnings[sortedEarnings.length - 2]?.earnings || 
                         sortedEarnings[sortedEarnings.length - 2]?.total || 0;
    
    if (previousMonth === 0) return { percent: 100, amount: currentMonth };
    
    const growthPercent = ((currentMonth - previousMonth) / previousMonth) * 100;
    const growthAmount = currentMonth - previousMonth;
    
    return {
      percent: Math.round(growthPercent),
      amount: growthAmount
    };
  };

  const growth = calculateGrowth();

  // ✅ GET MONTH NAME FROM MONTH INDEX
  const getMonthName = (monthIndex: number) => {
    if (monthIndex === undefined || monthIndex === null) return 'Unknown';
    const date = new Date();
    date.setMonth(monthIndex - 1); // Adjust for 1-indexed months
    return date.toLocaleString('default', { month: 'short' });
  };

  // ✅ FORMAT DATE FOR DISPLAY
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // ✅ GET TRANSACTION ICON BASED ON TYPE
  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'earning' || type === 'sale') {
      return status === 'completed' ? '💰' : '⏳';
    } else if (type === 'withdrawal') {
      return status === 'completed' ? '💸' : '⏳';
    } else if (type === 'refund') {
      return '↩️';
    }
    return '📊';
  };

  // ✅ GET TRANSACTION COLOR
  const getTransactionColor = (type: string) => {
    if (type === 'earning' || type === 'sale') return 'text-green-600';
    if (type === 'withdrawal') return 'text-blue-600';
    if (type === 'refund') return 'text-red-600';
    return 'text-gray-600';
  };

  // ✅ GET TRANSACTION SIGN
  const getTransactionSign = (type: string) => {
    if (type === 'earning' || type === 'sale') return '+';
    if (type === 'withdrawal' || type === 'refund') return '-';
    return '';
  };

  // ✅ FORMAT MONTHLY EARNINGS DATA FOR CHART
  const getChartData = () => {
    if (!monthlyData || monthlyData.length === 0) {
      // If no data, try to use transactions to create chart data
      if (transactions.length > 0) {
        const monthlyMap = new Map();
        
        transactions.forEach(transaction => {
          if (transaction.type === 'earning' && transaction.status === 'completed') {
            const date = new Date(transaction.date);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyMap.has(monthYear)) {
              monthlyMap.set(monthYear, {
                _id: { month: date.getMonth() + 1, year: date.getFullYear() },
                earnings: 0,
                orders: 0
              });
            }
            
            const monthData = monthlyMap.get(monthYear);
            monthData.earnings += transaction.amount || 0;
            monthData.orders += 1;
          }
        });
        
        return Array.from(monthlyMap.values()).sort((a, b) => {
          if (a._id.year !== b._id.year) return a._id.year - b._id.year;
          return a._id.month - b._id.month;
        });
      }
      
      // Return empty array if no data
      return [];
    }
    
    return monthlyData;
  };

  const chartData = getChartData();

  // ✅ GET TRANSACTION DESCRIPTION
  const getTransactionDescription = (transaction: any) => {
    if (transaction.description) return transaction.description;
    if (transaction.listingTitle) return `Sale: ${transaction.listingTitle}`;
    if (transaction.type === 'withdrawal') return 'Withdrawal to bank account';
    if (transaction.type === 'earning') return 'Order completed';
    return 'Transaction';
  };

  // ✅ CALCULATE TOTAL EARNINGS
  const getTotalEarnings = () => {
    return balanceData.totalEarnings || 0;
  };

  const totalEarnings = getTotalEarnings();

  // ✅ GET DISPLAY TRANSACTIONS
  const getDisplayTransactions = () => {
    if (historyData && historyData.length > 0) {
      return historyData;
    }
    
    if (transactions.length > 0) {
      return transactions;
    }
    
    return [];
  };

  const displayTransactions = getDisplayTransactions();

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available Balance</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatCurrency(balanceData.availableBalance || 0)}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Ready to withdraw
              </p>
            </div>
            <div className="text-4xl text-green-600">💰</div>
          </div>
        </div>

        {/* Pending Balance Card */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Pending Balance</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {formatCurrency(balanceData.pendingBalance || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                From active orders
              </p>
            </div>
            <div className="text-4xl text-blue-600">⏳</div>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Earnings</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                All-time earnings
              </p>
            </div>
            <div className="text-4xl text-purple-600">📈</div>
          </div>
        </div>

        {/* Monthly Growth Card */}
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
            {chartData && chartData.length > 0 ? (
              <>
                <div className="h-64 flex items-end space-x-2 md:space-x-4">
                  {chartData.map((monthData, index) => {
                    const earnings = monthData.earnings || monthData.total || 0;
                    const maxEarnings = Math.max(...chartData.map(m => m.earnings || m.total || 0), 1);
                    const height = maxEarnings > 0 ? (earnings / maxEarnings) * 100 : 0;
                    const orders = monthData.orders || monthData.orderCount || 0;
                    
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
                            {getMonthName(monthData._id?.month || monthData.month)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrencyShort(earnings)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {orders} {orders === 1 ? 'order' : 'orders'}
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
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4 text-gray-300">📊</div>
                  <p className="text-gray-500">No monthly earnings data available</p>
                  <p className="text-sm text-gray-400 mt-2">Complete orders to see earnings trends</p>
                </div>
              </div>
            )}
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
                      {formatCurrency(totalEarnings)}
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
                      {formatCurrency(balanceData.pendingBalance || 0)}
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
                      {formatCurrency(balanceData.totalWithdrawn || 0)}
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
                    <span className="text-gray-500 sm:text-sm">$</span>
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
                    step="0.01"
                  />
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawing || loading || (balanceData.availableBalance || 0) < 100}
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
              Available: {formatCurrency(balanceData.availableBalance || 0)} • Minimum: $1.00
            </p>
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50, 100].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setWithdrawAmount(amount.toString())}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
              >
                ${amount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const availableInDollars = centsToDollars(balanceData.availableBalance || 0);
                setWithdrawAmount(availableInDollars.toFixed(2));
              }}
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
        ) : displayTransactions.length > 0 ? (
          <div className="space-y-4">
            {displayTransactions.slice(0, 10).map((transaction: any, index: number) => (
              <div key={transaction._id || transaction.id || `transaction-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {getTransactionIcon(transaction.type || transaction.transactionType, transaction.status)}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">
                      {getTransactionDescription(transaction)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.date || transaction.createdAt || transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${getTransactionColor(transaction.type || transaction.transactionType)}`}>
                  {getTransactionSign(transaction.type || transaction.transactionType)}
                  {formatCurrency(transaction.amount || 0)}
                </div>
              </div>
            ))}
            
            {displayTransactions.length > 10 && (
              <div className="text-center pt-4">
                <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                  View All Transactions ({displayTransactions.length})
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
                  {balanceData.nextPayoutDate 
                    ? new Date(balanceData.nextPayoutDate).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Weekly on Fridays'}
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
                <span className="font-medium text-gray-900">2.9% + $0.30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;