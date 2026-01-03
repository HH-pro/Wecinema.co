// src/components/marketplace/seller/OrdersTab.tsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import marketplaceApi from '../../../api/marketplaceApi';
import OrderStatusTracker from './OrderStatusTracker';
import OrderActionGuide from './OrderActionGuide';
import DeliveryModal from './DeliveryModal';

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  };
  sellerId: {
    _id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price: number;
    currency: string;
    mediaUrls?: string[];
    description?: string;
    category?: string;
  } | string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  completedAt?: string;
  expectedDelivery?: string;
  buyerNotes?: string;
  sellerNotes?: string;
  revisions?: number;
  maxRevisions?: number;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  attachments?: any[];
  paymentStatus: string;
  orderType: string;
  requirements?: string;
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  onViewOrderDetails: (orderId: string) => void;
  onPlayVideo?: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
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
  actionLoading
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [processingActions, setProcessingActions] = useState<Record<string, boolean>>({});

  // Get order status info
  const getOrderStatusInfo = (status: string) => {
    const statusMap: Record<string, { text: string; icon: string; color: string }> = {
      'pending_payment': { text: 'Pending Payment', icon: '⏳', color: 'yellow' },
      'paid': { text: 'Paid', icon: '💰', color: 'green' },
      'processing': { text: 'Processing', icon: '⚙️', color: 'blue' },
      'in_progress': { text: 'In Progress', icon: '🛠️', color: 'purple' },
      'delivered': { text: 'Delivered', icon: '📦', color: 'orange' },
      'in_revision': { text: 'In Revision', icon: '🔄', color: 'red' },
      'completed': { text: 'Completed', icon: '✅', color: 'green' },
      'cancelled': { text: 'Cancelled', icon: '❌', color: 'red' },
      'refunded': { text: 'Refunded', icon: '💸', color: 'gray' },
      'disputed': { text: 'Disputed', icon: '⚠️', color: 'red' }
    };
    
    return statusMap[status] || { text: status, icon: '❓', color: 'gray' };
  };

  // Format currency
  const formatCurrencyShow = (amount: number, currency: string = 'USD'): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }
    
    // Check if amount is in cents or dollars
    const valueInDollars = amount < 100 ? amount : amount / 100;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueInDollars);
  };

  // Format date
  const formatDate = (dateString: string, includeTime: boolean = false): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      
      return date.toLocaleDateString('en-US', options);
    } catch {
      return 'Invalid date';
    }
  };

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

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };
// ✅ TEST FUNCTION FOR DEBUGGING
const testDeliveryFlow = async () => {
  try {
    console.log('🧪 Testing delivery flow...');
    
    // Test 1: Check auth token
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    
    // Test 2: Check API base URL
    console.log('🌐 API Base URL:', marketplaceApi.utils.getApiBaseUrl());
    
    // Test 3: Test file upload endpoint
    console.log('📤 Testing file upload endpoint...');
    try {
      const testResponse = await fetch('http://localhost:3000/marketplace/orders/upload/delivery', {
        method: 'OPTIONS',
      });
      console.log('✅ Upload endpoint accessible:', testResponse.ok);
    } catch (error) {
      console.error('❌ Upload endpoint not accessible:', error);
    }
    
    // Test 4: Test deliver endpoint
    if (selectedOrderForDelivery) {
      console.log('📦 Testing deliver endpoint for order:', selectedOrderForDelivery._id);
      try {
        const deliverResponse = await fetch(
          `http://localhost:3000/marketplace/orders/${selectedOrderForDelivery._id}/deliver-with-email`,
          { method: 'OPTIONS' }
        );
        console.log('✅ Deliver endpoint accessible:', deliverResponse.ok);
      } catch (error) {
        console.error('❌ Deliver endpoint not accessible:', error);
      }
    }
    
    console.log('✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// OrdersTab mein call karein jab modal open ho
useEffect(() => {
  if (deliveryModalOpen && selectedOrderForDelivery) {
    console.log('🔍 Debug info for delivery:', {
      order: selectedOrderForDelivery,
      status: selectedOrderForDelivery.status,
      id: selectedOrderForDelivery._id
    });
    // testDeliveryFlow(); // Uncomment for debugging
  }
}, [deliveryModalOpen, selectedOrderForDelivery]);
  // ✅ Handle Start Processing using marketplaceApi
  const handleStartProcessing = async (orderId: string) => {
    try {
      setProcessingActions(prev => ({ ...prev, [orderId]: true }));
      
      const response = await marketplaceApi.orders.startProcessing(orderId);
      
      if (response.success) {
        toast.success('Order processing started successfully!');
        onRefresh();
      } else {
        toast.error(response.error || 'Failed to start processing');
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
      toast.error(error.message || 'Failed to start processing');
    } finally {
      setProcessingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ✅ Handle Start Work using marketplaceApi
  const handleStartWork = async (orderId: string) => {
    try {
      setProcessingActions(prev => ({ ...prev, [orderId]: true }));
      
      const response = await marketplaceApi.orders.startWork(orderId);
      
      if (response.success) {
        toast.success('Work started successfully!');
        onRefresh();
      } else {
        toast.error(response.error || 'Failed to start work');
      }
    } catch (error: any) {
      console.error('Error starting work:', error);
      toast.error(error.message || 'Failed to start work');
    } finally {
      setProcessingActions(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Handle Deliver Click
  const handleDeliverClick = (order: Order) => {
    setSelectedOrderForDelivery(order);
    setDeliveryModalOpen(true);
  };

  // ✅ Determine if order can be cancelled
  const canCancelOrder = (order: Order): boolean => {
    const cancellableStatuses = ['pending_payment', 'paid', 'processing'];
    return cancellableStatuses.includes(order.status);
  };

  // ✅ Get cancellation configuration
  const getCancelConfig = (order: Order) => {
    switch (order.status) {
      case 'pending_payment':
        return {
          canCancel: true,
          reason: 'Payment not completed yet',
          message: 'Buyer hasn\'t completed payment. Order can be cancelled.',
          warning: 'No payment has been made yet.'
        };
      
      case 'paid':
        return {
          canCancel: true,
          reason: 'Order not started yet',
          message: 'You can cancel before starting work on this order.',
          warning: 'Full or partial refund may be required based on your cancellation policy.'
        };
      
      case 'processing':
        return {
          canCancel: true,
          reason: 'Work preparation stage',
          message: 'You can cancel before actual work begins.',
          warning: 'Any preparation work done will be lost.'
        };
      
      case 'in_progress':
        return {
          canCancel: false,
          reason: 'Work already started',
          message: 'Cannot cancel once work has started',
          warning: 'Complete the order or discuss with buyer.'
        };
      
      case 'delivered':
        return {
          canCancel: false,
          reason: 'Work delivered to buyer',
          message: 'Cannot cancel after delivery',
          warning: 'Awaiting buyer acceptance or request revisions.'
        };
      
      case 'in_revision':
        return {
          canCancel: false,
          reason: 'Revision in progress',
          message: 'Cannot cancel during revision',
          warning: 'Complete the revision process.'
        };
      
      case 'completed':
        return {
          canCancel: false,
          reason: 'Order completed',
          message: 'Cannot cancel completed orders',
          warning: 'Order has been successfully completed.'
        };
      
      case 'cancelled':
        return {
          canCancel: false,
          reason: 'Already cancelled',
          message: 'Order is already cancelled',
          warning: 'This order was cancelled previously.'
        };
      
      default:
        return {
          canCancel: false,
          reason: 'Unknown status',
          message: 'Cannot cancel',
          warning: 'Please check order status.'
        };
    }
  };

  // ✅ Handle Cancel Order using marketplaceApi
  const handleCancelOrder = async (order: Order) => {
    if (!canCancelOrder(order)) return;
    
    try {
      setProcessingActions(prev => ({ ...prev, [order._id]: true }));
      
      const response = await marketplaceApi.orders.cancelOrderBySeller(order._id, 'Seller cancelled the order');
      
      if (response.success) {
        toast.success('Order cancelled successfully!');
        onRefresh();
      } else {
        toast.error(response.error || 'Failed to cancel order');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setProcessingActions(prev => ({ ...prev, [order._id]: false }));
      setShowCancelConfirm(null);
    }
  };

  // ✅ Handle Complete Revision using marketplaceApi
  const handleCompleteRevision = async (order: Order) => {
    try {
      setSelectedOrderForDelivery(order);
      setDeliveryModalOpen(true);
    } catch (error: any) {
      console.error('Revision setup error:', error);
      toast.error(error.message || 'Failed to start revision');
    }
  };

 // ✅ TEST FUNCTION FOR DEBUGGING
const testDeliveryFlow = async () => {
  try {
    console.log('🧪 Testing delivery flow...');
    
    // Test 1: Check auth token
    const token = localStorage.getItem('token');
    console.log('🔑 Token exists:', !!token);
    
    // Test 2: Check API base URL
    console.log('🌐 API Base URL:', marketplaceApi.utils.getApiBaseUrl());
    
    // Test 3: Test file upload endpoint
    console.log('📤 Testing file upload endpoint...');
    try {
      const testResponse = await fetch('http://localhost:3000/marketplace/orders/upload/delivery', {
        method: 'OPTIONS',
      });
      console.log('✅ Upload endpoint accessible:', testResponse.ok);
    } catch (error) {
      console.error('❌ Upload endpoint not accessible:', error);
    }
    
    // Test 4: Test deliver endpoint
    if (selectedOrderForDelivery) {
      console.log('📦 Testing deliver endpoint for order:', selectedOrderForDelivery._id);
      try {
        const deliverResponse = await fetch(
          `http://localhost:3000/marketplace/orders/${selectedOrderForDelivery._id}/deliver-with-email`,
          { method: 'OPTIONS' }
        );
        console.log('✅ Deliver endpoint accessible:', deliverResponse.ok);
      } catch (error) {
        console.error('❌ Deliver endpoint not accessible:', error);
      }
    }
    
    console.log('✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// OrdersTab mein call karein jab modal open ho
useEffect(() => {
  if (deliveryModalOpen && selectedOrderForDelivery) {
    console.log('🔍 Debug info for delivery:', {
      order: selectedOrderForDelivery,
      status: selectedOrderForDelivery.status,
      id: selectedOrderForDelivery._id
    });
    // testDeliveryFlow(); // Uncomment for debugging
  }
}, [deliveryModalOpen, selectedOrderForDelivery]);
  // Get priority color
  const getPriorityColor = (status: string) => {
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
  };

  // Get status action
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
          color: 'yellow',
          onClick: () => handleDeliverClick(order),
          description: 'Send completed work to buyer',
          icon: '📤'
        };
      case 'in_revision':
        return {
          text: 'Complete Revision',
          color: 'amber',
          onClick: () => handleCompleteRevision(order),
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

  // Calculate delivery date
  const calculateDeliveryDate = (createdAt: string, expectedDays?: number) => {
    if (!expectedDays) return null;
    const date = new Date(createdAt);
    date.setDate(date.getDate() + expectedDays);
    return date;
  };

  // Get days remaining
  const getDaysRemaining = (deliveryDate: Date) => {
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get priority badge
  const getPriorityBadge = (order: Order) => {
    // Use expectedDelivery from order or calculate
    let deliveryDate: Date | null = null;
    
    if (order.expectedDelivery) {
      deliveryDate = new Date(order.expectedDelivery);
    } else {
      // Default to 7 days if no expected delivery
      deliveryDate = calculateDeliveryDate(order.createdAt, 7);
    }
    
    if (!deliveryDate) return null;
    
    const daysRemaining = getDaysRemaining(deliveryDate);
    
    if (daysRemaining <= 1) {
      return {
        text: 'Urgent',
        color: 'bg-red-100 text-red-800',
        icon: '🚨'
      };
    } else if (daysRemaining <= 3) {
      return {
        text: 'Priority',
        color: 'bg-orange-100 text-orange-800',
        icon: '⚡'
      };
    } else if (daysRemaining <= 7) {
      return {
        text: 'On Track',
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      };
    }
    return null;
  };

  // ✅ FILE VALIDATION HELPER
  const validateFileBeforeUpload = (file: File): string | null => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = [
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      // Videos
      '.mp4', '.mov', '.avi', '.webm', '.mkv',
      // Documents
      '.pdf', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      // Audio
      '.mp3', '.wav', '.ogg', '.m4a',
      // Archives
      '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.tar.gz', '.tar.bz2'
    ];

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is 100MB.`;
    }

    // Check file extension
    if (!allowedExtensions.includes(fileExtension)) {
      return `File type "${fileExtension}" is not supported.`;
    }

    return null; // File is valid
  };

  // Get currency from order
  const getOrderCurrency = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId.currency) {
      return order.listingId.currency;
    }
    return 'USD';
  };

  return (
    <div className="space-y-6">
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">❌</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
              {(() => {
                const order = orders.find(o => o._id === showCancelConfirm);
                if (!order) return null;
                const config = getCancelConfig(order);
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-yellow-800">
                      <span className="font-medium">Note:</span> {config.warning}
                    </p>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
              >
                Keep Order
              </button>
              <button
                onClick={() => {
                  const order = orders.find(o => o._id === showCancelConfirm);
                  if (order) handleCancelOrder(order);
                }}
                className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow"
                disabled={processingActions[showCancelConfirm]}
              >
                {processingActions[showCancelConfirm] ? (
                  <>
                    <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : 'Refresh'}
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
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
            <div className="text-sm font-medium text-green-700">Completed</div>
            <div className="text-2xl font-bold text-green-800">
              {orders.filter(o => o.status === 'completed').length}
            </div>
            <div className="text-xs text-green-600">Successfully delivered</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Cancellable</div>
            <div className="text-2xl font-bold text-gray-800">
              {orders.filter(o => canCancelOrder(o)).length}
            </div>
            <div className="text-xs text-gray-600">Can be cancelled</div>
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
              const priorityBadge = getPriorityBadge(order);
              const cancelConfig = getCancelConfig(order);
              const currency = getOrderCurrency(order);
              const isExpanded = expandedOrderId === order._id;
              const isLoading = processingActions[order._id] || false;

              return (
                <div 
                  key={order._id} 
                  className={`p-6 hover:bg-yellow-50 transition-colors ${getPriorityColor(order.status)}`}
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
                              {typeof order.listingId === 'object' 
                                ? order.listingId.title 
                                : 'Order #' + order.orderNumber}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'in_revision' ? 'bg-red-100 text-red-800' :
                              order.status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              <span className="mr-1">{statusInfo.icon}</span>
                              {statusInfo.text}
                            </span>
                            {priorityBadge && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                                <span className="mr-1">{priorityBadge.icon}</span>
                                {priorityBadge.text}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <span className="mr-1">👤</span>
                              <span>{order.buyerId?.username || order.buyerId?.email || 'Buyer'}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">💰</span>
                              <span className="font-medium text-green-600">
                                {formatCurrencyShow(order.amount, currency)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">📅</span>
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                            {order.expectedDelivery && (
                              <div className="flex items-center">
                                <span className="mr-1">⏳</span>
                                <span className="text-amber-600">
                                  Due: {formatDate(order.expectedDelivery)}
                                </span>
                              </div>
                            )}
                            {order.revisions !== undefined && (
                              <div className="flex items-center">
                                <span className="mr-1">🔄</span>
                                <span className={
                                  (order.maxRevisions && order.revisions >= order.maxRevisions) 
                                    ? 'text-red-600 font-medium' 
                                    : 'text-gray-600'
                                }>
                                  {order.revisions} / {order.maxRevisions || 3} revisions
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
                                    order.status === 'processing' 
                                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 w-1/4' 
                                      : 'bg-gradient-to-r from-green-500 to-green-600 w-3/4'
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
                          {formatCurrencyShow(order.amount, currency)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Order #{order.orderNumber || order._id.slice(-6)}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {action && action.onClick && (
                          <button
                            onClick={action.onClick}
                            disabled={isLoading || isSubmittingDelivery}
                            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-2 ${
                              action.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' :
                              action.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                              action.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                              action.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' :
                              'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                            }`}
                          >
                            {isLoading ? (
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

                        {/* Cancel Button */}
                        {cancelConfig.canCancel && (
                          <div className="relative group">
                            <button
                              onClick={() => setShowCancelConfirm(order._id)}
                              disabled={isLoading || isSubmittingDelivery}
                              className="px-4 py-2.5 text-sm font-medium text-red-700 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl transition-all duration-200 disabled:opacity-50 border border-red-200 flex items-center gap-2 group-hover:shadow-sm"
                            >
                              <span>❌</span>
                              Cancel
                            </button>
                            <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                              {cancelConfig.message}
                            </div>
                          </div>
                        )}

                        {/* Show disabled cancel button for non-cancellable orders */}
                        {!cancelConfig.canCancel && (
                          <div className="relative group">
                            <button
                              disabled
                              className="px-4 py-2.5 text-sm font-medium text-gray-400 bg-gray-100 rounded-xl cursor-not-allowed border border-gray-300 flex items-center gap-2"
                            >
                              <span>🚫</span>
                              Cannot Cancel
                            </button>
                            <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                              {cancelConfig.message}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => toggleExpandOrder(order._id)}
                          disabled={isSubmittingDelivery}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all duration-200 border border-gray-300 flex items-center gap-2 disabled:opacity-50"
                        >
                          <span>{isExpanded ? '▲' : '▼'}</span>
                          {isExpanded ? 'Show Less' : 'More Info'}
                        </button>

                        <button
                          onClick={() => onViewOrderDetails(order._id)}
                          disabled={isSubmittingDelivery}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-yellow-300 hover:bg-yellow-50 rounded-xl transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <span>📋</span>
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
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{action.icon}</span>
                                <p className="font-medium text-yellow-800">Next Step: {action.text}</p>
                              </div>
                              <p className="text-sm text-yellow-700 mb-3">{action.description}</p>
                              {action.onClick && (
                                <button
                                  onClick={action.onClick}
                                  disabled={isLoading || isSubmittingDelivery}
                                  className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                                >
                                  <span>{action.icon}</span>
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
                                <span className="font-medium">{formatDate(order.expectedDelivery)}</span>
                              </div>
                            )}
                            
                            {order.revisions !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Revisions Used</span>
                                <span className="font-medium">
                                  {order.revisions} / {order.maxRevisions || 3}
                                  {order.maxRevisions && order.revisions >= order.maxRevisions && (
                                    <span className="ml-2 text-xs text-red-600">(Max reached)</span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex justify-between">
                              <span className="text-gray-600">Payment Status</span>
                              <span className={`font-medium ${
                                order.paymentStatus === 'paid' ? 'text-green-600' :
                                order.paymentStatus === 'pending' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {order.paymentStatus?.replace('_', ' ') || 'N/A'}
                              </span>
                            </div>
                            
                            {order.requirements && (
                              <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">Requirements: </span>
                                  {order.requirements}
                                </p>
                              </div>
                            )}

                            {/* Quick Links */}
                            <div className="mt-6 pt-4 border-t border-yellow-200">
                              <p className="text-sm font-medium text-gray-900 mb-2">Quick Actions</p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => onViewOrderDetails(order._id)}
                                  disabled={isSubmittingDelivery}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border border-yellow-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span>📋</span>
                                  View Full Details
                                </button>
                                <button
                                  onClick={() => window.open(`/marketplace/messages?order=${order._id}`, '_blank')}
                                  disabled={isSubmittingDelivery}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span>💬</span>
                                  Message Buyer
                                </button>
                                {typeof order.listingId === 'object' && 
                                 order.listingId.mediaUrls && 
                                 order.listingId.mediaUrls.length > 0 && 
                                 onPlayVideo && (
                                  <button
                                    onClick={() => onPlayVideo(
                                      order.listingId.mediaUrls![0], 
                                      order.listingId.title
                                    )}
                                    disabled={isSubmittingDelivery}
                                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <span>▶️</span>
                                    View Media
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.orderNumber || order._id);
                                    toast.success('Order ID copied to clipboard!');
                                  }}
                                  disabled={isSubmittingDelivery}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span>📋</span>
                                  Copy Order ID
                                </button>
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

      {/* Delivery Modal */}
      {deliveryModalOpen && selectedOrderForDelivery && (
        <DeliveryModal
          isOpen={deliveryModalOpen}
          onClose={() => {
            setDeliveryModalOpen(false);
            setSelectedOrderForDelivery(null);
          }}
          order={selectedOrderForDelivery}
          onDeliver={handleActualDeliver}
          isLoading={processingActions[selectedOrderForDelivery._id] || isSubmittingDelivery}
          validateFile={validateFileBeforeUpload}
        />
      )}
    </div>
  );
};

export default OrdersTab;