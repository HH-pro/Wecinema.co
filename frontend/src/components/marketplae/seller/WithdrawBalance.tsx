// components/marketplace/seller/WithdrawBalance.tsx
import React, { useState, useEffect } from 'react';
import paymentsApi from '../../../api/paymentsApi';

interface StripeStatus {
  connected?: boolean;
  chargesEnabled?: boolean;
  availableBalance?: number; // in cents
  pendingBalance?: number; // in cents
}

interface WithdrawBalanceProps {
  stripeStatus: StripeStatus;
  availableBalance: number; // in cents
  pendingBalance: number; // in cents;
  onWithdrawSuccess: (amount: number) => void;
  totalEarnings?: number; // in cents
  thisMonthEarnings?: number; // in cents
  formatCurrency?: (amountInCents: number) => string;
  userId?: string;
}

const WithdrawBalance: React.FC<WithdrawBalanceProps> = ({
  stripeStatus,
  availableBalance: propAvailableBalance,
  pendingBalance: propPendingBalance,
  onWithdrawSuccess,
  totalEarnings = 0,
  thisMonthEarnings = 0,
  formatCurrency: formatCurrencyProp,
  userId
}) => {
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveAvailableBalance, setLiveAvailableBalance] = useState<number>(propAvailableBalance);
  const [livePendingBalance, setLivePendingBalance] = useState<number>(propPendingBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use provided formatCurrency or default to paymentsApi
  const formatCurrency = formatCurrencyProp || paymentsApi.formatCurrency;
  
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;
  const MIN_WITHDRAWAL = 500; // $5 in cents

  // Fetch live balance data
  const fetchLiveBalance = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch withdrawal history which includes balance info
      const response = await paymentsApi.getWithdrawalHistory({ limit: 1 });
      
      if (response.success && response.data?.balance) {
        const { availableBalance, pendingBalance } = response.data.balance;
        setLiveAvailableBalance(availableBalance || 0);
        setLivePendingBalance(pendingBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching live balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchLiveBalance();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveBalance, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Update live balances when props change
  useEffect(() => {
    setLiveAvailableBalance(propAvailableBalance);
    setLivePendingBalance(propPendingBalance);
  }, [propAvailableBalance, propPendingBalance]);

  // Handle withdrawal with paymentsApi
  const handleSubmitWithdrawal = async () => {
    const amountInDollars = parseFloat(withdrawAmount);
    if (!amountInDollars || amountInDollars <= 0 || isNaN(amountInDollars)) {
      alert('Please enter a valid amount.');
      return;
    }

    const amountInCents = Math.round(amountInDollars * 100);
    
    // Validate amount
    if (amountInCents > liveAvailableBalance) {
      alert(`Cannot withdraw more than ${formatCurrency(liveAvailableBalance)}`);
      return;
    }

    if (amountInCents < MIN_WITHDRAWAL) {
      alert(`Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL)}`);
      return;
    }

    if (window.confirm(`Withdraw ${formatCurrency(amountInCents)} to your bank account?`)) {
      setIsProcessing(true);
      try {
        // Use paymentsApi for withdrawal
        const response = await paymentsApi.requestWithdrawal(amountInCents);
        
        if (response.success) {
          alert('Withdrawal request submitted successfully!');
          setWithdrawAmount('');
          setShowWithdrawForm(false);
          
          // Update local balance immediately
          setLiveAvailableBalance(prev => prev - amountInCents);
          
          // Call parent callback
          if (onWithdrawSuccess) {
            onWithdrawSuccess(amountInCents);
          }
          
          // Refresh live data after successful withdrawal
          setTimeout(() => {
            fetchLiveBalance();
          }, 1000);
        } else {
          alert(`Withdrawal failed: ${response.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Withdrawal failed:', error);
        alert('Withdrawal failed. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleWithdrawClick = () => {
    if (!canWithdraw) {
      alert('Please complete your Stripe verification to withdraw funds.');
      return;
    }
    setShowWithdrawForm(true);
  };

  // Format input for better UX
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    setWithdrawAmount(value);
  };

  // Calculate max amount for input
  const maxAmountInDollars = (liveAvailableBalance / 100).toFixed(2);
  const minAmountInDollars = (MIN_WITHDRAWAL / 100).toFixed(2);

  // Format available balance for display
  const getFormattedBalance = () => {
    if (isRefreshing) {
      return (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          <span className="text-gray-500">Updating...</span>
        </div>
      );
    }
    
    return formatCurrency(liveAvailableBalance);
  };

  if (liveAvailableBalance <= 0) {
    return (
      <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-3 rounded-xl mr-4 shadow-sm">
            <span className="text-xl text-white">💰</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your Earnings Overview</h3>
            <div className="flex items-baseline gap-6 mt-2">
              <div>
                <p className="text-sm text-gray-600">Available to withdraw</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(0)}
                </p>
              </div>
              {pendingBalance > 0 && (
                <div className="border-l border-gray-200 pl-4">
                  <p className="text-sm text-gray-600">Pending Balance</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatCurrency(livePendingBalance)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Complete orders to start earning. Pending balance becomes available after order completion.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
      {/* Live Data Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="relative mr-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute"></div>
            <div className="w-2 h-2 bg-green-600 rounded-full relative"></div>
          </div>
          <span className="text-sm font-medium text-gray-700">Live Balance</span>
        </div>
        <button
          onClick={fetchLiveBalance}
          disabled={isRefreshing}
          className="text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
        >
          <svg 
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-3 rounded-xl mr-4 shadow-sm">
            <span className="text-xl text-white">💰</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Your Earnings Overview (USD)</h3>
            <div className="flex flex-wrap items-baseline gap-6 mt-2">
              <div>
                <p className="text-sm text-gray-600">Available to withdraw</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getFormattedBalance()}
                </p>
                {userId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Account: {userId?.slice(-6)}...
                  </p>
                )}
              </div>
              
              {livePendingBalance > 0 && (
                <div className="border-l border-emerald-200 pl-4">
                  <p className="text-sm text-gray-600">Pending Balance</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {formatCurrency(livePendingBalance)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    From active orders
                  </p>
                </div>
              )}
              
              {totalEarnings > 0 && (
                <div className="border-l border-emerald-200 pl-4">
                  <p className="text-sm text-gray-600">Total Earnings</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatCurrency(totalEarnings)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Lifetime earnings
                  </p>
                </div>
              )}
              
              {thisMonthEarnings > 0 && (
                <div className="border-l border-emerald-200 pl-4">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(thisMonthEarnings)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Current month
                  </p>
                </div>
              )}
            </div>
            
            {/* Balance progress bar */}
            {liveAvailableBalance > 0 && totalEarnings > 0 && (
              <div className="mt-3 max-w-md">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Available</span>
                  <span>{((liveAvailableBalance / totalEarnings) * 100).toFixed(0)}% of total</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((liveAvailableBalance / totalEarnings) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {!canWithdraw && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Complete Stripe verification to withdraw funds
              </p>
            )}
          </div>
        </div>
        
        {/* Withdrawal Actions */}
        <div className="flex gap-3">
          {showWithdrawForm ? (
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">
              <div className="w-full md:w-auto">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={handleAmountChange}
                    placeholder={minAmountInDollars}
                    className="pl-8 pr-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full md:w-40"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center md:text-left">
                  Min: {formatCurrency(MIN_WITHDRAWAL)} • Max: {formatCurrency(liveAvailableBalance)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitWithdrawal}
                  disabled={!withdrawAmount || isProcessing || 
                           parseFloat(withdrawAmount) * 100 < MIN_WITHDRAWAL ||
                           parseFloat(withdrawAmount) * 100 > liveAvailableBalance}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2 min-w-24 justify-center"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    'Withdraw Now'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowWithdrawForm(false);
                    setWithdrawAmount('');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleWithdrawClick}
                disabled={!canWithdraw || liveAvailableBalance < MIN_WITHDRAWAL}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-6 rounded-xl transition duration-200 shadow-md hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Withdraw Funds
              </button>
              
              {liveAvailableBalance < MIN_WITHDRAWAL && canWithdraw && (
                <p className="text-xs text-amber-600 text-center">
                  Minimum {formatCurrency(MIN_WITHDRAWAL)} required
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {showWithdrawForm && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Processing Time</p>
              <p className="text-xs text-gray-600">2-3 business days</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Transfer Fee</p>
              <p className="text-xs text-gray-600">No fees</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Available After</p>
              <p className="text-xs text-gray-600">Order completion</p>
            </div>
          </div>
          
          {/* Quick withdrawal buttons */}
          <div className="mt-3 flex justify-center gap-2">
            <button
              onClick={() => setWithdrawAmount((liveAvailableBalance / 200).toFixed(2))}
              className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded"
            >
              50%
            </button>
            <button
              onClick={() => setWithdrawAmount((liveAvailableBalance / 100).toFixed(2))}
              className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded"
            >
              100%
            </button>
            <button
              onClick={() => setWithdrawAmount((MIN_WITHDRAWAL / 100).toFixed(2))}
              className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded"
            >
              Min
            </button>
          </div>
        </div>
      )}
      
      {/* Last Updated Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Live balance updates every 30 seconds • Last updated: just now
        </p>
      </div>
    </div>
  );
};

export default WithdrawBalance;