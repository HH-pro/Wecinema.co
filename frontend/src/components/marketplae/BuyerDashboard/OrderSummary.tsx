import React from 'react';
import { 
  FaDollarSign, 
  FaPercent, 
  FaCalendarAlt, 
  FaTruck, 
  FaUser, 
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa';
import { formatCurrency } from '../../api';

interface OrderSummaryProps {
  order: {
    _id: string;
    orderNumber?: string;
    amount: number;
    platformFee?: number;
    sellerAmount?: number;
    status: string;
    createdAt: string;
    expectedDelivery?: string;
    deliveredAt?: string;
    completedAt?: string;
    revisions: number;
    maxRevisions: number;
    sellerId: any;
    buyerId: any;
  };
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ order }) => {
  const getSellerName = () => {
    if (typeof order.sellerId === 'object') {
      const seller = order.sellerId;
      return seller.firstName ? 
        `${seller.firstName} ${seller.lastName || ''}`.trim() : 
        seller.username || 'Seller';
    }
    return 'Seller';
  };

  const getBuyerName = () => {
    if (typeof order.buyerId === 'object') {
      const buyer = order.buyerId;
      return buyer.firstName ? 
        `${buyer.firstName} ${buyer.lastName || ''}`.trim() : 
        buyer.username || 'Buyer';
    }
    return 'Buyer';
  };

  const platformFee = order.platformFee || (order.amount * 0.15);
  const sellerAmount = order.sellerAmount || (order.amount - platformFee);
  const feePercentage = ((platformFee / order.amount) * 100).toFixed(1);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: '#f39c12',
      paid: '#3498db',
      processing: '#9b59b6',
      in_progress: '#34495e',
      delivered: '#27ae60',
      in_revision: '#f1c40f',
      completed: '#2ecc71',
      cancelled: '#e74c3c',
      disputed: '#c0392b'
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <div className="order-summary-container">
      <div className="summary-grid">
        <div className="summary-card financial">
          <h4>Financial Summary</h4>
          <div className="summary-item">
            <FaDollarSign />
            <div className="item-info">
              <span className="label">Order Amount</span>
              <span className="value">{formatCurrency(order.amount)}</span>
            </div>
          </div>
          <div className="summary-item">
            <FaPercent />
            <div className="item-info">
              <span className="label">Platform Fee ({feePercentage}%)</span>
              <span className="value">{formatCurrency(platformFee)}</span>
            </div>
          </div>
          <div className="summary-item highlight">
            <FaDollarSign />
            <div className="item-info">
              <span className="label">Seller Amount</span>
              <span className="value">{formatCurrency(sellerAmount)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card timeline">
          <h4>Order Timeline</h4>
          <div className="summary-item">
            <FaCalendarAlt />
            <div className="item-info">
              <span className="label">Order Created</span>
              <span className="value">{formatDate(order.createdAt)}</span>
            </div>
          </div>
          {order.expectedDelivery && (
            <div className="summary-item">
              <FaClock />
              <div className="item-info">
                <span className="label">Expected Delivery</span>
                <span className="value">{formatDate(order.expectedDelivery)}</span>
              </div>
            </div>
          )}
          {order.deliveredAt && (
            <div className="summary-item">
              <FaTruck />
              <div className="item-info">
                <span className="label">Delivered On</span>
                <span className="value">{formatDate(order.deliveredAt)}</span>
              </div>
            </div>
          )}
          {order.completedAt && (
            <div className="summary-item">
              <FaCheckCircle />
              <div className="item-info">
                <span className="label">Completed On</span>
                <span className="value">{formatDate(order.completedAt)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="summary-card parties">
          <h4>Parties Involved</h4>
          <div className="summary-item">
            <FaUser />
            <div className="item-info">
              <span className="label">Seller</span>
              <span className="value">{getSellerName()}</span>
            </div>
          </div>
          <div className="summary-item">
            <FaUser />
            <div className="item-info">
              <span className="label">Buyer</span>
              <span className="value">{getBuyerName()}</span>
            </div>
          </div>
        </div>

        <div className="summary-card details">
          <h4>Order Details</h4>
          <div className="summary-item">
            <FaFileAlt />
            <div className="item-info">
              <span className="label">Order Number</span>
              <span className="value">{order.orderNumber || 'N/A'}</span>
            </div>
          </div>
          <div className="summary-item">
            <FaCheckCircle />
            <div className="item-info">
              <span className="label">Status</span>
              <span 
                className="value status" 
                style={{ color: getStatusColor(order.status) }}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div className="summary-item">
            <FaTimes />
            <div className="item-info">
              <span className="label">Revisions Used</span>
              <span className="value">
                {order.revisions} / {order.maxRevisions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;