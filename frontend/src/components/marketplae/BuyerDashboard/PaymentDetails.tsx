import React from 'react';
import { 
  FaCreditCard, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaDollarSign,
  FaPercent,
  FaReceipt,
  FaCalendarAlt,
  FaIdCard
} from 'react-icons/fa';
import { formatCurrency } from '../../api';

interface PaymentDetailsProps {
  payment: {
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    platformFee: number;
    sellerAmount: number;
    paidAt?: string;
    transactionId?: string;
    stripePaymentIntentId?: string;
  };
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ payment }) => {
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'succeeded': return <FaCheckCircle />;
      case 'pending': return <FaClock />;
      case 'failed': return <FaTimesCircle />;
      case 'refunded': return <FaTimesCircle />;
      default: return <FaCreditCard />;
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'succeeded': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'failed': return '#e74c3c';
      case 'refunded': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getStatusText = () => {
    return payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
  };

  const feePercentage = ((payment.platformFee / payment.amount) * 100).toFixed(1);

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="payment-details-container">
      <div className="payment-summary">
        <div className="payment-amount">
          <h3>{formatCurrency(payment.amount, payment.currency)}</h3>
          <div className="payment-status" style={{ color: getStatusColor() }}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </div>
        </div>
        
        <div className="payment-method">
          <FaCreditCard />
          <span>{payment.paymentMethod || 'Stripe'}</span>
        </div>
      </div>

      <div className="payment-breakdown">
        <h4>Payment Breakdown</h4>
        <div className="breakdown-item">
          <div className="breakdown-label">
            <FaDollarSign />
            <span>Order Amount</span>
          </div>
          <div className="breakdown-value">
            {formatCurrency(payment.amount, payment.currency)}
          </div>
        </div>
        
        <div className="breakdown-item">
          <div className="breakdown-label">
            <FaPercent />
            <span>Platform Fee ({feePercentage}%)</span>
          </div>
          <div className="breakdown-value">
            {formatCurrency(payment.platformFee, payment.currency)}
          </div>
        </div>
        
        <div className="breakdown-item total">
          <div className="breakdown-label">
            <FaReceipt />
            <span>Seller Amount</span>
          </div>
          <div className="breakdown-value">
            {formatCurrency(payment.sellerAmount, payment.currency)}
          </div>
        </div>
      </div>

      <div className="payment-info">
        <h4>Payment Information</h4>
        {payment.transactionId && (
          <div className="info-item">
            <strong>
              <FaIdCard />
              Transaction ID:
            </strong>
            <span>{payment.transactionId}</span>
          </div>
        )}
        
        {payment.stripePaymentIntentId && (
          <div className="info-item">
            <strong>
              <FaIdCard />
              Payment Intent ID:
            </strong>
            <span>{payment.stripePaymentIntentId}</span>
          </div>
        )}
        
        {payment.paidAt && (
          <div className="info-item">
            <strong>
              <FaCalendarAlt />
              Paid On:
            </strong>
            <span>{formatDateTime(payment.paidAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;