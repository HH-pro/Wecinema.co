// components/marketplace/seller/WithdrawTab.tsx
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';
import { formatCurrency } from '../../../utils/marketplace';

interface StripeStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
}

interface BalanceData {
  availableBalance: number; // in cents
  pendingBalance: number; // in cents
  totalEarnings: number; // in cents
  totalWithdrawn: number; // in cents
  walletBalance: number; // in cents
  currency: string;
  lastWithdrawal: string | null;
  nextPayoutDate: string;
}

interface Withdrawal {
  _id: string;
  amount: number; // in cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stripeTransferId?: string;
  stripePayoutId?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  destination?: string;
  description?: string;
  estimatedArrival?: string;
}

interface WithdrawalHistory {
  withdrawals: Withdrawal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface WithdrawTabProps {
  stripeStatus: StripeStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

const WithdrawTab: React.FC<WithdrawTabProps> = ({
  stripeStatus,
  loading,
  onRefresh
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);

  const availableBalance = balanceData?.availableBalance || 0; // in cents
  const pendingBalance = balanceData?.pendingBalance || 0; // in cents
  const totalEarnings = balanceData?.totalEarnings || 0; // in cents
  const totalWithdrawn = balanceData?.totalWithdrawn || 0; // in cents
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;
  const hasBalance = availableBalance > 0;

  // Preset amounts in cents ($50 = 5000 cents)
  const presetAmounts = [
    { value: 5000, label: '$50' },
    { value: 10000, label: '$100' },
    { value: 25000, label: '$250' },
    { value: 50000, label: '$500' },
    { value: 100000, label: '$1,000' },
  ];

  const MIN_WITHDRAWAL = 500; // $5 in cents

  // Fetch balance and withdrawal history
  const fetchData = async () => {
    try {
      setPageLoading(true);
      
      const [balanceResponse, historyResponse] = await Promise.all([
        marketplaceApi.earnings.getBalance(),
        marketplaceApi.earnings.getHistory({ 
          page: currentPage, 
          limit: 10,
          type: 'withdrawal' 
        })
      ]);
      
      if (balanceResponse.success) {
        setBalanceData(balanceResponse.data);
      }
      
      if (historyResponse.success) {
        setWithdrawalHistory(historyResponse.data);
      }
    } catch (error) {
      console.error('Error fetching withdrawal data:', error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (stripeStatus?.chargesEnabled) {
      fetchData();
    }
  }, [stripeStatus, currentPage]);

  // Handle preset amount selection
  const handlePresetSelect = (amountInCents: number) => {
    if (amountInCents <= availableBalance) {
      setWithdrawAmount((amountInCents / 100).toString()); // Convert cents to dollars
      setShowCustomInput(false);
    }
  };

  // Handle custom amount
  const handleCustomAmount = () => {
    setShowCustomInput(true);
    setWithdrawAmount('');
  };

  // Convert dollar amount to cents for API
  const dollarsToCents = (dollars: number): number => {
    return Math.round(dollars * 100);
  };

  // Convert cents to dollars for display
  const centsToDollars = (cents: number): number => {
    return cents / 100;
  };

  // Validate and submit withdrawal
  const handleSubmitWithdrawal = async () => {
    if (!canWithdraw) {
      alert('Please connect and verify your Stripe account to withdraw funds.');
      return;
    }

    const amountInDollars = parseFloat(withdrawAmount);
    if (!amountInDollars || amountInDollars <= 0 || isNaN(amountInDollars)) {
      alert('Please enter a valid amount.');
      return;
    }

    const amountInCents = dollarsToCents(amountInDollars);
    
    if (amountInCents > availableBalance) {
      alert(`Cannot withdraw more than your available balance of ${formatCurrency(availableBalance)}.`);
      return;
    }

    if (amountInCents < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL)}.`);
      return;
    }

    if (window.confirm(`Are you sure you want to withdraw ${formatCurrency(amountInCents)}?`)) {
      setIsProcessing(true);
      try {
        // Send amount in cents to API
        const response = await marketplaceApi.earnings.withdraw({ 
          amount: amountInCents 
        });
        
        if (response.success) {
          alert('Withdrawal request submitted successfully!');
          setWithdrawAmount('');
          setCustomAmount('');
          setShowCustomInput(false);
          // Refresh data
          fetchData();
        } else {
          alert(`Withdrawal failed: ${response.error}`);
        }
      } catch (error) {
        console.error('Withdrawal failed:', error);
        alert('Failed to process withdrawal. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'failed':
        return '❌';
      default:
        return '📝';
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading withdrawal data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdraw Funds</h1>
          <p className="text-gray-600 mt-1">Transfer your earnings to your bank account</p>
        </div>
        <button
          onClick={() => {
            onRefresh();
            fetchData();
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Balance Summary - All in USD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(availableBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(pendingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Processing earnings</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-xs text-gray-500 mt-1">All-time income</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Withdrawn</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalWithdrawn)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Paid to your account</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Withdrawal</h2>
        
        {!canWithdraw ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="w-5 h-5 text-yellow-600 mr-3 mt-0.5">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.73 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-yellow-800">Account Setup Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please connect and verify your Stripe account to withdraw funds.
                </p>
              </div>
            </div>
          </div>
        ) : !hasBalance ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-5 h-5 text-blue-600 mr-3">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-800">
                  Your available balance is $0. Complete more orders to start earning!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Preset Amounts */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Quick Amounts</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    disabled={preset.value > availableBalance}
                    className={`px-4 py-3 rounded-lg border transition duration-200 ${
                      withdrawAmount === (preset.value / 100).toString()
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : preset.value > availableBalance
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{preset.label}</span>
                  </button>
                ))}
                <button
                  onClick={handleCustomAmount}
                  className={`px-4 py-3 rounded-lg border transition duration-200 ${
                    showCustomInput
                      ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                  }`}
                >
                  <span className="font-medium">Custom</span>
                </button>
              </div>
            </div>

            {/* Custom Amount Input */}
            {showCustomInput && (
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-2">
                  Enter custom amount (Minimum: {formatCurrency(MIN_WITHDRAWAL)})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min={(MIN_WITHDRAWAL / 100).toFixed(2)}
                    max={(availableBalance / 100).toFixed(2)}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomAmount(value);
                      setWithdrawAmount(value);
                    }}
                    placeholder="0.00"
                    className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">USD</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Available: {formatCurrency(availableBalance)}
                </p>
              </div>
            )}

            {/* Selected Amount Display */}
            {withdrawAmount && (
              <div className="mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Withdrawal Amount</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        ${parseFloat(withdrawAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Remaining Balance</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {formatCurrency(availableBalance - dollarsToCents(parseFloat(withdrawAmount)))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubmitWithdrawal}
                disabled={!withdrawAmount || isProcessing || parseFloat(withdrawAmount) <= 0}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-lg transition duration-200 shadow-md hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Request Withdrawal
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Withdrawal Information</h3>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Minimum withdrawal: {formatCurrency(MIN_WITHDRAWAL)}</li>
                    <li>• Processing time: 2-3 business days</li>
                    <li>• Funds will be transferred to your connected bank account</li>
                    <li>• No withdrawal fees for sellers</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Withdrawal History</h2>
          <span className="text-sm text-gray-500">
            {withdrawalHistory?.withdrawals?.length || 0} transactions
          </span>
        </div>

        {!withdrawalHistory?.withdrawals?.length ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 text-gray-300">💰</div>
            <h3 className="text-lg font-medium text-gray-900">No Withdrawals Yet</h3>
            <p className="text-gray-500 mt-2 mb-6">
              {hasBalance
                ? 'Request your first withdrawal to transfer earnings to your bank account.'
                : 'Complete orders to earn money and make withdrawals.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount (USD)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transfer ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawalHistory.withdrawals.map((withdrawal) => (
                  <tr key={withdrawal._id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(withdrawal.createdAt)}</div>
                      {withdrawal.estimatedArrival && (
                        <div className="text-xs text-gray-500">
                          Est: {formatDate(withdrawal.estimatedArrival)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </div>
                      {withdrawal.completedAt && (
                        <div className="text-xs text-gray-500">
                          Completed: {formatDate(withdrawal.completedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                        <span className="mr-1">{getStatusIcon(withdrawal.status)}</span>
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </span>
                      {withdrawal.failureReason && (
                        <div className="text-xs text-red-600 mt-1">{withdrawal.failureReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {withdrawal.description || 'Withdrawal to bank account'}
                      </div>
                      {withdrawal.destination && (
                        <div className="text-xs text-gray-500">
                          To: {withdrawal.destination}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 font-mono">
                        {withdrawal.stripeTransferId ? (
                          <span className="truncate max-w-[120px] inline-block">
                            {withdrawal.stripeTransferId}
                          </span>
                        ) : (
                          'Pending...'
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {withdrawalHistory?.pagination && withdrawalHistory.pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {withdrawalHistory.pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage === withdrawalHistory.pagination.pages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawTab;