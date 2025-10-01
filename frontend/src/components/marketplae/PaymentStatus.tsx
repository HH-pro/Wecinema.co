import React, { useState, useEffect } from 'react';
import { marketplaceAPI } from '../../api';

interface PaymentStatusProps {
  orderId: string;
  onStatusChange?: (status: string) => void;
}

interface PaymentStatusData {
  orderStatus: string;
  paymentIntent: {
    status: string;
    amount: number;
    currency: string;
    created: number;
  } | null;
  paymentReleased: boolean;
  releaseDate: string | null;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ orderId, onStatusChange }) => {
  const [status, setStatus] = useState<PaymentStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentStatus();
    const interval = setInterval(fetchPaymentStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchPaymentStatus = async () => {
    try {
      const result = await marketplaceAPI.payments.getStatus(orderId, setLoading);
      if (result.success && result.data) {
        setStatus(result.data);
        onStatusChange?.(result.data.orderStatus);
      } else {
        setError(result.error || 'Failed to fetch payment status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return '⏳';
      case 'paid':
        return '✅';
      case 'completed':
        return '🎉';
      case 'cancelled':
        return '❌';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return '#ffc107';
      case 'paid':
        return '#17a2b8';
      case 'completed':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="payment-status loading">
        <div className="loading-spinner"></div>
        <span>Checking payment status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-status error">
        <span>❌ Error: {error}</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="payment-status">
        <span>No payment information available</span>
      </div>
    );
  }

  return (
    <div className="payment-status">
      <div className="status-header">
        <div 
          className="status-icon"
          style={{ backgroundColor: getStatusColor(status.orderStatus) }}
        >
          {getStatusIcon(status.orderStatus)}
        </div>
        <div className="status-info">
          <h4>Payment Status</h4>
          <span className="status-text">
            {status.orderStatus.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      <div className="status-details">
        {status.paymentIntent && (
          <div className="detail-item">
            <label>Amount:</label>
            <span>${status.paymentIntent.amount / 100}</span>
          </div>
        )}

        {status.paymentReleased && status.releaseDate && (
          <div className="detail-item">
            <label>Funds Released:</label>
            <span>{new Date(status.releaseDate).toLocaleDateString()}</span>
          </div>
        )}

        {status.paymentIntent?.created && (
          <div className="detail-item">
            <label>Payment Created:</label>
            <span>{new Date(status.paymentIntent.created * 1000).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {status.orderStatus === 'pending_payment' && (
        <div className="status-note">
          <p>⚠️ Waiting for payment confirmation. Funds will be held in escrow until order completion.</p>
        </div>
      )}

      {status.orderStatus === 'paid' && (
        <div className="status-note">
          <p>✅ Payment received! Funds are secured in escrow. Seller will start working on your order.</p>
        </div>
      )}

      {status.orderStatus === 'completed' && status.paymentReleased && (
        <div className="status-note success">
          <p>🎉 Payment completed! Funds have been released to the seller.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;