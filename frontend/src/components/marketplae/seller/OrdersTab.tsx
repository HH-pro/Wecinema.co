// src/components/marketplace/seller/OrdersTab.tsx - SIMPLIFIED WORKING VERSION
import React, { useState } from 'react';
import { marketplaceAPI, getOrderStatusInfo, formatCurrency, formatDate } from '../../../api';
import OrderStatusTracker from './OrderStatusTracker';
import OrderActionGuide from './OrderActionGuide';
import DeliveryModal from './DeliveryModal';
import { toast } from 'react-toastify';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  amount: number;
  buyerId: {
    username: string;
    avatar?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  listingId: {
    title: string;
    mediaUrls?: string[];
  };
  sellerId?: {
    username: string;
    email?: string;
  };
  createdAt: string;
  deliveredAt?: string;
  completedAt?: string;
  expectedDelivery?: string;
  notes?: string;
  revisions?: number;
  maxRevisions?: number;
  expectedDays?: number;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  payments?: any[];
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  onViewOrderDetails: (orderId: string) => void;
  onPlayVideo?: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  loading,
  filter,
  onFilterChange,
  onViewOrderDetails,
  onPlayVideo,
  onRefresh,
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // SIMPLE FILE UPLOAD FUNCTION - DIRECT FETCH
  const uploadFilesDirect = async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/marketplace/orders/upload/delivery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (data.success) {
        return data.files;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // SIMPLIFIED DELIVERY FUNCTION
  const handleDeliverOrder = async (order: Order) => {
    setSelectedOrder(order);
    setDeliveryModalOpen(true);
  };

  // ACTION HANDLERS
  const handleStartProcessing = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await marketplaceAPI.orders.startProcessing(orderId, setActionLoading);
      toast.success('Order processing started!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start processing');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartWork = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await marketplaceAPI.orders.startWork(orderId, setActionLoading);
      toast.success('Work started on order!');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start work');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (confirm(`Cancel order #${order.orderNumber}? This will refund the buyer.`)) {
      try {
        setActionLoading(order._id);
        await marketplaceAPI.orders.cancelBySeller(order._id, 'Cancelled by seller', setActionLoading);
        toast.success('Order cancelled successfully');
        onRefresh();
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel order');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await marketplaceAPI.orders.complete(orderId, setActionLoading);
      toast.success('Order marked as completed! Payment released to seller.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestRevision = async (orderId: string) => {
    const revisionNotes = prompt('What needs to be revised?');
    if (revisionNotes) {
      try {
        setActionLoading(orderId);
        await marketplaceAPI.orders.requestRevision(orderId, revisionNotes, setActionLoading);
        toast.success('Revision requested!');
        onRefresh();
      } catch (error: any) {
        toast.error(error.message || 'Failed to request revision');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const getStatusAction = (order: Order) => {
    switch (order.status) {
      case 'paid':
        return {
          text: 'Start Processing',
          color: 'yellow',
          onClick: () => handleStartProcessing(order._id),
          description: 'Begin preparing this order',
          icon: '⚙️'
        };
      case 'processing':
        return {
          text: 'Start Work',
          color: 'green',
          onClick: () => handleStartWork(order._id),
          description: 'Begin working on deliverables',
          icon: '🛠️'
        };
      case 'in_progress':
        return {
          text: 'Deliver Work',
          color: 'purple',
          onClick: () => handleDeliverOrder(order),
          description: 'Send completed work to buyer',
          icon: '📤'
        };
      case 'in_revision':
        return {
          text: 'Complete Revision',
          color: 'amber',
          onClick: () => handleDeliverOrder(order), // Same modal for revisions
          description: 'Send revised work back',
          icon: '🔄'
        };
      case 'delivered':
        return {
          text: 'Awaiting Buyer',
          color: 'gray',
          onClick: null,
          description: 'Waiting for buyer review',
          icon: '⏳'
        };
      default:
        return null;
    }
  };

  const getPriorityColor = (status: string) => {
    switch (status) {
      case 'in_revision': return 'bg-red-50 border-red-200';
      case 'delivered': return 'bg-yellow-50 border-yellow-200';
      case 'in_progress': return 'bg-green-50 border-green-200';
      case 'processing': return 'bg-purple-50 border-purple-200';
      case 'paid': return 'bg-amber-50 border-amber-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            <p className="text-gray-600 mt-1">Manage and track all your orders</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-yellow-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-yellow-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { status: 'paid', label: 'To Start', color: 'yellow' },
            { status: 'processing,in_progress', label: 'In Progress', color: 'purple' },
            { status: 'delivered,in_revision', label: 'For Review', color: 'amber' },
            { status: 'completed', label: 'Completed', color: 'green' }
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 p-4 rounded-xl border border-${stat.color}-200`}>
              <div className={`text-sm font-medium text-${stat.color}-700`}>{stat.label}</div>
              <div className={`text-2xl font-bold text-${stat.color}-800`}>
                {orders.filter(o => stat.status.includes(o.status)).length}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="border-b border-yellow-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {statusFilters.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => onFilterChange(value)}
                className={`py-3 px-1 font-medium text-sm flex items-center whitespace-nowrap transition-all duration-200 relative ${
                  filter === value ? 'text-yellow-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  filter === value ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {count}
                </span>
                {filter === value && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
                ? "You don't have any orders yet."
                : `You don't have any ${filter.replace('_', ' ')} orders.`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-yellow-100">
            {filteredOrders.map(order => {
              const statusInfo = getOrderStatusInfo(order.status);
              const action = getStatusAction(order);
              const isExpanded = expandedOrderId === order._id;

              return (
                <div key={order._id} className={`p-6 ${getPriorityColor(order.status)}`}>
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
                              <span className="mr-1">💰</span>
                              <span className="font-medium">{formatCurrency(order.amount || 0)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">📅</span>
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {action && action.onClick && (
                        <button
                          onClick={action.onClick}
                          disabled={actionLoading === order._id}
                          className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-2 ${
                            action.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' :
                            action.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                            action.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                            'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                          }`}
                        >
                          {actionLoading === order._id ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            <>
                              <span>{action.icon}</span>
                              {action.text}
                            </>
                          )}
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <button
                          onClick={() => handleCompleteOrder(order._id)}
                          disabled={actionLoading === order._id}
                          className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm flex items-center gap-2"
                        >
                          ✅ Complete Order
                        </button>
                      )}

                      <button
                        onClick={() => onViewOrderDetails(order._id)}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-yellow-300 hover:bg-yellow-50 rounded-xl transition-all duration-200 shadow-sm flex items-center gap-2"
                      >
                        📋 Details
                      </button>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-yellow-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Order Progress</h4>
                          <OrderStatusTracker
                            currentStatus={order.status}
                            orderId={order._id}
                            createdAt={order.createdAt}
                            deliveredAt={order.deliveredAt}
                            completedAt={order.completedAt}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
                          <div className="space-y-3">
                            {order.status === 'delivered' && (
                              <button
                                onClick={() => handleCompleteOrder(order._id)}
                                disabled={actionLoading === order._id}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                              >
                                ✅ Mark as Completed
                              </button>
                            )}
                            {order.status === 'delivered' && order.revisions !== undefined && order.revisions < (order.maxRevisions || 3) && (
                              <button
                                onClick={() => handleRequestRevision(order._id)}
                                disabled={actionLoading === order._id}
                                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                              >
                                🔄 Request Revision
                              </button>
                            )}
                            <button
                              onClick={() => window.open(`/messages?order=${order._id}`, '_blank')}
                              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                            >
                              💬 Message Buyer
                            </button>
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

      {/* Delivery Modal */}
      {deliveryModalOpen && selectedOrder && (
        <SimpleDeliveryModal
          order={selectedOrder}
          onClose={() => setDeliveryModalOpen(false)}
          onDeliver={async (data) => {
            try {
              setActionLoading(selectedOrder._id);
              
              // Upload files
              let uploadedAttachments = [];
              if (data.attachments && data.attachments.length > 0) {
                uploadedAttachments = await uploadFilesDirect(data.attachments);
              }

              // Send delivery
              if (selectedOrder.status === 'in_revision') {
                await marketplaceAPI.orders.completeRevision(
                  selectedOrder._id,
                  {
                    deliveryMessage: data.message,
                    attachments: uploadedAttachments,
                    isFinalDelivery: data.isFinal
                  },
                  setActionLoading
                );
                toast.success('Revision completed!');
              } else {
                await marketplaceAPI.orders.deliverWithEmail(
                  selectedOrder._id,
                  {
                    deliveryMessage: data.message,
                    attachments: uploadedAttachments,
                    isFinalDelivery: data.isFinal
                  },
                  setActionLoading
                );
                toast.success('Order delivered! Buyer notified.');
              }

              setDeliveryModalOpen(false);
              onRefresh();
            } catch (error: any) {
              toast.error(error.message || 'Delivery failed');
            } finally {
              setActionLoading(null);
            }
          }}
          isLoading={actionLoading === selectedOrder._id}
        />
      )}
    </div>
  );
};

// SIMPLE DELIVERY MODAL
const SimpleDeliveryModal: React.FC<{
  order: Order;
  onClose: () => void;
  onDeliver: (data: {
    message: string;
    attachments: File[];
    isFinal: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}> = ({ order, onClose, onDeliver, isLoading }) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFinal, setIsFinal] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a delivery message');
      return;
    }

    await onDeliver({ message, attachments: files, isFinal });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {order.status === 'in_revision' ? 'Complete Revision' : 'Deliver Order'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what you're delivering..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Files (Optional)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
              {files.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Selected {files.length} file{files.length !== 1 ? 's' : ''}:
                  </p>
                  <ul className="mt-1 text-xs text-gray-500">
                    {files.map((file, index) => (
                      <li key={index} className="truncate">
                        📎 {file.name} ({Math.round(file.size / 1024)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="final-delivery"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="final-delivery" className="ml-2 text-sm text-gray-700">
                This is the final delivery
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : order.status === 'in_revision' ? (
                  'Complete Revision'
                ) : (
                  'Deliver Order'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;