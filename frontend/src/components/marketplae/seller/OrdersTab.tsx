// src/components/marketplace/seller/OrdersTab.tsx - COMPLETE FIXED VERSION
import React, { useState } from 'react';
import { marketplaceAPI, getOrderStatusInfo, formatCurrency, formatDate } from '../../../api';
import OrderStatusTracker from './OrderStatusTracker';
import OrderActionGuide from './OrderActionGuide';
import DeliveryModal from './DeliveryModal';

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
  onStartProcessing?: (orderId: string) => void;
  onStartWork?: (orderId: string) => void;
  onDeliver?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onCompleteRevision?: (order: Order) => void;
  actionLoading?: string | null;
  onActualDeliver?: (deliveryData: {
    orderId: string;
    message: string;
    attachments: File[];
    isFinal: boolean;
    revisionsLeft?: number;
  }) => Promise<void>;
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
  actionLoading,
  onActualDeliver
}) => {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

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

  const handleDeliverClick = (order: Order) => {
    setSelectedOrderForDelivery(order);
    setDeliveryModalOpen(true);
  };

  // ✅ IMPROVED FILE UPLOAD FUNCTION WITHOUT TOASTS
  const handleActualDeliver = async (deliveryData: {
    orderId: string;
    message: string;
    attachments: File[];
    isFinal: boolean;
    revisionsLeft?: number;
  }) => {
    try {
      setIsSubmittingDelivery(true);
      
      console.log('🚀 Starting delivery process...', {
        orderId: deliveryData.orderId,
        messageLength: deliveryData.message?.length,
        filesCount: deliveryData.attachments?.length,
        files: deliveryData.attachments?.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          extension: f.name.split('.').pop()?.toLowerCase()
        }))
      });

      let uploadedAttachments: Array<{
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        url: string;
        path: string;
      }> = [];

      // Upload files if available
      if (deliveryData.attachments && deliveryData.attachments.length > 0) {
        console.log('📤 Uploading files...', deliveryData.attachments.length);
        
        try {
          // ✅ Direct file upload with better handling
          uploadedAttachments = await uploadFilesDirect(deliveryData.attachments);
          
          console.log('✅ Files uploaded successfully:', uploadedAttachments);
        } catch (uploadError: any) {
          console.error('❌ File upload error:', uploadError);
          
          // Check if it's a file type error
          if (uploadError.message?.includes('File type') || uploadError.message?.includes('not supported')) {
            console.error(`❌ ${uploadError.message}. Please use supported file types.`);
          } else if (uploadError.message?.includes('size')) {
            console.error('❌ File too large. Maximum size is 100MB.');
          } else {
            console.error(`❌ File upload failed: ${uploadError.message || 'Please try again'}`);
          }
          return; // Stop if file upload fails
        }
      }

      // Determine if this is a revision or initial delivery
      const isRevision = selectedOrderForDelivery?.status === 'in_revision';
      console.log('🔄 Is revision?', isRevision);
      
      try {
        if (isRevision) {
          // Complete revision
          console.log('🔄 Completing revision...');
          await marketplaceAPI.orders.completeRevision(
            deliveryData.orderId,
            {
              deliveryMessage: deliveryData.message,
              attachments: uploadedAttachments,
              isFinalDelivery: deliveryData.isFinal
            },
            setIsSubmittingDelivery
          );
          console.log('✅ Revision completed successfully!');
        } else {
          // Initial delivery with email
          console.log('📤 Delivering order with email...');
          await marketplaceAPI.orders.deliverWithEmail(
            deliveryData.orderId,
            {
              deliveryMessage: deliveryData.message,
              attachments: uploadedAttachments,
              isFinalDelivery: deliveryData.isFinal
            },
            setIsSubmittingDelivery
          );
          console.log('✅ Order delivered successfully! Buyer has been notified via email.');
        }
      } catch (apiError: any) {
        console.error('❌ API Error:', apiError);
        
        // Handle specific API errors
        if (apiError.message?.includes('Validation failed')) {
          console.error('❌ Please check your delivery details and try again.');
        } else if (apiError.message?.includes('not found')) {
          console.error('❌ Order not found or you do not have permission.');
        } else {
          throw apiError; // Re-throw for outer catch
        }
      }

      // Success! Close modal and refresh
      console.log('🎉 Delivery successful, refreshing orders...');
      setDeliveryModalOpen(false);
      setSelectedOrderForDelivery(null);
      onRefresh();
      
    } catch (error: any) {
      console.error('❌ Delivery error:', error);
      
      // Show specific error messages in console only
      let errorMessage = 'Delivery failed. Please try again.';
      
      if (error.message?.includes('File type')) {
        errorMessage = 'Invalid file type. Please check allowed file formats.';
      } else if (error.message?.includes('size')) {
        errorMessage = 'File too large. Maximum size is 100MB.';
      } else if (error.message?.includes('network') || error.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error(`❌ ${errorMessage}`);
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // ✅ DIRECT FILE UPLOAD FUNCTION WITHOUT TOASTS
  const uploadFilesDirect = async (files: File[]) => {
    try {
      const formData = new FormData();
      
      // Log each file before uploading
      files.forEach(file => {
        console.log('📄 File to upload:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          extension: file.name.split('.').pop()?.toLowerCase()
        });
        formData.append('files', file);
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }

      console.log('🌐 Sending file upload request...');
      
      const response = await fetch('http://localhost:3000/marketplace/orders/upload/delivery', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, browser will set it automatically
        },
        body: formData,
      });

      console.log('📥 Upload response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Upload response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || `Upload failed with status ${response.status}`);
      }

      if (data.success) {
        return data.files;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Upload error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  };

  // For revision completion:
  const handleCompleteRevision = async (order: Order) => {
    try {
      setSelectedOrderForDelivery(order);
      setDeliveryModalOpen(true);
    } catch (error: any) {
      console.error('❌ Revision setup error:', error);
      console.error(`❌ ${error.message || 'Failed to start revision'}`);
    }
  };

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

  const getStatusAction = (order: Order) => {
    switch (order.status) {
      case 'paid':
        return {
          text: 'Start Processing',
          color: 'yellow',
          onClick: () => onStartProcessing?.(order._id),
          description: 'Begin preparing this order',
          icon: '⚙️'
        };
      case 'processing':
        return {
          text: 'Start Work',
          color: 'green',
          onClick: () => onStartWork?.(order._id),
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

  const calculateDeliveryDate = (createdAt: string, expectedDays?: number) => {
    if (!expectedDays) return null;
    const date = new Date(createdAt);
    date.setDate(date.getDate() + expectedDays);
    return date;
  };

  const getDaysRemaining = (deliveryDate: Date) => {
    const today = new Date();
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityBadge = (order: Order) => {
    const deliveryDate = calculateDeliveryDate(order.createdAt, order.expectedDays || 7);
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
      return `File type "${fileExtension}" is not supported. Allowed: ${allowedExtensions.join(', ')}`;
    }

    return null; // File is valid
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
          {/* <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200">
            <div className="text-sm font-medium text-amber-700">For Review</div>
            <div className="text-2xl font-bold text-amber-800">
              {orders.filter(o => ['delivered', 'in_revision'].includes(o.status)).length}
            </div> */}
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
              const deliveryDate = calculateDeliveryDate(order.createdAt, order.expectedDays || 7);
              const daysRemaining = deliveryDate ? getDaysRemaining(deliveryDate) : null;
              const isExpanded = expandedOrderId === order._id;
              const priorityBadge = getPriorityBadge(order);

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
                              <span>{order.buyerId?.username || 'Buyer'}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">💰</span>
                              <span className="font-medium text-green-600">{formatCurrency(order.amount || 0)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="mr-1">📅</span>
                              <span>{formatDate(order.createdAt)}</span>
                            </div>
                            {daysRemaining !== null && (
                              <div className="flex items-center">
                                <span className="mr-1">⏳</span>
                                <span className={
                                  daysRemaining <= 0 ? 'text-red-600 font-medium' :
                                  daysRemaining <= 2 ? 'text-orange-600 font-medium' :
                                  'text-amber-600'
                                }>
                                  {daysRemaining <= 0 
                                    ? 'Overdue!' 
                                    : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
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
                          {formatCurrency(order.amount || 0)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Order #{order.orderNumber || order._id.slice(-6)}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {action && action.onClick && (
                          <button
                            onClick={action.onClick}
                            disabled={actionLoading === order._id || isSubmittingDelivery}
                            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow flex items-center gap-2 ${
                              action.color === 'yellow' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' :
                              action.color === 'green' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                              action.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                              action.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' :
                              'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                            }`}
                          >
                            {(actionLoading === order._id || isSubmittingDelivery) ? (
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

                        {['paid', 'processing', 'in_progress'].includes(order.status) && onCancel && (
                          <button
                            onClick={() => onCancel(order)}
                            disabled={actionLoading === order._id || isSubmittingDelivery}
                            className="px-4 py-2.5 text-sm font-medium text-red-700 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 rounded-xl transition-all duration-200 disabled:opacity-50 border border-red-200 flex items-center gap-2"
                          >
                            <span>❌</span>
                            Cancel
                          </button>
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
                                  disabled={actionLoading === order._id || isSubmittingDelivery}
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
                            
                            {deliveryDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected Delivery</span>
                                <span className="font-medium">{formatDate(deliveryDate.toISOString())}</span>
                              </div>
                            )}
                            
                            {order.expectedDelivery && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Original ETA</span>
                                <span className="font-medium">{order.expectedDelivery}</span>
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
                            
                            {order.notes && (
                              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">Buyer Notes: </span>
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
                                  disabled={isSubmittingDelivery}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border border-yellow-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span>📋</span>
                                  View Full Details
                                </button>
                                <button
                                  onClick={() => window.open(`/messages?order=${order._id}`, '_blank')}
                                  disabled={isSubmittingDelivery}
                                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200 flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span>💬</span>
                                  Message Buyer
                                </button>
                                {order.listingId?.mediaUrls?.[0] && onPlayVideo && (
                                  <button
                                    onClick={() => onPlayVideo(order.listingId.mediaUrls![0], order.listingId.title)}
                                    disabled={isSubmittingDelivery}
                                    className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 border border-purple-200 flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <span>▶️</span>
                                    View Media
                                  </button>
                                )}
                                <button
                                  onClick={() => navigator.clipboard.writeText(order.orderNumber || order._id)}
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

      {/* Bulk Actions */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Bulk Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 border border-yellow-300 flex items-center gap-2">
              <span>📊</span>
              Export Orders (CSV)
            </button>
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-300 flex items-center gap-2">
              <span>📧</span>
              Send Bulk Message
            </button>
            <button className="px-4 py-2.5 text-sm bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-300 flex items-center gap-2">
              <span>🖨️</span>
              Print Order Summaries
            </button>
          </div>
        </div>
      )}

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
          isLoading={actionLoading === selectedOrderForDelivery._id || isSubmittingDelivery}
          validateFile={validateFileBeforeUpload} // ✅ Pass validation function to modal
        />
      )}
    </div>
  );
};

export default OrdersTab;