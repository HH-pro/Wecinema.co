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

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  onWithdrawRequest,
  loading,
  onRefresh
}) => {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
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
      {/* Stripe Status Card */}
      <StripeStatusCard stripeStatus={stripeStatus} />
      
      {/* Earnings Overview */}
      <EarningsOverview
        stripeStatus={stripeStatus}
        orderStats={orderStats}
        onWithdrawRequest={onWithdrawRequest}
      />
      
      {/* Earnings Stats */}
      <EarningsStats
        orderStats={orderStats}
        stripeStatus={stripeStatus}
      />
      
      {/* Additional Earnings Information */}
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
                <p className="text-sm font-medium text-green-600">+₹70.00</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">Order #12346</p>
                  <p className="text-xs text-gray-500">In Progress • 1 day ago</p>
                </div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Next Payout</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Estimated payout date</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">Feb 15, 2024</p>
              <p className="text-sm text-gray-500 mt-2">
                Funds are typically available 2-3 business days after withdrawal request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;