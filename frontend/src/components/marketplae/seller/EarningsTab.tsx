// EarningsTab component میں (اگر آپ کا ہے):
import React from 'react';
import { SellerStats } from '../../api/marketplaceApi';

interface EarningsTabProps {
  sellerStats: SellerStats | null;
  loading: boolean;
  onRefresh: () => void;
}

const EarningsTab: React.FC<EarningsTabProps> = ({ sellerStats, loading, onRefresh }) => {
  // Calculate earnings breakdown
  const totalEarnings = sellerStats?.totals?.totalRevenue ? sellerStats.totals.totalRevenue / 100 : 0;
  const thisMonthEarnings = sellerStats?.totals?.thisMonthRevenue ? sellerStats.totals.thisMonthRevenue / 100 : 0;
  const completedEarnings = sellerStats?.totals?.completedOrders?.revenue ? sellerStats.totals.completedOrders.revenue / 100 : 0;
  const pendingEarnings = sellerStats?.totals?.pendingOrders?.revenue ? sellerStats.totals.pendingOrders.revenue / 100 : 0;
  const averageOrderValue = sellerStats?.totals?.averageOrderValue ? sellerStats.totals.averageOrderValue / 100 : 0;

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Earnings Overview</h2>
            <p className="text-gray-600">Real-time earnings tracking</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
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
                Refresh
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Total Earnings</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-2">All-time revenue</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">This Month</h3>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${thisMonthEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-2">Current month revenue</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Avg Order Value</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-500 mt-2">Per completed order</p>
          </div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">By Status</h4>
            <div className="space-y-3">
              {sellerStats?.statsByStatus?.map((stat, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="capitalize">{stat._id.replace('_', ' ')}</span>
                  <div className="text-right">
                    <p className="font-medium">${(stat.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm text-gray-500">{stat.count} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-3">Summary</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Orders</span>
                <span className="font-medium">
                  ${completedEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-sm text-gray-500 ml-2">
                    ({sellerStats?.totals?.completedOrders?.count || 0} orders)
                  </span>
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Orders</span>
                <span className="font-medium">
                  ${pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-sm text-gray-500 ml-2">
                    ({sellerStats?.totals?.pendingOrders?.count || 0} orders)
                  </span>
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Revenue</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;