import React, { useEffect, useState } from 'react';
import { 
  FaShoppingBag, 
  FaClock, 
  FaCheckCircle, 
  FaWallet,
  FaShoppingCart,
  FaBoxOpen,
  FaSync
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
  status: 'pending' | 'completed' | 'cancelled';
  orderDate: string;
  quantity: number;
  total: number;
}

interface BuyerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
}

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<BuyerStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyerData();
  }, []);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockOrders: Order[] = [
        {
          _id: '1',
          productName: 'Premium Video Template',
          sellerName: 'Creative Studios',
          price: 49.99,
          status: 'completed',
          orderDate: '2024-01-15',
          quantity: 1,
          total: 49.99
        },
        {
          _id: '2',
          productName: 'Cinematic LUTs Pack',
          sellerName: 'Color Grading Pro',
          price: 29.99,
          status: 'pending',
          orderDate: '2024-01-18',
          quantity: 1,
          total: 29.99
        },
        {
          _id: '3',
          productName: 'Motion Graphics Bundle',
          sellerName: 'Animation Masters',
          price: 79.99,
          status: 'completed',
          orderDate: '2024-01-10',
          quantity: 1,
          total: 79.99
        }
      ];

      setOrders(mockOrders);

      // Calculate stats from mock data
      const totalOrders = mockOrders.length;
      const pendingOrders = mockOrders.filter(order => order.status === 'pending').length;
      const completedOrders = mockOrders.filter(order => order.status === 'completed').length;
      const totalSpent = mockOrders.reduce((sum, order) => sum + order.total, 0);

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent,
      });

    } catch (error) {
      console.error('Error fetching buyer data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'completed':
        return <FaCheckCircle className="status-icon completed" />;
      case 'cancelled':
        return <FaBoxOpen className="status-icon cancelled" />;
      default:
        return <FaClock className="status-icon pending" />;
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
        </div>
        <button className="refresh-btn" onClick={handleRefresh}>
          <FaSync /> Refresh
        </button>
      </div>

      {/* Simple Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-info">
            <h3>{stats.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{stats.completedOrders}</h3>
            <p>Completed Orders</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaWallet />
          </div>
          <div className="stat-info">
            <h3>${stats.totalSpent.toFixed(2)}</h3>
            <p>Total Spent</p>
          </div>
        </div>
      </div>

      {/* Simple Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn">
            <FaShoppingCart />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>

      {/* Simple Orders Section */}
      <div className="orders-section">
        <div className="section-header">
          <h2>Recent Orders</h2>
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {orders.length > 0 ? (
            orders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-details">
                  <h3 className="product-name">{order.productName}</h3>
                  <p className="seller">Seller: {order.sellerName}</p>
                  <div className="order-meta">
                    <span className="price">${order.total.toFixed(2)}</span>
                    <span className="order-date">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="order-status">
                  <div className={`status-badge ${order.status}`}>
                    {getStatusIcon(order.status)}
                    <span>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">
              <FaBoxOpen className="no-orders-icon" />
              <h3>No orders yet</h3>
              <p>Start shopping to see your orders here</p>
              <button className="cta-button">
                <FaShoppingCart />
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </MarketplaceLayout>

  );
};

export default BuyerDashboard;