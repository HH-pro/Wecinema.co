// components/marketplae/seller/WithdrawBalance.tsx
import React, { useState, useEffect } from 'react';

interface BalanceInfo {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastPayout?: string;
  nextPayout?: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  arrivalDate: string;
  createdAt: string;
}

interface WithdrawBalanceProps {
  stripeStatus: {
    connected: boolean;
    chargesEnabled: boolean;
    accountId?: string;
  };
  onWithdrawSuccess?: () => void;
}

const WithdrawBalance: React.FC<WithdrawBalanceProps> = ({ 
  stripeStatus,
  onWithdrawSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Fetch balance info
  const fetchBalance = async () => {
    if (!stripeStatus.connected || !stripeStatus.chargesEnabled) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/stripe/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalanceInfo(data);
      } else {
        // For testing - mock data
        setBalanceInfo({
          availableBalance: 25000, // $250.00
          pendingBalance: 7500,    // $75.00
          currency: 'usd',
          lastPayout: '2024-01-15',
          nextPayout: '2024-01-22'
        });
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      // Mock data for testing
      setBalanceInfo({
        availableBalance: 15000, // $150.00
        pendingBalance: 5000,    // $50.00
        currency: 'usd'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch payout history
  const fetchPayoutHistory = async () => {
    try {
      const response = await fetch('/api/marketplace/stripe/payouts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPayoutHistory(data);
      }
    } catch (err) {
      console.error('Error fetching payout history:', err);
    }
  };

  useEffect(() => {
    if (stripeStatus.connected && stripeStatus.chargesEnabled) {
      fetchBalance();
      fetchPayoutHistory();
    }
  }, [stripeStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: balanceInfo?.currency || 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const minAmount = 1.00;
    const maxAmount = balanceInfo ? balanceInfo.availableBalance / 100 : 0;

    if (amount < minAmount) {
      setError(`Minimum withdrawal is $${minAmount.toFixed(2)}`);
      return;
    }

    if (amount > maxAmount) {
      setError(`Amount exceeds available balance of ${formatCurrency(balanceInfo!.availableBalance)}`);
      return;
    }

    try {
      setWithdrawLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/marketplace/stripe/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amount })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setSuccess(`Withdrawal request for ${formatCurrency(amount * 100)} submitted successfully!`);
      setWithdrawAmount('');
      
      // Refresh data
      setTimeout(() => {
        fetchBalance();
        fetchPayoutHistory();
        if (onWithdrawSuccess) {
          onWithdrawSuccess();
        }
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (balanceInfo) {
      setWithdrawAmount((balanceInfo.availableBalance / 100).toString());
    }
  };

  // If Stripe not connected
  if (!stripeStatus.connected || !stripeStatus.chargesEnabled) {
    return null; // Don't show withdraw component if not connected
  }

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Withdraw Earnings</h2>
            <p className="text-gray-600 text-sm">Transfer funds to your bank account</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-xl">
            <span className="text-2xl">💰</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading balance information...</p>
          </div>
        ) : balanceInfo ? (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Available Balance</h3>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(balanceInfo.availableBalance)}
                </p>
                <p className="text-sm text-gray-500">Ready to withdraw</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Pending Balance</h3>
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(balanceInfo.pendingBalance)}
                </p>
                <p className="text-sm text-gray-500">Available in 7 days</p>
              </div>
            </div>

            {/* Withdraw Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-4">Withdraw Funds</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Withdraw
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={balanceInfo.availableBalance / 100}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="pl-8 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={handleMaxAmount}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Available: {formatCurrency(balanceInfo.availableBalance)}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 text-sm">{success}</p>
                  </div>
                )}

                <button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
                >
                  {withdrawLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Withdraw Funds
                    </>
                  )}
                </button>
              </div>

              {/* Info Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>2-5 business days</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>No withdrawal fees</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Min: $1.00</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Secure & encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout History Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg className={`w-4 h-4 mr-2 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {showHistory ? 'Hide Payout History' : 'Show Payout History'}
              </button>
            </div>

            {/* Payout History */}
            {showHistory && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-medium text-gray-900 mb-4">Recent Payouts</h3>
                {payoutHistory.length > 0 ? (
                  <div className="space-y-3">
                    {payoutHistory.map((payout) => (
                      <div key={payout.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(payout.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(payout.createdAt)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          payout.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-3xl mb-2">📄</div>
                    <p>No payout history yet</p>
                    <p className="text-sm mt-1">Your withdrawals will appear here</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">❌</div>
            <p>Unable to load balance information</p>
            <button
              onClick={fetchBalance}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawBalance;