import React, { useEffect, useState } from 'react';
import { 
  FaShoppingBag, 
  FaSearch, 
  FaFilter, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaBoxOpen,
  FaStar,
  FaWallet,
  FaShoppingCart,
  FaUserCheck,
  FaChartLine,
  FaExclamationTriangle,
  FaSync,
  FaArrowRight
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getRequest } from '../../api';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../components/Layout';

interface Order {
  _id: string;
  productName: string;
  sellerName: string;
  price: number;
  status: 'pending' | 'completed' | 'cancelled' | 'shipped';
  orderDate: string;
  estimatedDelivery?: string;
  image?: string;
  quantity: number;
  total: number;
}

interface BuyerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
  favoriteSellers: number;
  avgRating: number;
}

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<BuyerStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    favoriteSellers: 0,
    avgRating: 4.5
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-high' | 'price-low'>('newest');

  useEffect(() => {
    fetchBuyerData();
  }, []);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      
      // Fetch buyer orders
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      const ordersResult: any = await getRequest(`/orders/buyer/${userData.userId}`, setLoading);
      setOrders(ordersResult || []);

      // Calculate stats
      const totalOrders = ordersResult?.length || 0;
      const pendingOrders = ordersResult?.filter((order: Order) => order.status === 'pending').length || 0;
      const completedOrders = ordersResult?.filter((order: Order) => order.status === 'completed').length || 0;
      const totalSpent = ordersResult?.reduce((sum: number, order: Order) => sum + order.total, 0) || 0;

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent,
        favoriteSellers: 3, // Mock data
        avgRating: 4.5
      });

    } catch (error) {
      console.error('Error fetching buyer data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || order.status === activeTab;
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
        case 'oldest':
          return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        case 'price-high':
          return b.total - a.total;
        case 'price-low':
          return a.total - b.total;
        default:
          return 0;
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'completed':
        return <FaCheckCircle className="status-icon completed" />;
      case 'cancelled':
        return <FaTimesCircle className="status-icon cancelled" />;
      case 'shipped':
        return <FaBoxOpen className="status-icon shipped" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'var(--status-pending)';
      case 'completed':
        return 'var(--status-completed)';
      case 'cancelled':
        return 'var(--status-cancelled)';
      case 'shipped':
        return 'var(--status-shipped)';
      default:
        return 'var(--status-pending)';
    }
  };

  const handleRefresh = () => {
    fetchBuyerData();
    toast.info('Refreshing dashboard...');
  };

  if (loading) {
    return (
      <div className="buyer-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
      <MarketplaceLayout>

    <div className="buyer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Buyer Dashboard</h1>
          <p>Manage your purchases and track orders</p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh}>
          <FaSync /> Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total-orders">
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending-orders">
            <FaClock />
          </div>
          <div className="stat-info">
            <h3>{stats.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed-orders">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{stats.completedOrders}</h3>
            <p>Completed Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon total-spent">
            <FaWallet />
          </div>
          <div className="stat-info">
            <h3>${stats.totalSpent.toFixed(2)}</h3>
            <p>Total Spent</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon favorite-sellers">
            <FaUserCheck />
          </div>
          <div className="stat-info">
            <h3>{stats.favoriteSellers}</h3>
            <p>Favorite Sellers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rating">
            <FaStar />
          </div>
          <div className="stat-info">
            <h3>{stats.avgRating}/5</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn primary">
            <FaShoppingCart />
            <span>Continue Shopping</span>
          </button>
          <button className="action-btn secondary">
            <FaSearch />
            <span>Track Order</span>
          </button>
          <button className="action-btn secondary">
            <FaStar />
            <span>Leave Reviews</span>
          </button>
          <button className="action-btn secondary">
            <FaChartLine />
            <span>Spending Report</span>
          </button>
        </div>
      </div>

      {/* Orders Section */}
      <div className="orders-section">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <div className="controls">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Order Tabs */}
        <div className="order-tabs">
          {['all', 'pending', 'completed', 'cancelled'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== 'all' && (
                <span className="tab-count">
                  {orders.filter(order => order.status === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-image">
                  {order.image ? (
                    <img src={order.image} alt={order.productName} />
                  ) : (
                    <div className="image-placeholder">
                      <FaBoxOpen />
                    </div>
                  )}
                </div>
                
                <div className="order-details">
                  <h3 className="product-name">{order.productName}</h3>
                  <p className="seller">Seller: {order.sellerName}</p>
                  <div className="order-meta">
                    <span className="quantity">Qty: {order.quantity}</span>
                    <span className="price">${order.total.toFixed(2)}</span>
                  </div>
                  <p className="order-date">
                    Ordered: {new Date(order.orderDate).toLocaleDateString()}
                  </p>
                  {order.estimatedDelivery && (
                    <p className="delivery-date">
                      Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="order-status">
                  <div 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusIcon(order.status)}
                    <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                  </div>
                  
                  <div className="order-actions">
                    <button className="action-btn small">
                      View Details
                    </button>
                    {order.status === 'completed' && (
                      <button className="action-btn small secondary">
                        Leave Review
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button className="action-btn small warning">
                        Cancel Order
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
                {searchTerm || activeTab !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start shopping to see your orders here'
                }
              </p>
              {!searchTerm && activeTab === 'all' && (
                <button className="cta-button">
                  <FaShoppingCart />
                  Start Shopping
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">
              <FaShoppingBag />
            </div>
            <div className="activity-content">
              <p>You placed an order for <strong>Premium Video Template</strong></p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>
          
          <div className="activity-item">
            <div className="activity-icon">
              <FaCheckCircle />
            </div>
            <div className="activity-content">
              <p>Your order <strong>Cinematic LUTs Pack</strong> was delivered</p>
              <span className="activity-time">1 day ago</span>
            </div>
          </div>
          
          <div className="activity-item">
            <div className="activity-icon">
              <FaStar />
            </div>
            <div className="activity-content">
              <p>You reviewed <strong>Motion Graphics Bundle</strong></p>
              <span className="activity-time">2 days ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <div className="section-header">
          <h2>Recommended For You</h2>
          <button className="view-all">
            View All <FaArrowRight />
          </button>
        </div>
        <div className="recommendations-grid">
          <div className="recommendation-card">
            <div className="rec-image"></div>
            <div className="rec-content">
              <h4>4K Video Assets Pack</h4>
              <p>High-quality video elements</p>
              <div className="rec-price">$29.99</div>
            </div>
          </div>
          
          <div className="recommendation-card">
            <div className="rec-image"></div>
            <div className="rec-content">
              <h4>Professional Sound Effects</h4>
              <p>Royalty-free audio library</p>
              <div className="rec-price">$19.99</div>
            </div>
          </div>
          
          <div className="recommendation-card">
            <div className="rec-image"></div>
            <div className="rec-content">
              <h4>YouTube Intro Templates</h4>
              <p>Customizable intro sequences</p>
              <div className="rec-price">$14.99</div>
            </div>
          </div>
        </div>
      </div>
    </div>
      </MarketplaceLayout>

  );
};

export default BuyerDashboard;