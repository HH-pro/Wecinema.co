import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import MarketplaceLayout from '../../../src/components/Layout';
import marketplaceApi from '../../api/marketplaceApi';
import { OrderTimeline, OrderSummary, PaymentDetails } from '../../components/marketplae/BuyerDashboard';
import './OrderDetailsPage.css';

interface Order {
  _id: string;
  orderNumber?: string;
  listingId: any;
  buyerId: any;
  sellerId: any;
  amount: number;
  status: string;
  paymentStatus: string;
  orderType: string;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  deliveries?: any[];
  timeline?: any[];
  payment?: any;
  createdAt: string;
  updatedAt: string;
}

const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
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
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceApi.orders.getOrderDetails(orderId);
      
      if (response.success) {
        // Handle different response formats
        const orderData = response.data?.order || response.data || response.order;
        
        if (orderData) {
          setOrder(orderData);
        } else {
          setError('Order data not found in response');
          toast.error('Failed to load order details');
        }
      } else {
        setError(response.error || 'Failed to fetch order details');
        toast.error(response.error || 'Failed to load order');
      }
    } catch (error: any) {
      console.error('Error fetching order details:', error);
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

 const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  const valueInDollars = (amount || 0) / 100;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(valueInDollars);
};
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatStatus = (status: string | undefined | null): string => {
    if (!status || status.trim() === '') return 'N/A';
    // Replace underscores and hyphens with spaces, and capitalize each word
    return status
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderTabContent = () => {
    if (!order) return null;

    switch (activeTab) {
      case 'timeline':
        const timelineEvents = order.timeline || [];
        return <OrderTimeline events={timelineEvents} loading={loading} />;
      
      case 'summary':
        return <OrderSummary order={order} />;
      
      case 'payment':
        if (order.payment) {
          return <PaymentDetails payment={order.payment} />;
        } else {
          // Create payment details from order data
          const paymentDetails = {
            amount: order.amount,
            status: order.paymentStatus,
            method: 'Credit Card',
            transactionId: order._id,
            date: order.createdAt
          };
          return <PaymentDetails payment={paymentDetails} />;
        }
      
      case 'files':
        return (
          <div className="files-tab">
            <h3>Order Files</h3>
            {order.deliveryFiles && order.deliveryFiles.length > 0 ? (
              <div className="files-list">
                {order.deliveryFiles.map((file: string, index: number) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file || `File ${index + 1}`}</span>
                    <button 
                      className="download-btn"
                      onClick={() => window.open(`/marketplace/orders/upload/delivery/${file}`, '_blank')}
                      disabled={!file}
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
        return (
          <div className="order-details-tab">
            <div className="details-grid">
              <div className="detail-section">
                <h4>Order Information</h4>
                <div className="detail-item">
                  <strong>Order ID:</strong>
                  <span>{order._id || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Order Number:</strong>
                  <span>{order.orderNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <span className={`status-badge status-${order.status || 'unknown'}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Payment Status:</strong>
                  <span className={`status-badge status-${order.paymentStatus || 'unknown'}`}>
                    {formatStatus(order.paymentStatus)}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Order Type:</strong>
                  <span>{order.orderType || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Amount:</strong>
                  <span>{formatCurrency(order.amount || 0)}</span>
                </div>
                <div className="detail-item">
                  <strong>Created:</strong>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                {order.updatedAt && order.updatedAt !== order.createdAt && (
                  <div className="detail-item">
                    <strong>Last Updated:</strong>
                    <span>{formatDate(order.updatedAt)}</span>
                  </div>
                )}
              </div>
              
              <div className="detail-section">
                <h4>Listing Details</h4>
                {order.listingId && typeof order.listingId === 'object' ? (
                  <>
                    <div className="detail-item">
                      <strong>Title:</strong>
                      <span>{order.listingId.title || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Category:</strong>
                      <span>{order.listingId.category || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Type:</strong>
                      <span>{order.listingId.type || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <p>Listing details not available</p>
                )}
              </div>
              
              <div className="detail-section">
                <h4>Seller Information</h4>
                {order.sellerId && typeof order.sellerId === 'object' ? (
                  <>
                    <div className="detail-item">
                      <strong>Username:</strong>
                      <span>{order.sellerId.username || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Name:</strong>
                      <span>
                        {order.sellerId.firstName || order.sellerId.lastName 
                          ? `${order.sellerId.firstName || ''} ${order.sellerId.lastName || ''}`.trim()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>Rating:</strong>
                      <span>{order.sellerId.sellerRating || 'Not rated'}</span>
                    </div>
                  </>
                ) : (
                  <p>Seller information not available</p>
                )}
              </div>
              
              {order.deliveryMessage && (
                <div className="detail-section">
                  <h4>Delivery Message</h4>
                  <p className="delivery-message">{order.deliveryMessage}</p>
                </div>
              )}

              {order.deliveries && order.deliveries.length > 0 && (
                <div className="detail-section">
                  <h4>Deliveries ({order.deliveries.length})</h4>
                  <div className="deliveries-list">
                    {order.deliveries.slice(0, 3).map((delivery: any, index: number) => (
                      <div key={index} className="delivery-item">
                        <strong>Delivery {index + 1}:</strong>
                        <span>{delivery.message || 'No message'}</span>
                        <small>{formatDate(delivery.createdAt)}</small>
                      </div>
                    ))}
                    {order.deliveries.length > 3 && (
                      <button 
                        className="view-all-deliveries"
                        onClick={() => handleTabChange('files')}
                      >
                        View all {order.deliveries.length} deliveries
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800 font-medium">Loading your Order Details...</p>
          </div>
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
          <div className="order-number">#{order.orderNumber || (order._id ? order._id.slice(-8) : 'N/A')}</div>
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
            {/* <button
              className={`tab ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => handleTabChange('payment')}
            >
              Payment
            </button> */}
            {order.deliveryFiles && order.deliveryFiles.length > 0 && (
              <button
                className={`tab ${activeTab === 'files' ? 'active' : ''}`}
                onClick={() => handleTabChange('files')}
              >
                Files
              </button>
            )}
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
              onClick={() => {
                toast.info('Review feature coming soon!');
              }}
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

          {order.status === 'in_progress' && (
            <button 
              className="action-btn info"
              onClick={() => {
                toast.info('Work in progress...');
              }}
            >
              View Progress
            </button>
          )}

          {['in_revision', 'delivered'].includes(order.status) && (
            <button 
              className="action-btn revision"
              onClick={() => navigate(`/marketplace/orders/${orderId}/revision`)}
            >
              Request Revision
            </button>
          )}

          {['pending', 'pending_payment'].includes(order.status) && (
            <button 
              className="action-btn danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this order?')) {
                  toast.info('Cancellation feature coming soon!');
                }
              }}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default OrderDetailsPage;