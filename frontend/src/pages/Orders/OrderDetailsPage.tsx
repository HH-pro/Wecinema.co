import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import MarketplaceLayout from '../../../src/components/Layout/MarketplaceLayout';
import { marketplaceAPI } from '../../api';
import { OrderTimeline, OrderSummary, PaymentDetails } from '../../components/marketplae/BuyerDashboard/BuyerDashboard';
import './OrderDetailsPage.css';

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceAPI.orders.getDetails(orderId!, setLoading) as any;
      
      if (response.success) {
        setOrder(response.order);
      } else {
        setError(response.error || 'Failed to fetch order details');
        toast.error(response.error || 'Failed to load order');
      }
    } catch (error: any) {
      setError(error.message || 'Error loading order details');
      toast.error(error.message || 'Error loading order');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <OrderTimeline events={order?.timeline || []} loading={loading} />;
      
      case 'summary':
        return order ? <OrderSummary order={order} /> : null;
      
      case 'payment':
        return order?.payment ? <PaymentDetails payment={order.payment} /> : (
          <div className="no-payment">
            <FaExclamationCircle />
            <p>No payment information available</p>
          </div>
        );
      
      case 'files':
        return (
          <div className="files-tab">
            <h3>Order Files</h3>
            {order?.deliveryFiles && order.deliveryFiles.length > 0 ? (
              <div className="files-list">
                {order.deliveryFiles.map((file: string, index: number) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file}</span>
                    <button 
                      className="download-btn"
                      onClick={() => window.open(`/marketplace/orders/upload/delivery/${file}`, '_blank')}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No files available for this order</p>
            )}
          </div>
        );
      
      case 'details':
      default:
        return order ? (
          <div className="order-details-tab">
            <div className="details-grid">
              <div className="detail-section">
                <h4>Order Information</h4>
                <div className="detail-item">
                  <strong>Order ID:</strong>
                  <span>{order._id}</span>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Amount:</strong>
                  <span>${order.amount}</span>
                </div>
                <div className="detail-item">
                  <strong>Created:</strong>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="detail-section">
                <h4>Listing Details</h4>
                {typeof order.listingId === 'object' && (
                  <>
                    <div className="detail-item">
                      <strong>Title:</strong>
                      <span>{order.listingId.title}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Price:</strong>
                      <span>${order.listingId.price}</span>
                    </div>
                  </>
                )}
              </div>
              
              {order.deliveryMessage && (
                <div className="detail-section">
                  <h4>Delivery Message</h4>
                  <p className="delivery-message">{order.deliveryMessage}</p>
                </div>
              )}
            </div>
          </div>
        ) : null;
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="order-details-loading">
          <FaSpinner className="loading-spinner" />
          <p>Loading order details...</p>
        </div>
      </MarketplaceLayout>
    );
  }

  if (error || !order) {
    return (
      <MarketplaceLayout>
        <div className="order-error">
          <FaExclamationCircle />
          <h3>Order Not Found</h3>
          <p>{error || 'The order you are looking for does not exist'}</p>
          <button onClick={() => navigate('/marketplace/buyer-dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="order-details-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/marketplace/buyer-dashboard')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
          <h1>Order Details</h1>
          <div className="order-number">#{order.orderNumber || order._id.slice(-8)}</div>
        </div>

        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => handleTabChange('details')}
            >
              Details
            </button>
            <button
              className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => handleTabChange('timeline')}
            >
              Timeline
            </button>
            <button
              className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => handleTabChange('summary')}
            >
              Summary
            </button>
            <button
              className={`tab ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => handleTabChange('payment')}
            >
              Payment
            </button>
            <button
              className={`tab ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => handleTabChange('files')}
            >
              Files
            </button>
          </div>

          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>

        <div className="order-actions">
          <button 
            className="action-btn primary"
            onClick={() => navigate(`/marketplace/messages?order=${orderId}`)}
          >
            Contact Seller
          </button>
          {order.status === 'delivered' && (
            <button 
              className="action-btn success"
              onClick={() => navigate(`/marketplace/reviews/create?orderId=${orderId}`)}
            >
              Leave Review
            </button>
          )}
          {order.status === 'pending_payment' && (
            <button 
              className="action-btn warning"
              onClick={() => navigate(`/marketplace/payment/${orderId}`)}
            >
              Complete Payment
            </button>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default OrderDetailsPage;