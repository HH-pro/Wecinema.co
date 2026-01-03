// src/components/marketplace/seller/EarningsTab.tsx - UPDATED WITHOUT WITHDRAWAL SUMMARY
import React, { useState } from 'react';
import { SellerStats } from '../../../api/marketplaceApi';

interface EarningsTabProps {
  sellerStats: SellerStats | null;
  loading: boolean;
  onRefresh: () => void;
  totalEarnings: number;
  thisMonthEarnings: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  stripeStatus?: {
    connected: boolean;
    availableBalance: number;
  };
}

const EarningsTab: React.FC<EarningsTabProps> = ({ 
  sellerStats, 
  loading, 
  onRefresh,
  totalEarnings,
  thisMonthEarnings,
  pendingEarnings,
  totalWithdrawn,
  stripeStatus
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week'>('all');
  
  // Calculate earnings breakdown
  const completedEarnings = sellerStats?.totals?.completedOrders?.revenue ? sellerStats.totals.completedOrders.revenue / 100 : 0;
  const averageOrderValue = sellerStats?.totals?.averageOrderValue ? sellerStats.totals.averageOrderValue / 100 : 0;
  const availableBalance = stripeStatus?.availableBalance ? stripeStatus.availableBalance / 100 : 0;
  const totalOrders = sellerStats?.totals?.totalOrders || 0;
  const completedOrders = sellerStats?.totals?.completedOrders?.count || 0;
  const pendingOrders = sellerStats?.totals?.pendingOrders?.count || 0;

  // Get stats for other statuses
  const refundedEarnings = sellerStats?.statsByStatus?.find(s => s._id === 'refunded')?.totalAmount || 0;
  const refundedOrders = sellerStats?.statsByStatus?.find(s => s._id === 'refunded')?.count || 0;
  
  const inRevisionEarnings = sellerStats?.statsByStatus?.find(s => s._id === 'in_revision')?.totalAmount || 0;
  const inRevisionOrders = sellerStats?.statsByStatus?.find(s => s._id === 'in_revision')?.count || 0;
  
  const disputedEarnings = sellerStats?.statsByStatus?.find(s => s._id === 'disputed')?.totalAmount || 0;
  const disputedOrders = sellerStats?.statsByStatus?.find(s => s._id === 'disputed')?.count || 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate percentage change (mock data)
  const monthChangePercentage = 15.5; // Mock data
  const isPositiveChange = monthChangePercentage >= 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your revenue, withdrawals, and financial performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {(['all', 'month', 'week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {range === 'all' ? 'All Time' : range === 'month' ? 'This Month' : 'This Week'}
              </button>
            ))}
          </div>
          
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-sm font-medium rounded-lg transition duration-200 flex items-center shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Key Metrics Grid - 3 Cards Now */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Earnings Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg transform hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium opacity-90">Total Earnings</h3>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl">💰</span>
            </div>
          </div>
          <p className="text-3xl font-bold mb-2">{formatCurrency(totalEarnings)}</p>
          <p className="text-sm opacity-80">All-time revenue from {totalOrders} orders</p>
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex justify-between text-sm">
              <span className="opacity-80">Completed: {completedOrders}</span>
              <span className="opacity-80">Pending: {pendingOrders}</span>
            </div>
          </div>
        </div>

        {/* This Month Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">This Month</h3>
            <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-xl text-green-600">📈</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(thisMonthEarnings)}</p>
          <div className="flex items-center">
            <span className={`text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
              {isPositiveChange ? '↗' : '↘'} {Math.abs(monthChangePercentage)}%
            </span>
            <span className="text-sm text-gray-500 ml-2">from last month</span>
          </div>
          <p className="text-sm text-gray-500 mt-3">Current monthly revenue</p>
        </div>

        {/* Avg Order Value Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">Avg Order Value</h3>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
              <span className="text-xl text-purple-600">📊</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">{formatCurrency(averageOrderValue)}</p>
          <div className="flex items-center mt-3">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{completedOrders} orders</span>
              <span className="text-gray-500 ml-2">completed</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Per completed order</p>
        </div>
      </div>

      {/* Earnings Breakdown Full Width */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Earnings Breakdown</h3>
              <p className="text-sm text-gray-600 mt-1">Detailed analysis of your revenue by order status</p>
            </div>
            <div className="text-sm text-gray-500">
              {timeRange === 'all' ? 'All Time' : timeRange === 'month' ? 'This Month' : 'This Week'}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Completed Earnings</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(completedEarnings)}</p>
                  <p className="text-xs text-green-600 mt-2">{completedOrders} orders delivered</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-green-600">✅</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Pending Earnings</p>
                  <p className="text-2xl font-bold text-yellow-900">{formatCurrency(pendingEarnings)}</p>
                  <p className="text-xs text-yellow-600 mt-2">{pendingOrders} orders in progress</p>
                </div>
                <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-yellow-600">⏳</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Available Balance</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(availableBalance)}</p>
                  <p className="text-xs text-blue-600 mt-2">
                    {stripeStatus?.connected ? 'Ready to withdraw' : 'Connect Stripe'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-blue-600">💳</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-6">
            <h4 className="font-semibold text-gray-800 text-lg">Revenue by Order Status</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Main Statuses */}
              {sellerStats?.statsByStatus?.filter(stat => 
                ['completed', 'in_progress', 'pending_payment', 'paid'].includes(stat._id)
              ).map((stat, index) => (
                <div key={index} className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        stat._id === 'completed' ? 'bg-green-500' :
                        stat._id === 'in_progress' ? 'bg-blue-500' :
                        stat._id === 'pending_payment' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="font-medium capitalize">
                        {stat._id.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{stat.count} orders</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    ${(stat.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        stat._id === 'completed' ? 'bg-green-500' :
                        stat._id === 'in_progress' ? 'bg-blue-500' :
                        stat._id === 'pending_payment' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${totalOrders > 0 ? ((stat.count / totalOrders) * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {totalOrders > 0 ? ((stat.count / totalOrders) * 100).toFixed(1) : 0}% of total orders
                  </p>
                </div>
              ))}
            </div>

            {/* Other Statuses */}
            {(refundedOrders > 0 || inRevisionOrders > 0 || disputedOrders > 0) && (
              <div className="mt-8">
                <h5 className="font-medium text-gray-700 mb-4">Other Statuses</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Refunded */}
                  {refundedOrders > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-700">Refunded</p>
                          <p className="text-xl font-bold text-red-900">
                            ${(refundedEarnings / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600">{refundedOrders} orders</p>
                          <p className="text-xs text-red-500">
                            {totalOrders > 0 ? ((refundedOrders / totalOrders) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* In Revision */}
                  {inRevisionOrders > 0 && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-orange-700">In Revision</p>
                          <p className="text-xl font-bold text-orange-900">
                            ${(inRevisionEarnings / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-orange-600">{inRevisionOrders} orders</p>
                          <p className="text-xs text-orange-500">
                            {totalOrders > 0 ? ((inRevisionOrders / totalOrders) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disputed */}
                  {disputedOrders > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-purple-700">Disputed</p>
                          <p className="text-xl font-bold text-purple-900">
                            ${(disputedEarnings / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-purple-600">{disputedOrders} orders</p>
                          <p className="text-xs text-purple-500">
                            {totalOrders > 0 ? ((disputedOrders / totalOrders) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Summary</h3>
            <p className="text-sm text-gray-600 mt-1">Key metrics for your business</p>
          </div>
          <div className="mt-3 md:mt-0">
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Data updates in real-time</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-blue-600">📦</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-green-600">✅</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{completedOrders}</p>
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-xs text-green-500 mt-1">
              {totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}% success rate
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-yellow-600">⏳</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-xs text-yellow-500 mt-1">
              {totalOrders > 0 ? ((pendingOrders / totalOrders) * 100).toFixed(1) : 0}% of orders
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-purple-600">📊</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(averageOrderValue)}</p>
            <p className="text-sm text-gray-600">Avg Order Value</p>
            <p className="text-xs text-purple-500 mt-1">
              Per completed order
            </p>
          </div>
        </div>
      </div>

      {/* Tips & Guidance */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-xl text-blue-600">💡</span>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Tips to Increase Earnings</h4>
            <p className="text-sm text-blue-700">Best practices for growing your revenue</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600">⭐</span>
              </div>
              <h5 className="font-medium text-gray-900">Optimize Listings</h5>
            </div>
            <p className="text-sm text-gray-600">
              Use high-quality images and detailed descriptions to attract more buyers.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600">⚡</span>
              </div>
              <h5 className="font-medium text-gray-900">Fast Delivery</h5>
            </div>
            <p className="text-sm text-gray-600">
              Quick turnaround times lead to better reviews and more repeat customers.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-amber-600">💬</span>
              </div>
              <h5 className="font-medium text-gray-900">Great Communication</h5>
            </div>
            <p className="text-sm text-gray-600">
              Clear communication reduces revisions and increases customer satisfaction.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State for No Data */}
      {!sellerStats && !loading && (
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Earnings Data Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Start selling to see your earnings dashboard fill up with revenue data.
          </p>
          <div className="flex justify-center space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg">
              Create Your First Listing
            </button>
            {!stripeStatus?.connected && (
              <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200">
                Setup Payments
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsTab;