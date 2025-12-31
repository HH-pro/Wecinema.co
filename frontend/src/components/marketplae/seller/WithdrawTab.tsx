// components/marketplace/seller/WithdrawTab.tsx - UPDATED WITH $ CURRENCY
import React, { useState, useEffect } from 'react';

// Format currency function - CHANGED TO $
const formatCurrency = (amount: number) => {
  const amountInDollars = amount / 100;
  return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface StripeStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  availableBalance?: number; // in cents
  pendingBalance?: number; // in cents
  accountId?: string;
}

interface Withdrawal {
  _id: string;
  amount: number; // in cents
  status: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  destination?: string;
  description?: string;
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
  withdrawalHistory: WithdrawalHistory | null;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onWithdrawRequest: (amount: number) => void; // amount in dollars
  onRefresh: () => void;
  totalRevenue?: number; // in cents
  thisMonthRevenue?: number; // in cents
  pendingRevenue?: number; // in cents
}

const WithdrawTab: React.FC<WithdrawTabProps> = ({
  stripeStatus,
  withdrawalHistory,
  loading,
  currentPage,
  onPageChange,
  onWithdrawRequest,
  onRefresh,
  totalRevenue = 0,
  thisMonthRevenue = 0,
  pendingRevenue = 0
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // All amounts are in cents
  const availableBalance = stripeStatus?.availableBalance || 0; // in cents
  const pendingBalance = stripeStatus?.pendingBalance || 0; // in cents
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;
  const hasBalance = availableBalance > 0;

  // Convert cents to dollars for display and input
  const availableBalanceInDollars = availableBalance / 100;
  const pendingBalanceInDollars = pendingBalance / 100;

  // Preset amounts in dollars
  const presetAmounts = [
    { value: 50, label: '$50' },
    { value: 100, label: '$100' },
    { value: 250, label: '$250' },
    { value: 500, label: '$500' },
    { value: 1000, label: '$1,000' },
  ];

  // Handle preset amount selection
  const handlePresetSelect = (amountInDollars: number) => {
    if (amountInDollars <= availableBalanceInDollars) {
      setWithdrawAmount(amountInDollars.toString());
      setShowCustomInput(false);
    }
  };

  // Handle custom amount
  const handleCustomAmount = () => {
    setShowCustomInput(true);
    setWithdrawAmount('');
  };

  // Validate and submit withdrawal
  const handleSubmitWithdrawal = async () => {
    if (!canWithdraw) {
      alert('Please connect and verify your Stripe account to withdraw funds.');
      return;
    }

    const amountInDollars = parseFloat(withdrawAmount);
    if (!amountInDollars || amountInDollars <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (amountInDollars > availableBalanceInDollars) {
      alert(`Cannot withdraw more than your available balance of ${formatCurrency(availableBalance)}.`);
      return;
    }

    if (amountInDollars < 5) {
      alert('Minimum withdrawal amount is $5.00.');
      return;
    }

    if (window.confirm(`Are you sure you want to withdraw $${amountInDollars.toFixed(2)}?`)) {
      setIsProcessing(true);
      try {
        await onWithdrawRequest(amountInDollars);
        setWithdrawAmount('');
        setCustomAmount('');
        setShowCustomInput(false);
      } catch (error) {
        console.error('Withdrawal failed:', error);
        alert('Withdrawal failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Format date in US format
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
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📝';
    }
  };

  // Calculate total withdrawn amount
  const calculateTotalWithdrawn = () => {
    if (!withdrawalHistory?.withdrawals) return 0;
    
    return withdrawalHistory.withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0); // amount in cents
  };

  // Calculate success rate
  const calculateSuccessRate = () => {
    if (!withdrawalHistory?.withdrawals?.length) return 100;
    
    const total = withdrawalHistory.withdrawals.length;
    const successful = withdrawalHistory.withdrawals.filter(w => w.status === 'completed').length;
    
    return Math.round((successful / total) * 100);
  };

  const totalWithdrawn = calculateTotalWithdrawn();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading withdrawal history...</p>
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
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition duration-200 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Available Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(availableBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Pending Balance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(pendingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Processing earnings</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Withdrawn</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(totalWithdrawn)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">{withdrawalHistory?.withdrawals?.length || 0} transactions</p>
                <span className="text-xs font-medium text-green-600">
                  {calculateSuccessRate()}% success rate
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-purple-600">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-green-600">📈</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month Earnings</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(thisMonthRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-lg text-yellow-600">⏳</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(pendingRevenue)}</p>
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
                    disabled={preset.value > availableBalanceInDollars}
                    className={`px-4 py-3 rounded-lg border transition duration-200 ${
                      withdrawAmount === preset.value.toString()
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : preset.value > availableBalanceInDollars
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
                  Enter custom amount (Minimum: $5.00)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max={availableBalanceInDollars}
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
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Withdrawal Amount</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        ${parseFloat(withdrawAmount).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Balance After Withdrawal</p>
                      <p className="text-2xl font-bold text-green-700 mt-1">
                        {formatCurrency(availableBalance - (parseFloat(withdrawAmount) * 100))}
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
                    <li>• Minimum withdrawal: $5.00</li>
                    <li>• Processing time: 2-3 business days</li>
                    <li>• Funds will be transferred to your connected bank account</li>
                    <li>• No withdrawal fees for sellers</li>
                    <li>• Withdrawals processed Monday to Friday only</li>
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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {withdrawalHistory?.withdrawals?.length || 0} transactions
            </span>
            <div className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              {calculateSuccessRate()}% success rate
            </div>
          </div>
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
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destination
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
                        {withdrawal.completedAt && (
                          <div className="text-xs text-gray-500">
                            Completed: {formatDate(withdrawal.completedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-lg font-semibold ${
                          withdrawal.status === 'completed' ? 'text-green-700' : 'text-gray-900'
                        }`}>
                          {formatCurrency(withdrawal.amount)}
                        </div>
                        {withdrawal.description && (
                          <div className="text-xs text-gray-500">{withdrawal.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                            <span className="mr-1">{getStatusIcon(withdrawal.status)}</span>
                            {withdrawal.status === 'completed' ? 'Completed' :
                             withdrawal.status === 'pending' ? 'Pending' :
                             withdrawal.status === 'failed' ? 'Failed' : withdrawal.status}
                          </span>
                          {withdrawal.failureReason && (
                            <div className="text-xs text-red-600">{withdrawal.failureReason}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {withdrawal.destination || 'Bank Account'}
                        </div>
                        {withdrawal.stripePayoutId && (
                          <div className="text-xs text-gray-500">Payout ID: {withdrawal.stripePayoutId}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 font-mono">
                          {withdrawal.stripeTransferId ? (
                            <span className="truncate max-w-[120px] inline-block bg-gray-100 px-2 py-1 rounded">
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

            {/* Summary Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Total Withdrawn:</span>{' '}
                  <span className="text-lg font-bold text-green-700 ml-2">
                    {formatCurrency(totalWithdrawn)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Completed: {withdrawalHistory.withdrawals.filter(w => w.status === 'completed').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Pending: {withdrawalHistory.withdrawals.filter(w => w.status === 'pending').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pagination */}
        {withdrawalHistory?.pagination && withdrawalHistory.pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {withdrawalHistory.pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
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