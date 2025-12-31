import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import marketplaceApi from '../../../api/marketplaceApi';

interface LiveEarnings {
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
}

interface EarningsData {
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  thisMonthRevenue: number;
  totalRevenue: number;
}

interface EarningsTabProps {
  stripeStatus: any;
  orderStats: any;
  onWithdrawRequest: (amount: number) => Promise<void>;
  loading: boolean;
  onRefresh: () => void;
  earningsData: EarningsData;
  liveEarnings: LiveEarnings;
  onTabChange: (tab: string) => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  onWithdrawRequest,
  loading,
  onRefresh,
  earningsData,
  liveEarnings,
  onTabChange
}) => {
  const [earningsDetails, setEarningsDetails] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      
      // Fetch detailed earnings data
      const [summaryResponse, periodResponse] = await Promise.allSettled([
        marketplaceApi.earnings.getEarningsSummary(),
        marketplaceApi.earnings.getEarningsByPeriod('month')
      ]);
      
      const details: any = {};
      
      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.success) {
        details.summary = summaryResponse.value;
      }
      
      if (periodResponse.status === 'fulfilled' && periodResponse.value.success) {
        details.period = periodResponse.value;
      }
      
      setEarningsDetails(details);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setEarningsLoading(false);
    }
  };
  
  useEffect(() => {
    if (stripeStatus?.chargesEnabled) {
      fetchEarningsData();
    }
  }, [stripeStatus]);
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    const amountInRupees = amount / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  if (loading || earningsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings data...</p>
        </div>
      </div>
    );
  }
  
  if (!stripeStatus?.chargesEnabled) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4 text-gray-300">💰</div>
        <h3 className="text-lg font-medium text-gray-900">Payments Not Setup</h3>
        <p className="mt-2 text-gray-500 mb-4">
          Connect your Stripe account to start earning and withdraw your funds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow"
          >
            💰 Setup Payments
          </button>
          <button
            onClick={() => onTabChange('withdraw')}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            View Withdraw Options
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Live Earnings Banner */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-yellow-800">💰 Live Earnings Dashboard</h2>
            <p className="text-sm text-yellow-700 mt-1">
              Real-time earnings calculated from your orders. Updates automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-white border border-yellow-200 rounded-lg p-3 min-w-[140px]">
              <p className="text-xs text-yellow-600 font-medium">Total Earnings</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(liveEarnings.totalEarnings)}
              </p>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-3 min-w-[140px]">
              <p className="text-xs text-green-600 font-medium">Available Now</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(liveEarnings.completedEarnings)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stripe Status Card */}
      <StripeStatusCard stripeStatus={stripeStatus} />
      
      {/* Earnings Overview */}
      <EarningsOverview
        stripeStatus={stripeStatus}
        orderStats={orderStats}
        onWithdrawRequest={onWithdrawRequest}
        liveEarnings={liveEarnings}
      />
      
      {/* Earnings Stats */}
      <EarningsStats
        orderStats={orderStats}
        stripeStatus={stripeStatus}
        earningsData={earningsData}
        liveEarnings={liveEarnings}
      />
      
      {/* Earnings Breakdown */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">💰 Earnings Breakdown</h3>
          <button
            onClick={fetchEarningsData}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition duration-200 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source of Earnings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Earnings by Status</h4>
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completed Orders</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(liveEarnings.completedEarnings)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${liveEarnings.completedEarnings > 0 ? (liveEarnings.completedEarnings / liveEarnings.totalEarnings * 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Available for withdrawal</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Orders</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {formatCurrency(liveEarnings.pendingEarnings)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${liveEarnings.pendingEarnings > 0 ? (liveEarnings.pendingEarnings / liveEarnings.totalEarnings * 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Will be available upon completion</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Withdrawn</span>
                  <span className="text-sm font-medium text-blue-600">
                    {formatCurrency(earningsData.totalWithdrawn || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${earningsData.totalWithdrawn > 0 ? (earningsData.totalWithdrawn / liveEarnings.totalEarnings * 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Successfully transferred to your account</p>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Transactions</h4>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Revenue</p>
                    <p className="text-xs text-gray-500">From all completed orders</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(earningsData.totalRevenue * 100)}
                  </p>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">This Month</p>
                    <p className="text-xs text-gray-500">Monthly earnings</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(earningsData.thisMonthRevenue * 100)}
                  </p>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Available Now</p>
                    <p className="text-xs text-gray-500">Ready to withdraw</p>
                  </div>
                  <p className="text-lg font-bold text-yellow-600">
                    {formatCurrency(liveEarnings.completedEarnings)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Withdraw CTA */}
            <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-800">Ready to Withdraw?</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Transfer {formatCurrency(liveEarnings.completedEarnings)} to your bank account
                  </p>
                </div>
                <button
                  onClick={() => onTabChange('withdraw')}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Withdraw Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;