import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import OrderSummary from '../../components/marketplae/OrderSummary';

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

interface Order {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  buyerId: {
    username: string;
    avatar?: string;
  };
  listingId?: {
    title: string;
    mediaUrls: string[];
  };
}

const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    activeListings: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch seller orders
      const ordersResponse = await fetch('/api/marketplace/seller-orders');
      const ordersData = await ordersResponse.json();
      setRecentOrders(ordersData.slice(0, 5)); // Show last 5 orders

      // Fetch seller listings for stats
      const listingsResponse = await fetch('/api/marketplace/my-listings');
      const listingsData = await listingsResponse.json();

      // Calculate stats
      const totalListings = listingsData.length;
      const activeListings = listingsData.filter((l: any) => l.status === 'active').length;
      const totalOrders = ordersData.length;
      const pendingOrders = ordersData.filter((o: any) => 
        ['pending_payment', 'paid', 'in_progress'].includes(o.status)
      ).length;
      const totalRevenue = ordersData
        .filter((o: any) => o.status === 'completed')
        .reduce((sum: number, order: any) => sum + order.amount, 0);

      setStats({
        totalListings,
        activeListings,
        totalOrders,
        pendingOrders,
        totalRevenue
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = (orderId: string) => {
    // Navigate to order details
    console.log('View order:', orderId);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="loading">Loading dashboard...</div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="seller-dashboard">
        <div className="page-header">
          <h1>Seller Dashboard</h1>
          <p>Manage your listings and orders</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>${stats.totalRevenue}</h3>
            <p>Total Revenue</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalListings}</h3>
            <p>Total Listings</p>
          </div>
          <div className="stat-card">
            <h3>{stats.activeListings}</h3>
            <p>Active Listings</p>
          </div>
          <div className="stat-card">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
          <div className="stat-card">
            <h3>{stats.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <h2>Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders yet</p>
            </div>
          ) : (
            <div className="orders-list">
              {recentOrders.map(order => (
                <OrderSummary
                  key={order._id}
                  order={order}
                  onViewDetails={handleViewOrderDetails}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <button className="btn btn-primary">
              Create New Listing
            </button>
            <button className="btn btn-secondary">
              View All Orders
            </button>
            <button className="btn btn-secondary">
              Manage Listings
            </button>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;