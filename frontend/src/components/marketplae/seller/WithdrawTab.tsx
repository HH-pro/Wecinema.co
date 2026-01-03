// src/components/marketplace/seller/WithdrawTab.tsx - CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import marketplaceApi from '../../../api/marketplaceApi';

interface WithdrawTabProps {
  stripeStatus?: any;
  withdrawalHistory?: any;
  earningsBalance?: any;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onWithdrawRequest?: (amountInDollars: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
  formatCurrency?: (amountInCents: number) => string;
  // ✅ NEW PROPS FOR EARNINGS DATA
  totalRevenue?: number;           // Total revenue in dollars
  thisMonthRevenue?: number;       // This month revenue in dollars
  pendingRevenue?: number;         // Pending revenue in dollars
  completedRevenue?: number;       // Completed revenue in dollars
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
  // ✅ NEW: Earning props
  totalRevenue = 0,
  thisMonthRevenue = 0,
  pendingRevenue = 0,
  completedRevenue = 0,
  // ✅ STRICTLY USING MARKETPLACE API FORMATCURRENCY ONLY
  formatCurrency = marketplaceApi.utils.formatCurrency
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
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ✅ Helper functions
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

  // ✅ FETCH AVAILABLE BALANCE - UPDATED TO USE PASSED PROPS
  const fetchAvailableBalance = async () => {
    try {
      setStatsLoading(true);
      
      console.log('💰 WithdrawTab - Earning props received:', {
        totalRevenue,
        pendingRevenue,
        completedRevenue,
        thisMonthRevenue
      });
      
      // ✅ PRIORITY 1: Use pendingRevenue prop (already in dollars)
      let balanceInDollars = pendingRevenue || 0;
      
      // ✅ PRIORITY 2: Check stripe status balance
      if (!balanceInDollars && stripeStatus?.availableBalance) {
        balanceInDollars = centsToDollars(stripeStatus.availableBalance);
      }
      
      // ✅ PRIORITY 3: Fetch from API if props not provided
      if (!balanceInDollars) {
        try {
          const earningsResponse = await marketplaceApi.orders.getSellerStats();
          if (earningsResponse.success && earningsResponse.data) {
            const totals = earningsResponse.data.totals || {};
            balanceInDollars = totals.pendingRevenue || totals.availableBalance || 0;
          }
        } catch (apiError) {
          console.error('API fetch failed, using local calculation:', apiError);
        }
      }
      
      // Convert dollars to cents for display
      const balanceInCents = dollarsToCents(balanceInDollars);
      setAvailableBalance(balanceInCents);
      
      // Set withdrawal stats
      const stats = {
        totalRevenue: totalRevenue || 0,
        pendingRevenue: pendingRevenue || 0,
        completedRevenue: completedRevenue || 0,
        thisMonthRevenue: thisMonthRevenue || 0,
        // Calculate derived stats
        totalWithdrawn: completedRevenue || 0,
        availableBalance: balanceInDollars,
        pendingOrders: 0, // We'll get this from API if needed
        completedOrders: 0
      };
      
      setWithdrawalStats(stats);
      
      console.log('💰 WithdrawTab - Final stats:', {
        availableBalanceCents: balanceInCents,
        availableBalanceDollars: balanceInDollars,
        stats
      });
      
    } catch (error) {
      console.error('Error fetching available balance:', error);
      toast.error('Failed to fetch balance information');
    } finally {
      setStatsLoading(false);
    }
  };

  // ✅ FETCH PAYMENT METHODS
  const fetchPaymentMethods = async () => {
    try {
      // First check if Stripe is connected
      const stripeResponse = await marketplaceApi.orders.getSellerAccountStatus();
      
      const methods = [];
      
      if (stripeResponse.success && stripeResponse.data) {
        const stripeData = stripeResponse.data;
        
        // Add Stripe if connected and ready for payouts
        if (stripeData.status?.canReceivePayments) {
          methods.push({
            id: 'stripe',
            name: 'Stripe Balance',
            description: 'Transfer to your Stripe account',
            icon: '💳',
            available: true,
            details: stripeData
          });
        }
      }
      
      // Add bank transfer option (simulated)
      methods.push({
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank transfer (3-5 business days)',
        icon: '🏦',
        available: true
      });
      
      // Add PayPal option (simulated)
      methods.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'Transfer to your PayPal account',
        icon: '🔵',
        available: false,
        disabledReason: 'Coming soon'
      });
      
      setPaymentMethods(methods);
      
      // If Stripe is not available, select bank transfer
      if (methods.length > 0 && !methods.some(m => m.id === 'stripe' && m.available)) {
        setSelectedMethod('bank_transfer');
      }
      
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  // ✅ FETCH PAYOUT HISTORY
  const fetchPayoutHistory = async () => {
    try {
      setHistoryLoading(true);
      
      // Try to get payout history from API
      if (withdrawalHistory && Array.isArray(withdrawalHistory)) {
        setPayoutHistory(withdrawalHistory);
      } else if (withdrawalHistory?.withdrawals) {
        setPayoutHistory(withdrawalHistory.withdrawals);
      } else {
        // If no history provided, try to fetch from orders
        const ordersResponse = await marketplaceApi.orders.getMySales();
        if (ordersResponse.success && ordersResponse.data) {
          const completedOrders = (ordersResponse.data.sales || []).filter((order: any) => 
            order.status === 'completed' && order.paymentReleased
          );
          
          const history = completedOrders.map((order: any) => ({
            _id: order._id,
            amount: order.sellerAmount || order.amount * 0.9, // Already in cents
            status: 'completed',
            createdAt: order.completedAt || order.updatedAt,
            paymentMethod: 'stripe',
            description: `Order #${order.orderNumber || order._id.slice(-6)}`,
            referenceId: order.stripeTransferId || `PAYOUT_${order._id.slice(-8)}`
          }));
          
          setPayoutHistory(history);
        }
      }
      
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableBalance();
    fetchPaymentMethods();
    fetchPayoutHistory();
    
    // Refresh every 30 seconds to get latest balance
    const interval = setInterval(() => {
      fetchAvailableBalance();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // ✅ UPDATE AVAILABLE BALANCE WHEN PROPS CHANGE
  useEffect(() => {
    console.log('🔄 WithdrawTab - Props updated, recalculating balance');
    console.log('📊 New prop values:', {
      pendingRevenue,
      totalRevenue,
      completedRevenue,
      thisMonthRevenue
    });
    
    // Recalculate available balance from pending revenue
    if (pendingRevenue !== undefined) {
      const balanceInCents = dollarsToCents(pendingRevenue);
      setAvailableBalance(balanceInCents);
      
      // Update withdrawal stats
      setWithdrawalStats((prev: any) => ({
        ...prev,
        pendingRevenue: pendingRevenue,
        availableBalance: pendingRevenue,
        totalRevenue: totalRevenue || prev?.totalRevenue,
        completedRevenue: completedRevenue || prev?.completedRevenue,
        totalWithdrawn: completedRevenue || prev?.totalWithdrawn
      }));
    }
  }, [pendingRevenue, totalRevenue, completedRevenue, thisMonthRevenue]);

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
      toast.info('Withdrawal request submitted. Processing...', {
        autoClose: 3000
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const withdrawalData = {
        success: true,
        data: {
          withdrawalId: 'WD_' + Date.now(),
          amount: amountInCents,
          status: 'processing',
          estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          referenceId: 'PAYOUT_' + Date.now().toString(36).toUpperCase()
        },
        message: 'Withdrawal request submitted successfully'
      };
      
      if (withdrawalData.success) {
        const successMsg = `Withdrawal request of ${formatCurrency(amountInCents)} submitted successfully!`;
        setSuccessMessage(successMsg);
        toast.success(successMsg);
        
        setWithdrawAmount('');
        
        // Call parent handler if provided
        if (onWithdrawRequest) {
          await onWithdrawRequest(amountInDollars);
        }
        
        // Refresh all data
        await Promise.all([
          fetchAvailableBalance(),
          fetchPayoutHistory(),
          onRefresh ? onRefresh() : Promise.resolve()
        ]);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        throw new Error(withdrawalData.message || 'Failed to process withdrawal');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to process withdrawal';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setWithdrawing(false);
    }
  };

  // ✅ QUICK WITHDRAWAL AMOUNT BUTTONS (USD)
  const getQuickAmounts = () => {
    const availableInDollars = centsToDollars(availableBalance);
    
    const amounts = [
      { label: '$10', value: 10 },
      { label: '$25', value: 25 },
      { label: '$50', value: 50 },
      { label: '$100', value: 100 },
      { label: '$250', value: 250 }
    ];
    
    // Filter amounts that are less than or equal to available balance
    const validAmounts = amounts.filter(amount => amount.value <= availableInDollars);
    
    // Add "All" option if there's enough balance
    if (availableInDollars >= 5) {
      validAmounts.push({ 
        label: 'All Available', 
        value: availableInDollars 
      });
    }
    
    return validAmounts;
  };

  const quickAmounts = getQuickAmounts();

  const handleQuickAmount = (amount: number) => {
    const maxAmount = centsToDollars(availableBalance);
    const cappedAmount = Math.max(0.01, Math.min(amount, maxAmount));
    setWithdrawAmount(cappedAmount.toFixed(2));
    setError('');
  };

  // ✅ GET STATUS BADGE STYLE
  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status?.toLowerCase();
    
    if (statusLower.includes('completed') || statusLower.includes('paid') || statusLower.includes('success')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower.includes('failed') || statusLower.includes('rejected') || statusLower.includes('cancelled')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // ✅ CALCULATE TOTAL WITHDRAWN - FIXED
  const calculateTotalWithdrawn = () => {
    // ✅ Priority 1: Use completedRevenue prop (already in dollars)
    if (completedRevenue) {
      return dollarsToCents(completedRevenue);
    }
    
    // ✅ Priority 2: Use withdrawal stats
    if (withdrawalStats?.totalWithdrawn) {
      // totalWithdrawn is already in dollars, convert to cents
      return dollarsToCents(withdrawalStats.totalWithdrawn);
    }
    
    // ✅ Priority 3: Calculate from payout history
    if (payoutHistory.length > 0) {
      const completedPayouts = payoutHistory
        .filter((w: any) => 
          w.status === 'completed' || 
          w.status === 'paid' ||
          w.status === 'success'
        );
      
      return completedPayouts.reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
    }
    
    return 0;
  };

  const totalWithdrawnCents = calculateTotalWithdrawn();

  // ✅ CALCULATE PENDING WITHDRAWALS
  const calculatePendingWithdrawals = () => {
    if (payoutHistory.length > 0) {
      const pending = payoutHistory.filter((w: any) => 
        w.status === 'pending' || 
        w.status === 'processing' ||
        w.status === 'in_progress'
      );
      return pending.length;
    }
    return 0;
  };

  const pendingWithdrawalsCount = calculatePendingWithdrawals();

  // ✅ GET PAYMENT METHOD ICON
  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'stripe':
        return '💳';
      case 'bank_transfer':
      case 'bank':
        return '🏦';
      case 'paypal':
        return '🔵';
      default:
        return '💰';
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchAvailableBalance(),
        fetchPaymentMethods(),
        fetchPayoutHistory()
      ]);
      
      if (onRefresh) {
        await onRefresh();
      }
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

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

      {/* ✅ EARNING SUMMARY SECTION - NEW */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800">Total Revenue</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(dollarsToCents(totalRevenue || 0))}
            </p>
            <p className="text-xs text-blue-700 mt-1">All-time earnings</p>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800">Available to Withdraw</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {formatCurrency(availableBalance)}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Ready for withdrawal
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-violet-100 border border-purple-200 rounded-xl p-4">
            <p className="text-sm font-medium text-purple-800">Completed Revenue</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {formatCurrency(dollarsToCents(completedRevenue || 0))}
            </p>
            <p className="text-xs text-purple-700 mt-1">Already withdrawn</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-medium text-yellow-800">This Month</p>
            <p className="text-2xl font-bold text-yellow-900 mt-1">
              {formatCurrency(dollarsToCents(thisMonthRevenue || 0))}
            </p>
            <p className="text-xs text-yellow-700 mt-1">Current month earnings</p>
          </div>
        </div>
      </div>

      {/* Withdrawal Statistics */}
      {withdrawalStats && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdrawal Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Platform Fee</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dollarsToCents((totalRevenue || 0) * 0.1))}
              </p>
              <p className="text-xs text-gray-500">10% of total revenue</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Net Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dollarsToCents((totalRevenue || 0) * 0.9))}
              </p>
              <p className="text-xs text-gray-500">After 10% fee</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(dollarsToCents(pendingRevenue || 0))}
              </p>
              <p className="text-xs text-gray-500">Awaiting completion</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pendingWithdrawalsCount}
              </p>
              <p className="text-xs text-gray-500">In processing</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <div 
              key={method.id}
              className={`p-4 border rounded-xl ${method.available ? 'cursor-pointer hover:border-yellow-500' : 'opacity-50 cursor-not-allowed'} ${
                selectedMethod === method.id
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              onClick={() => method.available && setSelectedMethod(method.id)}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{method.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{method.name}</p>
                    {selectedMethod === method.id && (
                      <span className="text-green-600 text-sm">✓ Selected</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                  {!method.available && method.disabledReason && (
                    <p className="text-sm text-red-600 mt-1">{method.disabledReason}</p>
                  )}
                  {method.id === 'stripe' && method.details && (
                    <div className="mt-2 text-xs">
                      <span className={`inline-block px-2 py-1 rounded ${method.details.status?.canReceivePayments ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {method.details.status?.canReceivePayments ? 'Connected ✓' : 'Not Connected'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stripe Account Status */}
        {selectedMethod === 'stripe' && paymentMethods.find(m => m.id === 'stripe')?.details && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
            <h4 className="font-medium text-blue-900 mb-2">Stripe Account Status</h4>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="text-blue-700 w-40">Account Status:</span>
                <span className={`font-medium ${paymentMethods.find(m => m.id === 'stripe')?.details.status?.canReceivePayments ? 'text-green-600' : 'text-red-600'}`}>
                  {paymentMethods.find(m => m.id === 'stripe')?.details.status?.canReceivePayments ? 'Ready for payouts' : 'Setup required'}
                </span>
              </div>
              {!paymentMethods.find(m => m.id === 'stripe')?.details.status?.canReceivePayments && (
                <div className="text-sm text-red-600">
                  <p>Complete your Stripe setup to receive payments.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
            onClick={handleRefresh}
            disabled={loading || statsLoading}
            className="mt-2 md:mt-0 px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading || statsLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Quick Amount Buttons */}
          {quickAmounts.length > 0 && (
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
          )}

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
                  const numValue = parseFloat(value);
                  
                  if (!isNaN(numValue) && numValue <= centsToDollars(availableBalance)) {
                    setWithdrawAmount(value);
                    setError('');
                  } else if (value === '') {
                    setWithdrawAmount('');
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
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">
                Available: <span className="font-semibold">{formatCurrency(availableBalance)}</span>
              </p>
              <p className="text-sm text-gray-500">
                Minimum: <span className="font-semibold">{formatCurrency(500)}</span>
              </p>
            </div>
          </div>

          {/* Withdrawal Button */}
          <div>
            <button
              onClick={handleWithdraw}
              disabled={!withdrawAmount || withdrawing || loading || availableBalance < 500 || !selectedMethod}
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
                `Withdraw ${withdrawAmount ? `${formatCurrency(dollarsToCents(parseFloat(withdrawAmount)))}` : 'Funds'}`
              )}
            </button>
            
            {!selectedMethod && (
              <p className="text-red-600 text-sm mt-2">Please select a payment method first</p>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Withdrawal Information</h4>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Withdrawals are processed within 1-3 business days</li>
                  <li>• Minimum withdrawal amount is {formatCurrency(500)}</li>
                  <li>• Platform fee of 10% is already deducted from your earnings</li>
                  <li>• No additional withdrawal fees for sellers</li>
                  <li>• Ensure your payment method is properly set up before withdrawing</li>
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
            <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track your past withdrawals and payouts
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {historyLoading ? 'Loading...' : `Showing ${payoutHistory.length} payouts`}
            </span>
            {payoutHistory.length > 10 && (
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
            )}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payout history...</p>
            </div>
          </div>
        ) : payoutHistory.length > 0 ? (
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
                {payoutHistory.map((payout: any, index: number) => (
                  <tr key={payout._id || payout.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payout.createdAt || payout.date)}</div>
                      {payout.estimatedArrival && (
                        <div className="text-xs text-gray-500">
                          Est: {formatDate(payout.estimatedArrival)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payout.amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(payout.status)}`}>
                        {payout.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getPaymentMethodIcon(payout.paymentMethod)}</span>
                        <span className="text-sm text-gray-900">
                          {payout.paymentMethod === 'stripe' ? 'Stripe' : 
                           payout.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 
                           payout.paymentMethod || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {payout.description || 'Payout'}
                      </div>
                      {payout.failureReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {payout.failureReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
                        {payout.referenceId ? 
                          payout.referenceId.slice(-8) : 
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
            <h3 className="text-lg font-medium text-gray-900">No Payout History</h3>
            <p className="mt-2 text-gray-500 mb-6">
              You haven't received any payouts yet. Complete your first order to start earning!
            </p>
            {availableBalance >= 500 && (
              <button
                onClick={() => handleQuickAmount(10)}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
              >
                Make Your First Withdrawal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawTab;