import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

interface WithdrawTabProps {
  stripeStatus: any;
  withdrawalHistory: any;
  earningsBalance: any;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onWithdrawRequest: (amountInDollars: number) => Promise<void>;
  onRefresh: () => Promise<void>;
  formatCurrency?: (amountInCents: number) => string;
}

const WithdrawTab: React.FC<WithdrawTabProps> = ({
  stripeStatus,
  withdrawalHistory,
  earningsBalance,
  loading,
  currentPage,
  onPageChange,
  onWithdrawRequest,
  onRefresh,
  formatCurrency = marketplaceApi.formatCurrency
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [withdrawalStats, setWithdrawalStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('stripe');

  // Helper functions
  const dollarsToCents = (dollars: number): number => {
    return Math.round(dollars * 100);
  };

  const centsToDollars = (cents: number): number => {
    return cents / 100;
  };

  const validateWithdrawalAmount = (amountInCents: number, availableBalance: number): { valid: boolean; error?: string } => {
    const minWithdrawal = 500; // $5.00 minimum
    
    if (amountInCents < minWithdrawal) {
      return { valid: false, error: `Minimum withdrawal amount is ${formatCurrency(minWithdrawal)}` };
    }
    
    if (amountInCents > availableBalance) {
      return { valid: false, error: 'Insufficient balance' };
    }
    
    return { valid: true };
  };

  // ✅ FETCH WITHDRAWAL STATS FROM MARKETPLACE API
  const fetchWithdrawalStats = async () => {
    try {
      setStatsLoading(true);
      
      // Try multiple endpoints for withdrawal stats
      try {
        // First try earnings API
        const earningsResponse = await marketplaceApi.earnings.getEarningsDashboard();
        if (earningsResponse.success && earningsResponse.data) {
          const data = earningsResponse.data;
          setWithdrawalStats({
            totalWithdrawn: data.totalWithdrawn || 0,
            availableBalance: data.availableBalance || 0,
            pendingBalance: data.pendingBalance || 0
          });
          return;
        }
      } catch (error) {
        console.log('Earnings dashboard failed, trying other endpoints...');
      }
      
      // Try withdrawal history endpoint
      try {
        const withdrawalResponse = await marketplaceApi.earnings.getWithdrawalHistory({ status: '' });
        if (withdrawalResponse.success) {
          let withdrawals: any[] = [];
          
          if (Array.isArray(withdrawalResponse.data)) {
            withdrawals = withdrawalResponse.data;
          } else if (withdrawalResponse.data && Array.isArray(withdrawalResponse.data.withdrawals)) {
            withdrawals = withdrawalResponse.data.withdrawals;
          } else if (withdrawalResponse.data && withdrawalResponse.data.history) {
            withdrawals = withdrawalResponse.data.history;
          }
          
          // Calculate stats
          const totalWithdrawn = withdrawals
            .filter((w: any) => w.status === 'completed')
            .reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
          
          const pendingWithdrawals = withdrawals.filter((w: any) => 
            w.status === 'pending' || w.status === 'processing'
          ).length;
          
          setWithdrawalStats({
            totalWithdrawn,
            pendingWithdrawals,
            lastWithdrawal: withdrawals.length > 0 ? withdrawals[0] : null
          });
        }
      } catch (error) {
        console.log('Withdrawal history endpoint failed');
      }
      
    } catch (error) {
      console.error('Error fetching withdrawal stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ FETCH PAYMENT METHODS
  const fetchPaymentMethods = async () => {
    try {
      // Check Stripe status first
      const stripeStatusResponse = await marketplaceApi.stripe.getStripeStatus();
      if (stripeStatusResponse.success && stripeStatusResponse.data) {
        const methods = [];
        
        // Add Stripe if connected
        if (stripeStatusResponse.data.chargesEnabled) {
          methods.push({
            id: 'stripe',
            name: 'Stripe Balance',
            description: 'Transfer to your Stripe account',
            icon: '💳',
            available: true
          });
        }
        
        // Add bank transfer option
        methods.push({
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank transfer',
          icon: '🏦',
          available: true
        });
        
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  useEffect(() => {
    // Calculate available balance from multiple sources
    let balance = 0;
    
    // Check earnings balance first
    if (earningsBalance?.availableBalance) {
      balance = earningsBalance.availableBalance;
    } 
    // Check stripe status
    else if (stripeStatus?.balance?.available) {
      balance = stripeStatus.balance.available;
    }
    // Check withdrawal history balance
    else if (withdrawalHistory?.balance?.availableBalance) {
      balance = withdrawalHistory.balance.availableBalance;
    }
    // Use withdrawal stats if available
    else if (withdrawalStats?.availableBalance) {
      balance = withdrawalStats.availableBalance;
    }
    
    setAvailableBalance(balance);
    
    // Fetch withdrawal stats and payment methods
    fetchWithdrawalStats();
    fetchPaymentMethods();
  }, [earningsBalance, stripeStatus, withdrawalHistory, withdrawalStats]);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amountInDollars = parseFloat(withdrawAmount);
    const amountInCents = dollarsToCents(amountInDollars);
    
    // Validate withdrawal amount
    const validation = validateWithdrawalAmount(amountInCents, availableBalance);
    
    if (!validation.valid) {
      setError(validation.error || 'Invalid withdrawal amount');
      return;
    }

    setError('');
    setWithdrawing(true);
    
    try {
      // Process withdrawal through marketplace API
      const response = await marketplaceApi.earnings.processPayout(
        amountInCents,
        selectedMethod,
        {
          note: 'Withdrawal request from seller dashboard',
          timestamp: new Date().toISOString()
        }
      );
      
      if (response.success) {
        setSuccessMessage(`Successfully requested withdrawal of ${formatCurrency(amountInCents)}`);
        setWithdrawAmount('');
        
        // Call parent handler
        await onWithdrawRequest(amountInDollars);
        
        // Refresh all data
        await Promise.all([
          onRefresh(),
          fetchWithdrawalStats()
        ]);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        setError(response.error || 'Failed to process withdrawal');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  // ✅ QUICK WITHDRAWAL AMOUNT BUTTONS (USD)
  const quickAmounts = [
    { label: '$10', value: 10 },
    { label: '$25', value: 25 },
    { label: '$50', value: 50 },
    { label: '$100', value: 100 },
    { label: '$250', value: 250 },
    { label: 'All', value: centsToDollars(availableBalance) }
  ];

  const handleQuickAmount = (amount: number) => {
    // Cap at available balance
    const cappedAmount = Math.min(amount, centsToDollars(availableBalance));
    setWithdrawAmount(cappedAmount.toFixed(2));
    setError('');
  };

  // ✅ GET STATUS BADGE STYLE
  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ✅ FORMAT DATE FOR DISPLAY
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // ✅ CALCULATE TOTAL WITHDRAWN
  const calculateTotalWithdrawn = () => {
    // Try multiple sources
    if (earningsBalance?.totalWithdrawn) {
      return earningsBalance.totalWithdrawn;
    }
    
    if (withdrawalStats?.totalWithdrawn) {
      return withdrawalStats.totalWithdrawn;
    }
    
    if (withdrawalHistory?.withdrawals && withdrawalHistory.withdrawals.length > 0) {
      return withdrawalHistory.withdrawals
        .filter((w: any) => w.status === 'completed' || w.status === 'paid')
        .reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
    }
    
    return 0;
  };

  const totalWithdrawn = calculateTotalWithdrawn();

  // ✅ GET WITHDRAWALS FROM HISTORY
  const getWithdrawalsList = () => {
    if (!withdrawalHistory) return [];
    
    if (Array.isArray(withdrawalHistory)) {
      return withdrawalHistory;
    }
    
    if (withdrawalHistory.withdrawals && Array.isArray(withdrawalHistory.withdrawals)) {
      return withdrawalHistory.withdrawals;
    }
    
    if (withdrawalHistory.history && Array.isArray(withdrawalHistory.history)) {
      return withdrawalHistory.history;
    }
    
    if (withdrawalHistory.data && Array.isArray(withdrawalHistory.data)) {
      return withdrawalHistory.data;
    }
    
    return [];
  };

  const withdrawalsList = getWithdrawalsList();

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available to Withdraw Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Available to Withdraw</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatCurrency(availableBalance)}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Ready for immediate withdrawal
              </p>
            </div>
            <div className="text-4xl text-green-600">💰</div>
          </div>
        </div>
        
        {/* Pending Clearance Card */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Pending Clearance</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {formatCurrency(earningsBalance?.pendingBalance || stripeStatus?.pendingBalance || 0)}
              </p>
              <p className="text-sm text-blue-700 mt-2">
                From active orders
              </p>
            </div>
            <div className="text-4xl text-blue-600">⏳</div>
          </div>
        </div>
        
        {/* Total Withdrawn Card */}
        <div className="bg-gradient-to-r from-purple-50 to-violet-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Total Withdrawn</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {formatCurrency(totalWithdrawn)}
              </p>
              <p className="text-sm text-purple-700 mt-2">
                All-time withdrawals
              </p>
            </div>
            <div className="text-4xl text-purple-600">💸</div>
          </div>
        </div>
      </div>

      {/* Withdrawal Statistics */}
      {withdrawalStats && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdrawal Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Total Withdrawn</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(withdrawalStats.totalWithdrawn || totalWithdrawn || 0)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {withdrawalStats.pendingWithdrawals || 
                  withdrawalsList.filter((w: any) => 
                    w.status === 'pending' || w.status === 'processing'
                  ).length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {withdrawalStats.completedWithdrawals ||
                  withdrawalsList.filter((w: any) => 
                    w.status === 'completed' || w.status === 'paid'
                  ).length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Last Withdrawal</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {withdrawalsList.length > 0
                  ? formatCurrency(withdrawalsList[0].amount || 0)
                  : 'None'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Request Withdrawal</h3>
            <p className="text-sm text-gray-600 mt-1">
              Transfer funds to your preferred payment method
            </p>
          </div>
          <button
            onClick={async () => {
              await onRefresh();
              await fetchWithdrawalStats();
            }}
            disabled={loading || statsLoading}
            className="mt-2 md:mt-0 px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading || statsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Payment Method Selection */}
          {paymentMethods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-4 border rounded-xl text-left transition-colors duration-200 ${
                      selectedMethod === method.id
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{method.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{method.name}</p>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quick Amounts
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickAmounts.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleQuickAmount(item.value)}
                  className="px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors duration-200"
                  disabled={availableBalance < dollarsToCents(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Withdrawal Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (parseFloat(value) <= centsToDollars(availableBalance)) {
                    setWithdrawAmount(value);
                    setError('');
                  }
                }}
                placeholder="Enter amount"
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                min="0.01"
                step="0.01"
                max={centsToDollars(availableBalance)}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">USD</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Available: <span className="font-semibold">{formatCurrency(availableBalance)}</span> • 
              Minimum: <span className="font-semibold">$5.00</span>
            </p>
          </div>

          {/* Withdrawal Button */}
          <div>
            <button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || withdrawing || loading || availableBalance < 500}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            >
              {withdrawing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Withdrawal...
                </>
              ) : (
                `Withdraw ${withdrawAmount ? `$${withdrawAmount}` : 'Funds'}`
              )}
            </button>
          </div>

          {/* Additional Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Withdrawal Information</h4>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Withdrawals are processed within 1-3 business days</li>
                  <li>• Minimum withdrawal amount is $5.00</li>
                  <li>• No withdrawal fees for sellers</li>
                  <li>• Funds are transferred to your selected payment method</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Withdrawal History</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track your past withdrawal requests
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {withdrawalsList.length} withdrawals
            </span>
            <div className="flex space-x-1">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={loading}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading withdrawal history...</p>
            </div>
          </div>
        ) : withdrawalsList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawalsList.map((withdrawal: any) => (
                  <tr key={withdrawal._id || withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(withdrawal.createdAt || withdrawal.date)}</div>
                      {withdrawal.estimatedArrival && (
                        <div className="text-xs text-gray-500">
                          Est: {formatDate(withdrawal.estimatedArrival)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(withdrawal.status)}`}>
                        {withdrawal.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {withdrawal.paymentMethod || 'Stripe'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {withdrawal.description || 'Withdrawal request'}
                      </div>
                      {withdrawal.failureReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {withdrawal.failureReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {withdrawal.referenceId || withdrawal.stripePayoutId ? 
                          `ID: ${(withdrawal.referenceId || withdrawal.stripePayoutId).slice(-8)}` : 
                          '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 text-gray-300">💸</div>
            <h3 className="text-lg font-medium text-gray-900">No Withdrawal History</h3>
            <p className="mt-2 text-gray-500 mb-6">
              You haven't made any withdrawal requests yet.
            </p>
            <button
              onClick={() => handleQuickAmount(10)}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Make Your First Withdrawal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawTab;