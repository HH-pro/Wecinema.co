import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../../components/Layout';
import { 
  FiPackage, 
  FiShoppingBag, 
  FiCheckCircle, 
  FiClock, 
  FiTruck,
  FiDollarSign,
  FiUser,
  FiCalendar,
  FiSearch,
  FiFilter
} from 'react-icons/fi';
import axios from 'axios';

// Types
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
  buyerId: User;
  sellerId: User;
  listingId: Listing;
  offerId?: Offer;
  orderType: 'direct_purchase' | 'accepted_offer' | 'commission';
  amount: number;
  status: 'pending_payment' | 'paid' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed';
  stripePaymentIntentId?: string;
  paymentReleased: boolean;
  releaseDate?: string;
  platformFee?: number;
  sellerAmount?: number;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  revisions: number;
  maxRevisions: number;
  revisionNotes?: string;
  requirements?: string;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  expectedDelivery?: string;
  buyerNotes?: string;
  sellerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  totalRevenue?: number;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  stats: OrderStats;
  count: number;
}

const MyOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get<OrdersResponse>(
        'http://localhost:3000/marketplace/orders/my-orders',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setOrders(response.data.orders);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Order['status']): string => {
    const colors: Record<Order['status'], string> = {
      pending_payment: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      in_revision: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      disputed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: Order['status']): JSX.Element => {
    const icons: Record<Order['status'], JSX.Element> = {
      pending_payment: <FiClock className="text-yellow-600" />,
      paid: <FiDollarSign className="text-blue-600" />,
      in_progress: <FiUser className="text-purple-600" />,
      delivered: <FiTruck className="text-green-600" />,
      in_revision: <FiClock className="text-orange-600" />,
      completed: <FiCheckCircle className="text-green-600" />,
      cancelled: <FiPackage className="text-red-600" />,
      disputed: <FiPackage className="text-red-600" />
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
    const matchesSearch = order.listingId?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.sellerId?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'active' && ['paid', 'in_progress', 'delivered', 'in_revision'].includes(order.status)) ||
                      (activeTab === 'completed' && order.status === 'completed') ||
                      (activeTab === 'pending' && order.status === 'pending_payment');

    return matchesSearch && matchesTab;
  });

  const handleViewOrder = (orderId: string): void => {
    navigate(`/marketplace/orders/${orderId}`);
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your orders...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                <p className="mt-2 text-gray-600">
                  Track and manage all your purchases
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.active || 0}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    placeholder="Search orders by title or seller..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: orders.length },
                  { key: 'active', label: 'Active', count: stats.active || 0 },
                  { key: 'completed', label: 'Completed', count: stats.completed || 0 },
                  { key: 'pending', label: 'Pending', count: stats.pending || 0 }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      activeTab === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiPackage size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery || activeTab !== 'all' ? 'No orders found' : 'No orders yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || activeTab !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start shopping to see your orders here!'}
                </p>
                <button 
                  onClick={() => navigate('/marketplace/browse')}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <FiShoppingBag className="mr-2" size={18} />
                  Browse Marketplace
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order: Order) => (
                <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Listing Image */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                          {order.listingId?.mediaUrls?.[0] ? (
                            <img 
                              src={order.listingId.mediaUrls[0]} 
                              alt={order.listingId.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <FiPackage className="text-gray-400" size={24} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {order.listingId?.title || 'Unknown Listing'}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">
                              Seller: <span className="font-medium">@{order.sellerId?.username}</span>
                              {order.sellerId?.sellerRating && (
                                <span className="ml-2 text-yellow-600">
                                  ⭐ {order.sellerId.sellerRating}
                                </span>
                              )}
                            </p>
                            {order.offerId && (
                              <p className="text-sm text-gray-500 mt-1">
                                Custom offer: {formatPrice(order.amount)}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xl font-bold text-gray-900">
                              {formatPrice(order.amount)}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {getStatusText(order.status)}
                            </span>
                          </div>
                        </div>

                        {/* Order Meta */}
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <FiCalendar size={14} />
                            Ordered: {formatDate(order.createdAt)}
                          </div>
                          {order.expectedDelivery && (
                            <div className="flex items-center gap-1">
                              <FiClock size={14} />
                              Expected: {formatDate(order.expectedDelivery)}
                            </div>
                          )}
                          {order.orderType === 'accepted_offer' && (
                            <div className="flex items-center gap-1">
                              <FiUser size={14} />
                              Custom Offer
                            </div>
                          )}
                          {order.deliveredAt && (
                            <div className="flex items-center gap-1">
                              <FiTruck size={14} />
                              Delivered: {formatDate(order.deliveredAt)}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => handleViewOrder(order._id)}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                          >
                            View Details
                          </button>
                          
                          {order.status === 'delivered' && (
                            <button
                              onClick={() => handleViewOrder(order._id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                            >
                              Review Delivery
                            </button>
                          )}
                          
                          {order.status === 'pending_payment' && (
                            <button
                              onClick={() => navigate('/marketplace/checkout')}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                            >
                              Complete Payment
                            </button>
                          )}

                          {order.status === 'in_revision' && (
                            <button
                              onClick={() => handleViewOrder(order._id)}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
                            >
                              View Revision
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default MyOrders;