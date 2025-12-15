import React, { useEffect, useState } from 'react';
import { 
  FaShoppingBag, 
  FaClock, 
  FaCheckCircle, 
  FaWallet,
  FaShoppingCart,
  FaBoxOpen,
  FaSync,
  FaTruck,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaDollarSign,
  FaUser,
  FaCalendar,
  FaEye,
  FaCreditCard,
  FaComment,
  FaReply,
  FaTimes
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../components/Layout';
import { marketplaceAPI, isAuthenticated, formatCurrency } from '../../services/api';
import { getCurrentUserId } from '../../utilities/helperfFunction';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  sellerRating?: number;
}

interface Listing {
  _id: string;
  title: string;
  mediaUrls?: string[];
  price: number;
  category: string;
  type: string;
  description?: string;
  tags?: string[];
}

interface Offer {
  _id: string;
  amount: number;
  message?: string;
  requirements?: string;
  expectedDelivery?: string;
  createdAt: string;
}

interface Order {
  _id: string;
  buyerId: User | string;
  sellerId: User | string;
  listingId: Listing | string;
  offerId?: Offer | string;
  orderType: 'direct_purchase' | 'accepted_offer' | 'commission';
  amount: number;
  status: 'pending_payment' | 'paid' | 'processing' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed';
  paymentReleased: boolean;
  platformFee?: number;
  sellerAmount?: number;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  revisions: number;
  maxRevisions: number;
  requirements?: string;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string;
  processingAt?: string;
  startedAt?: string;
  revisionNotes?: Array<{
    notes: string;
    requestedAt: string;
    completedAt?: string;
  }>;
  // New fields from your backend
  sellerPayoutAmount?: number;
  cancelledAt?: string;
  buyerNotes?: string;
  sellerNotes?: string;
}

interface Delivery {
  _id: string;
  orderId: string | Order;
  sellerId: User | string;
  buyerId: User | string;
  message: string;
  attachments: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    key?: string;
  }>;
  isFinalDelivery: boolean;
  revisionNumber: number;
  status: 'pending_review';
  createdAt: string;
}

interface BuyerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeOrders: number;
  totalSpent: number;
  cancelledOrders?: number;
  totalRevenue?: number;
  pendingRevenue?: number;
}

interface DashboardResponse {
  success: boolean;
  orders?: Order[];
  sales?: Order[];
  data?: {
    orders?: Order[];
    stats?: BuyerStats;
  };
  stats?: {
    total: number;
    active: number;
    completed: number;
    pending: number;
    cancelled: number;
    totalRevenue?: number;
    pendingRevenue?: number;
  };
  error?: string;
  count?: number;
}

