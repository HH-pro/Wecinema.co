// src/components/marketplace/seller/OrdersTab.tsx
import React from 'react';
import { 
  formatCurrency, 
  formatDate, 
  getOrderStatusInfo, 
  getStatusColor 
} from '../../../api';
import SellerOrderActions from './SellerOrderActions';

interface Order {
  _id: string;
  orderNumber?: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
    mediaUrls?: string[];
    description?: string;
    type?: string;
  };
  createdAt: string;
  updatedAt?: string;
  orderDate?: string;
  paidAt?: string;
  processingAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  expectedDelivery?: string;
  shippingAddress?: any;
  paymentMethod?: string;
  notes?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
  paymentReleased?: boolean;
  platformFee?: number;
  sellerAmount?: number;
  revisions?: number;
  maxRevisions?: number;
  revisionNotes?: any[];
  deliveryMessage?: string;
  deliveryFiles?: string[];
  workFiles?: any[];
  userRole?: 'buyer' | 'seller';
  permissions?: {
    canStartProcessing: boolean;
    canStartWork: boolean;
    canDeliver: boolean;
    canCancelBySeller: boolean;
  };
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  filter?: string;
  onFilterChange?: (filter: string) => void;
  onViewOrderDetails: (orderId: string) => void;
  onPlayVideo: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
  onStartProcessing?: (orderId: string) => void;
  onStartWork?: (orderId: string) => void;
  onDeliver?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onCompleteRevision?: (order: Order) => void;
  actionLoading?: string | null;
}

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  loading,
  filter = 'all',
  onFilterChange,
  onViewOrderDetails,
  onPlayVideo,
  onRefresh,
  onStartProcessing,
  onStartWork,
  onDeliver,
  onCancel,
  onCompleteRevision,
  actionLoading
}) => {
  const filters = [
    { id: 'all', label: 'All Orders', count: orders.length },
    { id: 'active', label: 'Active', count: orders.filter(o => 
      ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)
    ).length },
    { id: 'pending_payment', label: 'Pending Payment', count: orders.filter(o => o.status === 'pending_payment').length },
    { id: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
    { id: 'in_progress', label: 'In Progress', count: orders.filter(o => o.status === 'in_progress').length },
    { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
    { id: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
    { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const filteredOrders = filter === 'all' 
    ? orders 
    : filter === 'active'
      ? orders.filter(o => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status))
      : orders.filter(o => o.status === filter);

  const getTimelineIcon = (status: string, order: Order) => {
    switch (status) {
      case 'paid':
        return order.paidAt ? '💳' : '';
      case 'processing':
        return order.processingAt ? '⚙️' : '';
      case 'in_progress':
        return order.startedAt ? '👨‍💻' : '';
      case 'delivered':
        return order.deliveredAt ? '🚚' : '';
      case 'completed':
        return order.completedAt ? '✅' : '';
      case 'cancelled':
        return order.cancelledAt ? '❌' : '';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Orders</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage all your customer orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {filters.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => onFilterChange?.(id)}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                filter === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                filter === id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-gray-300">📦</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? "You haven't received any orders yet."
                : `No orders with status "${filters.find(f => f.id === filter)?.label}"`
              }
            </p>
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Orders
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const statusInfo = getOrderStatusInfo(order.status);
              const statusColor = getStatusColor(order.status);
              
              return (
                <div 
                  key={order._id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order #{order.orderNumber || order._id.substring(18, 24).toUpperCase()}
                              </h3>
                              <span 
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                                style={{ 
                                  backgroundColor: `${statusColor}15`, 
                                  color: statusColor,
                                  borderColor: `${statusColor}30`
                                }}
                              >
                                <span className="mr-1">{statusInfo.icon}</span>
                                {statusInfo.text}
                              </span>
                            </div>
                            
                            <p className="text-gray-700 mb-1">
                              <span className="font-medium">{order.listingId?.title || 'Unknown Listing'}</span>
                              <span className="mx-2">•</span>
                              <span className="text-gray-600">For {order.buyerId?.username || 'Unknown Buyer'}</span>
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(order.createdAt)}
                              </div>
                              {order.expectedDelivery && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Due: {formatDate(order.expectedDelivery)}
                                </div>
                              )}
                              {order.revisions !== undefined && order.maxRevisions !== undefined && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Revisions: {order.revisions}/{order.maxRevisions}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(order.amount || 0)}
                            </p>
                            {order.sellerAmount && (
                              <p className="text-sm text-gray-500 mt-1">
                                You receive: {formatCurrency(order.sellerAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Timeline */}
                        {(order.paidAt || order.processingAt || order.startedAt || order.deliveredAt || order.completedAt) && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                              {order.paidAt && (
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                                    💳
                                  </span>
                                  <span className="ml-2 text-xs text-gray-600">Paid</span>
                                </div>
                              )}
                              {order.processingAt && (
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
                                    ⚙️
                                  </span>
                                  <span className="ml-2 text-xs text-gray-600">Processing</span>
                                </div>
                              )}
                              {order.startedAt && (
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm">
                                    👨‍💻
                                  </span>
                                  <span className="ml-2 text-xs text-gray-600">Work Started</span>
                                </div>
                              )}
                              {order.deliveredAt && (
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm">
                                    🚚
                                  </span>
                                  <span className="ml-2 text-xs text-gray-600">Delivered</span>
                                </div>
                              )}
                              {order.completedAt && (
                                <div className="flex items-center">
                                  <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm">
                                    ✅
                                  </span>
                                  <span className="ml-2 text-xs text-gray-600">Completed</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="lg:w-64">
                        <div className="flex flex-wrap gap-2 justify-end">
                          {onStartProcessing && onStartWork && onDeliver && onCancel && onCompleteRevision && (
                            <SellerOrderActions
                              order={order}
                              loading={actionLoading === order._id}
                              onStartProcessing={() => onStartProcessing(order._id)}
                              onStartWork={() => onStartWork(order._id)}
                              onDeliver={() => onDeliver(order)}
                              onCancel={() => onCancel(order)}
                              onCompleteRevision={() => onCompleteRevision(order)}
                              onViewDetails={() => onViewOrderDetails(order._id)}
                            />
                          )}
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => onViewOrderDetails(order._id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                          >
                            View Details
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Media Preview */}
                    {order.listingId?.mediaUrls && order.listingId.mediaUrls.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Listing Media</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {order.listingId.mediaUrls.slice(0, 5).map((url, index) => {
                            const isVideo = url.match(/\.(mp4|webm|mov|avi)$/i);
                            return (
                              <div
                                key={index}
                                className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:border-blue-300"
                                onClick={() => {
                                  if (isVideo) {
                                    onPlayVideo(url, order.listingId?.title || 'Video');
                                  }
                                }}
                              >
                                {isVideo ? (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <img
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Image';
                                    }}
                                  />
                                )}
                                {isVideo && (
                                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 rounded p-0.5">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Stats Summary */}
      {filteredOrders.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <span>Showing <span className="font-semibold">{filteredOrders.length}</span> orders</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Total Value: <span className="font-semibold text-green-600">
                  {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.amount, 0))}
                </span>
              </span>
            </div>
            <button
              onClick={onRefresh}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center mt-2 sm:mt-0"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;