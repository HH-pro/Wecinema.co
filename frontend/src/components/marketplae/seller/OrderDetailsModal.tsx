// src/components/marketplae/seller/OrderDetailsModal.tsx
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
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');

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

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId || !orderDetails) return;
    
    if (!window.confirm(`Change order status to "${newStatus}"?`)) return;
    
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
        // Refresh order details
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
      maximumFractionDigits: 0,
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
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_payment':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
      case 'shipped':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusOptions = (currentStatus: string) => {
    const options: { value: string; label: string; color: string }[] = [];
    
    switch (currentStatus) {
      case 'pending_payment':
        options.push(
          { value: 'confirmed', label: 'Confirm', color: 'green' },
          { value: 'cancelled', label: 'Cancel', color: 'red' }
        );
        break;
      case 'confirmed':
      case 'paid':
        options.push(
          { value: 'in_progress', label: 'Start Work', color: 'blue' },
          { value: 'cancelled', label: 'Cancel', color: 'red' }
        );
        break;
      case 'in_progress':
        options.push(
          { value: 'shipped', label: 'Ship', color: 'blue' },
          { value: 'completed', label: 'Complete', color: 'green' },
          { value: 'cancelled', label: 'Cancel', color: 'red' }
        );
        break;
      case 'shipped':
        options.push(
          { value: 'delivered', label: 'Deliver', color: 'green' },
          { value: 'completed', label: 'Complete', color: 'green' }
        );
        break;
    }
    
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[75vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
              <p className="text-xs text-gray-600">ID: #{orderId?.slice(-8)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchOrderDetails}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 px-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 font-medium text-sm ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2 px-1 font-medium text-sm ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Details
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-130px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Error Loading Order</h3>
              <p className="text-xs text-gray-600 mb-3">{error}</p>
              <button
                onClick={fetchOrderDetails}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : orderDetails ? (
            <div className="p-4 space-y-4">
              {/* Status & Amount Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(orderDetails.status)}`}>
                        {orderDetails.status ? orderDetails.status.replace('_', ' ') : 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {formatDate(orderDetails.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">Order Status</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(orderDetails.amount)}
                    </p>
                  </div>
                </div>

                {/* Quick Status Actions */}
                {getStatusOptions(orderDetails.status).length > 0 && (
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
                    <div className="flex flex-wrap gap-2">
                      {getStatusOptions(orderDetails.status).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusUpdate(option.value)}
                          disabled={updating}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            option.color === 'green'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : option.color === 'red'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          } disabled:opacity-50`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' ? (
                <div className="space-y-4">
                  {/* Product Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      {orderDetails.listingId?.mediaUrls?.[0] ? (
                        <img
                          src={orderDetails.listingId.mediaUrls[0]}
                          alt={orderDetails.listingId.title}
                          className="w-16 h-16 object-cover rounded border border-gray-300"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded border border-purple-200 flex items-center justify-center">
                          <div className="text-2xl">📦</div>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm mb-1">
                          {orderDetails.listingId?.title || 'Unknown Listing'}
                        </h4>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>Price: {formatCurrency(orderDetails.listingId?.price || 0)}</span>
                          <span>•</span>
                          <span>Sold: {formatCurrency(orderDetails.amount)}</span>
                        </div>
                        {orderDetails.listingId?.category && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {orderDetails.listingId.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Buyer */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                        <svg className="w-3 h-3 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Buyer
                      </h5>
                      <div className="flex items-center space-x-2">
                        {orderDetails.buyerId?.avatar ? (
                          <img
                            src={orderDetails.buyerId.avatar}
                            alt={orderDetails.buyerId.username}
                            className="w-8 h-8 rounded-full border border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border border-white bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {orderDetails.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{orderDetails.buyerId?.username}</p>
                          <p className="text-xs text-gray-500">{orderDetails.buyerId?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Seller */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                        <svg className="w-3 h-3 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Seller
                      </h5>
                      <div className="flex items-center space-x-2">
                        {orderDetails.sellerId?.avatar ? (
                          <img
                            src={orderDetails.sellerId.avatar}
                            alt={orderDetails.sellerId.username}
                            className="w-8 h-8 rounded-full border border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full border border-white bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                            {orderDetails.sellerId?.username?.charAt(0).toUpperCase() || 'S'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{orderDetails.sellerId?.username}</p>
                          {orderDetails.sellerId?.sellerRating && (
                            <div className="flex items-center mt-0.5">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-3 h-3 ${i < Math.floor(orderDetails.sellerId!.sellerRating!) ? 'fill-current' : 'text-gray-300'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-gray-600 ml-1">
                                {orderDetails.sellerId.sellerRating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Order Info</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Payment</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{orderDetails.paymentMethod || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payment Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(orderDetails.paymentStatus)}`}>
                          {orderDetails.paymentStatus || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {orderDetails.shippingAddress && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                        <svg className="w-3 h-3 text-orange-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Shipping Address
                      </h5>
                      <p className="text-sm text-gray-900 whitespace-pre-line">
                        {orderDetails.shippingAddress}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* DETAILS TAB */
                <div className="space-y-4">
                  {/* Payment Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Payment Details</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Payment Method</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{orderDetails.paymentMethod || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Payment Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(orderDetails.paymentStatus)}`}>
                          {orderDetails.paymentStatus || 'Unknown'}
                        </span>
                      </div>
                      {orderDetails.stripePaymentIntentId && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Stripe ID</span>
                          <a
                            href={`https://dashboard.stripe.com/payments/${orderDetails.stripePaymentIntentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-mono"
                          >
                            #{orderDetails.stripePaymentIntentId.slice(-8)}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Product Details</h5>
                    <div className="space-y-3">
                      {orderDetails.listingId?.description && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-sm text-gray-900">{orderDetails.listingId.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <p className="text-sm font-medium text-gray-900">{orderDetails.listingId?.category || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Type</p>
                          <p className="text-sm font-medium text-gray-900">{orderDetails.listingId?.type || 'N/A'}</p>
                        </div>
                      </div>
                      {orderDetails.listingId?.tags && orderDetails.listingId.tags.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {orderDetails.listingId.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes & Messages */}
                  {(orderDetails.notes || orderDetails.offerId?.message || orderDetails.offerId?.requirements) && (
                    <div className="space-y-3">
                      {orderDetails.notes && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Order Notes</h5>
                          <p className="text-sm text-yellow-800 whitespace-pre-line">{orderDetails.notes}</p>
                        </div>
                      )}
                      
                      {orderDetails.offerId?.message && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Offer Message</h5>
                          <p className="text-sm text-blue-800 whitespace-pre-line">{orderDetails.offerId.message}</p>
                        </div>
                      )}
                      
                      {orderDetails.offerId?.requirements && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-gray-700 mb-1">Requirements</h5>
                          <p className="text-sm text-green-800 whitespace-pre-line">{orderDetails.offerId.requirements}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Order Timeline</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Order Created</span>
                        <span className="text-sm text-gray-900">{formatDate(orderDetails.createdAt)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Last Updated</span>
                        <span className="text-sm text-gray-900">{formatDate(orderDetails.updatedAt)}</span>
                      </div>
                      {orderDetails.offerId?.expectedDelivery && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Expected Delivery</span>
                          <span className="text-sm text-gray-900">{orderDetails.offerId.expectedDelivery}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {orderDetails ? `Updated: ${formatDate(orderDetails.updatedAt)}` : 'Loading...'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {orderDetails?.stripePaymentIntentId && (
                <a
                  href={`https://dashboard.stripe.com/payments/${orderDetails.stripePaymentIntentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors inline-flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Stripe
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;