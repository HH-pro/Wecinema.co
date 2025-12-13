// src/components/marketplace/seller/OrdersTab.tsx
import React, { useState, useCallback } from 'react';
import { getOrderStatusInfo, formatCurrency, formatDate } from '../../../api';
import OrderStatusTracker from './OrderStatusTracker';
import OrderActionGuide from './OrderActionGuide';

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
    mediaUrls?: string[];
  };
  createdAt: string;
  deliveredAt?: string;
  completedAt?: string;
  expectedDelivery?: string;
  notes?: string;
  revisions?: number;
  maxRevisions?: number;
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  onViewOrderDetails: (orderId: string) => void;
  onPlayVideo?: (videoUrl: string, title: string) => void;
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
  filter,
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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState<string | null>(null);

  const statusFilters = [
    { value: 'all', label: 'All Orders', count: orders.length },
    { value: 'paid', label: 'To Start', count: orders.filter(o => o.status === 'paid').length },
    { value: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
    { value: 'in_progress', label: 'In Progress', count: orders.filter(o => o.status === 'in_progress').length },
    { value: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
    { value: 'in_revision', label: 'Revision', count: orders.filter(o => o.status === 'in_revision').length },
    { value: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
  ];

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const toggleExpandOrder = useCallback((orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  }, []);

  const getPriorityColor = useCallback((status: string) => {
    switch (status) {
      case 'in_revision':
        return 'bg-red-50 border-red-200';
      case 'delivered':
        return 'bg-yellow-50 border-yellow-200';
      case 'in_progress':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-purple-50 border-purple-200';
      case 'paid':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  }, []);

  const handleAction = useCallback(async (
    orderId: string, 
    actionFunction?: (orderId: string | Order) => void,
    order?: Order
  ) => {
    if (!actionFunction) return;
    
    setLocalLoading(orderId);
    try {
      if (order && (actionFunction === onDeliver || actionFunction === onCancel || actionFunction === onCompleteRevision)) {
        await actionFunction(order);
      } else if (actionFunction === onStartProcessing || actionFunction === onStartWork) {
        await actionFunction(orderId);
      }
    } catch (error) {
      console.error('Action failed:', error);
      // You might want to show a toast notification here
    } finally {
      setLocalLoading(null);
    }
  }, [onDeliver, onCancel, onCompleteRevision, onStartProcessing, onStartWork]);

  const getStatusAction = useCallback((order: Order) => {
    switch (order.status) {
      case 'paid':
        return {
          text: 'Start Processing',
          color: 'yellow',
          onClick: () => handleAction(order._id, onStartProcessing, order),
          description: 'Begin preparing this order',
          requiresConfirmation: false
        };
      case 'processing':
        return {
          text: 'Start Work',
          color: 'green',
          onClick: () => handleAction(order._id, onStartWork, order),
          description: 'Begin working on deliverables',
          requiresConfirmation: false
        };
      case 'in_progress':
        return {
          text: 'Deliver Work',
          color: 'yellow',
          onClick: () => handleAction(order._id, onDeliver, order),
          description: 'Send completed work to buyer',
          requiresConfirmation: true
        };
      case 'in_revision':
        return {
          text: 'Complete Revision',
          color: 'amber',
          onClick: () => handleAction(order._id, onCompleteRevision, order),
          description: 'Send revised work back',
          requiresConfirmation: false
        };
      case 'delivered':
        return {
          text: 'Awaiting Buyer',
          color: 'gray',
          onClick: null,
          description: 'Waiting for buyer review',
          requiresConfirmation: false
        };
      default:
        return null;
    }
  }, [handleAction, onStartProcessing, onStartWork, onDeliver, onCompleteRevision]);

  const calculateDeliveryDate = useCallback((createdAt: string, expectedDays?: number) => {
    if (!expectedDays) return null;
    const date = new Date(createdAt);
    date.setDate(date.getDate() + expectedDays);
    return date;
  }, []);

  const getDaysRemaining = useCallback((deliveryDate: Date) => {
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const isOrderActionLoading = useCallback((orderId: string) => {
    return actionLoading === orderId || localLoading === orderId;
  }, [actionLoading, localLoading]);

  const renderActionButton = (order: Order, action: any) => {
    const isLoading = isOrderActionLoading(order._id);
    
    if (!action || !action.onClick) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (action.requiresConfirmation) {
        const confirmed = window.confirm(`Are you sure you want to ${action.text.toLowerCase()} for order #${order.orderNumber}?`);
        if (confirmed) {
          action.onClick();
        }
      } else {
        action.onClick();
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow min-w-[120px] ${
          action.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' :
          action.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
          action.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
          action.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' :
          'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          action.text
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            <p className="text-gray-600 mt-1">Manage and track all your orders in one place</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-4 py-2.5 bg-white border border-yellow-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200">
            <div className="text-sm font-medium text-yellow-700">To Start</div>
            <div className="text-2xl font-bold text-yellow-800">
              {orders.filter(o => o.status === 'paid').length}
            </div>
            <div className="text-xs text-yellow-600">Awaiting action</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
            <div className="text-sm font-medium text-purple-700">In Progress</div>
            <div className="text-2xl font-bold text-purple-800">
              {orders.filter(o => ['processing', 'in_progress'].includes(o.status)).length}
            </div>
            <div className="text-xs text-purple-600">Being worked on</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
            <div className="text-sm font-medium text-amber-700">For Review</div>
            <div className="text-2xl font-bold text-amber-800">
              {orders.filter(o => ['delivered', 'in_revision'].includes(o.status)).length}
            </div>
            <div className="text-xs text-amber-600">Awaiting buyer</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <div className="text-sm font-medium text-green-700">Completed</div>
            <div className="text-2xl font-bold text-green-800">
              {orders.filter(o => o.status === 'completed').length}
            </div>
            <div className="text-xs text-green-600">Successfully delivered</div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="border-b border-yellow-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {statusFilters.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => onFilterChange(value)}
                className={`py-3 px-1 font-medium text-sm flex items-center whitespace-nowrap transition-all duration-200 relative ${
                  filter === value
                    ? 'text-yellow-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    filter === value ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {count}
                  </span>
                )}
                {filter === value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Order Action Guide */}
      <OrderActionGuide currentFilter={filter} />

      {/* Orders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-700">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-4 text-gray-300">📦</div>
            <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
            <p className="mt-2 text-gray-500">
              {filter === 'all' 
                ? "You don't have any orders yet. When you receive orders, they'll appear here."
                : `You don't have any ${filter.replace('_', ' ')} orders.`
              }
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => onFilterChange('all')}
                className="mt-4 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
              >
                View All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-yellow-100">
            {filteredOrders.map(order => {
              const statusInfo = getOrderStatusInfo(order.status);
              const action = getStatusAction(order);
              const deliveryDate = calculateDeliveryDate(order.createdAt, 7);
              const daysRemaining = deliveryDate ? getDaysRemaining(deliveryDate) : null;
              const isExpanded = expandedOrderId === order._id;
              const isLoading = isOrderActionLoading(order._id);

              return (
                <div 
                  key={order._id} 
                  className={`p-6 hover:bg-yellow-50 transition-colors ${getPriorityColor(order.status)} ${isLoading ? 'opacity-70' : ''}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center border border-yellow-200 flex-shrink-0">
                          <span className="text-lg font-semibold text-yellow-600">
                            {order.orderNumber?.slice(-3) || '#'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">
                              {order.listingId?.title || 'Order'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'in_revision' ? 'bg-red-100 text-red-800' :
                              order.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              <span className="mr-1">{statusInfo.icon}</span>
                              {statusInfo.text}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <span className="mr-1">👤</span>
                              <span>{order.buyerId?.username || 'Buyer'}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">📅</span>
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                            {daysRemaining !== null && daysRemaining > 0 && (
                              <div className="flex items-center">
                                <span className="mr-1">⏳</span>
                                <span className={daysRemaining <= 2 ? 'text-red-600 font-medium' : 'text-amber-600'}>
                                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar for In Progress Orders */}
                          {['processing', 'in_progress'].includes(order.status) && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>
                                  {order.status === 'processing' ? '25%' : '75%'}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    order.status === 'processing' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 w-1/4' : 'bg-gradient-to-r from-green-500 to-green-600 w-3/4'
                                  }`}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 lg:gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(order.amount || 0)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Order #{order.orderNumber || order._id.slice(-6)}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {renderActionButton(order, action)}

                        {['paid', 'processing'].includes(order.status) && onCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const confirmed = window.confirm(`Are you sure you want to cancel order #${order.orderNumber}?`);
                              if (confirmed) {
                                handleAction(order._id, onCancel, order);
                              }
                            }}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-sm font-medium text-red-700 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl transition-all duration-200 disabled:opacity-50 border border-red-200 min-w-[80px]"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandOrder(order._id);
                          }}
                          disabled={isLoading}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all duration-200 border border-gray-300 disabled:opacity-50 min-w-[100px]"
                        >
                          {isExpanded ? 'Show Less' : 'More Info'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrderDetails(order._id);
                          }}
                          disabled={isLoading}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-yellow-300 hover:bg-yellow-50 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50 min-w-[80px]"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-yellow-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Status Tracker */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Order Progress</h4>
                          <OrderStatusTracker
                            currentStatus={order.status}
                            orderId={order._id}
                            createdAt={order.createdAt}
                            deliveredAt={order.deliveredAt}
                            completedAt={order.completedAt}
                          />
                          
                          {action && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                              <p className="font-medium text-yellow-800">Next Step: {action.text}</p>
                              <p className="text-sm text-yellow-700 mt-1">{action.description}</p>
                              {action.onClick && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (action.requiresConfirmation) {
                                      const confirmed = window.confirm(`Are you sure you want to ${action.text.toLowerCase()} for order #${order.orderNumber}?`);
                                      if (confirmed) {
                                        action.onClick();
                                      }
                                    } else {
                                      action.onClick();
                                    }
                                  }}
                                  disabled={isLoading}
                                  className="mt-3 w-full px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 shadow-md"
                                >
                                  Take Action
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Column: Order Details */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Order Details</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Order Date</span>
                              <span className="font-medium">{formatDate(order.createdAt)}</span>
                            </div>
                            
                            {order.expectedDelivery && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Delivery</span>
                                <span className="font-medium">{order.expectedDelivery}</span>
                              </div>
                            )}
                            
                            {order.revisions !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Revisions</span>
                                <span className="font-medium">
                                  {order.revisions} / {order.maxRevisions || 3} used
                                </span>
                              </div>
                            )}
                            
                            {order.notes && (
                              <div className="mt-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Notes: </span>
                                  {order.notes}
                                </p>
                              </div>
                            )}

                            {/* Quick Links */}
                            <div className="mt-6 pt-4 border-t border-yellow-200">
                              <p className="text-sm font-medium text-gray-900 mb-2">Quick Actions</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => onViewOrderDetails(order._id)}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border border-yellow-200"
                                >
                                  📋 View Full Details
                                </button>
                                <button
                                  onClick={() => window.open(`/messages?order=${order._id}`, '_blank')}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200"
                                >
                                  💬 Message Buyer
                                </button>
                                {order.listingId?.mediaUrls?.[0] && onPlayVideo && (
                                  <button
                                    onClick={() => onPlayVideo(order.listingId.mediaUrls[0], order.listingId.title)}
                                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200"
                                  >
                                    ▶️ View Media
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border border-yellow-300">
              Export Orders (CSV)
            </button>
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-300">
              Send Bulk Message
            </button>
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-300">
              Print Order Summaries
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;