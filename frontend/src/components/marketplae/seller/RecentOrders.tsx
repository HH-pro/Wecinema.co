import React from 'react';
import { formatCurrency, getOrderStatusInfo } from '../../../api';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  amount: number;
  buyerId: {
    username: string;
    avatar?: string;
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
      month: 'short'
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'pending_payment': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-blue-100 text-blue-800',
      'processing': 'bg-purple-100 text-purple-800',
      'in_progress': 'bg-indigo-100 text-indigo-800',
      'delivered': 'bg-green-100 text-green-800',
      'completed': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-red-100 text-red-800',
      'in_revision': 'bg-amber-100 text-amber-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionButtons = (order: Order) => {
    const actions: React.ReactNode[] = [];
    
    // Add status-specific actions
    switch (order.status) {
      case 'paid':
        actions.push(
          <button
            key="process"
            onClick={() => onStartProcessing(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            title="Start Processing"
          >
            {orderActionLoading === order._id ? '...' : 'Process'}
          </button>
        );
        break;
        
      case 'processing':
        actions.push(
          <button
            key="work"
            onClick={() => onStartWork(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            title="Start Work"
          >
            {orderActionLoading === order._id ? '...' : 'Work'}
          </button>
        );
        break;
        
      case 'in_progress':
        actions.push(
          <button
            key="deliver"
            onClick={() => onDeliver(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            title="Deliver Order"
          >
            Deliver
          </button>
        );
        break;
        
      case 'in_revision':
        actions.push(
          <button
            key="revision"
            onClick={() => onCompleteRevision(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            title="Complete Revision"
          >
            Revise
          </button>
        );
        break;
    }
    
    // Add cancel button for certain statuses
    if (['paid', 'processing'].includes(order.status)) {
      actions.push(
        <button
          key="cancel"
          onClick={() => onCancel(order)}
          disabled={orderActionLoading === order._id}
          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 border border-red-200"
          title="Cancel Order"
        >
          Cancel
        </button>
      );
    }
    
    // Always add details button
    actions.push(
      <button
        key="details"
        onClick={() => onViewOrderDetails(order._id)}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
        title="View Details"
      >
        Details
      </button>
    );
    
    return actions;
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
            <p className="text-sm text-gray-600 mt-1">Manage your latest orders with quick actions</p>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order & Buyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.slice(0, 5).map(order => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300 mr-3">
                        <span className="font-medium text-gray-600">
                          {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm truncate max-w-xs">
                          {order.listingId?.title || 'Order'}
                        </p>
                        <p className="text-xs text-gray-500">{order.buyerId?.username || 'Buyer'}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className="font-semibold text-green-600">{formatCurrency(order.amount || 0)}</span>
                    <p className="text-xs text-gray-500">#{order.orderNumber || order._id.slice(-6)}</p>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{formatDate(order.createdAt)}</span>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {getActionButtons(order)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentOrders;