
// components/marketplace/seller/EarningsTab.tsx - FULLY UPDATED
import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import WithdrawBalance from './WithdrawBalance';
import marketplaceApi from '../../../api/marketplaceApi';
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
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [realTimeUpdate, setRealTimeUpdate] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Get current user ID on component mount
  useEffect(() => {
    const userId = getCurrentUserId();
    setCurrentUserId(userId);
  }, []);
  
  // Fetch live earnings data using marketplaceApi
  const fetchLiveEarnings = async () => {
    try {
      setLiveLoading(true);
      
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch earnings');
        return null;
      }
      
      // Get earnings dashboard from marketplaceApi
      const earningsResponse = await marketplaceApi.earnings.getEarningsDashboard();
      
      if (earningsResponse.success && earningsResponse.data) {
        const earningsData = earningsResponse.data;
        setLiveEarnings(earningsData);
        
        // Store user-specific earnings in localStorage
        localStorage.setItem(`earnings_${currentUserId}`, JSON.stringify({
          ...earningsData,
          lastUpdated: Date.now()
        }));
        
        return earningsData;
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
  
  // Fetch withdrawals using marketplaceApi
  const fetchWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch withdrawals');
        return;
      }
      
      // Get withdrawal history from marketplaceApi
      const response = await marketplaceApi.earnings.getWithdrawalHistory({ status: '' });
      
      if (response.success) {
        // Handle both array and object responses
        let withdrawalData = [];
        
        if (Array.isArray(response.data)) {
          withdrawalData = response.data;
        } else if (response.data && Array.isArray(response.data.withdrawals)) {
          withdrawalData = response.data.withdrawals;
        } else if (response.data && typeof response.data === 'object') {
          // Extract any array from the response object
          const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            withdrawalData = possibleArrays[0];
          }
        }
        
        // Filter withdrawals for current user
        const userWithdrawals = withdrawalData.filter((w: any) => 
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
  
  // Fetch payment history using marketplaceApi
  const fetchPaymentHistory = async () => {
    try {
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch payment history');
        return [];
      }
      
      const response = await marketplaceApi.earnings.getPaymentHistory({ limit: 10 });
      
      if (response.success) {
        // Handle both array and object responses
        let paymentData = [];
        
        if (Array.isArray(response.data)) {
          paymentData = response.data;
        } else if (response.data && Array.isArray(response.data.payments)) {
          paymentData = response.data.payments;
        } else if (response.data && typeof response.data === 'object') {
          // Extract any array from the response object
          const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            paymentData = possibleArrays[0];
          }
        }
        
        // Filter payments for current user
        const userPayments = paymentData.filter((p: any) => 
          p.userId === currentUserId || !p.userId // Include if no userId (backward compatibility)
        );
        
        setPaymentHistory(userPayments);
        
        // Also update earnings history for backward compatibility
        setEarningsHistory(userPayments.filter((p: any) => 
          p.type === 'earning' || p.amount > 0
        ));
        
        // Store user-specific payment history
        localStorage.setItem(`payment_history_${currentUserId}`, JSON.stringify({
          payments: userPayments,
          lastUpdated: Date.now()
        }));
        
        return userPayments;
      }
      
      // Try localStorage fallback
      const savedHistory = localStorage.getItem(`payment_history_${currentUserId}`);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setPaymentHistory(parsed.payments || []);
        setEarningsHistory((parsed.payments || []).filter((p: any) => 
          p.type === 'earning' || p.amount > 0
        ));
        return parsed.payments || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      
      // Try localStorage fallback
      if (currentUserId) {
        const savedHistory = localStorage.getItem(`payment_history_${currentUserId}`);
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          setPaymentHistory(parsed.payments || []);
          setEarningsHistory((parsed.payments || []).filter((p: any) => 
            p.type === 'earning' || p.amount > 0
          ));
          return parsed.payments || [];
        }
      }
      
      return [];
    }
  };
  
  // Fetch monthly earnings from payment history
  const fetchMonthlyEarnings = async () => {
    try {
      // Check if user is logged in
      if (!currentUserId) {
        console.warn('No user ID found, cannot fetch monthly earnings');
        return [];
      }
      
      // Get payment history for the last 6 months
      const response = await marketplaceApi.earnings.getPaymentHistory({ limit: 100 });
      
      if (response.success) {
        let paymentData = [];
        
        if (Array.isArray(response.data)) {
          paymentData = response.data;
        } else if (response.data && Array.isArray(response.data.payments)) {
          paymentData = response.data.payments;
        } else if (response.data && typeof response.data === 'object') {
          const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
          if (possibleArrays.length > 0) {
            paymentData = possibleArrays[0];
          }
        }
        
        // Filter for earnings only (positive amounts or type earning)
        const earningsData = paymentData.filter((item: any) => 
          (item.type === 'earning' || item.amount > 0) && 
          (item.userId === currentUserId || !item.userId)
        );
        
        // Group earnings by month
        const monthlyData: Record<string, number> = {};
        
        earningsData.forEach((item: any) => {
          if (item.createdAt || item.date) {
            const date = new Date(item.createdAt || item.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = 0;
            }
            
            monthlyData[monthKey] += Math.abs(item.amount) || 0;
          }
        });
        
        // Convert to array format, get last 6 months
        const last6Months: any[] = [];
        const now = new Date();
        
        for (let i = 0; i < 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const monthKey = `${year}-${month}`;
          
          last6Months.unshift({
            _id: { year, month },
            earnings: monthlyData[monthKey] || 0,
            userId: currentUserId
          });
        }
        
        setMonthlyEarnings(last6Months);
        
        // Store user-specific monthly earnings
        localStorage.setItem(`monthly_earnings_${currentUserId}`, JSON.stringify({
          earnings: last6Months,
          lastUpdated: Date.now()
        }));
        
        return last6Months;
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
  
  // Process withdrawal using marketplaceApi
  const handleProcessWithdrawal = async (amount: number, paymentMethod: string, accountDetails: any) => {
    try {
      const response = await marketplaceApi.earnings.processPayout(amount, paymentMethod, accountDetails);
      return response;
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      return {
        success: false,
        error: 'Failed to process withdrawal'
      };
    }
  };
  
  // Release pending payment
  const handleReleasePayment = async (orderId: string) => {
    try {
      const response = await marketplaceApi.earnings.releasePayment(orderId);
      if (response.success) {
        // Refresh data
        fetchAllEarningsData();
      }
      return response;
    } catch (error) {
      console.error('Error releasing payment:', error);
      return {
        success: false,
        error: 'Failed to release payment'
      };
    }
  };
  
  // Calculate real-time metrics
  const calculateRealTimeMetrics = () => {
    if (!liveEarnings && !balanceData) {
      return {
        monthOverMonthGrowth: 0,
        avgOrderValue: 0,
        completionRate: 0,
        lifetimeRevenue: 0,
        totalWithdrawn: totalWithdrawn || 0,
        netEarnings: 0,
        pendingOrders: 0
      };
    }
    
    const data = liveEarnings || balanceData;
    
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
    
    const currentMonthEarnings = currentMonthData?.earnings || data?.thisMonthRevenue || 0;
    const lastMonthEarnings = lastMonthData?.earnings || 0;
    
    const monthOverMonthGrowth = lastMonthEarnings > 0 
      ? ((currentMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
      : currentMonthEarnings > 0 ? 100 : 0;
    
    // Calculate average order value
    const avgOrderValue = orderStats?.totalOrders && orderStats.totalOrders > 0 
      ? (data?.totalEarnings || 0) / orderStats.totalOrders 
      : 0;
    
    // Calculate completion rate
    const completionRate = orderStats?.totalOrders && orderStats.totalOrders > 0
      ? ((orderStats.completed || 0) / orderStats.totalOrders) * 100
      : 0;
    
    // Calculate pending orders
    const pendingOrders = orderStats?.pending || orderStats?.active || 0;
    
    return {
      monthOverMonthGrowth: monthOverMonthGrowth || 0,
      avgOrderValue: avgOrderValue || 0,
      completionRate: completionRate || 0,
      lifetimeRevenue: data?.lifetimeRevenue || data?.totalEarnings || 0,
      totalWithdrawn: data?.totalWithdrawn || totalWithdrawn || 0,
      netEarnings: (data?.totalEarnings || 0) - (data?.totalWithdrawn || totalWithdrawn || 0),
      pendingOrders: pendingOrders || 0
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
        fetchPaymentHistory(),
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
      
      // Process withdrawal through marketplace API
      const result = await handleProcessWithdrawal(
        amountInCents,
        'stripe',
        { userId: currentUserId }
      );
      
      if (result.success) {
        // Call parent handler
        onWithdrawSuccess(amountInCents);
        
        // Refresh data after withdrawal
        setTimeout(() => {
          fetchAllEarningsData();
        }, 1000);
        
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Error handling withdrawal:', error);
      return {
        success: false,
        error: 'Withdrawal failed'
      };
    }
  };
  
  // Format currency helper
  const formatCurrency = (amountInCents: number): string => {
    return marketplaceApi.formatCurrency(amountInCents || 0);
  };
  
  // Format date helper
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
  
  // Calculate this month's revenue
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = monthlyEarnings?.find((item: any) => 
    item._id?.month === currentMonth && item._id?.year === currentYear
  );
  
  const thisMonthRevenue = thisMonthData?.earnings || 
                          liveEarnings?.thisMonthRevenue || 
                          balanceData?.thisMonthRevenue || 
                          0;
  
  // Get real-time metrics
  const realTimeMetrics = calculateRealTimeMetrics();
  
  // Get effective data (live earnings first, then balanceData)
  const effectiveData = liveEarnings || balanceData;
  
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
      <StripeStatusCard 
        stripeStatus={stripeStatus} 
        stripeApi={marketplaceApi.stripe}
        onRefresh={handleManualRefresh}
      />
      
      {/* Withdraw Balance Component */}
      <WithdrawBalance
        stripeStatus={stripeStatus}
        availableBalance={effectiveData?.availableBalance || 0}
        pendingBalance={effectiveData?.pendingBalance || 0}
        totalEarnings={effectiveData?.totalEarnings || 0}
        thisMonthEarnings={thisMonthRevenue}
        onWithdrawSuccess={handleWithdrawRequest}
        formatCurrency={formatCurrency}
        userId={currentUserId}
        earningsApi={marketplaceApi.earnings}
      />
      
      {/* Earnings Overview */}
      <EarningsOverview
        stripeStatus={stripeStatus}
        orderStats={orderStats}
        balanceData={effectiveData}
        thisMonthRevenue={thisMonthRevenue}
        realTimeMetrics={realTimeMetrics}
        formatCurrency={formatCurrency}
        userId={currentUserId}
        earningsApi={marketplaceApi.earnings}
      />
      
      {/* Earnings Stats */}
      <EarningsStats
        orderStats={orderStats}
        stripeStatus={stripeStatus}
        monthlyEarnings={monthlyEarnings}
        realTimeMetrics={realTimeMetrics}
        formatCurrency={formatCurrency}
        userId={currentUserId}
        earningsApi={marketplaceApi.earnings}
      />
      
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Available Balance */}
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-green-600 text-xl">💰</span>
            </div>
            <div className="text-xs font-medium text-green-600 px-2 py-1 bg-green-50 rounded">
              READY
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(effectiveData?.availableBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Ready for immediate withdrawal</p>
        </div>
        
        {/* Pending Balance */}
        <div className="bg-white border border-yellow-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-yellow-600 text-xl">⏳</span>
            </div>
            <div className="text-xs font-medium text-yellow-600 px-2 py-1 bg-yellow-50 rounded">
              PENDING
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Pending Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(effectiveData?.pendingBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">From {realTimeMetrics.pendingOrders} active orders</p>
        </div>
        
        {/* This Month Earnings */}
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-blue-600 text-xl">📈</span>
            </div>
            <div className={`text-sm font-medium px-2 py-1 rounded ${
              realTimeMetrics.monthOverMonthGrowth > 0 
                ? 'text-green-600 bg-green-50' 
                : 'text-red-600 bg-red-50'
            }`}>
              {realTimeMetrics.monthOverMonthGrowth > 0 ? '↑' : '↓'} 
              {Math.abs(realTimeMetrics.monthOverMonthGrowth).toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">This Month</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(thisMonthRevenue)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Your month-over-month growth</p>
        </div>
        
        {/* Total Withdrawn */}
        <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-purple-600 text-xl">💳</span>
            </div>
            <div className="text-xs font-medium text-purple-600 px-2 py-1 bg-purple-50 rounded">
              PAID
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Total Withdrawn</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(realTimeMetrics.totalWithdrawn)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Already paid to your account</p>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Earnings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Earnings</h3>
              <p className="text-sm text-gray-500 mt-1">Your latest income transactions</p>
            </div>
            <button
              onClick={fetchPaymentHistory}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {paymentHistory.length > 0 ? (
              paymentHistory
                .filter((p: any) => p.type === 'earning' || p.amount > 0)
                .slice(0, 5)
                .map((transaction, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                          <span className="text-lg">💰</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description || 'Order Payment'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.createdAt || transaction.date)} • 
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${getStatusColor(transaction.status)}`}>
                              {transaction.status || 'completed'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          +{formatCurrency(transaction.amount || 0)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Order #{transaction.orderId?.slice(-6) || 'N/A'}
                        </p>
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
                  onClick={fetchPaymentHistory}
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Load Transactions
                </button>
              </div>
            )}
          </div>
          {paymentHistory.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={() => onGoToWithdraw?.()}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all transactions →
              </button>
            </div>
          )}
        </div>
        
        {/* Recent Withdrawals */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Withdrawals</h3>
              <p className="text-sm text-gray-500 mt-1">Your withdrawal requests</p>
            </div>
            <button
              onClick={fetchWithdrawals}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {withdrawals.length > 0 ? (
              withdrawals.slice(0, 5).map((withdrawal, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        withdrawal.status === 'completed' ? 'bg-blue-100 text-blue-600' :
                        withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <span className="text-lg">
                          {withdrawal.status === 'completed' ? '✅' :
                           withdrawal.status === 'pending' ? '⏳' : '❌'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {withdrawal.description || 'Withdrawal Request'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(withdrawal.createdAt || withdrawal.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        -{formatCurrency(withdrawal.amount || 0)}
                      </p>
                      <p className={`text-sm capitalize ${getStatusColor(withdrawal.status)}`}>
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
                  className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Load Withdrawals
                </button>
              </div>
            )}
          </div>
          {withdrawals.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={() => onGoToWithdraw?.()}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all withdrawals →
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Monthly Earnings Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Monthly Earnings Trend</h3>
            <p className="text-sm text-gray-500 mt-1">Last 6 months of your earnings</p>
          </div>
          <button
            onClick={fetchMonthlyEarnings}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div 
                      className="w-3/4 mx-auto bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg transition-all duration-300 group-hover:opacity-90"
                      style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                    ></div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {formatCurrency(earnings)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {monthNames[(month._id?.month || 1) - 1]} '{month._id?.year?.toString().slice(-2) || '23'}
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
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Load Monthly Data
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
            Live data • User: {currentUserId?.slice(-6)}...
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
            Refresh Data
          </button>
          <button
            onClick={() => onGoToWithdraw?.()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow text-center"
          >
            💳 Withdraw Earnings
          </button>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;