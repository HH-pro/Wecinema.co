// components/marketplace/seller/EarningsTab.tsx
import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import WithdrawBalance from './WithdrawBalance';
import marketplaceApi from '../../../api/marketplaceApi';
import { formatCurrency } from '../../../utils/marketplace';

interface EarningsTabProps {
  stripeStatus: any;
  orderStats: any;
  balanceData?: any;
  monthlyEarnings?: any[];
  earningsHistory?: any[];
  onWithdrawSuccess: (amount: number) => void;
  loading: boolean;
  onRefresh: () => void;
  onGoToWithdraw?: () => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  balanceData,
  monthlyEarnings = [],
  earningsHistory = [],
  onWithdrawSuccess,
  loading,
  onRefresh,
  onGoToWithdraw
}) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  
  // Fetch withdrawals
  const fetchWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const response = await marketplaceApi.earnings.getHistory({ 
        limit: 5, 
        type: 'withdrawal' 
      });
      
      if (response.success) {
        setWithdrawals(response.data?.earnings || []);
      } else {
        // Mock data for development
        setWithdrawals([
          { _id: '1', type: 'withdrawal', amount: 50000, status: 'completed', description: 'Withdrawal to bank', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
          { _id: '2', type: 'withdrawal', amount: 100000, status: 'pending', description: 'Withdrawal request', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }
        ]);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setWithdrawalsLoading(false);
    }
  };
  
  useEffect(() => {
    if (stripeStatus?.chargesEnabled) {
      fetchWithdrawals();
    }
  }, [stripeStatus]);
  
  if (loading) {
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
  
  // Calculate this month's revenue
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthData = monthlyEarnings?.find((item: any) => 
    item._id?.month === currentMonth && item._id?.year === currentYear
  );
  const thisMonthRevenue = thisMonthData?.earnings || balanceData?.thisMonthRevenue || 0;
  
  return (
    <div className="space-y-8">
      {/* Stripe Status Card */}
      <StripeStatusCard stripeStatus={stripeStatus} />
      
      {/* Withdraw Balance Component */}
      <WithdrawBalance
        stripeStatus={stripeStatus}
        availableBalance={balanceData?.availableBalance || 0}
        pendingBalance={balanceData?.pendingBalance || 0}
        totalEarnings={balanceData?.totalEarnings || 0}
        thisMonthEarnings={thisMonthRevenue}
        onWithdrawSuccess={onWithdrawSuccess}
      />
      
      {/* Earnings Overview */}
      <EarningsOverview
        stripeStatus={stripeStatus}
        orderStats={orderStats}
        balanceData={balanceData}
        thisMonthRevenue={thisMonthRevenue}
      />
      
      {/* Earnings Stats */}
      <EarningsStats
        orderStats={orderStats}
        stripeStatus={stripeStatus}
        monthlyEarnings={monthlyEarnings}
      />
      
      {/* Recent Transactions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Earnings */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Earnings</h3>
            <p className="text-sm text-gray-500 mt-1">Your latest income transactions</p>
          </div>
          <div className="divide-y divide-gray-100">
            {earningsHistory.length > 0 ? (
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
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()} • 
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
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Withdrawals */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Withdrawals</h3>
            <p className="text-sm text-gray-500 mt-1">Your withdrawal requests</p>
          </div>
          <div className="divide-y divide-gray-100">
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
                        <p className="font-medium text-gray-900">Withdrawal Request</p>
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
      
      {/* Earnings Insights */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Earnings Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payout Schedule</h4>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Next Payout</span>
                <span className="text-sm font-medium text-green-600">
                  {balanceData?.nextPayoutDate 
                    ? new Date(balanceData.nextPayoutDate).toLocaleDateString()
                    : 'Not scheduled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Withdrawal</span>
                <span className="text-sm text-gray-900">
                  {balanceData?.lastWithdrawal 
                    ? new Date(balanceData.lastWithdrawal).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Funds are typically available 2-3 business days after withdrawal request.
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Earnings Summary (USD)</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Available Balance</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(balanceData?.availableBalance || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Pending Balance</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(balanceData?.pendingBalance || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm text-gray-700">Total Earnings</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(balanceData?.totalEarnings || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span className="text-sm text-gray-700">This Month</span>
                </div>
                <span className="font-medium text-gray-900">
                  {formatCurrency(thisMonthRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition duration-200 flex items-center gap-2 justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
        <button
          onClick={onGoToWithdraw}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow text-center"
        >
          💳 Go to Withdrawals
        </button>
      </div>
    </div>
  );
};

export default EarningsTab;