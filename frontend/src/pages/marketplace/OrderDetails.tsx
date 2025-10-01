import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import { marketplaceAPI } from '../../api';

interface OrderDetailsState {
  order: any;
  loading: boolean;
  activeTab: 'details' | 'messages' | 'delivery';
  deliveryMessage: string;
}

const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { updateOrderStatus, deliverOrder } = useMarketplace();
  
  const [state, setState] = useState<OrderDetailsState>({
    order: null,
    loading: true,
    activeTab: 'details',
    deliveryMessage: ''
  });

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const orderData = await marketplaceAPI.orders.getDetails(orderId!);
      setState(prev => ({ ...prev, order: orderData, loading: false }));
    } catch (error) {
      console.error('Error fetching order details:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleStartWork = async () => {
    try {
      await updateOrderStatus(orderId!, 'in_progress');
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error starting work:', error);
    }
  };

  const handleDeliverOrder = async () => {
    try {
      await deliverOrder(orderId!, {
        deliveryMessage: state.deliveryMessage,
        deliveryFiles: []
      });
      setState(prev => ({ ...prev, deliveryMessage: '' }));
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error delivering order:', error);
    }
  };

  const handleAcceptDelivery = async () => {
    try {
      await marketplaceAPI.payments.capture(orderId!, () => {});
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error accepting delivery:', error);
    }
  };

  const handleRequestRevision = async () => {
    try {
      await marketplaceAPI.orders.requestRevision(orderId!, 'Please make the requested changes', () => {});
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error requesting revision:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending_payment: '#ffc107',
      paid: '#17a2b8',
      in_progress: '#007bff',
      delivered: '#28a745',
      completed: '#20c997',
      cancelled: '#dc3545',
      disputed: '#fd7e14'
    };
    return colors[status] || '#6c757d';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (state.loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (!state.order) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Order Not Found</h2>
          <p>The order you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/marketplace/orders')} className="btn btn-primary">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const { order } = state;
  const isSeller = true; // You would get this from auth context
  const isBuyer = true; // You would get this from auth context

  return (
    <div className="page-container">
      <div className="order-details-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <div className="header-content">
          <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
          <span 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Order Summary */}
      <div className="order-summary-card">
        <div className="summary-grid">
          <div className="summary-item">
            <label>Amount</label>
            <span className="amount">${order.amount}</span>
          </div>
          <div className="summary-item">
            <label>Order Type</label>
            <span>{order.orderType.replace('_', ' ')}</span>
          </div>
          <div className="summary-item">
            <label>Created</label>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          {order.paidAt && (
            <div className="summary-item">
              <label>Paid On</label>
              <span>{formatDate(order.paidAt)}</span>
            </div>
          )}
          {order.deliveredAt && (
            <div className="summary-item">
              <label>Delivered On</label>
              <span>{formatDate(order.deliveredAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${state.activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setState(prev => ({ ...prev, activeTab: 'details' }))}
          >
            Order Details
          </button>
          <button 
            className={`tab ${state.activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setState(prev => ({ ...prev, activeTab: 'messages' }))}
          >
            Messages
          </button>
          <button 
            className={`tab ${state.activeTab === 'delivery' ? 'active' : ''}`}
            onClick={() => setState(prev => ({ ...prev, activeTab: 'delivery' }))}
          >
            Delivery
          </button>
        </div>

        <div className="tab-content">
          {/* Details Tab */}
          {state.activeTab === 'details' && (
            <div className="details-content">
              <div className="info-section">
                <h3>Order Information</h3>
                {order.requirements && (
                  <div className="info-item">
                    <label>Requirements:</label>
                    <p>{order.requirements}</p>
                  </div>
                )}
                {order.buyerNotes && (
                  <div className="info-item">
                    <label>Buyer Notes:</label>
                    <p>{order.buyerNotes}</p>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h3>Parties</h3>
                <div className="parties-grid">
                  <div className="party">
                    <label>Buyer</label>
                    <span>{order.buyerId?.username || 'Unknown'}</span>
                  </div>
                  <div className="party">
                    <label>Seller</label>
                    <span>{order.sellerId?.username || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {order.listingId && (
                <div className="info-section">
                  <h3>Listing Details</h3>
                  <div className="listing-preview">
                    <strong>{order.listingId.title}</strong>
                    {order.listingId.description && (
                      <p>{order.listingId.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {state.activeTab === 'messages' && (
            <div className="messages-content">
              <div className="messages-placeholder">
                <h3>Order Messages</h3>
                <p>Direct messaging system will be implemented here.</p>
                <p>You'll be able to communicate with the {isSeller ? 'buyer' : 'seller'} about this order.</p>
                <button 
                  onClick={() => navigate(`/marketplace/messages/${orderId}`)}
                  className="btn btn-primary"
                >
                  Open Messages
                </button>
              </div>
            </div>
          )}

          {/* Delivery Tab */}
          {state.activeTab === 'delivery' && (
            <div className="delivery-content">
              {order.status === 'paid' && isSeller && (
                <div className="action-section">
                  <h3>Start Working</h3>
                  <p>Begin working on the order and deliver when ready.</p>
                  <button onClick={handleStartWork} className="btn btn-primary">
                    Start Work
                  </button>
                </div>
              )}

              {order.status === 'in_progress' && isSeller && (
                <div className="action-section">
                  <h3>Deliver Work</h3>
                  <textarea
                    value={state.deliveryMessage}
                    onChange={(e) => setState(prev => ({ ...prev, deliveryMessage: e.target.value }))}
                    placeholder="Add delivery message and instructions..."
                    rows={4}
                    className="delivery-textarea"
                  />
                  <button 
                    onClick={handleDeliverOrder}
                    disabled={!state.deliveryMessage.trim()}
                    className="btn btn-success"
                  >
                    Deliver Order
                  </button>
                </div>
              )}

              {order.status === 'delivered' && isBuyer && (
                <div className="action-section">
                  <h3>Review Delivery</h3>
                  {order.deliveryMessage && (
                    <div className="delivery-message">
                      <strong>Seller's Message:</strong>
                      <p>{order.deliveryMessage}</p>
                    </div>
                  )}
                  <div className="action-buttons">
                    <button onClick={handleAcceptDelivery} className="btn btn-success">
                      Accept Delivery & Release Payment
                    </button>
                    <button onClick={handleRequestRevision} className="btn btn-warning">
                      Request Revision
                    </button>
                  </div>
                </div>
              )}

              {order.status === 'completed' && (
                <div className="completed-section">
                  <h3>✅ Order Completed</h3>
                  <p>This order has been successfully completed.</p>
                  {order.completedAt && (
                    <p>Completed on: {formatDate(order.completedAt)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Timeline */}
      <div className="timeline-section">
        <h3>Order Timeline</h3>
        <div className="timeline">
          <div className="timeline-item completed">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <strong>Order Created</strong>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>
          
          {order.paidAt && (
            <div className="timeline-item completed">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <strong>Payment Received</strong>
                <span>{formatDate(order.paidAt)}</span>
              </div>
            </div>
          )}
          
          {order.deliveredAt && (
            <div className="timeline-item completed">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <strong>Work Delivered</strong>
                <span>{formatDate(order.deliveredAt)}</span>
              </div>
            </div>
          )}
          
          {order.completedAt && (
            <div className="timeline-item completed">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <strong>Order Completed</strong>
                <span>{formatDate(order.completedAt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;