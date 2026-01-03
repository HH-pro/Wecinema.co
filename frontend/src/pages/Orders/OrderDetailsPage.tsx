// src/pages/marketplace/orders/OrderDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, 
  FaSpinner, 
  FaExclamationCircle, 
  FaDownload,
  FaFile,
  FaHistory,
  FaCreditCard,
  FaInfoCircle,
  FaEnvelope,
  FaStar,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaShoppingBag
} from 'react-icons/fa';
import MarketplaceLayout from '../../components/Layout';
import marketplaceApi from '../../api/marketplaceApi';
import { 
  Order, 
  OrderTimelineItem, 
  Delivery,
  UploadedFile,
  ApiResponse 
} from '../../api/marketplaceApi';
import './OrderDetailsPage.css';

// Order Summary Component
const OrderSummary: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="order-summary">
      <h3 className="summary-title">Order Summary</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Total Amount:</span>
          <span className="summary-value">
            {marketplaceApi.utils.formatCurrency(order.amount * 100, order.listingId?.currency || 'USD')}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Platform Fee (10%):</span>
          <span className="summary-value">
            {marketplaceApi.utils.formatCurrency(
              (order.amount * 100) * 0.10, 
              order.listingId?.currency || 'USD'
            )}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Net Payout:</span>
          <span className="summary-value">
            {marketplaceApi.utils.formatCurrency(
              (order.amount * 100) * 0.90, 
              order.listingId?.currency || 'USD'
            )}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Payment Status:</span>
          <span className={`summary-value status-${order.paymentStatus}`}>
            {order.paymentStatus.replace('_', ' ')}
          </span>
        </div>
        {order.maxRevisions !== undefined && (
          <>
            <div className="summary-item">
              <span className="summary-label">Revisions Used:</span>
              <span className="summary-value">{order.revisions || 0}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Revisions Left:</span>
              <span className="summary-value">{order.maxRevisions - (order.revisions || 0)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Order Timeline Component
const OrderTimeline: React.FC<{ timeline: OrderTimelineItem[]; loading: boolean }> = ({ timeline, loading }) => {
  if (loading) {
    return (
      <div className="timeline-loading">
        <FaSpinner className="spin" /> Loading timeline...
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="no-timeline">
        <FaHistory />
        <p>No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="order-timeline">
      <h3 className="timeline-title">Order Timeline</h3>
      <div className="timeline-container">
        {timeline.map((event, index) => (
          <div key={index} className="timeline-event">
            <div className="timeline-icon">
              {event.icon === 'check' && <FaCheckCircle />}
              {event.icon === 'clock' && <FaClock />}
              {event.icon === 'user' && <FaUser />}
              {event.icon === 'shopping' && <FaShoppingBag />}
              {!['check', 'clock', 'user', 'shopping'].includes(event.icon) && <FaInfoCircle />}
            </div>
            <div className="timeline-content">
              <div className="timeline-status">{event.status}</div>
              <div className="timeline-description">{event.description}</div>
              <div className="timeline-date">
                {marketplaceApi.utils.formatDate(event.date, true)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Payment Details Component
const PaymentDetails: React.FC<{ payment: any }> = ({ payment }) => {
  if (!payment) {
    return (
      <div className="no-payment">
        <FaExclamationCircle />
        <p>No payment information available</p>
      </div>
    );
  }

  return (
    <div className="payment-details">
      <h3 className="payment-title">Payment Information</h3>
      <div className="payment-grid">
        <div className="payment-item">
          <span className="payment-label">Payment Status:</span>
          <span className={`payment-value status-${payment.status}`}>
            {payment.status?.replace('_', ' ') || 'N/A'}
          </span>
        </div>
        <div className="payment-item">
          <span className="payment-label">Payment Intent ID:</span>
          <span className="payment-value code">{payment.paymentIntentId || 'N/A'}</span>
        </div>
        <div className="payment-item">
          <span className="payment-label">Amount:</span>
          <span className="payment-value">
            {marketplaceApi.utils.formatCurrency(payment.amount, payment.currency || 'USD')}
          </span>
        </div>
        {payment.paidAt && (
          <div className="payment-item">
            <span className="payment-label">Paid At:</span>
            <span className="payment-value">
              {marketplaceApi.utils.formatDate(payment.paidAt, true)}
            </span>
          </div>
        )}
        {payment.releaseDate && (
          <div className="payment-item">
            <span className="payment-label">Release Date:</span>
            <span className="payment-value">
              {marketplaceApi.utils.formatDate(payment.releaseDate)}
            </span>
          </div>
        )}
        {payment.paymentReleased !== undefined && (
          <div className="payment-item">
            <span className="payment-label">Funds Released:</span>
            <span className={`payment-value ${payment.paymentReleased ? 'released' : 'pending'}`}>
              {payment.paymentReleased ? 'Yes' : 'No'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Order Details Page Component
const OrderDetailsPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State variables
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [userRole, setUserRole] = useState<'buyer' | 'seller' | 'admin'>('buyer');
  const [permissions, setPermissions] = useState<any>({});

  // Fetch order details when orderId changes
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Set active tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
// اصل fetchOrderDetails function کو یوں تبدیل کریں:
const fetchOrderDetails = async () => {
  if (!orderId) {
    setError('No order ID provided');
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);

    // 1. Fetch order details
    const orderResponse = await marketplaceApi.orders.getOrderDetails(orderId);
    
    // 2. Check response structure properly
    if (!orderResponse.success || !orderResponse.data) {
      console.error('Order response:', orderResponse);
      throw new Error(orderResponse.error || 'Failed to fetch order details');
    }

    // 3. Extract data with safe access
    const orderData = orderResponse.data;
    
    // 4. Check if order exists in response
    if (!orderData.order) {
      console.error('No order in response:', orderData);
      throw new Error('Order not found in response');
    }

    setOrder(orderData.order);
    setTimeline(orderData.timeline || []);
    setUserRole(orderData.userRole || 'buyer');
    setPermissions(orderData.permissions || {});

    // 5. Fetch deliveries separately if needed
    try {
      const deliveriesResponse = await marketplaceApi.orders.getDeliveries(orderId);
      if (deliveriesResponse.success && deliveriesResponse.data) {
        setDeliveries(deliveriesResponse.data.deliveries || []);
      }
    } catch (deliveryError) {
      console.warn('Could not fetch deliveries:', deliveryError);
    }

    // 6. Fetch files separately
    try {
      const filesResponse = await marketplaceApi.orders.getDownloadFiles(orderId);
      if (filesResponse.success && filesResponse.data) {
        setFiles(filesResponse.data.files || []);
      }
    } catch (fileError) {
      console.warn('Could not fetch files:', fileError);
    }

  } catch (error: any) {
    console.error('Error fetching order details:', error);
    setError(error.message || 'Failed to load order details');
    toast.error(error.message || 'Failed to load order details');
  } finally {
    setLoading(false);
  }
};
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`?tab=${tab}`, { replace: true });
  };

  // Handle order action
  const handleOrderAction = async (action: string, data?: any) => {
    if (!orderId || !order) return;

    try {
      setLoading(true);
      let response: ApiResponse;

      switch (action) {
        case 'complete':
          response = await marketplaceApi.orders.completeOrder(orderId);
          break;
        case 'requestRevision':
          if (!data?.revisionNotes) {
            toast.error('Please provide revision notes');
            return;
          }
          response = await marketplaceApi.orders.requestRevision(orderId, data.revisionNotes);
          break;
        case 'startProcessing':
          response = await marketplaceApi.orders.startProcessing(orderId);
          break;
        case 'startWork':
          response = await marketplaceApi.orders.startWork(orderId);
          break;
        case 'deliver':
          if (!data?.deliveryMessage) {
            toast.error('Please provide a delivery message');
            return;
          }
          response = await marketplaceApi.orders.deliverOrder(orderId, {
            deliveryMessage: data.deliveryMessage,
            deliveryFiles: data.deliveryFiles || []
          });
          break;
        case 'cancel':
          const cancelReason = window.prompt('Please provide a reason for cancellation:');
          if (!cancelReason) {
            toast.info('Cancellation cancelled');
            return;
          }
          response = userRole === 'buyer' 
            ? await marketplaceApi.orders.cancelOrderByBuyer(orderId, cancelReason)
            : await marketplaceApi.orders.cancelOrderBySeller(orderId, cancelReason);
          break;
        default:
          toast.error('Unknown action');
          return;
      }

      if (response.success) {
        toast.success(response.message || 'Action completed successfully');
        // Refresh order details
        fetchOrderDetails();
      } else {
        toast.error(response.error || 'Action failed');
      }
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle file download
  const handleFileDownload = async (fileUrl: string, fileName: string) => {
    try {
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // Render loading state
  if (loading && !order) {
    return (
      <MarketplaceLayout>
        <div className="order-details-loading">
          <div className="loading-spinner">
            <FaSpinner className="spin" />
          </div>
          <p>Loading order details...</p>
        </div>
      </MarketplaceLayout>
    );
  }

  // Render error state
  if (error || !order) {
    return (
      <MarketplaceLayout>
        <div className="order-error">
          <FaExclamationCircle className="error-icon" />
          <h3>Order Not Found</h3>
          <p>{error || 'The order you are looking for does not exist or you do not have permission to view it.'}</p>
          <button 
            className="back-button"
            onClick={() => navigate('/marketplace/buyer-dashboard')}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </MarketplaceLayout>
    );
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return <OrderTimeline timeline={timeline} loading={loading} />;
      
      case 'summary':
        return <OrderSummary order={order} />;
      
      case 'payment':
        return <PaymentDetails payment={order} />;
      
      case 'deliveries':
        return (
          <div className="deliveries-tab">
            <h3 className="tab-title">Deliveries</h3>
            {deliveries.length > 0 ? (
              <div className="deliveries-list">
                {deliveries.map((delivery) => (
                  <div key={delivery._id} className="delivery-item">
                    <div className="delivery-header">
                      <span className="delivery-number">
                        Delivery #{delivery.revisionNumber}
                        {delivery.isFinalDelivery && <span className="final-badge">Final</span>}
                      </span>
                      <span className={`delivery-status status-${delivery.status}`}>
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="delivery-message">
                      {delivery.message}
                    </div>
                    {delivery.attachments.length > 0 && (
                      <div className="delivery-files">
                        <h4>Attachments:</h4>
                        <div className="files-grid">
                          {delivery.attachments.map((file, index) => (
                            <div key={index} className="file-item">
                              <FaFile className="file-icon" />
                              <span className="file-name">{file.originalName}</span>
                              <button
                                className="download-file-btn"
                                onClick={() => handleFileDownload(file.url, file.originalName)}
                              >
                                <FaDownload />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="delivery-footer">
                      <span className="delivery-date">
                        {marketplaceApi.utils.formatDate(delivery.createdAt, true)}
                      </span>
                      <span className="delivery-by">
                        By: {delivery.sellerId.username}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-deliveries">
                <FaExclamationCircle />
                <p>No deliveries yet</p>
              </div>
            )}
          </div>
        );
      
      case 'files':
        return (
          <div className="files-tab">
            <h3 className="tab-title">Order Files</h3>
            {files.length > 0 ? (
              <div className="files-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item-detailed">
                    <div className="file-info">
                      <FaFile className="file-icon" />
                      <div className="file-details">
                        <span className="file-name">{file.originalName}</span>
                        <span className="file-size">{marketplaceApi.utils.formatBytes(file.size)}</span>
                        <span className="file-type">{file.mimeType}</span>
                      </div>
                    </div>
                    <button
                      className="download-btn primary"
                      onClick={() => handleFileDownload(file.url, file.originalName)}
                    >
                      <FaDownload /> Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-files">
                <FaExclamationCircle />
                <p>No files available for this order</p>
              </div>
            )}
          </div>
        );
      
      case 'details':
      default:
        return (
          <div className="order-details-tab">
            <div className="details-grid">
              {/* Order Information */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FaInfoCircle /> Order Information
                </h4>
                <div className="detail-item">
                  <strong>Order ID:</strong>
                  <span className="detail-value code">{order._id}</span>
                </div>
                <div className="detail-item">
                  <strong>Order Number:</strong>
                  <span className="detail-value">{order.orderNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <span className={`detail-value status-badge status-${order.status}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Order Type:</strong>
                  <span className="detail-value">{order.orderType?.replace('_', ' ') || 'Direct Purchase'}</span>
                </div>
                <div className="detail-item">
                  <strong>Created:</strong>
                  <span className="detail-value">
                    {marketplaceApi.utils.formatDate(order.createdAt, true)}
                  </span>
                </div>
                {order.expectedDelivery && (
                  <div className="detail-item">
                    <strong>Expected Delivery:</strong>
                    <span className="detail-value">
                      {marketplaceApi.utils.formatDate(order.expectedDelivery)}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Information */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FaCreditCard /> Financial Information
                </h4>
                <div className="detail-item">
                  <strong>Amount:</strong>
                  <span className="detail-value">
                    {marketplaceApi.utils.formatCurrency(order.amount * 100, 'USD')}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Payment Status:</strong>
                  <span className={`detail-value status-badge status-${order.paymentStatus}`}>
                    {order.paymentStatus.replace('_', ' ')}
                  </span>
                </div>
                {order.platformFee !== undefined && (
                  <div className="detail-item">
                    <strong>Platform Fee:</strong>
                    <span className="detail-value">
                      {marketplaceApi.utils.formatCurrency(order.platformFee * 100, 'USD')}
                    </span>
                  </div>
                )}
                {order.sellerAmount !== undefined && (
                  <div className="detail-item">
                    <strong>Seller Payout:</strong>
                    <span className="detail-value">
                      {marketplaceApi.utils.formatCurrency(order.sellerAmount * 100, 'USD')}
                    </span>
                  </div>
                )}
                {order.paymentReleased !== undefined && (
                  <div className="detail-item">
                    <strong>Payment Released:</strong>
                    <span className={`detail-value ${order.paymentReleased ? 'released' : 'pending'}`}>
                      {order.paymentReleased ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>

              {/* Listing Information */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FaShoppingBag /> Listing Information
                </h4>
                {typeof order.listingId === 'object' ? (
                  <>
                    <div className="detail-item">
                      <strong>Title:</strong>
                      <span className="detail-value">{order.listingId.title}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Price:</strong>
                      <span className="detail-value">
                        {marketplaceApi.utils.formatCurrency(order.listingId.price * 100, order.listingId.currency || 'USD')}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>Category:</strong>
                      <span className="detail-value">{order.listingId.category}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Type:</strong>
                      <span className="detail-value">{order.listingId.type?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div className="detail-item">
                    <strong>Listing ID:</strong>
                    <span className="detail-value code">{order.listingId}</span>
                  </div>
                )}
              </div>

              {/* User Information */}
              <div className="detail-section">
                <h4 className="section-title">
                  <FaUser /> User Information
                </h4>
                <div className="detail-item">
                  <strong>Buyer:</strong>
                  <span className="detail-value">{order.buyerId.username || order.buyerId.email}</span>
                </div>
                <div className="detail-item">
                  <strong>Seller:</strong>
                  <span className="detail-value">{order.sellerId.username || order.sellerId.email}</span>
                </div>
                {order.buyerNotes && (
                  <div className="detail-item">
                    <strong>Buyer Notes:</strong>
                    <p className="detail-value notes">{order.buyerNotes}</p>
                  </div>
                )}
                {order.sellerNotes && (
                  <div className="detail-item">
                    <strong>Seller Notes:</strong>
                    <p className="detail-value notes">{order.sellerNotes}</p>
                  </div>
                )}
                {order.requirements && (
                  <div className="detail-item">
                    <strong>Requirements:</strong>
                    <p className="detail-value notes">{order.requirements}</p>
                  </div>
                )}
              </div>

              {/* Delivery Information */}
              {order.deliveryMessage && (
                <div className="detail-section full-width">
                  <h4 className="section-title">
                    <FaEnvelope /> Delivery Message
                  </h4>
                  <div className="delivery-message-container">
                    <p className="delivery-message">{order.deliveryMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Render action buttons based on user role and order status
  const renderActionButtons = () => {
    if (!order) return null;

    const isBuyer = userRole === 'buyer';
    const isSeller = userRole === 'seller';

    return (
      <div className="order-actions">
        {isBuyer && (
          <>
            {order.status === 'delivered' && permissions.canCompleteOrder && (
              <button
                className="action-btn success"
                onClick={() => handleOrderAction('complete')}
                disabled={loading}
              >
                <FaCheckCircle /> Complete Order
              </button>
            )}
            
            {order.status === 'delivered' && permissions.canRequestRevision && (
              <button
                className="action-btn warning"
                onClick={() => {
                  const revisionNotes = window.prompt('Please enter your revision notes:');
                  if (revisionNotes) {
                    handleOrderAction('requestRevision', { revisionNotes });
                  }
                }}
                disabled={loading}
              >
                Request Revision
              </button>
            )}
            
            {order.status === 'pending_payment' && permissions.canCompletePayment && (
              <button
                className="action-btn primary"
                onClick={() => navigate(`/marketplace/payment/${orderId}`)}
              >
                <FaCreditCard /> Complete Payment
              </button>
            )}
            
            {permissions.canCancel && (
              <button
                className="action-btn danger"
                onClick={() => handleOrderAction('cancel')}
                disabled={loading}
              >
                Cancel Order
              </button>
            )}
          </>
        )}

        {isSeller && (
          <>
            {order.status === 'paid' && permissions.canStartProcessing && (
              <button
                className="action-btn primary"
                onClick={() => handleOrderAction('startProcessing')}
                disabled={loading}
              >
                Start Processing
              </button>
            )}
            
            {order.status === 'processing' && permissions.canStartWork && (
              <button
                className="action-btn primary"
                onClick={() => handleOrderAction('startWork')}
                disabled={loading}
              >
                Start Work
              </button>
            )}
            
            {order.status === 'in_progress' && permissions.canDeliver && (
              <button
                className="action-btn success"
                onClick={() => {
                  const deliveryMessage = window.prompt('Enter delivery message:');
                  if (deliveryMessage) {
                    handleOrderAction('deliver', { deliveryMessage });
                  }
                }}
                disabled={loading}
              >
                Deliver Order
              </button>
            )}
            
            {order.status === 'in_revision' && permissions.canCompleteRevision && (
              <button
                className="action-btn warning"
                onClick={() => {
                  const deliveryMessage = window.prompt('Enter delivery message for revision:');
                  if (deliveryMessage) {
                    handleOrderAction('deliver', { deliveryMessage, isRevision: true });
                  }
                }}
                disabled={loading}
              >
                Complete Revision
              </button>
            )}
          </>
        )}

        {/* Common actions for all users */}
        <button
          className="action-btn secondary"
          onClick={() => {
            const chatLink = `/marketplace/messages?order=${orderId}`;
            navigate(chatLink);
          }}
        >
          <FaEnvelope /> Contact {isBuyer ? 'Seller' : 'Buyer'}
        </button>

        {isBuyer && order.status === 'completed' && (
          <button
            className="action-btn success"
            onClick={() => {
              navigate(`/marketplace/review/create?orderId=${orderId}`);
            }}
          >
            <FaStar /> Leave Review
          </button>
        )}
      </div>
    );
  };

  return (
    <MarketplaceLayout>
      <div className="order-details-page">
        {/* Page Header */}
        <div className="page-header">
          <button 
            className="back-btn"
            onClick={() => navigate('/marketplace/buyer-dashboard')}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
          
          <div className="header-content">
            <h1 className="page-title">Order Details</h1>
            <div className="order-header-info">
              <span className="order-number">
                #{order.orderNumber || order._id.slice(-8).toUpperCase()}
              </span>
              <span className={`order-status-badge status-${order.status}`}>
                {order.status.replace('_', ' ')}
              </span>
              <span className="order-amount">
                {marketplaceApi.utils.formatCurrency(order.amount * 100, 'USD')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="tabs-container">
          <div className="tabs-navigation">
            <button
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => handleTabChange('details')}
            >
              <FaInfoCircle /> Details
            </button>
            <button
              className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => handleTabChange('timeline')}
            >
              <FaHistory /> Timeline
            </button>
            <button
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => handleTabChange('summary')}
            >
              <FaCheckCircle /> Summary
            </button>
            <button
              className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => handleTabChange('payment')}
            >
              <FaCreditCard /> Payment
            </button>
            <button
              className={`tab-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
              onClick={() => handleTabChange('deliveries')}
            >
              <FaEnvelope /> Deliveries
            </button>
            <button
              className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => handleTabChange('files')}
            >
              <FaFile /> Files
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {renderTabContent()}
          </div>
        </div>

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Additional Info */}
        <div className="additional-info">
          <div className="info-card">
            <h4>User Role</h4>
            <p className="user-role">{userRole}</p>
          </div>
          <div className="info-card">
            <h4>Last Updated</h4>
            <p>{marketplaceApi.utils.formatDate(order.updatedAt, true)}</p>
          </div>
          <div className="info-card">
            <h4>Order Type</h4>
            <p>{order.orderType?.replace('_', ' ') || 'Direct'}</p>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default OrderDetailsPage;