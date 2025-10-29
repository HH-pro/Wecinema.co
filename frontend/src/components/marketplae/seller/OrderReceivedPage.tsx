import React, { useState } from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

interface Buyer {
  _id: string;
  username: string;
}

interface Listing {
  _id: string;
  title: string;
  price?: number;
}

interface Order {
  _id: string;
  status: string;
  amount: number;
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
  buyerId: Buyer;
  listingId: Listing;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface OrderReceivedPageProps {
  orders: Order[];
  onOrderUpdate: (orderId: string, newStatus: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'accepted':
    case 'active':
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
    case 'pending_payment':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'shipped':
    case 'sold':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const OrderReceivedPage: React.FC<OrderReceivedPageProps> = ({ orders, onOrderUpdate }) => {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders Received</h1>
          <p className="mt-2 text-gray-600">Manage and track all orders received from buyers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Orders ({orders.length})</h2>
          </div>
          
          <div className="p-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900">No orders received yet</h3>
                <p className="mt-2 text-gray-500">When buyers purchase your items, orders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order._id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              From: {order.buyerId?.username || 'Unknown Buyer'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                            </span>
                            <PaymentStatusBadge order={order} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="font-semibold text-green-600">{formatCurrency(order.amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Order Date</p>
                            <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment Method</p>
                            <p className="font-medium text-gray-900 capitalize">{order.paymentMethod || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Shipping Address</p>
                            <p className="font-medium text-gray-900 line-clamp-1">{order.shippingAddress || 'Not provided'}</p>
                          </div>
                        </div>

                        {order.listingId && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Listing</p>
                            <p className="font-medium text-gray-900">{order.listingId.title}</p>
                            {order.listingId.price && (
                              <p className="text-sm text-gray-600">
                                Original Price: {formatCurrency(order.listingId.price)}
                              </p>
                            )}
                          </div>
                        )}

                        {order.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-1">Seller Notes</p>
                            <p className="text-gray-900 bg-blue-50 rounded-lg p-3 text-sm border border-blue-200">
                              {order.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 lg:w-48">
                        <button
                          onClick={() => window.location.href = `/orders/${order._id}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                        >
                          View Details
                        </button>
                        {order.status === 'pending_payment' && (
                          <div className="text-xs text-gray-500 text-center">
                            Waiting for buyer payment
                          </div>
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => onOrderUpdate(order._id, 'in_progress')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                          >
                            Start Work
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => onOrderUpdate(order._id, 'completed')}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                          >
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReceivedPage;