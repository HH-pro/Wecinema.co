import React, { useEffect, useState } from 'react';
import { 
  FaShoppingBag, 
  FaDollarSign, 
  FaCheckCircle, 
  FaClock, 
  FaTimes,
  FaChartLine,
  FaCalendar,
  FaArrowLeft,
  FaSpinner
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../../Layout';
import { marketplaceApi } from '../../../api';
import './BuyerStatsPage.css';

interface BuyerStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  totalSpent: number;
  monthlySpent: number;
  averageOrderValue: number;
  successRate: number;
  favoriteCategory?: string;
  ordersByMonth?: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  recentOrders?: Array<any>;
}

const BuyerStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBuyerStats();
  }, []);

  const fetchBuyerStats = async () => {
    try {
      setLoading(true);
      // Try different endpoints if one fails
      let response;
      
      try {
        response = await marketplaceApi.dashboard.getBuyerStats(setLoading) as any;
      } catch (error) {
        console.log('Trying alternative endpoint...');
        // Try orders stats endpoint
        response = await marketplaceApi.orders.getBuyerStats(setLoading) as any;
      }
      
      if (response?.success) {
        setStats(response.stats || response);
      } else {
        // Calculate stats from orders if API doesn't provide
        await calculateStatsFromOrders();
      }
    } catch (error) {
      console.error('Error fetching buyer stats:', error);
      // Calculate stats from orders as fallback
      await calculateStatsFromOrders();
    } finally {
      setLoading(false);
    }
  };

  const calculateStatsFromOrders = async () => {
    try {
      const ordersResponse = await marketplaceApi.orders.getMy(setLoading) as any;
      if (ordersResponse.success && ordersResponse.orders) {
        const orders = ordersResponse.orders;
        
        const totalOrders = orders.length;
        const completedOrders = orders.filter((o: any) => o.status === 'completed').length;
        const pendingOrders = orders.filter((o: any) => o.status === 'pending_payment').length;
        const cancelledOrders = orders.filter((o: any) => o.status === 'cancelled').length;
        const activeOrders = orders.filter((o: any) => 
          ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)
        ).length;
        
        const completedAndActiveOrders = orders.filter((o: any) => 
          ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(o.status)
        );
        
        const totalSpent = completedAndActiveOrders.reduce((sum: number, order: any) => sum + order.amount, 0);
        
        // Calculate monthly spent (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlyOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= thirtyDaysAgo && 
                 ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(order.status);
        });
        const monthlySpent = monthlyOrders.reduce((sum: number, order: any) => sum + order.amount, 0);
        
        const averageOrderValue = completedAndActiveOrders.length > 0 
          ? totalSpent / completedAndActiveOrders.length 
          : 0;

        const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

        setStats({
          totalOrders,
          completedOrders,
          pendingOrders,
          cancelledOrders,
          activeOrders,
          totalSpent,
          monthlySpent,
          averageOrderValue,
          successRate
        });
      }
    } catch (error) {
      console.error('Error calculating stats from orders:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <MarketplaceLayout>
           <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                 <div className="text-center">
                   <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                   <p className="text-lg text-gray-800 font-medium">Loading statistics...</p>
                 </div>
                 </div>
         
      </MarketplaceLayout>
    );
  }

  if (!stats) {
    return (
      <MarketplaceLayout>
        <div className="stats-error">
          <h3>Unable to load statistics</h3>
          <p>Please try again later or contact support.</p>
          <button onClick={() => navigate('/marketplace/buyer-dashboard')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="buyer-stats-page">
        {/* Header */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/marketplace/buyer-dashboard')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
          <div className="header-content">
            <h1>Buyer Statistics</h1>
            <p>Detailed insights into your purchasing activity</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="key-metrics">
          <div className="metric-card total-spent">
            <div className="metric-icon">
              <FaDollarSign />
            </div>
            <div className="metric-content">
              <h3>{formatCurrency(stats.totalSpent)}</h3>
              <p>Total Spent</p>
              <small>{formatCurrency(stats.monthlySpent)} this month</small>
            </div>
          </div>

          <div className="metric-card total-orders">
            <div className="metric-icon">
              <FaShoppingBag />
            </div>
            <div className="metric-content">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
              <small>{stats.activeOrders} active</small>
            </div>
          </div>

          <div className="metric-card success-rate">
            <div className="metric-icon">
              <FaCheckCircle />
            </div>
            <div className="metric-content">
              <h3>{formatPercentage(stats.successRate)}</h3>
              <p>Success Rate</p>
              <small>{stats.completedOrders} completed</small>
            </div>
          </div>

          <div className="metric-card avg-order">
            <div className="metric-icon">
              <FaChartLine />
            </div>
            <div className="metric-content">
              <h3>{formatCurrency(stats.averageOrderValue)}</h3>
              <p>Avg. Order Value</p>
              <small>Per successful order</small>
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="detailed-stats">
          <div className="stats-section">
            <h3>Order Breakdown</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">
                  <FaCheckCircle style={{ color: '#27ae60' }} />
                  <span>Completed</span>
                </div>
                <div className="stat-value">
                  <span className="count">{stats.completedOrders}</span>
                  {stats.totalOrders > 0 && (
                    <span className="percentage">
                      {formatPercentage((stats.completedOrders / stats.totalOrders) * 100)}
                    </span>
                  )}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">
                  <FaClock style={{ color: '#f39c12' }} />
                  <span>Active</span>
                </div>
                <div className="stat-value">
                  <span className="count">{stats.activeOrders}</span>
                  {stats.totalOrders > 0 && (
                    <span className="percentage">
                      {formatPercentage((stats.activeOrders / stats.totalOrders) * 100)}
                    </span>
                  )}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">
                  <FaClock style={{ color: '#3498db' }} />
                  <span>Pending Payment</span>
                </div>
                <div className="stat-value">
                  <span className="count">{stats.pendingOrders}</span>
                  {stats.totalOrders > 0 && (
                    <span className="percentage">
                      {formatPercentage((stats.pendingOrders / stats.totalOrders) * 100)}
                    </span>
                  )}
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-label">
                  <FaTimes style={{ color: '#e74c3c' }} />
                  <span>Cancelled</span>
                </div>
                <div className="stat-value">
                  <span className="count">{stats.cancelledOrders}</span>
                  {stats.totalOrders > 0 && (
                    <span className="percentage">
                      {formatPercentage((stats.cancelledOrders / stats.totalOrders) * 100)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="stats-section">
            <h3>Financial Summary</h3>
            <div className="financial-summary">
              <div className="financial-item">
                <span className="label">Total Orders Value</span>
                <span className="value">{formatCurrency(stats.totalSpent)}</span>
              </div>
              
              <div className="financial-item">
                <span className="label">Monthly Spending</span>
                <span className="value">{formatCurrency(stats.monthlySpent)}</span>
              </div>
              
              <div className="financial-item">
                <span className="label">Average Order Value</span>
                <span className="value">{formatCurrency(stats.averageOrderValue)}</span>
              </div>
              
              {stats.favoriteCategory && (
                <div className="financial-item">
                  <span className="label">Favorite Category</span>
                  <span className="value category">{stats.favoriteCategory}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Stats */}
          {stats.ordersByMonth && stats.ordersByMonth.length > 0 && (
            <div className="stats-section">
              <h3>Orders Timeline</h3>
              <div className="timeline-stats">
                <div className="timeline-header">
                  <span>Month</span>
                  <span>Orders</span>
                  <span>Amount</span>
                </div>
                {stats.ordersByMonth.slice(0, 6).map((item, index) => (
                  <div key={index} className="timeline-item">
                    <span className="month">
                      <FaCalendar /> {item.month}
                    </span>
                    <span className="orders-count">{item.count} orders</span>
                    <span className="orders-amount">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="stats-actions">
          <button className="action-btn primary" onClick={() => navigate('/marketplace/buyer-dashboard')}>
            Back to Dashboard
          </button>
          <button className="action-btn" onClick={() => navigate('/marketplace')}>
            Browse Listings
          </button>
          <button className="action-btn" onClick={fetchBuyerStats}>
            Refresh Stats
          </button>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerStatsPage;