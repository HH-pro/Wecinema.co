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
import axios from 'axios';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../components/Layout';

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

  const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
  };

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      if (!token) {
        toast.error('Please login to view your dashboard');
        navigate('/login');
        return;
      }

      // Fetch orders from your backend API
      const response = await axios.get(
        'http://localhost:3000/marketplace/orders/my-orders',
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        const buyerOrders = response.data.orders || [];
        setOrders(buyerOrders);
        calculateStats(buyerOrders);
        toast.success(`Loaded ${buyerOrders.length} orders`);
      } else {
        throw new Error(response.data.error || 'Failed to fetch orders');
      }

    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
      
      if (error.response?.status === 401) {
        toast.error('Please login to view your dashboard');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to load dashboard data');
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
              <option value="completed">Completed</option>
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
              filteredOrders.map(order => (
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
                      
                      {order.status === 'pending_payment' && (
                        <button 
                          onClick={() => navigate('/marketplace/checkout')}
                          className="complete-payment-btn"
                        >
                          Complete Payment
                        </button>
                      )}
                      
                      {order.status === 'delivered' && (
                        <button 
                          onClick={() => handleViewOrder(order._id)}
                          className="review-delivery-btn"
                        >
                          Review Delivery
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
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