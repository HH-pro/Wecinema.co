// components/marketplace/OrderSummary.tsx
import React from 'react';

interface Order {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  sellerId: {
    username: string;
    avatar?: string;
  };
  listingId?: {
    title: string;
    mediaUrls: string[];
  };
}

interface OrderSummaryProps {
  order: Order;
  onViewDetails: (orderId: string) => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ order, onViewDetails }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      delivered: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const statusText: { [key: string]: string } = {
      pending_payment: 'Payment Pending',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      completed: 'Completed'
    };
    return statusText[status] || status;
  };

  return (
    <div className="order-item grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
      {/* Order Info - Mobile first layout */}
      <div className="md:col-span-4 flex items-start space-x-3">
        {order.listingId?.mediaUrls?.[0] && (
          <img
            src={order.listingId.mediaUrls[0]}
            alt={order.listingId.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {order.listingId?.title || 'Unknown Listing'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Order #{order._id.slice(-8)}</p>
        </div>
      </div>

      {/* Date */}
      <div className="md:col-span-2 flex items-center">
        <span className="text-sm text-gray-900">{formatDate(order.createdAt)}</span>
      </div>

      {/* Seller */}
      <div className="md:col-span-2 flex items-center">
        <div className="flex items-center space-x-2">
          {order.sellerId.avatar && (
            <img
              src={order.sellerId.avatar}
              alt={order.sellerId.username}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="text-sm text-gray-900">{order.sellerId.username}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="md:col-span-2 flex items-center">
        <span className="text-sm font-medium text-gray-900">
          {formatAmount(order.amount)}
        </span>
      </div>

      {/* Status */}
      <div className="md:col-span-1 flex items-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {getStatusText(order.status)}
        </span>
      </div>

      {/* Actions */}
      <div className="md:col-span-1 flex items-center justify-end">
        <button
          onClick={() => onViewDetails(order._id)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
        >
          View
        </button>
      </div>

      {/* Mobile view divider */}
      <div className="md:hidden border-t border-gray-200 pt-4 -mx-6 px-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">Actions:</span>
          <button
            onClick={() => onViewDetails(order._id)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;