// src/components/marketplace/seller/EarningsTab.tsx - UPDATED FIXED VERSION
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsTabProps {
  earningsBalance?: any;
  monthlyEarnings?: any[];
  earningsHistory?: any[];
  onWithdrawRequest: (amountInDollars: number) => Promise<void>;
  loading: boolean;
  onRefresh?: () => Promise<void>;
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
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  // ✅ ڈالر میں فارمیٹ کرنے کا فنکشن
  const formatInUSD = (amountInCents: number): string => {
    if (!amountInCents && amountInCents !== 0) return '$0.00';
    
    const amountInDollars = centsToDollars(amountInCents);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  };

  const formatInUSDShort = (amountInCents: number): string => {
    if (!amountInCents && amountInCents !== 0) return '$0.00';
    
    const amountInDollars = centsToDollars(amountInCents);
    
    if (amountInDollars >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amountInDollars);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInDollars);
  };

  // ✅ آرڈرز سے ڈیٹا اکٹھا کریں
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setApiError('');
      console.log('🔄 Fetching orders for earnings calculation...');
      
      const ordersData = await marketplaceApi.orders.getMySales();
      console.log('📊 Orders received:', ordersData?.length || 0);
      
      if (!Array.isArray(ordersData)) {
        throw new Error('Invalid orders data received');
      }
      
      setOrders(ordersData || []);
      
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);
      setApiError(error.message || 'Failed to fetch orders data');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ حساب کتاب والے فنکشنز
  const calculateEarnings = () => {
    if (!orders || orders.length === 0) {
      return {
        totalEarnings: 0,
        availableBalance: 0,
        pendingBalance: 0,
        completedOrdersCount: 0,
        pendingOrdersCount: 0,
        activeOrdersCount: 0
      };
    }

    // مکمل آرڈرز (paymentReleased = true)
    const completedOrders = orders.filter(order => 
      order.status === 'completed' && order.paymentReleased === true
    );

    // جاری آرڈرز (کام چل رہا ہے)
    const activeOrders = orders.filter(order => 
      order.status === 'in_progress' || 
      order.status === 'pending' ||
      order.status === 'delivered' ||
      order.status === 'revision_requested'
    );

    // pending آرڈرز (paymentReleased = false)
    const pendingOrders = orders.filter(order => 
      order.status === 'completed' && order.paymentReleased === false
    );

    // Total revenue تمام مکمل آرڈرز سے
    const totalEarnings = completedOrders.reduce((sum, order) => {
      return sum + (order.sellerAmount || order.amount || 0);
    }, 0);

    // Available balance (جو withdraw ہو سکتی ہے)
    const availableBalance = completedOrders.reduce((sum, order) => {
      return sum + (order.sellerAmount || order.amount || 0);
    }, 0);

    // Pending balance (active orders سے)
    const pendingBalance = activeOrders.reduce((sum, order) => {
      return sum + (order.sellerAmount || order.amount || 0);
    }, 0);

    return {
      totalEarnings,
      availableBalance,
      pendingBalance,
      completedOrdersCount: completedOrders.length,
      pendingOrdersCount: pendingOrders.length,
      activeOrdersCount: activeOrders.length
    };
  };

  // ✅ Monthly earnings calculate کریں
  const calculateMonthlyEarnings = () => {
    if (!orders || orders.length === 0) return [];

    const completedOrders = orders.filter(order => 
      order.status === 'completed' && order.paymentReleased === true
    );

    const monthlyMap = new Map();

    completedOrders.forEach(order => {
      const date = new Date(order.completedAt || order.createdAt || order.updatedAt);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthYear = `${year}-${month.toString().padStart(2, '0')}`;
      
      const current = monthlyMap.get(monthYear) || { 
        earnings: 0, 
        orders: 0,
        month,
        year,
        monthYear
      };
      
      monthlyMap.set(monthYear, {
        ...current,
        earnings: current.earnings + (order.sellerAmount || order.amount || 0),
        orders: current.orders + 1,
        _id: { month, year }
      });
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .slice(0, 6); // آخری 6 ماہ
  };

  // ✅ Transactions list بنائیں
  const getTransactions = () => {
    if (!orders || orders.length === 0) return [];

    const completedOrders = orders.filter(order => 
      order.status === 'completed' && order.paymentReleased === true
    );

    return completedOrders.map(order => ({
      _id: order._id || order.id,
      type: 'earning',
      status: 'completed',
      amount: order.sellerAmount || order.amount || 0,
      description: `Order: ${order.listingId?.title || 'Completed Order'}`,
      date: order.completedAt || order.createdAt || order.updatedAt,
      orderNumber: order.orderNumber || order._id?.slice(-6) || 'N/A'
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

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
    
    const earnings = calculateEarnings();
    const availableBalanceInCents = earnings.availableBalance;
    const requestedAmountInCents = dollarsToCents(amountInDollars);
    
    if (requestedAmountInCents > availableBalanceInCents) {
      setError(`Insufficient balance. Available: ${formatInUSD(availableBalanceInCents)}`);
      return;
    }
    
    setWithdrawing(true);
    try {
      await onWithdrawRequest(amountInDollars);
      setWithdrawAmount('');
      setError('');
      // Refresh data after successful withdrawal
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  // ✅ Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // ✅ Get month name
  const getMonthName = (monthIndex: number) => {
    if (!monthIndex) return 'Unknown';
    const date = new Date();
    date.setMonth(monthIndex - 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  // ✅ Get transaction icon
  const getTransactionIcon = (type: string) => {
    if (type === 'earning') return '💰';
    if (type === 'withdrawal') return '💸';
    return '📊';
  };

  // ✅ Get transaction color
  const getTransactionColor = (type: string) => {
    if (type === 'earning') return 'text-green-600';
    if (type === 'withdrawal') return 'text-blue-600';
    return 'text-gray-600';
  };

  // ✅ Get transaction sign
  const getTransactionSign = (type: string) => {
    if (type === 'earning') return '+';
    if (type === 'withdrawal') return '-';
    return '';
  };

  // ✅ Calculate data
  const earnings = calculateEarnings();
  const monthlyData = calculateMonthlyEarnings();
  const transactions = getTransactions();

  // ✅ Calculate growth
  const calculateGrowth = () => {
    if (!monthlyData || monthlyData.length < 2) return { percent: 0, amount: 0 };
    
    try {
      const sorted = [...monthlyData].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      
      const current = sorted[sorted.length - 1]?.earnings || 0;
      const previous = sorted[sorted.length - 2]?.earnings || 0;
      
      if (previous === 0) return { percent: 100, amount: current };
      
      const percent = ((current - previous) / previous) * 100;
      return {
        percent: Math.round(percent),
        amount: current - previous
      };
    } catch (e) {
      return { percent: 0, amount: 0 };
    }
  };

  const growth = calculateGrowth();

  // ✅ Calculate available balance in dollars
  const availableBalanceInCents = earnings.availableBalance || 0;
  const availableBalanceInDollars = centsToDollars(availableBalanceInCents);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded-2xl p-6">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-12 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings data from orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-800">API Error</p>
              <p className="text-sm text-red-700 mt-1">{apiError}</p>
              <p className="text-sm text-red-600 mt-2">
                Showing calculated data from your orders
              </p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="ml-auto text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded border border-red-300"
            >
              {isLoading ? 'Refreshing...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {orders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-blue-600 mr-2">ℹ️</div>
            <div>
              <p className="text-sm font-medium text-blue-800">Data Source</p>
              <p className="text-sm text-blue-700">
                Earnings calculated from {orders.length} orders. This matches Seller Dashboard data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available Balance</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatInUSD(earnings.availableBalance)}
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
                {formatInUSD(earnings.pendingBalance)}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                {earnings.activeOrdersCount} active orders
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
                {formatInUSD(earnings.totalEarnings)}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                {earnings.completedOrdersCount} completed orders
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
                {growth.amount >= 0 ? '+' : ''}{formatInUSD(Math.abs(growth.amount))}
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
              Track your earnings from completed orders
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
            {monthlyData.length > 0 ? (
              <>
                <div className="h-64 flex items-end space-x-2 md:space-x-4">
                  {monthlyData.map((monthData, index) => {
                    const earningsAmount = monthData.earnings || 0;
                    const maxEarnings = Math.max(...monthlyData.map(m => m.earnings || 0), 1);
                    const height = (earningsAmount / maxEarnings) * 100;
                    
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
                            {getMonthName(monthData.month)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatInUSDShort(earningsAmount)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {monthData.orders || 0} orders
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gradient-to-t from-yellow-400 to-yellow-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-600">Monthly Earnings from Completed Orders</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4 text-gray-300">📊</div>
                  <p className="text-gray-500">No monthly earnings data yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Complete orders to see monthly earnings breakdown
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <span className="text-green-600">📦</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Completed Orders</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      {earnings.completedOrdersCount}
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
                    <p className="text-sm font-medium text-blue-800">Active Orders</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {earnings.activeOrdersCount}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <span className="text-purple-600">💵</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">This Month</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      {monthlyData.length > 0 ? formatInUSDShort(monthlyData[0].earnings) : '$0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                  <span className="text-yellow-600">💰</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Average Order Value</p>
                  <p className="text-xl font-bold text-yellow-900 mt-1">
                    {earnings.completedOrdersCount > 0 
                      ? formatInUSD(earnings.totalEarnings / earnings.completedOrdersCount)
                      : '$0.00'
                    }
                  </p>
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
              Withdrawal Amount (USD)
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
                    placeholder="Enter amount in USD"
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || withdrawing || loading || availableBalanceInCents < 100}
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
              Available: {formatInUSD(availableBalanceInCents)} • Minimum: $1.00
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
                setWithdrawAmount(availableBalanceInDollars.toFixed(2));
              }}
              className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 transition-colors duration-200"
            >
              Withdraw All
            </button>
          </div>
        </div>
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Your earnings from completed orders
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction, index) => (
              <div key={transaction._id || `transaction-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-900">
                      {transaction.description || 'Transaction'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${getTransactionColor(transaction.type)}`}>
                  {getTransactionSign(transaction.type)}
                  {formatInUSD(transaction.amount || 0)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 text-gray-300">💰</div>
            <h3 className="text-lg font-medium text-gray-900">No Transactions Yet</h3>
            <p className="mt-2 text-gray-500 mb-6">
              You haven't completed any orders yet
            </p>
            <button
              onClick={fetchOrders}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
            >
              Check for New Orders
            </button>
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Data Source</p>
            <p className="text-sm text-gray-600 mt-1">Orders API</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Last Updated</p>
            <p className="text-sm text-gray-600 mt-1">
              {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;