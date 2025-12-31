import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import WithdrawModal from './WithdrawTab';
import marketplaceApi from '../../../api/marketplaceApi';

interface EarningsTabProps {
  stripeStatus: any;
  orderStats: any;
  loading: boolean;
  onRefresh: () => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({
  stripeStatus,
  orderStats,
  loading,
  onRefresh
}) => {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      
      // Fetch balance and earnings data
      const [balanceResponse, monthlyResponse, historyResponse] = await Promise.allSettled([
        marketplaceApi.earnings.getBalance(),
        marketplaceApi.earnings.getMonthlySummary(),
        marketplaceApi.earnings.getHistory({ limit: 10 })
      ]);
      
      const earningsData: any = {};
      
      if (balanceResponse.status === 'fulfilled' && balanceResponse.value.success) {
        setBalanceData(balanceResponse.value.data);
      }
      
      if (monthlyResponse.status === 'fulfilled' && monthlyResponse.value.success) {
        earningsData.monthly = monthlyResponse.value.data;
      }
      
      if (historyResponse.status === 'fulfilled' && historyResponse.value.success) {
        setEarningsHistory(historyResponse.value.data.earnings);
      }
      
      setEarningsData(earningsData);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setEarningsLoading(false);
    }
  };
  
  const handleWithdrawRequest = async (amount: number) => {
    try {
      setWithdrawLoading(true);
      const response = await marketplaceApi.earnings.withdraw({ amount });
      
      if (response.success) {
        alert('Withdrawal request submitted successfully!');
        setWithdrawModalOpen(false);
        // Refresh balance data
        fetchEarningsData();
      } else {
        alert(`Withdrawal failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Failed to process withdrawal request');
    } finally {
      setWithdrawLoading(false);
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
      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onWithdraw={handleWithdrawRequest}
        availableBalance={balanceData?.availableBalance || 0}
        isLoading={withdrawLoading}
      />
      
      {/* Stripe Status Card */}
      <StripeStatusCard stripeStatus={stripeStatus} />
      
      {/* Balance Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-medium text-blue-700 mb-1">Available Balance</h3>
            <p className="text-3xl font-bold text-gray-900">
              ₹{balanceData?.availableBalance?.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Pending withdrawal: ₹{balanceData?.pendingBalance?.toFixed(2) || '0.00'}
            </p>
          </div>
          <button
            onClick={() => setWithdrawModalOpen(true)}
            disabled={(balanceData?.availableBalance || 0) < 500}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              (balanceData?.availableBalance || 0) >= 500
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            💳 Withdraw Funds
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-lg font-semibold text-gray-900">
              ₹{balanceData?.totalEarnings?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Withdrawn</p>
            <p className="text-lg font-semibold text-gray-900">
              ₹{balanceData?.totalWithdrawn?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Next Payout</p>
            <p className="text-lg font-semibold text-gray-900">
              {balanceData?.nextPayoutDate 
                ? new Date(balanceData.nextPayoutDate).toLocaleDateString()
                : 'Not scheduled'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Recent Earnings History */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
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
                      {transaction.type === 'earning' ? '+' : '-'}₹{transaction.amount?.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Balance: ₹{transaction.balanceAfter?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No transactions yet
            </div>
          )}
        </div>
      </div>
      
      {/* Withdrawal Info */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Withdrawal Information</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Minimum withdrawal amount: ₹500</li>
          <li>• Withdrawals are processed within 3-5 business days</li>
          <li>• Funds will be transferred to your connected Stripe account</li>
          <li>• A small processing fee may apply (usually 2.9% + ₹3)</li>
        </ul>
      </div>
    </div>
  );
};

export default EarningsTab;