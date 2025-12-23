// src/components/marketplace/seller/OrderDetailsModal.tsx - FIXED VERSION
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

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

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

  // ✅ Function to check if order can be cancelled
  const canCancelOrder = (status: string): boolean => {
    // Only allow cancellation in these statuses (before work starts)
    const cancellableStatuses = ['pending_payment', 'paid', 'processing'];
    return cancellableStatuses.includes(status?.toLowerCase());
  };

  // ✅ Function to check if shipping option should be shown
  const canShowShippingOption = (status: string): boolean => {
    // Only show shipping for specific statuses
    const shippingStatuses = ['in_progress', 'shipped'];
    return shippingStatuses.includes(status?.toLowerCase());
  };

  // ✅ Check if work has started
  const isWorkStarted = (status: string): boolean => {
    const workStartedStatuses = ['in_progress', 'delivered', 'in_revision', 'completed', 'shipped'];
    return workStartedStatuses.includes(status?.toLowerCase());
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId || !orderDetails) return;
    
    // Check cancellation restrictions
    if (newStatus === 'cancelled') {
      if (!canCancelOrder(orderDetails.status)) {
        alert('This order cannot be cancelled because work has already started.');
        return;
      }
    }
    
    // Check shipping restrictions
    if (newStatus === 'shipped') {
      if (!canShowShippingOption(orderDetails.status)) {
        alert('Cannot ship order at this stage.');
        return;
      }
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

  // ✅ UPDATED: Get status options based on current status
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-sm font-bold text-gray-900">Order #{orderId?.slice(-6)}</h2>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(orderDetails?.status || '')}`}>
              {orderDetails?.status?.replace('_', ' ') || 'Loading'}
            </span>
            {orderDetails && (
              <div className="flex items-center ml-2">
                {isWorkStarted(orderDetails.status) ? (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                    Work Started
                  </span>
                ) : canCancelOrder(orderDetails.status) ? (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    Can Cancel
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                    Cannot Cancel
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSection('status')}
            className={`flex-1 py-2 text-xs font-medium ${activeSection === 'status' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Status & Actions
          </button>
          <button
            onClick={() => setActiveSection('info')}
            className={`flex-1 py-2 text-xs font-medium ${activeSection === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Order Info
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-gray-600 mb-2">{error}</p>
              <button
                onClick={fetchOrderDetails}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : orderDetails ? (
            <>
              {/* Status & Actions Tab */}
              {activeSection === 'status' ? (
                <div className="space-y-3">
                  {/* Amount & Date */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-600">Order Amount</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(orderDetails.amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">Order Date</p>
                        <p className="text-xs text-gray-900">{formatDate(orderDetails.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Work Status Warning */}
                  {isWorkStarted(orderDetails.status) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <div className="flex items-start">
                        <svg className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-yellow-800">Work Has Started</p>
                          <p className="text-xs text-yellow-700">
                            This order cannot be cancelled because work has already begun.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Actions */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Update Status:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {getStatusOptions(orderDetails.status).map((option) => (
                        <div key={option.value} className="relative group">
                          <button
                            onClick={() => !option.disabled && handleStatusUpdate(option.value)}
                            disabled={updating || option.disabled}
                            className={`w-full p-2 rounded text-xs font-medium ${
                              option.color === 'green'
                                ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
                                : option.color === 'red'
                                ? 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300'
                                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
                            } ${option.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            {option.label}
                            {option.disabled && (
                              <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                          </button>
                          {option.disabled && option.tooltip && (
                            <div className="absolute z-10 invisible group-hover:visible bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-gray-700 bg-white border border-gray-200 rounded shadow-lg whitespace-nowrap">
                              {option.tooltip}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Cancellation Info */}
                    {!canCancelOrder(orderDetails.status) && (
                      <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                        <p className="font-medium text-gray-700">Cancellation Policy:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          <li>Orders can be cancelled before work starts</li>
                          <li>Once work begins, cancellation is not possible</li>
                          <li>Contact buyer for any issues during work</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="border border-gray-200 rounded p-2">
                    <div className="flex items-start space-x-2">
                      {orderDetails.listingId?.mediaUrls?.[0] ? (
                        <img
                          src={orderDetails.listingId.mediaUrls[0]}
                          alt={orderDetails.listingId.title}
                          className="w-12 h-12 object-cover rounded border border-gray-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded border border-purple-200 flex items-center justify-center">
                          <div className="text-xl">📦</div>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">{orderDetails.listingId?.title}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Price: {formatCurrency(orderDetails.listingId?.price || 0)}</span>
                          <span>Sold: {formatCurrency(orderDetails.amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <p className="text-xs text-gray-600">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{orderDetails.paymentMethod || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <p className="text-xs text-gray-600">Payment Status</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${getStatusColor(orderDetails.paymentStatus)}`}>
                        {orderDetails.paymentStatus || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Work Progress Indicator */}
                  {isWorkStarted(orderDetails.status) && (
                    <div className="border border-green-200 rounded p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">Work Progress</p>
                        <span className="text-xs text-green-600 font-medium">
                          {orderDetails.status === 'in_progress' ? 'In Progress' : 
                           orderDetails.status === 'delivered' ? 'Delivered' :
                           orderDetails.status === 'completed' ? 'Completed' : 
                           'In Process'}
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
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
                /* Info Tab */
                <div className="space-y-3">
                  {/* Buyer & Seller */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-gray-200 rounded p-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Buyer</p>
                      <div className="flex items-center space-x-2">
                        {orderDetails.buyerId?.avatar ? (
                          <img src={orderDetails.buyerId.avatar} alt={orderDetails.buyerId.username} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                            {orderDetails.buyerId?.username?.charAt(0) || 'B'}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-900">{orderDetails.buyerId?.username}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{orderDetails.buyerId?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded p-2">
                      <p className="text-xs font-medium text-gray-700 mb-1">Seller</p>
                      <div className="flex items-center space-x-2">
                        {orderDetails.sellerId?.avatar ? (
                          <img src={orderDetails.sellerId.avatar} alt={orderDetails.sellerId.username} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                            {orderDetails.sellerId?.username?.charAt(0) || 'S'}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-900">{orderDetails.sellerId?.username}</p>
                          {orderDetails.sellerId?.sellerRating && (
                            <div className="flex items-center">
                              <span className="text-xs text-yellow-600 mr-1">★</span>
                              <span className="text-xs text-gray-600">{orderDetails.sellerId.sellerRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Status Info */}
                  <div className="border border-gray-200 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium text-gray-700">Order Status</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(orderDetails.status)}`}>
                        {orderDetails.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {isWorkStarted(orderDetails.status) ? (
                        <div className="flex items-center text-red-600">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Cancellation not available
                        </div>
                      ) : (
                        <div className="flex items-center text-green-600">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Cancellation available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="border border-gray-200 rounded p-2">
                    <div className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700 mb-1">Shipping Address</p>
                        <p className="text-xs text-gray-900 whitespace-pre-line">{orderDetails.shippingAddress || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="border border-gray-200 rounded p-2">
                    <p className="text-xs font-medium text-gray-700 mb-2">Product Details</p>
                    <div className="space-y-2">
                      {orderDetails.listingId?.description && (
                        <div>
                          <p className="text-xs text-gray-600 mb-0.5">Description</p>
                          <p className="text-xs text-gray-900 line-clamp-3">{orderDetails.listingId.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-600">Category</p>
                          <p className="text-xs font-medium text-gray-900">{orderDetails.listingId?.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Type</p>
                          <p className="text-xs font-medium text-gray-900">{orderDetails.listingId?.type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(orderDetails.notes || orderDetails.offerId?.message || orderDetails.offerId?.requirements) && (
                    <div className="space-y-2">
                      {orderDetails.notes && (
                        <div className="border border-yellow-200 bg-yellow-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Notes</p>
                          <p className="text-xs text-gray-900 line-clamp-2">{orderDetails.notes}</p>
                        </div>
                      )}
                      {orderDetails.offerId?.message && (
                        <div className="border border-blue-200 bg-blue-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Offer Message</p>
                          <p className="text-xs text-gray-900 line-clamp-2">{orderDetails.offerId.message}</p>
                        </div>
                      )}
                      {orderDetails.offerId?.requirements && (
                        <div className="border border-green-200 bg-green-50 rounded p-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Requirements</p>
                          <p className="text-xs text-gray-900 line-clamp-2">{orderDetails.offerId.requirements}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="border border-gray-200 rounded p-2">
                    <p className="text-xs font-medium text-gray-700 mb-2">Timeline</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Created</span>
                        <span className="text-xs text-gray-900">{formatDate(orderDetails.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Updated</span>
                        <span className="text-xs text-gray-900">{formatDate(orderDetails.updatedAt)}</span>
                      </div>
                      {orderDetails.offerId?.expectedDelivery && (
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-600">Expected Delivery</span>
                          <span className="text-xs text-gray-900">{orderDetails.offerId.expectedDelivery}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stripe */}
                  {orderDetails.stripePaymentIntentId && (
                    <div className="border border-purple-200 bg-purple-50 rounded p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-700">Stripe Payment</p>
                        <a
                          href={`https://dashboard.stripe.com/payments/${orderDetails.stripePaymentIntentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          View
                        </a>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-mono">ID: {orderDetails.stripePaymentIntentId.slice(-8)}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50"
            >
              Close
            </button>
            <div className="flex space-x-2">
              {/* Contact Buyer Button */}
              {orderDetails?.buyerId && (
                <button
                  onClick={() => window.open(`/messages?user=${orderDetails.buyerId?._id}`, '_blank')}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact
                </button>
              )}
              <button
                onClick={fetchOrderDetails}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;