import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsTabProps {
  stripeStatus: any;
  orderStats: any;
  onWithdrawRequest: (amount: number) => void;
  loading: boolean;
  onRefresh: () => void;
}

// ✅ Currency formatter for dollars
const formatToDollars = (amountInCents: number) => {
  const amountInDollars = amountInCents / 100;
  return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  onWithdrawRequest,
  loading,
  onRefresh
}) => {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  // ✅ Format order stats amounts to dollars (orderStats amounts are in dollars, need to convert to cents for display)
  const formatOrderStatsToDollars = (stats: any) => {
    if (!stats) return stats;
    
    return {
      ...stats,
      totalRevenue: formatToDollars((stats.totalRevenue || 0) * 100),
      pendingRevenue: formatToDollars((stats.pendingRevenue || 0) * 100),
      thisMonthRevenue: formatToDollars((stats.thisMonthRevenue || 0) * 100),
      // Add other formatted fields as needed
    };
  };

  // ✅ Format stripe status amounts to dollars
  const formatStripeStatusToDollars = (status: any) => {
    if (!status) return status;
    
    return {
      ...status,
      balance: formatToDollars(status.balance || 0),
      availableBalance: formatToDollars(status.availableBalance || 0),
      pendingBalance: formatToDollars(status.pendingBalance || 0),
    };
  };

  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      
      // Fetch detailed earnings data
      const [summaryResponse, periodResponse, balanceResponse] = await Promise.allSettled([
        marketplaceApi.earnings.getEarningsSummary(),
        marketplaceApi.earnings.getEarningsByPeriod('month'),
        marketplaceApi.earnings.getAvailableBalance()
      ]);
      
      const earningsData: any = {};
      
      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.success) {
        earningsData.summary = summaryResponse.value;
      }
      
      if (periodResponse.status === 'fulfilled' && periodResponse.value.success) {
        earningsData.period = periodResponse.value;
      }
      
      if (balanceResponse.status === 'fulfilled' && balanceResponse.value.success) {
        earningsData.balance = balanceResponse.value;
      }
      
      setEarningsData(earningsData);
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
  
  return (
    <div className="space-y-8">
      {/* Stripe Status Card - Pass formatted data */}
      <StripeStatusCard 
        stripeStatus={formatStripeStatusToDollars(stripeStatus)} 
      />
      
      {/* Earnings Overview - Pass formatted data */}
      <EarningsOverview
        stripeStatus={formatStripeStatusToDollars(stripeStatus)}
        orderStats={formatOrderStatsToDollars(orderStats)}
        onWithdrawRequest={onWithdrawRequest}
      />
      
      {/* Earnings Stats - Pass formatted data */}
      <EarningsStats
        orderStats={formatOrderStatsToDollars(orderStats)}
        stripeStatus={formatStripeStatusToDollars(stripeStatus)}
      />
      
      {/* Additional Earnings Information - UPDATED FOR DOLLARS */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Earnings Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Transactions</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Order #12345</p>
                  <p className="text-xs text-gray-500">Completed • 2 days ago</p>
                </div>
                <p className="text-sm font-medium text-green-600">+$70.00</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Order #12346</p>
                  <p className="text-xs text-gray-500">In Progress • 1 day ago</p>
                </div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Order #12347</p>
                  <p className="text-xs text-gray-500">Completed • 3 days ago</p>
                </div>
                <p className="text-sm font-medium text-green-600">+$120.50</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Next Payout</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Available for payout:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatToDollars(stripeStatus?.availableBalance || 0)}
                </p>
              </div>
              <p className="text-sm text-gray-600">Estimated payout date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Feb 15, 2024</p>
              <p className="text-sm text-gray-500 mt-2">
                Funds are typically available 2-3 business days after withdrawal request.
              </p>
            </div>
          </div>
        </div>
        
        {/* ✅ Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Avg. Order Value</p>
            <p className="text-xl font-bold text-gray-900">
              {orderStats.completed > 0 
                ? formatToDollars(((orderStats.totalRevenue || 0) * 100) / orderStats.completed)
                : formatToDollars(0)
              }
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-xl font-bold text-gray-900">
              {orderStats.totalOrders > 0 
                ? `${Math.round((orderStats.completed / orderStats.totalOrders) * 100)}%`
                : '0%'
              }
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Withdrawn</p>
            <p className="text-xl font-bold text-gray-900">
              {formatToDollars(
                (stripeStatus?.balance || 0) - (stripeStatus?.availableBalance || 0)
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* ✅ Earnings Timeline */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Earnings Timeline</h3>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Current Month</p>
              <p className="text-sm text-gray-600">
                {formatToDollars((orderStats.thisMonthRevenue || 0) * 100)} from {orderStats.thisMonthOrders || 0} orders
              </p>
            </div>
            <div className="text-sm font-medium text-green-600">
              {orderStats.thisMonthOrders > 0 ? '↑ Active' : 'No orders'}
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">All Time Earnings</p>
              <p className="text-sm text-gray-600">
                {formatToDollars((orderStats.totalRevenue || 0) * 100)} from {orderStats.totalOrders || 0} total orders
              </p>
            </div>
            <div className="text-sm font-medium text-blue-600">
              {orderStats.totalOrders > 0 ? `${orderStats.completed || 0} completed` : 'No orders'}
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Pending Orders</p>
              <p className="text-sm text-gray-600">
                {formatToDollars((orderStats.pendingRevenue || 0) * 100)} from {orderStats.activeOrders || 0} active orders
              </p>
            </div>
            <div className="text-sm font-medium text-yellow-600">
              {orderStats.activeOrders > 0 ? 'In progress' : 'No pending'}
            </div>
          </div>
        </div>
      </div>
      
      {/* ✅ Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="bg-blue-100 p-3 rounded-lg mr-4">
            <span className="text-blue-600 text-xl">❓</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help With Earnings?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Have questions about your earnings, payouts, or Stripe setup? We're here to help!
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition duration-200">
                Contact Support
              </button>
              <button className="px-4 py-2 bg-white border border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition duration-200">
                View FAQ
              </button>
              <button 
                onClick={onRefresh}
                className="px-4 py-2 bg-white border border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition duration-200"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;