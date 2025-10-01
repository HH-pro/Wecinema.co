import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout/MarketplaceLayout';
import OrderSummary from '../../components/marketplae/OrderSummary';

interface Order {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  sellerId: {
    username: string;
    avatar?: string;
  };
  listingId?: {
    title: string;
    mediaUrls: string[];
  };
}

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/my-orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = (orderId: string) => {
    // Navigate to order details page
    console.log('View order details:', orderId);
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const getOrderCountByStatus = (status: string) => {
    return orders.filter(order => order.status === status).length;
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="loading">Loading your orders...</div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="my-orders-page">
        <div className="page-header">
          <h1>My Orders</h1>
          <p>Track and manage your purchases</p>
        </div>

        {/* Order Filters */}
        <div className="order-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'pending_payment' ? 'active' : ''}`}
            onClick={() => setFilter('pending_payment')}
          >
            Payment Pending ({getOrderCountByStatus('pending_payment')})
          </button>
          <button 
            className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({getOrderCountByStatus('in_progress')})
          </button>
          <button 
            className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered ({getOrderCountByStatus('delivered')})
          </button>
          <button 
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({getOrderCountByStatus('completed')})
          </button>
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <h3>No orders found</h3>
              <p>
                {filter === 'all' 
                  ? "You haven't placed any orders yet." 
                  : `No orders with status "${filter}"`
                }
              </p>
              {filter === 'all' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = '/marketplace'}
                >
                  Browse Listings
                </button>
              )}
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderSummary
                key={order._id}
                order={order}
                onViewDetails={handleViewOrderDetails}
              />
            ))
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default MyOrders;