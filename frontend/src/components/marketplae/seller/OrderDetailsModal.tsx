// src/components/marketplace/seller/OrderDetailsModal.tsx - FIXED SCROLLABLE VERSION
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

interface OrderDetails {
  _id: string;
  status: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  stripePaymentIntentId?: string;
  buyerId?: {
    _id: string;
    username: string;
    avatar?: string;
    email: string;
  };
  sellerId?: {
    _id: string;
    username: string;
    avatar?: string;
    sellerRating?: number;
    email: string;
  };
  listingId?: {
    _id: string;
    title: string;
    mediaUrls?: string[];
    price: number;
    category: string;
    type: string;
    description?: string;
    tags?: string[];
  };
  offerId?: {
    _id: string;
    amount: number;
    message?: string;
    requirements?: string;
    expectedDelivery?: string;
  };
}

interface OrderDetailsModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (orderId: string, newStatus: string) => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onOrderUpdate
}) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeSection, setActiveSection] = useState<'status' | 'info'>('status');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
      setIsClosing(false);
    } else {
      setIsClosing(true);
    }
  }, [isOpen, orderId]);

  // Close modal with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setOrderDetails(response.data.order);
      } else {
        setError('Failed to load order details');
      }
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err.response?.data?.error || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const canCancelOrder = (status: string): boolean => {
    const cancellableStatuses = ['pending_payment', 'paid', 'processing'];
    return cancellableStatuses.includes(status?.toLowerCase());
  };

  const canShowShippingOption = (status: string): boolean => {
    const shippingStatuses = ['in_progress', 'shipped'];
    return shippingStatuses.includes(status?.toLowerCase());
  };

  const isWorkStarted = (status: string): boolean => {
    const workStartedStatuses = ['in_progress', 'delivered', 'in_revision', 'completed', 'shipped'];
    return workStartedStatuses.includes(status?.toLowerCase());
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId || !orderDetails) return;
    
    if (newStatus === 'cancelled' && !canCancelOrder(orderDetails.status)) {
      alert('This order cannot be cancelled because work has already started.');
      return;
    }
    
    if (newStatus === 'shipped' && !canShowShippingOption(orderDetails.status)) {
      alert('Cannot ship order at this stage.');
      return;
    }
    
    const confirmMessage = newStatus === 'cancelled' 
      ? `Are you sure you want to cancel this order? This action cannot be undone.`
      : `Change order status to "${newStatus}"?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setUpdating(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${orderId}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setOrderDetails(prev => prev ? { ...prev, status: newStatus } : null);
        onOrderUpdate?.(orderId, newStatus);
        fetchOrderDetails();
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status?.toLowerCase() || '';
    if (['completed', 'paid', 'delivered'].includes(statusLower)) return 'bg-green-100 text-green-800';
    if (['pending_payment', 'pending'].includes(statusLower)) return 'bg-yellow-100 text-yellow-800';
    if (['in_progress', 'shipped', 'in_transit'].includes(statusLower)) return 'bg-blue-100 text-blue-800';
    if (['cancelled', 'failed', 'rejected'].includes(statusLower)) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusOptions = (currentStatus: string) => {
    const options: { value: string; label: string; color: string; disabled?: boolean; tooltip?: string }[] = [];
    const status = currentStatus?.toLowerCase() || '';
    
    if (status === 'pending_payment') {
      options.push(
        { value: 'confirmed', label: 'Confirm', color: 'green' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: !canCancelOrder(status),
          tooltip: !canCancelOrder(status) ? 'Cannot cancel after payment' : ''
        }
      );
    } else if (status === 'confirmed' || status === 'paid') {
      options.push(
        { value: 'in_progress', label: 'Start Work', color: 'blue' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: !canCancelOrder(status),
          tooltip: !canCancelOrder(status) ? 'Cannot cancel after starting work' : ''
        }
      );
    } else if (status === 'processing') {
      options.push(
        { value: 'in_progress', label: 'Start Work', color: 'blue' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: !canCancelOrder(status),
          tooltip: !canCancelOrder(status) ? 'Cannot cancel after work preparation' : ''
        }
      );
    } else if (status === 'in_progress') {
      options.push(
        { 
          value: 'shipped', 
          label: 'Ship', 
          color: 'blue',
          disabled: !canShowShippingOption(status),
          tooltip: !canShowShippingOption(status) ? 'Shipping not available' : ''
        },
        { value: 'delivered', label: 'Deliver', color: 'green' },
        { value: 'completed', label: 'Complete', color: 'green' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: true,
          tooltip: 'Cannot cancel - work has started'
        }
      );
    } else if (status === 'shipped') {
      options.push(
        { value: 'delivered', label: 'Deliver', color: 'green' },
        { value: 'completed', label: 'Complete', color: 'green' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: true,
          tooltip: 'Cannot cancel - order has been shipped'
        }
      );
    } else if (status === 'delivered') {
      options.push(
        { value: 'completed', label: 'Complete', color: 'green' },
        { 
          value: 'cancelled', 
          label: 'Cancel', 
          color: 'red',
          disabled: true,
          tooltip: 'Cannot cancel - order has been delivered'
        }
      );
    }
    
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        {/* Modal Content */}
        <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg sm:my-8 ${
          isClosing ? 'animate-slideOut' : 'animate-slideIn'
        }`}>
          {/* Header - Fixed */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Order #{orderId?.slice(-6)}
                  </h3>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(orderDetails?.status || '')}`}>
                      {orderDetails?.status?.replace('_', ' ') || 'Loading'}
                    </span>
                    {orderDetails && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isWorkStarted(orderDetails.status) 
                          ? 'bg-red-100 text-red-800' 
                          : canCancelOrder(orderDetails.status) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isWorkStarted(orderDetails.status) ? 'Work Started' : 
                         canCancelOrder(orderDetails.status) ? 'Can Cancel' : 
                         'Cannot Cancel'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={fetchOrderDetails}
                disabled={loading}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg 
                  className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Tabs - Fixed */}
            <div className="mt-4 flex space-x-1 border-b border-gray-200">
              <button
                onClick={() => setActiveSection('status')}
                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                  activeSection === 'status' 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Status & Actions
                {activeSection === 'status' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSection('info')}
                className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
                  activeSection === 'info' 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Order Details
                {activeSection === 'info' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="h-[60vh] overflow-y-auto">
            <div className="px-4 pb-4 pt-2 sm:px-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading order details...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">Error loading order</h3>
                  <p className="mt-1 text-sm text-gray-500">{error}</p>
                  <button
                    onClick={fetchOrderDetails}
                    className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              ) : orderDetails ? (
                <>
                  {/* Status & Actions Tab */}
                  {activeSection === 'status' ? (
                    <div className="space-y-4">
                      {/* Order Summary Card */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{orderDetails.listingId?.title || 'Order'}</p>
                            <p className="mt-1 text-sm text-gray-600">Order Amount</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(orderDetails.amount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Order Date</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(orderDetails.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Work Status Warning */}
                      {isWorkStarted(orderDetails.status) && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                          <div className="flex">
                            <svg className="h-5 w-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Work In Progress</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                <p>This order cannot be cancelled because work has already started.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status Actions */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Update Order Status</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {getStatusOptions(orderDetails.status).map((option) => (
                            <div key={option.value} className="relative group">
                              <button
                                onClick={() => !option.disabled && handleStatusUpdate(option.value)}
                                disabled={updating || option.disabled}
                                className={`w-full rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                                  option.disabled 
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-400' 
                                    : option.color === 'green'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : option.color === 'red'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center justify-center">
                                  {option.label}
                                  {option.disabled && (
                                    <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                              {option.disabled && option.tooltip && (
                                <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg whitespace-nowrap">
                                  {option.tooltip}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Product Information</h3>
                        <div className="flex items-start space-x-3">
                          {orderDetails.listingId?.mediaUrls?.[0] ? (
                            <img
                              src={orderDetails.listingId.mediaUrls[0]}
                              alt={orderDetails.listingId.title}
                              className="h-16 w-16 flex-shrink-0 rounded-lg border border-gray-300 object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 flex items-center justify-center">
                              <span className="text-2xl">📦</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{orderDetails.listingId?.title}</p>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                              <span>Listed: {formatCurrency(orderDetails.listingId?.price || 0)}</span>
                              <span>Sold: {formatCurrency(orderDetails.amount)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {orderDetails.listingId?.tags?.slice(0, 3).map((tag, index) => (
                                <span key={index} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payment & Progress */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs font-medium text-gray-500">Payment Method</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{orderDetails.paymentMethod || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs font-medium text-gray-500">Payment Status</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(orderDetails.paymentStatus)}`}>
                              {orderDetails.paymentStatus || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Work Progress */}
                      {isWorkStarted(orderDetails.status) && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900">Work Progress</h3>
                            <span className="text-xs font-medium text-green-600">
                              {orderDetails.status === 'in_progress' ? 'In Progress' : 
                               orderDetails.status === 'delivered' ? 'Delivered' :
                               orderDetails.status === 'completed' ? 'Completed' : 
                               'In Process'}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                orderDetails.status === 'in_progress' ? 'bg-yellow-500 w-1/2' :
                                orderDetails.status === 'delivered' ? 'bg-green-500 w-3/4' :
                                orderDetails.status === 'completed' ? 'bg-green-600 w-full' :
                                'bg-blue-500 w-1/3'
                              }`}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Info Tab - Scrollable */
                    <div className="space-y-4">
                      {/* Buyer & Seller Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">Buyer Information</h3>
                          <div className="flex items-center space-x-3">
                            {orderDetails.buyerId?.avatar ? (
                              <img
                                src={orderDetails.buyerId.avatar}
                                alt={orderDetails.buyerId.username}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {orderDetails.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{orderDetails.buyerId?.username}</p>
                              <p className="text-xs text-gray-500 truncate">{orderDetails.buyerId?.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => window.open(`/messages?user=${orderDetails.buyerId?._id}`, '_blank')}
                            className="mt-3 w-full rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                          >
                            Message Buyer
                          </button>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">Seller Information</h3>
                          <div className="flex items-center space-x-3">
                            {orderDetails.sellerId?.avatar ? (
                              <img
                                src={orderDetails.sellerId.avatar}
                                alt={orderDetails.sellerId.username}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {orderDetails.sellerId?.username?.charAt(0).toUpperCase() || 'S'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{orderDetails.sellerId?.username}</p>
                              {orderDetails.sellerId?.sellerRating && (
                                <div className="flex items-center">
                                  <svg className="h-3 w-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="ml-1 text-sm text-gray-600">{orderDetails.sellerId.sellerRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Information */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-gray-900">Shipping Address</h3>
                            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                              {orderDetails.shippingAddress || 'No shipping address provided'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Product Details</h3>
                        <div className="space-y-3">
                          {orderDetails.listingId?.description && (
                            <div>
                              <p className="text-xs font-medium text-gray-500">Description</p>
                              <p className="mt-1 text-sm text-gray-700">{orderDetails.listingId.description}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Category</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">{orderDetails.listingId?.category || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Type</p>
                              <p className="mt-1 text-sm font-medium text-gray-900">{orderDetails.listingId?.type || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      {(orderDetails.notes || orderDetails.offerId?.message || orderDetails.offerId?.requirements) && (
                        <div className="space-y-3">
                          {orderDetails.notes && (
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                              <h4 className="text-sm font-medium text-yellow-800">Order Notes</h4>
                              <p className="mt-1 text-sm text-yellow-700">{orderDetails.notes}</p>
                            </div>
                          )}
                          {orderDetails.offerId?.message && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                              <h4 className="text-sm font-medium text-blue-800">Offer Message</h4>
                              <p className="mt-1 text-sm text-blue-700">{orderDetails.offerId.message}</p>
                            </div>
                          )}
                          {orderDetails.offerId?.requirements && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                              <h4 className="text-sm font-medium text-green-800">Requirements</h4>
                              <p className="mt-1 text-sm text-green-700">{orderDetails.offerId.requirements}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Order Timeline</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Order Created</span>
                            <span className="text-sm font-medium text-gray-900">{formatDate(orderDetails.createdAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Last Updated</span>
                            <span className="text-sm font-medium text-gray-900">{formatDate(orderDetails.updatedAt)}</span>
                          </div>
                          {orderDetails.offerId?.expectedDelivery && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Expected Delivery</span>
                              <span className="text-sm font-medium text-gray-900">{orderDetails.offerId.expectedDelivery}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stripe Payment */}
                      {orderDetails.stripePaymentIntentId && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-medium text-purple-800">Stripe Payment</h3>
                              <p className="mt-1 text-xs text-purple-600 font-mono">
                                ID: {orderDetails.stripePaymentIntentId.slice(-8)}
                              </p>
                            </div>
                            <a
                              href={`https://dashboard.stripe.com/payments/${orderDetails.stripePaymentIntentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                            >
                              View in Stripe
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
              <div className="flex space-x-3">
                {orderDetails?.buyerId && (
                  <button
                    onClick={() => window.open(`/messages?user=${orderDetails.buyerId?._id}`, '_blank')}
                    className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Contact Buyer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;