interface Stats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  cancelled: number;
}

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<BuyerStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBuyerData();
  }, []);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      
      // Check authentication
      if (!isAuthenticated()) {
        toast.error('Please login to view your dashboard');
        navigate('/login');
        return;
      }

      // Fetch orders using marketplaceAPI.orders.getMy()
      const response = await marketplaceAPI.orders.getMy(setLoading) as DashboardResponse;
      
      console.log('API Response:', response); // Debug log
      
      if (response.success) {
        const buyerOrders = response.orders || [];
        setOrders(buyerOrders);
        
        // Calculate stats from orders
        const calculatedStats = calculateStats(buyerOrders);
        
        // Use backend stats if available, otherwise use calculated
        if (response.stats) {
          setStats({
            totalOrders: response.stats.total || calculatedStats.totalOrders,
            pendingOrders: response.stats.pending || calculatedStats.pendingOrders,
            completedOrders: response.stats.completed || calculatedStats.completedOrders,
            activeOrders: response.stats.active || calculatedStats.activeOrders,
            cancelledOrders: response.stats.cancelled || calculatedStats.cancelledOrders,
            totalSpent: calculatedStats.totalSpent,
            totalRevenue: response.stats.totalRevenue,
            pendingRevenue: response.stats.pendingRevenue
          });
        } else {
          setStats(calculatedStats);
        }
        
      } else {
        throw new Error(response.error || 'Failed to fetch orders');
      }

    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
      
      if (error.message?.includes('unauthorized') || error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error(error.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]): BuyerStats => {
    const totalOrders = ordersData.length;
    const pendingOrders = ordersData.filter(order => order.status === 'pending_payment').length;
    const completedOrders = ordersData.filter(order => order.status === 'completed').length;
    const cancelledOrders = ordersData.filter(order => order.status === 'cancelled').length;
    const activeOrders = ordersData.filter(order => 
      ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
    ).length;
    const totalSpent = ordersData
      .filter(order => ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(order.status))
      .reduce((sum, order) => sum + order.amount, 0);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      activeOrders,
      cancelledOrders,
      totalSpent,
    };
  };

  // Helper functions to handle populated data
  const getSellerUsername = (order: Order): string => {
    if (typeof order.sellerId === 'object' && order.sellerId !== null) {
      const seller = order.sellerId as User;
      return seller.firstName ? `${seller.firstName} ${seller.lastName || ''}`.trim() : seller.username || 'Unknown Seller';
    }
    return 'Seller';
  };

  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).title || 'Unknown Listing';
    }
    return 'Listing';
  };

  const getListingMedia = (order: Order): string | undefined => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      const listing = order.listingId as Listing;
      if (listing.mediaUrls && listing.mediaUrls.length > 0) {
        const media = listing.mediaUrls[0];
        return typeof media === 'string' ? media : (media as any)?.url;
      }
    }
    return undefined;
  };

  const getStatusColor = (status: Order['status']): string => {
    const colors: Record<Order['status'], string> = {
      pending_payment: 'var(--warning)',
      paid: 'var(--info)',
      processing: 'var(--primary-light)',
      in_progress: 'var(--primary)',
      delivered: 'var(--success-light)',
      in_revision: 'var(--warning)',
      completed: 'var(--success)',
      cancelled: 'var(--danger)',
      disputed: 'var(--danger-dark)'
    };
    return colors[status] || 'var(--secondary)';
  };

  const getStatusIcon = (status: Order['status']) => {
    const icons: Record<Order['status'], JSX.Element> = {
      pending_payment: <FaClock className="status-icon" />,
      paid: <FaCreditCard className="status-icon" />,
      processing: <FaBoxOpen className="status-icon" />,
      in_progress: <FaUser className="status-icon" />,
      delivered: <FaTruck className="status-icon" />,
      in_revision: <FaReply className="status-icon" />,
      completed: <FaCheckCircle className="status-icon" />,
      cancelled: <FaTimes className="status-icon" />,
      disputed: <FaExclamationTriangle className="status-icon" />
    };
    return icons[status];
  };

  const getStatusText = (status: Order['status']): string => {
    const texts: Record<Order['status'], string> = {
      pending_payment: 'Payment Pending',
      paid: 'Paid',
      processing: 'Processing',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      in_revision: 'Revision',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed'
    };
    return texts[status] || status.replace('_', ' ').toUpperCase();
  };

  const getOrderDescription = (order: Order): string => {
    switch (order.status) {
      case 'pending_payment':
        return 'Waiting for payment completion';
      case 'paid':
        return 'Payment received, seller will start soon';
      case 'processing':
        return 'Seller is preparing your order';
      case 'in_progress':
        return 'Seller is working on your order';
      case 'delivered':
        return 'Work delivered, please review';
      case 'in_revision':
        return `Revision requested (${order.revisions || 0}/${order.maxRevisions || 3})`;
      case 'completed':
        return 'Order successfully completed';
      case 'cancelled':
        return 'Order has been cancelled';
      case 'disputed':
        return 'Order is under dispute';
      default:
        return 'Order is being processed';
    }
  };

  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = getListingTitle(order).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getSellerUsername(order).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (orderId: string): void => {
    navigate(`/marketplace/orders/${orderId}`);
  };

  const handleContinueShopping = (): void => {
    navigate('/marketplace');
  };

  const handleRefresh = () => {
    fetchBuyerData();
    toast.info('Refreshing dashboard...');
  };

  // Handle order actions
  const handleOrderAction = async (orderId: string, action: string, data?: any) => {
    try {
      switch (action) {
        case 'complete_payment':
          // Navigate to payment page
          navigate(`/marketplace/payment/${orderId}`);
          break;
          
        case 'request_revision':
          const revisionNotes = prompt('Please provide revision notes:');
          if (revisionNotes) {
            await marketplaceAPI.orders.requestRevision(orderId, revisionNotes, setLoading);
            toast.success('Revision requested successfully');
            fetchBuyerData(); // Refresh data
          }
          break;
          
        case 'complete_order':
          await marketplaceAPI.orders.complete(orderId, setLoading);
          toast.success('Order marked as completed');
          fetchBuyerData(); // Refresh data
          break;
          
        case 'contact_seller':
          navigate(`/marketplace/messages?order=${orderId}`);
          break;
          
        case 'cancel_order':
          const cancelReason = prompt('Please provide reason for cancellation:');
          if (cancelReason) {
            await marketplaceAPI.orders.cancelByBuyer(orderId, cancelReason, setLoading);
            toast.success('Order cancelled successfully');
            fetchBuyerData(); // Refresh data
          }
          break;
          
        default:
          console.log('Unknown action:', action);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform action');
    }
  };

  // Get available actions based on order status
  const getOrderActions = (order: Order): Array<{label: string, action: string, className: string, icon: JSX.Element}> => {
    const actions: Array<{label: string, action: string, className: string, icon: JSX.Element}> = [];
    
    // Always show view details
    actions.push({
      label: 'View Details',
      action: 'view_details',
      className: 'view-details-btn',
      icon: <FaEye />
    });
    
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'complete-payment-btn',
          icon: <FaCreditCard />
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'cancel-btn',
          icon: <FaTimes />
        });
        break;
        
      case 'delivered':
        if ((order.revisions || 0) < (order.maxRevisions || 3)) {
          actions.push({
            label: 'Request Revision',
            action: 'request_revision',
            className: 'revision-btn',
            icon: <FaReply />
          });
        }
        actions.push({
          label: 'Complete Order',
          action: 'complete_order',
          className: 'complete-order-btn',
          icon: <FaCheckCircle />
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        break;
        
      case 'in_revision':
      case 'in_progress':
      case 'paid':
      case 'processing':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'review-btn',
          icon: <FaComment />
        });
        break;
    }
    
    return actions;
  };

  const formatPrice = (price: number): string => {
    return formatCurrency(price, 'USD');
  };

  const formatDate = (date: string): string => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="buyer-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="buyer-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Buyer Dashboard</h1>
            <p>Manage and track your purchases</p>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            <FaSync /> Refresh
          </button>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card total-orders">
            <div className="stat-icon">
              <FaShoppingBag />
            </div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>

          <div className="stat-card active-orders">
            <div className="stat-icon">
              <FaSync />
            </div>
            <div className="stat-info">
              <h3>{stats.activeOrders}</h3>
              <p>Active Orders</p>
            </div>
          </div>

          <div className="stat-card completed-orders">
            <div className="stat-icon">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <h3>{stats.completedOrders}</h3>
              <p>Completed</p>
            </div>
          </div>

          <div className="stat-card total-spent">
            <div className="stat-icon">
              <FaWallet />
            </div>
            <div className="stat-info">
              <h3>{formatPrice(stats.totalSpent)}</h3>
              <p>Total Spent</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn" onClick={handleContinueShopping}>
              <FaShoppingCart />
              <span>Continue Shopping</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/marketplace/offers/my-offers')}
            >
              <FaBoxOpen />
              <span>View My Offers</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/marketplace/messages')}
            >
              <FaComment />
              <span>Messages</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search orders by title or seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-dropdown">
            <FaFilter className="filter-icon" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="pending_payment">Payment Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="in_revision">Revision</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Section */}
        <div className="orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <span className="orders-count">{filteredOrders.length} orders</span>
          </div>

          {/* Orders List */}
          <div className="orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => {
                const actions = getOrderActions(order);
                
                return (
                  <div key={order._id} className="order-card" style={{ borderLeftColor: getStatusColor(order.status) }}>
                    <div className="order-image">
                      <div className="image-container">
                        {getListingMedia(order) ? (
                          <img 
                            src={getListingMedia(order)} 
                            alt={getListingTitle(order)}
                            className="listing-image"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x100?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="image-placeholder">
                            <FaBoxOpen />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="order-details">
                      <h3 className="product-name">{getListingTitle(order)}</h3>
                      <p className="seller">
                        <FaUser className="seller-icon" />
                        Seller: {getSellerUsername(order)}
                      </p>
                      <div className="order-meta">
                        <span className="price">{formatPrice(order.amount)}</span>
                        <span className="order-date">
                          <FaCalendar className="date-icon" />
                          Ordered: {formatDate(order.createdAt)}
                        </span>
                        {order.expectedDelivery && (
                          <span className="expected-delivery">
                            <FaClock className="delivery-icon" />
                            Expected: {formatDate(order.expectedDelivery)}
                          </span>
                        )}
                        {order.deliveredAt && (
                          <span className="delivered-date">
                            <FaTruck className="delivered-icon" />
                            Delivered: {formatDate(order.deliveredAt)}
                          </span>
                        )}
                      </div>
                      <div className="order-description">
                        <p>{getOrderDescription(order)}</p>
                      </div>
                    </div>

                    <div className="order-status">
                      <div className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                      
                      <div className="order-actions">
                        {actions.map((action, index) => (
                          action.action === 'view_details' ? (
                            <button
                              key={index}
                              onClick={() => handleViewOrder(order._id)}
                              className={`action-button ${action.className}`}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </button>
                          ) : (
                            <button
                              key={index}
                              onClick={() => handleOrderAction(order._id, action.action)}
                              className={`action-button ${action.className}`}
                            >
                              {action.icon}
                              <span>{action.label}</span>
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-orders">
                <FaBoxOpen className="no-orders-icon" />
                <h3>No orders found</h3>
                <p>
                  {orders.length === 0 
                    ? "Start shopping to see your orders here" 
                    : "No orders match your search criteria"}
                </p>
                {orders.length === 0 && (
                  <button className="cta-button" onClick={handleContinueShopping}>
                    <FaShoppingCart />
                    Start Shopping
                  </button>
                )}
                {orders.length > 0 && (
                  <button 
                    className="cta-button" 
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;