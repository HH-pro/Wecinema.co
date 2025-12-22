// src/components/marketplace/seller/OrderDetailsModal.tsx
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

  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  const fetchOrderDetails = async () => {
    if (!orderId) {
      setError('Order ID is missing');
      return;
    }
    
    // Validate orderId format
    if (!isValidObjectId(orderId)) {
      setError(`Invalid order ID format: ${orderId}. Please check the order ID.`);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching order details for ID:', orderId);
      
      // TRY DIFFERENT ENDPOINTS IN SEQUENCE
      
      // Option 1: Try the original endpoint (if routes are fixed)
      try {
        const response = await axios.get(
          `${API_BASE_URL}/marketplace/orders/${orderId}`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            timeout: 5000
          }
        );

        if (response.data.success) {
          console.log('✅ Order details fetched successfully from /orders/:orderId');
          setOrderDetails(response.data.order);
          return;
        }
      } catch (err: any) {
        console.log('⚠️ Endpoint 1 failed, trying next...');
      }
      
      // Option 2: Try query parameter endpoint
      try {
        const response = await axios.get(
          `${API_BASE_URL}/marketplace/order-details`,
          {
            params: { orderId },
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            timeout: 5000
          }
        );

        if (response.data.success) {
          console.log('✅ Order details fetched successfully from /order-details');
          setOrderDetails(response.data.order);
          return;
        }
      } catch (err: any) {
        console.log('⚠️ Endpoint 2 failed, trying next...');
      }
      
      // Option 3: Try get-order endpoint
      try {
        const response = await axios.get(
          `${API_BASE_URL}/marketplace/orders/get-order/${orderId}`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            timeout: 5000
          }
        );

        if (response.data.success) {
          console.log('✅ Order details fetched successfully from /orders/get-order/:orderId');
          setOrderDetails(response.data.order);
          return;
        }
      } catch (err: any) {
        console.log('⚠️ Endpoint 3 failed');
      }
      
      // If all endpoints fail
      setError('Failed to load order details. Please try again or contact support.');
      
    } catch (err: any) {
      console.error('❌ Error fetching order details:', err);
      
      // More specific error messages
      if (err.response?.status === 404) {
        setError(`Order not found with ID: ${orderId}`);
      } else if (err.response?.status === 500 && err.response?.data?.error?.includes('Cast to ObjectId')) {
        setError(`Server error: Invalid order ID format. Please check backend routes.`);
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please check your internet connection.');
      } else {
        setError(err.response?.data?.error || 'Failed to load order details. Please try again.');
      }
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
        fetchOrderDetails(); // Refresh data
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
    const options: { value: string; label: string; color: string }[] = [];
    const status = currentStatus?.toLowerCase() || '';
    
    if (status === 'pending_payment') {
      options.push(
        { value: 'confirmed', label: 'Confirm', color: 'green' },
        { value: 'cancelled', label: 'Cancel', color: 'red' }
      );
    } else if (status === 'confirmed' || status === 'paid') {
      options.push(
        { value: 'in_progress', label: 'Start Work', color: 'blue' },
        { value: 'cancelled', label: 'Cancel', color: 'red' }
      );
    } else if (status === 'in_progress') {
      options.push(
        { value: 'shipped', label: 'Ship', color: 'blue' },
        { value: 'completed', label: 'Complete', color: 'green' },
        { value: 'cancelled', label: 'Cancel', color: 'red' }
      );
    } else if (status === 'shipped') {
      options.push(
        { value: 'delivered', label: 'Deliver', color: 'green' },
        { value: 'completed', label: 'Complete', color: 'green' }
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
            <h2 className="text-sm font-bold text-gray-900">
              Order {orderDetails ? `#${orderId?.slice(-6)}` : `#${orderId?.slice(-6)}`}
            </h2>
          </div>
          <div className="flex items-center space-x-1">
            {orderDetails && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(orderDetails.status)}`}>
                {orderDetails.status?.replace('_', ' ') || 'Unknown'}
              </span>
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
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600">Loading order details...</p>
              <p className="text-xs text-gray-500 mt-1">Order ID: {orderId}</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 mb-2 font-medium">Unable to Load Order</p>
              <p className="text-xs text-gray-600 mb-4 max-w-sm mx-auto">{error}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={fetchOrderDetails}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : orderDetails ? (
            <>
              {/* Status & Actions Tab */}
              {activeSection === 'status' ? (
                <div className="space-y-3">
                  {/* Amount & Date */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
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

                  {/* Status Actions */}
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Update Status:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {getStatusOptions(orderDetails.status).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusUpdate(option.value)}
                          disabled={updating}
                          className={`p-2 rounded text-xs font-medium ${
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

                  {/* Product Info */}
                  <div className="border border-gray-200 rounded p-3">
                    <div className="flex items-start space-x-3">
                      {orderDetails.listingId?.mediaUrls?.[0] ? (
                        <img
                          src={orderDetails.listingId.mediaUrls[0]}
                          alt={orderDetails.listingId.title}
                          className="w-14 h-14 object-cover rounded border border-gray-300"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded border border-purple-200 flex items-center justify-center">
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