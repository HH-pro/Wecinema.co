// components/marketplace/seller/EarningsTab.tsx - UPDATED WITH $ CURRENCY
import React, { useState, useEffect } from 'react';
import StripeStatusCard from './StripeStatusCard';
import EarningsOverview from './EarningsOverview';
import EarningsStats from './EarningsStats';
import marketplaceApi from '../../../api/marketplaceApi';

// Format currency function - CHANGED TO $
const formatCurrency = (amount: number) => {
  const amountInDollars = amount / 100;
  return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Calculate earnings metrics from orderStats
  const calculateEarningsMetrics = () => {
    // Note: orderStats amounts are in cents
    const totalEarnings = orderStats?.totalRevenue || 0; // in cents
    const availableBalance = stripeStatus?.availableBalance || orderStats?.totalRevenue || 0; // in cents
    const pendingBalance = orderStats?.pendingRevenue || 0; // in cents
    const thisMonthEarnings = orderStats?.thisMonthRevenue || 0; // in cents
    
    // Calculate potential earnings from active listings (estimated)
    const potentialEarnings = (orderStats?.activeOrders || 0) * 5000; // 5000 cents = $50 average
    
    return {
      totalEarnings,
      availableBalance,
      pendingBalance,
      thisMonthEarnings,
      potentialEarnings,
      formatted: {
        totalEarnings: formatCurrency(totalEarnings),
        availableBalance: formatCurrency(availableBalance),
        pendingBalance: formatCurrency(pendingBalance),
        thisMonthEarnings: formatCurrency(thisMonthEarnings),
        potentialEarnings: formatCurrency(potentialEarnings)
      }
    };
  };
  
  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      
      // Try to fetch detailed earnings data from API
      const [summaryResponse, periodResponse, balanceResponse] = await Promise.allSettled([
        marketplaceApi.earnings?.getEarningsSummary?.() || Promise.resolve({ success: false }),
        marketplaceApi.earnings?.getEarningsByPeriod?.('month') || Promise.resolve({ success: false }),
        marketplaceApi.earnings?.getAvailableBalance?.() || Promise.resolve({ success: false })
      ]);
      
      const earningsData: any = {};
      
      // Process API responses
      if (summaryResponse.status === 'fulfilled' && summaryResponse.value.success) {
        earningsData.summary = summaryResponse.value;
      }
      
      if (periodResponse.status === 'fulfilled' && periodResponse.value.success) {
        earningsData.period = periodResponse.value;
      }
      
      if (balanceResponse.status === 'fulfilled' && balanceResponse.value.success) {
        earningsData.balance = balanceResponse.value;
      }
      
      // Fallback to orderStats if API data is not available
      if (!earningsData.summary) {
        earningsData.summary = {
          totalEarnings: orderStats?.totalRevenue || 0,
          thisMonthEarnings: orderStats?.thisMonthRevenue || 0,
          totalOrders: orderStats?.totalOrders || 0,
          thisMonthOrders: orderStats?.thisMonthOrders || 0
        };
      }
      
      if (!earningsData.balance) {
        earningsData.balance = {
          available: stripeStatus?.availableBalance || orderStats?.totalRevenue || 0,
          pending: orderStats?.pendingRevenue || 0,
          processing: 0
        };
      }
      
      setEarningsData(earningsData);
      
      // Generate mock transactions for display
      generateMockTransactions();
      
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      // Fallback to orderStats data
      const fallbackData = {
        summary: {
          totalEarnings: orderStats?.totalRevenue || 0,
          thisMonthEarnings: orderStats?.thisMonthRevenue || 0,
          totalOrders: orderStats?.totalOrders || 0,
          thisMonthOrders: orderStats?.thisMonthOrders || 0
        },
        balance: {
          available: stripeStatus?.availableBalance || orderStats?.totalRevenue || 0,
          pending: orderStats?.pendingRevenue || 0,
          processing: 0
        }
      };
      
      setEarningsData(fallbackData);
      generateMockTransactions();
    } finally {
      setEarningsLoading(false);
    }
  };
  
  // Generate mock transaction history
  const generateMockTransactions = () => {
    const mockTransactions = [
      {
        id: 'ORD_001',
        type: 'order',
        description: 'Custom Web Design',
        status: 'completed',
        amount: 7000, // 7000 cents = $70
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        customer: 'John Doe'
      },
      {
        id: 'ORD_002',
        type: 'order',
        description: 'Logo Design Package',
        status: 'in_progress',
        amount: 5000, // 5000 cents = $50
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        customer: 'Jane Smith'
      },
      {
        id: 'ORD_003',
        type: 'order',
        description: 'Social Media Graphics',
        status: 'completed',
        amount: 3000, // 3000 cents = $30
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        customer: 'Robert Johnson'
      },
      {
        id: 'WDR_001',
        type: 'withdrawal',
        description: 'Bank Transfer',
        status: 'completed',
        amount: -15000, // 15000 cents = $150 (negative for withdrawal)
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        destination: 'Bank Account •••• 4321'
      }
    ];
    
    // Sort by date (newest first)
    mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(mockTransactions);
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };
  
  // Get next payout date (mock calculation)
  const getNextPayoutDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // If today is Friday, payout is Monday
    if (dayOfWeek === 5) {
      today.setDate(today.getDate() + 3);
    } 
    // If today is Saturday, payout is Monday
    else if (dayOfWeek === 6) {
      today.setDate(today.getDate() + 2);
    }
    // If today is Sunday, payout is Tuesday
    else if (dayOfWeek === 0) {
      today.setDate(today.getDate() + 2);
    }
    // Otherwise, payout is next business day
    else {
      today.setDate(today.getDate() + 1);
    }
    
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };
  
  useEffect(() => {
    if (stripeStatus?.chargesEnabled) {
      fetchEarningsData();
    }
  }, [stripeStatus, orderStats]);
  
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
  
  const earningsMetrics = calculateEarningsMetrics();
  
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">💰 Earnings Insights</h3>
          <button
            onClick={fetchEarningsData}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Recent Transactions</h4>
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === 'withdrawal' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {transaction.type === 'withdrawal' ? '💸' : '💰'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {transaction.id} • {transaction.customer || transaction.destination}
                          </span>
                          <span className={`text-xs font-medium ${getStatusColor(transaction.status)}`}>
                            {getStatusText(transaction.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.amount < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 text-gray-300">📊</div>
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              )}
            </div>
            
            {transactions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button className="w-full px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition duration-200">
                  View All Transactions
                </button>
              </div>
            )}
          </div>
          
          {/* Payout Schedule & Insights */}
          <div className="space-y-6">
            {/* Next Payout */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Next Payout</h4>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">💸</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated payout date</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{getNextPayoutDate()}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  <span className="font-medium">Available for withdrawal:</span>{' '}
                  <span className="text-lg font-bold text-green-700">
                    {earningsMetrics.formatted.availableBalance}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  💡 Funds are typically available 2-3 business days after withdrawal request.
                  Withdrawals processed on business days only.
                </p>
              </div>
            </div>
            
            {/* Earnings Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <h4 className="text-sm font-medium text-gray-700 mb-4">📈 Earnings Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-sm font-medium text-gray-900">
                    {earningsMetrics.formatted.thisMonthEarnings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Clearance</span>
                  <span className="text-sm font-medium text-yellow-700">
                    {earningsMetrics.formatted.pendingBalance}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Earnings</span>
                  <span className="text-sm font-bold text-gray-900">
                    {earningsMetrics.formatted.totalEarnings}
                  </span>
                </div>
              </div>
              
              {/* Progress bar for monthly goal */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Monthly Goal Progress</span>
                  <span className="text-xs font-medium text-gray-900">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  $250 monthly goal • {formatCurrency(earningsMetrics.thisMonthEarnings)} earned
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tips Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <span className="text-xl">💡</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Tips to Increase Earnings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-yellow-100 rounded-lg p-4">
            <div className="text-lg mb-2">⭐</div>
            <h4 className="font-medium text-gray-900 mb-2">Optimize Listings</h4>
            <p className="text-sm text-gray-600">
              Use high-quality images and detailed descriptions to attract more buyers.
            </p>
          </div>
          <div className="bg-white border border-yellow-100 rounded-lg p-4">
            <div className="text-lg mb-2">⚡</div>
            <h4 className="font-medium text-gray-900 mb-2">Fast Delivery</h4>
            <p className="text-sm text-gray-600">
              Complete orders faster to get positive reviews and repeat customers.
            </p>
          </div>
          <div className="bg-white border border-yellow-100 rounded-lg p-4">
            <div className="text-lg mb-2">📈</div>
            <h4 className="font-medium text-gray-900 mb-2">Offer Extras</h4>
            <p className="text-sm text-gray-600">
              Add premium services or fast delivery options to increase order value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;