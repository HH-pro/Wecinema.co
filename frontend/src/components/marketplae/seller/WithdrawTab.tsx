// components/marketplace/seller/WithdrawBalance.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [lastUpdated, setLastUpdated] = useState<string>('just now');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Use provided formatCurrency or default to paymentsApi
  const formatCurrency = formatCurrencyProp || paymentsApi.formatCurrency;
  
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;
  const MIN_WITHDRAWAL = 500; // $5 in cents

  // Fetch live balance data - with better error handling
  const fetchLiveBalance = async (silent: boolean = false) => {
    // Don't fetch if component is unmounted
    if (!mountedRef.current) return;
    
    // Don't fetch if already refreshing
    if (isRefreshing && !silent) return;
    
    if (!silent) {
      setIsRefreshing(true);
    }
    
    try {
      // Fetch withdrawal history which includes balance info
      const response = await paymentsApi.getWithdrawalHistory({ limit: 1 });
      
      if (response.success && response.data?.balance) {
        const { availableBalance, pendingBalance } = response.data.balance;
        const newAvailableBalance = availableBalance || propAvailableBalance || 0;
        const newPendingBalance = pendingBalance || propPendingBalance || 0;
        
        // Only update state if values actually changed
        if (newAvailableBalance !== liveAvailableBalance) {
          setLiveAvailableBalance(newAvailableBalance);
        }
        if (newPendingBalance !== livePendingBalance) {
          setLivePendingBalance(newPendingBalance);
        }
        
        setLastUpdated(new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }));
        
        console.log('Live balance updated:', { 
          available: newAvailableBalance, 
          pending: newPendingBalance 
        });
      }
    } catch (error) {
      console.error('Error fetching live balance:', error);
      // Don't show error to user for silent refreshes
    } finally {
      if (!silent && mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  };

  // Setup auto-refresh
  const setupAutoRefresh = () => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    if (autoRefreshEnabled) {
      // Refresh every 60 seconds (reduced from 30)
      refreshIntervalRef.current = setInterval(() => {
        fetchLiveBalance(true); // Silent refresh
      }, 60000);
    }
  };

  // Initial fetch and setup
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchLiveBalance();
    
    // Enable auto-refresh by default
    setAutoRefreshEnabled(true);
    
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Handle auto-refresh toggle
  useEffect(() => {
    setupAutoRefresh();
  }, [autoRefreshEnabled]);

  // Update live balances when props change (but not on every render)
  useEffect(() => {
    // Only update if props have actually changed
    if (propAvailableBalance !== liveAvailableBalance) {
      setLiveAvailableBalance(propAvailableBalance);
    }
    if (propPendingBalance !== livePendingBalance) {
      setLivePendingBalance(propPendingBalance);
    }
  }, [propAvailableBalance, propPendingBalance]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchLiveBalance();
  };

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
          // Update local balance immediately (optimistic update)
          setLiveAvailableBalance(prev => {
            const newBalance = prev - amountInCents;
            console.log('Balance after withdrawal:', { old: prev, amount: amountInCents, new: newBalance });
            return newBalance;
          });
          
          alert('Withdrawal request submitted successfully!');
          setWithdrawAmount('');
          setShowWithdrawForm(false);
          
          // Call parent callback
          if (onWithdrawSuccess) {
            onWithdrawSuccess(amountInCents);
          }
          
          // Refresh live data after successful withdrawal (delayed)
          setTimeout(() => {
            fetchLiveBalance();
          }, 2000);
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
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600 mr-2"></div>
          <span className="text-gray-500">Updating...</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center">
        <span className="text-2xl font-bold text-gray-900">
          {formatCurrency(liveAvailableBalance)}
        </span>
        {autoRefreshEnabled && (
          <div className="ml-2 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    );
  };

  if (liveAvailableBalance <= 0) {
    return (
      <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-3 rounded-xl mr-4 shadow-sm">
              <span className="text-xl text-white">💰</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Your Earnings Overview</h3>
              <p className="text-sm text-gray-600">Available to withdraw</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(0)}
              </p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
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
        <div className="mt-3">
          <p className="text-sm text-gray-500">
            Complete orders to start earning. Pending balance becomes available after order completion.
          </p>
          {livePendingBalance > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                Pending Balance: {formatCurrency(livePendingBalance)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
      {/* Header with auto-refresh toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-2 rounded-lg mr-3">
            <span className="text-lg text-white">💰</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Live Balance</h3>
            <p className="text-xs text-gray-500">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={autoRefreshEnabled}
                  onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${autoRefreshEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoRefreshEnabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm font-medium text-gray-700">
                Auto-refresh
              </div>
            </label>
          </div>
          
          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="text-sm bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium py-1.5 px-3 rounded-lg flex items-center gap-1"
          >
            <svg 
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1">
          {/* Balance Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available Balance Card */}
            <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Available to withdraw</p>
                {autoRefreshEnabled && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              {getFormattedBalance()}
              <p className="text-xs text-gray-500 mt-2">
                Ready for immediate withdrawal
              </p>
              {userId && (
                <p className="text-xs text-gray-500 mt-1">
                  Account: {userId?.slice(-6)}...
                </p>
              )}
            </div>
            
            {/* Pending Balance Card */}
            <div className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-2">Pending Balance</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatCurrency(livePendingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                From active orders • Available after completion
              </p>
            </div>
          </div>
          
          {/* Additional Earnings Info */}
          {(totalEarnings > 0 || thisMonthEarnings > 0) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {totalEarnings > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              )}
              
              {thisMonthEarnings > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="font-medium text-blue-700">
                    {formatCurrency(thisMonthEarnings)}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Balance progress bar - Only show if meaningful */}
          {liveAvailableBalance > 0 && totalEarnings > liveAvailableBalance && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Available Balance</span>
                <span>{((liveAvailableBalance / totalEarnings) * 100).toFixed(0)}% of total</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((liveAvailableBalance / totalEarnings) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {!canWithdraw && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">
                ⚠️ Complete Stripe verification to withdraw funds
              </p>
            </div>
          )}
        </div>
        
        {/* Withdrawal Actions */}
        <div className="lg:w-96">
          {showWithdrawForm ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-3">Withdraw Funds</h4>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-2">
                  Amount to withdraw (USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="text"
                    value={withdrawAmount}
                    onChange={handleAmountChange}
                    placeholder={`Enter amount (min ${minAmountInDollars})`}
                    className="pl-8 pr-4 py-3 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full"
                    maxLength={10}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    Min: {formatCurrency(MIN_WITHDRAWAL)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Max: {formatCurrency(liveAvailableBalance)}
                  </span>
                </div>
                
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setWithdrawAmount((liveAvailableBalance / 200).toFixed(2))}
                    className="flex-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-1.5 rounded"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount((liveAvailableBalance / 100).toFixed(2))}
                    className="flex-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-1.5 rounded"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(minAmountInDollars)}
                    className="flex-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 py-1.5 rounded"
                  >
                    Min
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitWithdrawal}
                  disabled={!withdrawAmount || isProcessing || 
                           parseFloat(withdrawAmount) * 100 < MIN_WITHDRAWAL ||
                           parseFloat(withdrawAmount) * 100 > liveAvailableBalance}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
                  className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition duration-200"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Processing</p>
                    <p className="text-xs text-gray-600">2-3 days</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Fee</p>
                    <p className="text-xs text-gray-600">No fees</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Min Amount</p>
                    <p className="text-xs text-gray-600">{formatCurrency(MIN_WITHDRAWAL)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">💰</div>
                <h4 className="font-medium text-gray-900">Ready to Withdraw</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Transfer funds to your bank account
                </p>
              </div>
              
              <button
                onClick={handleWithdrawClick}
                disabled={!canWithdraw || liveAvailableBalance < MIN_WITHDRAWAL}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Withdraw Funds
              </button>
              
              {liveAvailableBalance < MIN_WITHDRAWAL && canWithdraw && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  Minimum {formatCurrency(MIN_WITHDRAWAL)} required
                </p>
              )}
              
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  Funds typically arrive in 2-3 business days
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Auto-refresh status */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {autoRefreshEnabled 
            ? `Live balance updates every 60 seconds • Last updated: ${lastUpdated}`
            : 'Auto-refresh is disabled • Click refresh to update balance'
          }
        </p>
      </div>
    </div>
  );
};

export default WithdrawBalance;