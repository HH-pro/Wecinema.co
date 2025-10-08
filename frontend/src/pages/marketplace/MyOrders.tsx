import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
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
      const response = await fetch('/marketplace/my-orders');
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
          <h1 className="text-3xl font-bold mt-10 text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">Track and manage your purchases</p>
        </div>

        {/* Order Filters - Browser-like tabs */}
        <div className="order-filters border-b border-gray-200 mt-8">
          <nav className="-mb-px flex space-x-8">
            <button 
              className={`filter-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'all' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({orders.length})
            </button>
            <button 
              className={`filter-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'pending_payment' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setFilter('pending_payment')}
            >
              Payment Pending ({getOrderCountByStatus('pending_payment')})
            </button>
            <button 
              className={`filter-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'in_progress' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setFilter('in_progress')}
            >
              In Progress ({getOrderCountByStatus('in_progress')})
            </button>
            <button 
              className={`filter-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'delivered' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setFilter('delivered')}
            >
              Delivered ({getOrderCountByStatus('delivered')})
            </button>
            <button 
              className={`filter-tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'completed' 
                  ? 'border-yellow-500 text-yellow-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setFilter('completed')}
            >
              Completed ({getOrderCountByStatus('completed')})
            </button>
          </nav>
        </div>

        {/* Orders List - Browser-like table layout */}
        <div className="orders-list mt-6">
          {filteredOrders.length === 0 ? (
            <div className="empty-state text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' 
                    ? "You haven't placed any orders yet." 
                    : `No orders with status "${filter}"`
                  }
                </p>
                {filter === 'all' && (
                  <button 
                    className="btn btn-primary bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                    onClick={() => window.location.href = '/marketplace'}
                  >
                    Browse Listings
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 bg-gray-50 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <div className="col-span-4">Order</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Seller</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              
              {/* Order Items */}
              <div className="divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <OrderSummary
                    key={order._id}
                    order={order}
                    onViewDetails={handleViewOrderDetails}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .my-orders-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        .filter-tab {
          transition: all 0.2s ease-in-out;
        }
        
        .filter-tab:focus {
          outline: none;
        }
        
        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.125rem;
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .order-filters {
            overflow-x: auto;
          }
          
          .order-filters nav {
            min-width: max-content;
          }
        }
      `}</style>
    </MarketplaceLayout>
  );
};

export default MyOrders;