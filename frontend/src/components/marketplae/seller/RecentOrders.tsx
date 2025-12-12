// src/components/marketplae/seller/RecentOrders.tsx
import React from 'react';
import { formatCurrency, getOrderStatusInfo } from '../../../api';
import OrderStatusTracker from './OrderStatusTracker';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  amount: number;
  buyerId: {
    username: string;
  };
  listingId: {
    title: string;
  };
  createdAt: string;
  deliveredAt?: string;
  completedAt?: string;
}

interface RecentOrdersProps {
  orders: Order[];
  onViewOrderDetails: (orderId: string) => void;
  onStartProcessing: (order: Order) => void;
  onStartWork: (order: Order) => void;
  onDeliver: (order: Order) => void;
  onCancel: (order: Order) => void;
  onCompleteRevision: (order: Order) => void;
  onViewAll: () => void;
  onCreateListing: () => void;
  orderActionLoading: string | null;
}

const RecentOrders: React.FC<RecentOrdersProps> = ({
  orders,
  onViewOrderDetails,
  onStartProcessing,
  onStartWork,
  onDeliver,
  onCancel,
  onCompleteRevision,
  onViewAll,
  onCreateListing,
  orderActionLoading
}) => {
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <div className="p-6 text-center py-10">
          <div className="text-5xl mb-4 text-gray-300">📦</div>
          <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
          <p className="mt-2 text-gray-500">When you receive orders, they'll appear here.</p>
          <button
            onClick={onCreateListing}
            className="mt-4 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
          >
            Create Your First Listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-600 mt-1">Quick actions for your latest orders</p>
          </div>
          <button 
            onClick={onViewAll}
            className="text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            View All →
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {orders.slice(0, 5).map(order => {
            const statusInfo = getOrderStatusInfo(order.status);
            return (
              <div 
                key={order._id} 
                className="p-4 border border-gray-200 rounded-xl hover:border-yellow-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-300">
                      <span className="text-lg font-semibold text-gray-600">
                        {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.listingId?.title || 'Order'}</p>
                      <p className="text-sm text-gray-500">{order.buyerId?.username || 'Buyer'}</p>
                      <div className="flex items-center mt-1">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}
                        >
                          <span className="mr-1">{statusInfo.icon}</span>
                          {statusInfo.text}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-green-600 text-lg">{formatCurrency(order.amount || 0)}</p>
                      <p className="text-xs text-gray-500">Order #{order.orderNumber || order._id.slice(-6)}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {order.status === 'paid' && (
                        <button
                          onClick={() => onStartProcessing(order)}
                          disabled={orderActionLoading === order._id}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                        >
                          {orderActionLoading === order._id ? '...' : 'Start Processing'}
                        </button>
                      )}
                      
                      {order.status === 'processing' && (
                        <button
                          onClick={() => onStartWork(order)}
                          disabled={orderActionLoading === order._id}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                        >
                          {orderActionLoading === order._id ? '...' : 'Start Work'}
                        </button>
                      )}
                      
                      {order.status === 'in_progress' && (
                        <button
                          onClick={() => onDeliver(order)}
                          disabled={orderActionLoading === order._id}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                        >
                          Deliver
                        </button>
                      )}
                      
                      {order.status === 'in_revision' && (
                        <button
                          onClick={() => onCompleteRevision(order)}
                          disabled={orderActionLoading === order._id}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
                        >
                          Complete Revision
                        </button>
                      )}
                      
                      {['paid', 'processing'].includes(order.status) && (
                        <button
                          onClick={() => onCancel(order)}
                          disabled={orderActionLoading === order._id}
                          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 border border-red-200"
                        >
                          Cancel
                        </button>
                      )}
                      
                      <button
                        onClick={() => onViewOrderDetails(order._id)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <OrderStatusTracker 
                    currentStatus={order.status}
                    orderId={order._id}
                    createdAt={order.createdAt}
                    deliveredAt={order.deliveredAt}
                    completedAt={order.completedAt}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;