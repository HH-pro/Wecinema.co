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
  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending_payment: 'orange',
      paid: 'blue',
      in_progress: 'purple',
      delivered: 'green',
      completed: 'green',
      cancelled: 'red'
    };
    return statusColors[status] || 'gray';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="order-summary">
      <div className="order-header">
        <div className="order-info">
          <h4>Order #{order._id.slice(-6)}</h4>
          <span className="order-date">{formatDate(order.createdAt)}</span>
        </div>
        <span 
          className="order-status"
          style={{ backgroundColor: getStatusColor(order.status) }}
        >
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="order-details">
        {order.listingId && (
          <div className="listing-preview">
            <img 
              src={order.listingId.mediaUrls[0] || '/placeholder-image.jpg'} 
              alt={order.listingId.title}
            />
            <span>{order.listingId.title}</span>
          </div>
        )}
        
        <div className="seller-info">
          <span>Seller: {order.sellerId.username}</span>
        </div>
        
        <div className="order-amount">
          <strong>${order.amount}</strong>
        </div>
      </div>

      <div className="order-actions">
        <button 
          onClick={() => onViewDetails(order._id)}
          className="btn btn-primary"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;