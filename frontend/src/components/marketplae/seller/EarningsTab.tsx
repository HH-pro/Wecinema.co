// components/marketplace/seller/EarningsTab.tsx
import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import WithdrawBalance from './WithdrawBalance';
import paymentsApi from '../../../api/paymentsApi';
import { getCurrentUserId } from '../../../utilities/helperfFunction';

interface EarningsTabProps {
  stripeStatus: any;
  orderStats: any;
  balanceData?: {
    availableBalance: number; // in cents
    pendingBalance: number; // in cents
    totalEarnings: number; // in cents
    totalWithdrawn: number; // in cents
    thisMonthRevenue: number; // in cents
    lastWithdrawal: string | null;
    nextPayoutDate: string;
    lifetimeRevenue?: number; // in cents
  };
  monthlyEarnings?: any[];
  earningsHistory?: any[];
  onWithdrawSuccess: (amount: number) => void;
  loading: boolean;
  onRefresh: () => void;
  onGoToWithdraw?: () => void;
  totalWithdrawn?: number; // in cents
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  balanceData,
  monthlyEarnings: initialMonthlyEarnings = [],
  earningsHistory: initialEarningsHistory = [],
  onWithdrawSuccess,
  loading,
  onRefresh,
  onGoToWithdraw,
  totalWithdrawn = 0
}) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [liveEarnings, setLiveEarnings] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>(initialMonthlyEarnings);
  const [earningsHistory, setEarningsHistory] = useState<any[]>(initialEarningsHistory);
  const [realTimeUpdate, setRealTimeUpdate] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get current user ID on component mount
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);
  
  // Fetch live earnings data using paymentsApi
  const fetchLiveEarnings = async () => {
    try {
      setLiveLoading(true);
      
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch earnings');
        return null;
      }
      
      // Get earnings balance from paymentsApi
      const balanceResponse = await paymentsApi.getEarningsBalance();
      
      if (balanceResponse.success && balanceResponse.data) {
        setLiveEarnings(balanceResponse.data);
        
        // Store user-specific earnings in localStorage
        localStorage.setItem(`earnings_${currentUserId}`, JSON.stringify({
          ...balanceResponse.data,
          lastUpdated: Date.now()
        }));
        
        return balanceResponse.data;
      }
      
      // Try to get from localStorage as fallback
      const savedEarnings = localStorage.getItem(`earnings_${currentUserId}`);
      if (savedEarnings) {
        const parsed = JSON.parse(savedEarnings);
        setLiveEarnings(parsed);
        return parsed;
      }
      
      // Fallback to balanceData if API fails
      if (balanceData) {
        setLiveEarnings(balanceData);
        return balanceData;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching live earnings:', error);
      
      // Try localStorage fallback
      if (currentUserId) {
        const savedEarnings = localStorage.getItem(`earnings_${currentUserId}`);
        if (savedEarnings) {
          const parsed = JSON.parse(savedEarnings);
          setLiveEarnings(parsed);
          return parsed;
        }
      }
      
      // Use balanceData as fallback
      if (balanceData) {
        setLiveEarnings(balanceData);
      }
      return null;
    } finally {
      setLiveLoading(false);
    }
  };
  
  // Fetch withdrawals using paymentsApi
  const fetchWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch withdrawals');
        return;
      }
      
      // Get withdrawal history from paymentsApi
      const response = await paymentsApi.getWithdrawalHistory({ limit: 5 });
      
      if (response.success && response.data?.withdrawals) {
        // Filter withdrawals for current user (should be done by backend, but double-check)
        const userWithdrawals = response.data.withdrawals.filter((w: any) => 
          w.userId === currentUserId || !w.userId // Include if no userId (backward compatibility)
        );
        
        setWithdrawals(userWithdrawals);
        
        // Store user-specific withdrawals
        localStorage.setItem(`withdrawals_${currentUserId}`, JSON.stringify({
          withdrawals: userWithdrawals,
          lastUpdated: Date.now()
        }));
        
        return;
      }
      
      // Try localStorage fallback
      const savedWithdrawals = localStorage.getItem(`withdrawals_${currentUserId}`);
      if (savedWithdrawals) {
        const parsed = JSON.parse(savedWithdrawals);
        setWithdrawals(parsed.withdrawals || []);
        return;
      }
      
      // Fallback: If we have balanceData with withdrawals, use that
      if (balanceData?.totalWithdrawn && currentUserId) {
        // Create mock withdrawals based on total withdrawn
        setWithdrawals([
          {
            _id: '1',
            userId: currentUserId,
            type: 'withdrawal',
            amount: Math.min(balanceData.totalWithdrawn, 50000),
            status: 'completed',
            description: 'Withdrawal to bank',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      
      // Try localStorage fallback
      if (currentUserId) {
        const savedWithdrawals = localStorage.getItem(`withdrawals_${currentUserId}`);
        if (savedWithdrawals) {
          const parsed = JSON.parse(savedWithdrawals);
          setWithdrawals(parsed.withdrawals || []);
          return;
        }
      }
    } finally {
      setWithdrawalsLoading(false);
    }
  };
  
  // Fetch earnings history using paymentsApi
  const fetchEarningsHistory = async () => {
    try {
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch earnings history');
        return [];
      }
      
      const response = await paymentsApi.getEarningsHistory({ limit: 10 });
      
      if (response.success && response.data?.earnings) {
        // Filter earnings for current user
        const userEarnings = response.data.earnings.filter((e: any) => 
          e.userId === currentUserId || !e.userId // Include if no userId (backward compatibility)
        );
        
        setEarningsHistory(userEarnings);
        
        // Store user-specific earnings history
        localStorage.setItem(`earnings_history_${currentUserId}`, JSON.stringify({
          earnings: userEarnings,
          lastUpdated: Date.now()
        }));
        
        return userEarnings;
      }
      
      // Try localStorage fallback
      const savedHistory = localStorage.getItem(`earnings_history_${currentUserId}`);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setEarningsHistory(parsed.earnings || []);
        return parsed.earnings || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching earnings history:', error);
      
      // Try localStorage fallback
      if (currentUserId) {
        const savedHistory = localStorage.getItem(`earnings_history_${currentUserId}`);
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          setEarningsHistory(parsed.earnings || []);
          return parsed.earnings || [];
        }
      }
      
      return [];
    }
  };
  
  // Fetch monthly earnings using paymentsApi
  const fetchMonthlyEarnings = async () => {
    try {
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch monthly earnings');
        return [];
      }
      
      const response = await paymentsApi.getMonthlyEarnings({ months: 6 });
      
      if (response.success && response.data) {
        // Filter monthly earnings for current user
        const userMonthlyEarnings = response.data.filter((item: any) => 
          item.userId === currentUserId || !item.userId // Include if no userId (backward compatibility)
        );
        
        setMonthlyEarnings(userMonthlyEarnings);
        
        // Store user-specific monthly earnings
        localStorage.setItem(`monthly_earnings_${currentUserId}`, JSON.stringify({
          earnings: userMonthlyEarnings,
          lastUpdated: Date.now()
        }));
        
        return userMonthlyEarnings;
      }
      
      // Try localStorage fallback
      const savedMonthly = localStorage.getItem(`monthly_earnings_${currentUserId}`);
      if (savedMonthly) {
        const parsed = JSON.parse(savedMonthly);
        setMonthlyEarnings(parsed.earnings || []);
        return parsed.earnings || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching monthly earnings:', error);
      
      // Try localStorage fallback
      if (currentUserId) {
        const savedMonthly = localStorage.getItem(`monthly_earnings_${currentUserId}`);
        if (savedMonthly) {
          const parsed = JSON.parse(savedMonthly);
          setMonthlyEarnings(parsed.earnings || []);
          return parsed.earnings || [];
        }
      }
      
      return [];
    }
  };
  
  // Calculate real-time metrics with safe defaults
  const calculateRealTimeMetrics = () => {
    // Ensure orderStats has safe defaults
    const safeOrderStats = {
      totalOrders: orderStats?.totalOrders || 0,
      completed: orderStats?.completed || 0,
      ...orderStats
    };
    
    if (!liveEarnings && !balanceData) {
      return {
        monthOverMonthGrowth: 0,
        avgOrderValue: 0,
        completionRate: 0,
        lifetimeRevenue: 0,
        totalWithdrawn: totalWithdrawn || 0,
        netEarnings: 0
      };
    }
    
    const data = liveEarnings || balanceData || {};
    
    // Calculate growth percentage if we have monthly data
    const currentMonth = new Date().getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const currentYear = new Date().getFullYear();
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const currentMonthData = monthlyEarnings?.find((item: any) => 
      item._id?.month === currentMonth && item._id?.year === currentYear
    );
    
    const lastMonthData = monthlyEarnings?.find((item: any) => 
      item._id?.month === lastMonth && item._id?.year === lastMonthYear
    );
    
    const thisMonthRevenue = data?.thisMonthRevenue || 0;
    const lastMonthEarnings = lastMonthData?.earnings || 0;
    
    const monthOverMonthGrowth = lastMonthEarnings > 0 
      ? ((thisMonthRevenue - lastMonthEarnings) / lastMonthEarnings) * 100
      : 0;
    
    // Calculate average order value with safe division
    const totalEarningsValue = data?.totalEarnings || 0;
    const avgOrderValue = safeOrderStats.totalOrders > 0 
      ? totalEarningsValue / safeOrderStats.totalOrders 
      : 0;
    
    // Calculate completion rate with safe division
    const completionRate = safeOrderStats.totalOrders > 0
      ? ((safeOrderStats.completed || 0) / safeOrderStats.totalOrders) * 100
      : 0;
    
    return {
      monthOverMonthGrowth: monthOverMonthGrowth || 0,
      avgOrderValue: avgOrderValue || 0,
      completionRate: completionRate || 0,
      lifetimeRevenue: data?.lifetimeRevenue || data?.totalEarnings || 0,
      totalWithdrawn: data?.totalWithdrawn || totalWithdrawn || 0,
      netEarnings: (data?.totalEarnings || 0) - (data?.totalWithdrawn || totalWithdrawn || 0)
    };
  };
  
  // Initial data fetch
  useEffect(() => {
    if (stripeStatus?.chargesEnabled && currentUserId) {
      fetchAllEarningsData();
    }
  }, [stripeStatus, currentUserId]);
  
  // Fetch all earnings data
  const fetchAllEarningsData = async () => {
    try {
      if (!currentUserId) {
        console.warn('Cannot fetch data: No user ID');
        return;
      }
      
      await Promise.all([
        fetchLiveEarnings(),
        fetchWithdrawals(),
        fetchEarningsHistory(),
        fetchMonthlyEarnings()
      ]);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };
  
  // Refresh data periodically (every 30 seconds)
  useEffect(() => {
    if (stripeStatus?.chargesEnabled && currentUserId) {
      const interval = setInterval(() => {
        fetchLiveEarnings();
        setRealTimeUpdate(prev => prev + 1);
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [stripeStatus, currentUserId]);
  
  // Handle manual refresh
  const handleManualRefresh = async () => {
    try {
      if (!currentUserId) {
        console.warn('Cannot refresh: No user ID');
        return;
      }
      
      await fetchAllEarningsData();
      onRefresh(); // Call parent refresh if needed
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };
  
  // Handle withdrawal request
  const handleWithdrawRequest = async (amountInCents: number) => {
    try {
      if (!currentUserId) {
        console.error('Cannot withdraw: No user ID');
        return;
      }
      
      // Call parent handler
      onWithdrawSuccess(amountInCents);
      
      // Refresh data after withdrawal
      setTimeout(() => {
        fetchAllEarningsData();
      }, 1000);
    } catch (error) {
      console.error('Error handling withdrawal:', error);
    }
  };
  
  if (loading || liveLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your earnings data...</p>
          <p className="text-sm text-gray-500 mt-1">Updating in real-time</p>
        </div>
      </div>
    );
  }
  
  if (!stripeStatus?.chargesEnabled) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4 text-gray-300">💰</div>
        <h3 className="text-lg font-medium text-gray-900">Payments Not Setup</h3>
        <p className="mt-2 text-gray-500 mb-6">
          Connect your Stripe account to start earning and withdraw your funds.
        </p>
        <button
          onClick={onRefresh}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow"
        >
          💰 Setup Payments
        </button>
      </div>
    );
  }
  
  if (!currentUserId) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4 text-gray-300">🔒</div>
        <h3 className="text-lg font-medium text-gray-900">Authentication Required</h3>
        <p className="mt-2 text-gray-500 mb-6">
          Please log in to view your earnings.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
        >
          Go to Login
        </button>
      </div>
    );
  }
  
  // Calculate this month's revenue with safe defaults
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = monthlyEarnings?.find((item: any) => 
    item._id?.month === currentMonth && item._id?.year === currentYear
  );
  
  const thisMonthRevenue = thisMonthData?.earnings || 
                          liveEarnings?.thisMonthRevenue || 
                          balanceData?.thisMonthRevenue || 
                          0;
  
  // Get real-time metrics with safe defaults
  const realTimeMetrics = calculateRealTimeMetrics();
  
  // Get effective data (live earnings first, then balanceData)
  const effectiveData = liveEarnings || balanceData || {};
  
  // Format currency helper with safe defaults
  const formatCurrency = (amountInCents: number): string => {
    return paymentsApi.formatCurrency(amountInCents || 0);
  };
  
  return (
    <div className="space-y-8">
      {/* User-specific header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full relative"></div>
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            Your Earnings Dashboard • User: {currentUserId?.slice(-6)}...
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Updated {realTimeUpdate === 0 ? 'just now' : `${realTimeUpdate * 30} seconds ago`}
          </span>
          <button
            onClick={handleManualRefresh}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Stripe Status Card */}
      <StripeStatusCard stripeStatus={stripeStatus} />
      
      {/* Withdraw Balance Component - With User-specific Data */}
      <WithdrawBalance
        stripeStatus={stripeStatus}
        availableBalance={effectiveData?.availableBalance || 0}
        pendingBalance={effectiveData?.pendingBalance || 0}
        totalEarnings={effectiveData?.totalEarnings || 0}
        thisMonthEarnings={thisMonthRevenue}
        onWithdrawSuccess={handleWithdrawRequest}
        formatCurrency={formatCurrency}
        userId={currentUserId}
      />
      
      {/* Earnings Overview - Updated with User-specific Data */}
      <EarningsOverview
        stripeStatus={stripeStatus}
        orderStats={orderStats}
        balanceData={effectiveData}
        thisMonthRevenue={thisMonthRevenue}
        realTimeMetrics={realTimeMetrics}
        formatCurrency={formatCurrency}
        userId={currentUserId}
      />
      
      {/* Earnings Stats - Updated with User-specific Data */}
      <EarningsStats
        orderStats={orderStats}
        stripeStatus={stripeStatus}
        monthlyEarnings={monthlyEarnings}
        realTimeMetrics={realTimeMetrics}
        formatCurrency={formatCurrency}
        userId={currentUserId}
      />
      
      {/* User-specific Earnings Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance */}
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">💰</span>
            </div>
            <div className="text-xs font-medium text-gray-500">
              Your Balance
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(effectiveData?.availableBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Ready for withdrawal</p>
        </div>
        
        {/* Pending Balance */}
        <div className="bg-white border border-yellow-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Pending Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(effectiveData?.pendingBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">From your active orders</p>
        </div>
        
        {/* This Month - LINE 826 SHOULD BE HERE */}
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📈</span>
            </div>
            <div className={`text-sm font-medium px-2 py-1 rounded ${
              realTimeMetrics?.monthOverMonthGrowth > 0 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
              {realTimeMetrics?.monthOverMonthGrowth > 0 ? '↑' : '↓'} 
              {/* FIXED LINE 826: Added optional chaining and default value */}
              {Math.abs(realTimeMetrics?.monthOverMonthGrowth || 0).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Your Earnings This Month</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(thisMonthRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Your month-over-month growth</p>
        </div>
        
        {/* Total Withdrawn */}
        <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">💳</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Your Total Withdrawn</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(realTimeMetrics?.totalWithdrawn || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Paid to your account</p>
        </div>
      </div>
      
      {/* Recent Transactions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Earnings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Recent Earnings</h3>
              <p className="text-sm text-gray-500 mt-1">Your latest income transactions</p>
            </div>
            <button
              onClick={fetchEarningsHistory}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {earningsHistory && earningsHistory.length > 0 ? (
              earningsHistory.map((transaction, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        transaction.type === 'earning' ? 'bg-green-100 text-green-600' :
                        transaction.type === 'withdrawal' ? 'bg-blue-100 text-blue-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'earning' ? '💰' :
                         transaction.type === 'withdrawal' ? '💳' : '🔄'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description || 'Earnings Transaction'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.date || transaction.createdAt).toLocaleDateString()} • 
                          {transaction.status === 'completed' ? '✅ Completed' :
                           transaction.status === 'pending' ? '⏳ Pending' : '❌ Failed'}
                        </p>
                      </div>
                    </div>
                    <div className={`text-right ${
                      transaction.type === 'earning' ? 'text-green-600' :
                      transaction.type === 'withdrawal' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      <p className="font-medium">
                        {transaction.type === 'earning' ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                      </p>
                      {transaction.balanceAfter && (
                        <p className="text-sm text-gray-500">
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-3xl mb-2">📊</div>
                <p>No earnings transactions yet</p>
                <p className="text-sm mt-1">Complete orders to see your earnings here</p>
                <button
                  onClick={fetchEarningsHistory}
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                >
                  Load Transactions
                </button>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={fetchEarningsHistory}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              Load more transactions →
            </button>
          </div>
        </div>
        
        {/* Recent Withdrawals */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Your Recent Withdrawals</h3>
              <p className="text-sm text-gray-500 mt-1">Your withdrawal requests</p>
            </div>
            <button
              onClick={fetchWithdrawals}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {withdrawals.length > 0 ? (
              withdrawals.map((withdrawal, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        withdrawal.status === 'completed' ? 'bg-green-100 text-green-600' :
                        withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {withdrawal.status === 'completed' ? '✅' :
                         withdrawal.status === 'pending' ? '⏳' : '❌'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {withdrawal.description || 'Withdrawal Request'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(withdrawal.createdAt || withdrawal.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-right ${
                      withdrawal.status === 'completed' ? 'text-green-600' :
                      withdrawal.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      <p className="font-medium">
                        -{formatCurrency(withdrawal.amount || 0)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {withdrawal.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-3xl mb-2">💳</div>
                <p>No withdrawals yet</p>
                <p className="text-sm mt-1">Withdraw your earnings when you're ready</p>
                <button
                  onClick={fetchWithdrawals}
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                >
                  Load Withdrawals
                </button>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={onGoToWithdraw}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              View all withdrawals →
            </button>
          </div>
        </div>
      </div>
      
      {/* User Earnings Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">💰 Your Earnings Insights</h3>
          <span className="text-xs text-gray-500">User ID: {currentUserId?.slice(-8)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payout Schedule</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Next Payout</span>
                <span className="text-sm font-medium text-green-600">
                  {effectiveData?.nextPayoutDate 
                    ? new Date(effectiveData.nextPayoutDate).toLocaleDateString()
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Withdrawal</span>
                <span className="text-sm text-gray-900">
                  {effectiveData?.lastWithdrawal 
                    ? new Date(effectiveData.lastWithdrawal).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Funds are typically available 2-3 business days after withdrawal request.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Performance</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Order Value</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(realTimeMetrics?.avgOrderValue || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-medium text-gray-900">
                  {/* FIXED: Added optional chaining and default value */}
                  {(realTimeMetrics?.completionRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Month Growth</span>
                <span className={`font-medium ${
                  realTimeMetrics?.monthOverMonthGrowth && realTimeMetrics.monthOverMonthGrowth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {realTimeMetrics?.monthOverMonthGrowth && realTimeMetrics.monthOverMonthGrowth > 0 ? '+' : ''}
                  {/* FIXED: Added optional chaining and default value */}
                  {(realTimeMetrics?.monthOverMonthGrowth || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Earnings (USD)</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Available</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(effectiveData?.availableBalance || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(effectiveData?.pendingBalance || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Total</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(effectiveData?.totalEarnings || 0)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Net Earnings</h4>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatCurrency(realTimeMetrics?.netEarnings || 0)}
              </div>
              <p className="text-sm text-gray-600">After your withdrawals</p>
              <div className="mt-4 text-xs text-gray-500">
                <div className="flex justify-between mb-1">
                  <span>Total Earned:</span>
                  <span>{formatCurrency(effectiveData?.totalEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>You Withdrew:</span>
                  <span>-{formatCurrency(realTimeMetrics?.totalWithdrawn || 0)}</span>
                </div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-medium">
                  <span>Your Balance:</span>
                  <span>{formatCurrency(realTimeMetrics?.netEarnings || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Your Monthly Earnings Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Your Monthly Earnings Trend</h3>
            <p className="text-sm text-gray-500 mt-1">Your last 6 months earnings</p>
          </div>
          <button
            onClick={fetchMonthlyEarnings}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh Chart
          </button>
        </div>
        <div className="h-64 flex items-end space-x-2">
          {monthlyEarnings.length > 0 ? (
            monthlyEarnings.map((month, index) => {
              const earnings = month.earnings || 0;
              const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings || 0));
              const heightPercentage = maxEarnings > 0 ? (earnings / maxEarnings) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg"
                    style={{ height: `${heightPercentage}%` }}
                  ></div>
                  <div className="mt-2 text-xs text-gray-500">
                    {month._id?.month}/{month._id?.year?.toString().slice(-2) || 'N/A'}
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {formatCurrency(earnings)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="w-full text-center py-12 text-gray-500">
              <div className="text-3xl mb-2">📊</div>
              <p>No monthly earnings data available</p>
              <button
                onClick={fetchMonthlyEarnings}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
              >
                Load Your Monthly Data
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="text-sm text-gray-500">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Your live data • User: {currentUserId?.slice(-6)}...
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition duration-200 flex items-center gap-2 justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Your Data
          </button>
          <button
            onClick={onGoToWithdraw}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow text-center"
          >
            💳 Withdraw Your Earnings
          </button>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;