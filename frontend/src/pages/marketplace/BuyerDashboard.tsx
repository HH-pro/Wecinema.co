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
  FaCalendar
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../components/Layout';
import { marketplaceAPI } from '../../services/api'; // Import the marketplaceAPI

interface User {
  _id: string;
  username: string;
  avatar?: string;
  email: string;
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
}

interface Order {
  _id: string;
  buyerId: User | string;
  sellerId: User | string;
  listingId: Listing | string;
  offerId?: Offer | string;
  orderType: 'direct_purchase' | 'accepted_offer' | 'commission';
  amount: number;
  status: 'pending_payment' | 'paid' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed';
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
}

interface BuyerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeOrders: number;
  totalSpent: number;
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
      
      // Check if user is authenticated
      if (!marketplaceAPI.auth.isAuthenticated()) {
        toast.error('Please login to view your dashboard');
        navigate('/login');
        return;
      }

      // Fetch orders using marketplaceAPI
      const response = await marketplaceAPI.orders.getMy(setLoading);
      
      if (response.success) {
        const buyerOrders = response.orders || response.data?.orders || [];
        setOrders(buyerOrders);
        calculateStats(buyerOrders);
        
        // Optionally fetch dashboard stats for more detailed statistics
        try {
          const dashboardStats = await marketplaceAPI.dashboard.getBuyerStats();
          if (dashboardStats.success) {
            // Update stats with dashboard data if available
            setStats(prev => ({
              ...prev,
              ...dashboardStats.data
            }));
          }
        } catch (dashboardError) {
          console.log('Dashboard stats not available, using calculated stats');
        }
      } else {
        throw new Error(response.error || 'Failed to fetch orders');
      }

    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
      
      if (error.response?.status === 401 || error.message?.includes('unauthorized')) {
        toast.error('Please login to view your dashboard');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error(error.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    const pendingOrders = ordersData.filter(order => order.status === 'pending_payment').length;
    const completedOrders = ordersData.filter(order => order.status === 'completed').length;
    const activeOrders = ordersData.filter(order => 
      ['paid', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
    ).length;
    const totalSpent = ordersData
      .filter(order => ['completed', 'delivered', 'in_progress', 'paid'].includes(order.status))
      .reduce((sum, order) => sum + order.amount, 0);

    setStats({
      totalOrders,
      pendingOrders,
      completedOrders,
      activeOrders,
      totalSpent,
    });
  };

  // Helper functions to handle populated data
  const getSellerUsername = (order: Order): string => {
    if (typeof order.sellerId === 'object' && order.sellerId !== null) {
      return (order.sellerId as User).username || 'Unknown Seller';
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
      return (order.listingId as Listing).mediaUrls?.[0];
    }
    return undefined;
  };

  const getStatusColor = (status: Order['status']): string => {
    const colors: Record<Order['status'], string> = {
      pending_payment: 'status-pending',
      paid: 'status-paid',
      in_progress: 'status-in-progress',
      delivered: 'status-delivered',
      in_revision: 'status-revision',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      disputed: 'status-disputed'
    };
    return colors[status] || 'status-pending';
  };

  const getStatusIcon = (status: Order['status']) => {
    const icons: Record<Order['status'], JSX.Element> = {
      pending_payment: <FaClock className="status-icon" />,
      paid: <FaDollarSign className="status-icon" />,
      in_progress: <FaUser className="status-icon" />,
      delivered: <FaTruck className="status-icon" />,
      in_revision: <FaSync className="status-icon" />,
      completed: <FaCheckCircle className="status-icon" />,
      cancelled: <FaBoxOpen className="status-icon" />,
      disputed: <FaExclamationTriangle className="status-icon" />
    };
    return icons[status];
  };

  const getStatusText = (status: Order['status']): string => {
    const texts: Record<Order['status'], string> = {
      pending_payment: 'Payment Pending',
      paid: 'Paid',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      in_revision: 'Revision Requested',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed'
    };
    return texts[status] || status;
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

  // Add function to handle order actions
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
          // Navigate to messages
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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Add a function to get order actions based on status
  const getOrderActions = (order: Order) => {
    const actions = [];
    
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'complete-payment-btn'
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'cancel-btn'
        });
        break;
        
      case 'delivered':
        actions.push({
          label: 'Request Revision',
          action: 'request_revision',
          className: 'revision-btn'
        });
        actions.push({
          label: 'Complete Order',
          action: 'complete_order',
          className: 'complete-order-btn'
        });
        break;
        
      case 'in_revision':
      case 'in_progress':
      case 'paid':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn'
        });
        break;
        
      case 'completed':
        // Check if review can be left
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'review-btn'
        });
        break;
    }
    
    return actions;
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
              <FaUser />
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
                  <div key={order._id} className="order-card">
                    <div className="order-image">
                      <div className="image-container">
                        {getListingMedia(order) ? (
                          <img 
                            src={getListingMedia(order)} 
                            alt={getListingTitle(order)}
                            className="listing-image"
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
                        Seller: @{getSellerUsername(order)}
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
                      </div>
                    </div>

                    <div className="order-status">
                      <div className={`status-badge ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </div>
                      
                      <div className="order-actions">
                        <button 
                          onClick={() => handleViewOrder(order._id)}
                          className="view-details-btn"
                        >
                          View Details
                        </button>
                        
                        {actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleOrderAction(order._id, action.action)}
                            className={`action-button ${action.className}`}
                          >
                            {action.label}
                          </button>
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