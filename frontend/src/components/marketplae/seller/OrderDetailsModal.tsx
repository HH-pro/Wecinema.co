// src/components/marketplae/seller/OrderDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../../../api';
const API_BASE_URL = api.API_BASE_URL;
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
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
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
          { value: 'confirmed', label: 'Confirm Order', color: 'green' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'confirmed':
      case 'paid':
        options.push(
          { value: 'in_progress', label: 'Start Processing', color: 'blue' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'in_progress':
        options.push(
          { value: 'shipped', label: 'Mark as Shipped', color: 'blue' },
          { value: 'completed', label: 'Complete Order', color: 'green' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'shipped':
        options.push(
          { value: 'delivered', label: 'Mark as Delivered', color: 'green' },
          { value: 'completed', label: 'Complete Order', color: 'green' }
        );
        break;
    }
    
    return options;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-600">Order ID: {orderId?.slice(-8)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Order</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchOrderDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              {/* Order Status Bar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">Current Status</h3>
                    <div className="flex items-center mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(orderDetails.status)}`}>
                        {orderDetails.status ? orderDetails.status.replace('_', ' ') : 'Unknown'}
                      </span>
                      <span className="ml-3 text-sm text-gray-600">
                        {formatDate(orderDetails.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Order Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(orderDetails.amount)}
                    </p>
                  </div>
                </div>

                {/* Status Update Actions */}
                {getStatusOptions(orderDetails.status).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Update Order Status:</p>
                    <div className="flex flex-wrap gap-2">
                      {getStatusOptions(orderDetails.status).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusUpdate(option.value)}
                          disabled={updating}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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

              {/* Order Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Buyer Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Buyer Information
                  </h3>
                  <div className="flex items-center space-x-4 mb-4">
                    {orderDetails.buyerId?.avatar ? (
                      <img
                        src={orderDetails.buyerId.avatar}
                        alt={orderDetails.buyerId.username}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-white bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {orderDetails.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{orderDetails.buyerId?.username || 'Unknown Buyer'}</p>
                      <p className="text-sm text-gray-600">{orderDetails.buyerId?.email || 'No email provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Seller Information */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Seller Information
                  </h3>
                  <div className="flex items-center space-x-4 mb-4">
                    {orderDetails.sellerId?.avatar ? (
                      <img
                        src={orderDetails.sellerId.avatar}
                        alt={orderDetails.sellerId.username}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-white bg-green-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {orderDetails.sellerId?.username?.charAt(0).toUpperCase() || 'S'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{orderDetails.sellerId?.username || 'Unknown Seller'}</p>
                      {orderDetails.sellerId?.sellerRating && (
                        <div className="flex items-center mt-1">
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < Math.floor(orderDetails.sellerId!.sellerRating!) ? 'fill-current' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            {orderDetails.sellerId.sellerRating.toFixed(1)}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="lg:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Product Information
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    {orderDetails.listingId?.mediaUrls?.[0] ? (
                      <div className="md:w-1/3">
                        <img
                          src={orderDetails.listingId.mediaUrls[0]}
                          alt={orderDetails.listingId.title}
                          className="w-full h-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="md:w-1/3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg border border-purple-200 flex items-center justify-center">
                        <div className="text-center p-6">
                          <div className="text-4xl mb-2">📦</div>
                          <p className="text-sm text-purple-700">No image available</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Product Details */}
                    <div className="md:w-2/3">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {orderDetails.listingId?.title || 'Unknown Listing'}
                      </h4>
                      <p className="text-gray-600 mb-4">
                        {orderDetails.listingId?.description || 'No description provided'}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Category</p>
                          <p className="font-medium text-gray-900">
                            {orderDetails.listingId?.category || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-medium text-gray-900">
                            {orderDetails.listingId?.type || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Original Price</p>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(orderDetails.listingId?.price || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Sold For</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(orderDetails.amount)}
                          </p>
                        </div>
                      </div>

                      {/* Tags */}
                      {orderDetails.listingId?.tags && orderDetails.listingId.tags.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {orderDetails.listingId.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="lg:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Order Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium text-gray-900">
                        {orderDetails.paymentMethod || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(orderDetails.paymentStatus)}`}>
                        {orderDetails.paymentStatus || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(orderDetails.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(orderDetails.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {orderDetails.shippingAddress && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Shipping Address</p>
                      <div className="bg-white border border-gray-300 rounded-lg p-4">
                        <p className="text-gray-900 whitespace-pre-line">
                          {orderDetails.shippingAddress}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {orderDetails.notes && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Order Notes</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 whitespace-pre-line">
                          {orderDetails.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Offer Message */}
                  {orderDetails.offerId?.message && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Offer Message</p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-800 whitespace-pre-line">
                          {orderDetails.offerId.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  {orderDetails.offerId?.requirements && (
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Requirements</p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800 whitespace-pre-line">
                          {orderDetails.offerId.requirements}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <div className="space-x-3">
            {orderDetails?.stripePaymentIntentId && (
              <a
                href={`https://dashboard.stripe.com/payments/${orderDetails.stripePaymentIntentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Stripe Payment
              </a>
            )}
            <button
              onClick={fetchOrderDetails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;