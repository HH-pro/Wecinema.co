import React from 'react';
import marketplaceApi, { Order as ApiOrder } from '../../../api/marketplaceApi';

// ✅ Marketpalce API se helper functions le rahe hain
const { formatCurrency, getOrderStatusInfo } = marketplaceApi.utils;

// Order interface ko marketplace API se le rahe hain
interface Order extends ApiOrder {
  buyerId?: {
    username: string;
    avatar?: string;
  };
  listingId?: {
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const getStatusColor = (status: string): string => {
    // ✅ Marketplace API se status info le sakte hain
    const statusInfo = getOrderStatusInfo ? getOrderStatusInfo(status) : null;
    
    if (statusInfo?.color) {
      return statusInfo.color;
    }
    
    // Fallback colors agar API se nahi aaye
    const colors: Record<string, string> = {
      'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'paid': 'bg-blue-100 text-blue-800 border-blue-200',
      'processing': 'bg-purple-100 text-purple-800 border-purple-200',
      'in_progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'delivered': 'bg-green-100 text-green-800 border-green-200',
      'completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'cancelled_by_seller': 'bg-red-100 text-red-800 border-red-200',
      'cancelled_by_buyer': 'bg-red-100 text-red-800 border-red-200',
      'in_revision': 'bg-amber-100 text-amber-800 border-amber-200',
      'revision_requested': 'bg-amber-100 text-amber-800 border-amber-200',
      'rejected': 'bg-gray-100 text-gray-800 border-gray-200',
      'refunded': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusDisplayText = (status: string): string => {
    // ✅ Marketplace API se display text le sakte hain
    const statusInfo = getOrderStatusInfo ? getOrderStatusInfo(status) : null;
    
    if (statusInfo?.displayText) {
      return statusInfo.displayText;
    }
    
    // Fallback display text
    const displayTexts: Record<string, string> = {
      'pending_payment': 'Pending Payment',
      'pending': 'Pending',
      'paid': 'Paid',
      'processing': 'Processing',
      'in_progress': 'In Progress',
      'delivered': 'Delivered',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'cancelled_by_seller': 'Cancelled by Seller',
      'cancelled_by_buyer': 'Cancelled by Buyer',
      'in_revision': 'In Revision',
      'revision_requested': 'Revision Requested',
      'rejected': 'Rejected',
      'refunded': 'Refunded'
    };
    
    return displayTexts[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionButtons = (order: Order) => {
    const actions: React.ReactNode[] = [];
    
    // ✅ Marketplace API se order status actions check kar sakte hain
    // For now, hum manual logic use kar rahe hain
    
    // Add status-specific actions
    switch (order.status) {
      case 'paid':
        actions.push(
          <button
            key="process"
            onClick={() => onStartProcessing(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-1"
            title="Start Processing"
          >
            {orderActionLoading === order._id ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </span>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process
              </>
            )}
          </button>
        );
        break;
        
      case 'processing':
        actions.push(
          <button
            key="work"
            onClick={() => onStartWork(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-1"
            title="Start Work"
          >
            {orderActionLoading === order._id ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting
              </span>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Start Work
              </>
            )}
          </button>
        );
        break;
        
      case 'in_progress':
        actions.push(
          <button
            key="deliver"
            onClick={() => onDeliver(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-1"
            title="Deliver Order"
          >
            {orderActionLoading === order._id ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Delivering
              </span>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Deliver
              </>
            )}
          </button>
        );
        break;
        
      case 'in_revision':
      case 'revision_requested':
        actions.push(
          <button
            key="revision"
            onClick={() => onCompleteRevision(order)}
            disabled={orderActionLoading === order._id}
            className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-1"
            title="Complete Revision"
          >
            {orderActionLoading === order._id ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Revising
              </span>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Revise
              </>
            )}
          </button>
        );
        break;
    }
    
    // Add cancel button for certain statuses
    if (['pending_payment', 'pending', 'paid', 'processing', 'in_progress'].includes(order.status)) {
      actions.push(
        <button
          key="cancel"
          onClick={() => onCancel(order)}
          disabled={orderActionLoading === order._id}
          className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 border border-red-200 flex items-center gap-1"
          title="Cancel Order"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      );
    }
    
    // Always add details button
    actions.push(
      <button
        key="details"
        onClick={() => onViewOrderDetails(order._id)}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 flex items-center gap-1"
        title="View Details"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Details
      </button>
    );
    
    return actions;
  };

  // Calculate total amount for display
  const calculateTotalEarnings = () => {
    const totalCents = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    return formatCurrency(totalCents);
  };

  const totalRecentOrders = orders.length;

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
            className="mt-4 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow flex items-center justify-center mx-auto"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Your First Listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{totalRecentOrders}</span> recent orders
              </p>
              <span className="h-4 w-px bg-gray-300"></span>
              <p className="text-sm text-gray-600">
                Total: <span className="font-medium text-green-600">{calculateTotalEarnings()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>{orders.filter(o => o.status === 'completed').length} completed</span>
            </div>
            <button 
              onClick={onViewAll}
              className="text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>View All Orders</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Order & Buyer</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Amount</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Date</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.slice(0, 5).map(order => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center border border-yellow-300 mr-4 shadow-sm">
                        <span className="font-bold text-yellow-800 text-lg">
                          {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate max-w-xs mb-1">
                          {order.listingId?.title || 'Order'}
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate">{order.buyerId?.username || 'Unknown Buyer'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-green-600 text-base">{formatCurrency(order.amount || 0)}</span>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span className="font-mono">#{order.orderNumber || order._id.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)} border`}>
                        <span className="w-2 h-2 rounded-full mr-2" style={{
                          backgroundColor: getStatusColor(order.status).includes('green') ? '#10B981' :
                                          getStatusColor(order.status).includes('yellow') ? '#F59E0B' :
                                          getStatusColor(order.status).includes('blue') ? '#3B82F6' :
                                          getStatusColor(order.status).includes('purple') ? '#8B5CF6' :
                                          getStatusColor(order.status).includes('red') ? '#EF4444' :
                                          getStatusColor(order.status).includes('gray') ? '#6B7280' : '#6B7280'
                        }}></span>
                        {getStatusDisplayText(order.status)}
                      </span>
                      
                      {order.deliveredAt && (
                        <div className="text-xs text-gray-500">
                          Delivered: {formatDate(order.deliveredAt)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{formatDate(order.createdAt)}</span>
                      {order.completedAt && (
                        <span className="text-xs text-green-600 mt-1">
                          Completed: {formatDate(order.completedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2 min-w-[200px]">
                      {getActionButtons(order)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length > 5 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">5</span> of <span className="font-medium text-gray-900">{orders.length}</span> recent orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;