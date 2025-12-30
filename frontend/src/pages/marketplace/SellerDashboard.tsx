// src/pages/seller/SellerDashboard.tsx - DEBUG VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Import Layout component
import MarketplaceLayout from '../../components/Layout';

// Import helper function
import { getCurrentUserId } from '../../utilities/helperfFunction';

// Import API
import marketplaceApi from '../../api/marketplaceApi';

// Access API methods
const listingsApi = marketplaceApi.listings;
const ordersApi = marketplaceApi.orders;
const offersApi = marketplaceApi.offers;

// Use formatCurrency from marketplaceApi
const formatCurrency = marketplaceApi.formatCurrency;

// Debug: Let's check what we're importing
console.log('🔍 Starting SellerDashboard imports...');

// SIMPLE COMPONENTS - Create inline fallbacks
const SimpleDashboardHeader = ({ title, subtitle, earnings, onRefresh, refreshing }: any) => (
  <div className="mb-8">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-xl">
          <div className="text-sm">Total Earnings</div>
          <div className="text-xl font-bold">{earnings}</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  </div>
);

const SimpleTabNavigation = ({ tabs, activeTab, onTabChange }: any) => (
  <div className="mb-6">
    <div className="flex space-x-1 border-b border-gray-200">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === tab.id
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label} {tab.badge && `(${tab.badge})`}
        </button>
      ))}
    </div>
  </div>
);

const SimpleWelcomeCard = ({ title, subtitle, primaryAction }: any) => (
  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6 mb-6">
    <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-600 mb-4">{subtitle}</p>
    {primaryAction && (
      <button
        onClick={primaryAction.onClick}
        className="px-6 py-3 bg-yellow-500 text-white font-medium rounded-xl hover:bg-yellow-600"
      >
        {primaryAction.label}
      </button>
    )}
  </div>
);

// Interfaces
interface Order {
  _id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface Offer {
  _id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  status: string;
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  status: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  totalRevenue: number;
  pendingRevenue: number;
  thisMonthOrders: number;
  thisMonthRevenue: number;
}

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Basic states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  
  // Stats
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    thisMonthOrders: 0,
    thisMonthRevenue: 0,
  });

  // Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: listings.length },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orders.length },
    { id: 'offers', label: 'Offers', icon: '💌', badge: offers.length },
    { id: 'withdraw', label: 'Withdraw', icon: '💰', badge: null }
  ];

  // Fetch initial data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        navigate('/login');
        return;
      }

      // Mock data for testing
      const mockOrders: Order[] = [
        {
          _id: '1',
          listingId: '101',
          listingTitle: 'Website Design',
          buyerId: 'buyer1',
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
          sellerId: currentUserId,
          sellerName: 'You',
          amount: 5000,
          status: 'processing',
          paymentStatus: 'paid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      const mockListings: Listing[] = [
        {
          _id: '101',
          title: 'Professional Website Design',
          description: 'I will design a professional website for your business',
          price: 5000,
          category: 'web-design',
          tags: ['website', 'design', 'responsive'],
          status: 'active',
          sellerId: currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];

      const mockOffers: Offer[] = [];

      // Set data
      setOrders(mockOrders);
      setListings(mockListings);
      setOffers(mockOffers);
      
      // Calculate stats
      setOrderStats({
        totalOrders: mockOrders.length,
        activeOrders: mockOrders.filter(o => ['processing', 'in_progress'].includes(o.status)).length,
        totalRevenue: mockOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0),
        pendingRevenue: mockOrders.filter(o => ['processing', 'in_progress'].includes(o.status)).reduce((sum, o) => sum + o.amount, 0),
        thisMonthOrders: mockOrders.length,
        thisMonthRevenue: mockOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0),
      });

      // Mock Stripe status
      setStripeStatus({
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false
      });

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      fetchDashboardData();
      setRefreshing(false);
      setSuccessMessage('Dashboard refreshed!');
    }, 1000);
  };

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-green-600 mr-3">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-red-600 mr-3">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Header */}
          <SimpleDashboardHeader
            title="Seller Dashboard"
            subtitle="Manage your marketplace business"
            earnings="₹0"
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

          {/* Tabs */}
          <SimpleTabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Content */}
          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <SimpleWelcomeCard
                  title="Welcome back! 👋"
                  subtitle="Start by creating your first listing to receive orders."
                  primaryAction={{
                    label: '+ Create New Listing',
                    onClick: () => navigate('/marketplace/create')
                  }}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">₹{orderStats.totalRevenue}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600">Active Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{orderStats.activeOrders}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600">Listings</p>
                    <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6">
                    <p className="text-sm text-gray-600">Pending Offers</p>
                    <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
                  </div>
                </div>

                {/* Orders Section */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      View all →
                    </button>
                  </div>
                  
                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{order.listingTitle}</p>
                              <p className="text-sm text-gray-600">Buyer: {order.buyerName}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">₹{order.amount}</p>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-4 text-gray-300">📦</div>
                      <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
                      <p className="mt-2 text-gray-500 mb-6">
                        Create listings to start receiving orders
                      </p>
                      <button
                        onClick={() => navigate('/marketplace/create')}
                        className="px-6 py-3 bg-yellow-500 text-white font-medium rounded-xl hover:bg-yellow-600"
                      >
                        + Create Your First Listing
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'listings' && (
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">My Listings</h3>
                  <button
                    onClick={() => navigate('/marketplace/create')}
                    className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600"
                  >
                    + New Listing
                  </button>
                </div>
                
                {listings.length > 0 ? (
                  <div className="space-y-4">
                    {listings.map(listing => (
                      <div key={listing._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{listing.title}</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="font-bold text-gray-900">₹{listing.price}</p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              listing.status === 'active' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {listing.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4 text-gray-300">🏠</div>
                    <h3 className="text-lg font-medium text-gray-900">No Listings Yet</h3>
                    <p className="mt-2 text-gray-500 mb-6">
                      Create your first listing to start selling
                    </p>
                    <button
                      onClick={() => navigate('/marketplace/create')}
                      className="px-6 py-3 bg-yellow-500 text-white font-medium rounded-xl hover:bg-yellow-600"
                    >
                      + Create Your First Listing
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">My Orders</h3>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{order.listingTitle}</p>
                            <p className="text-sm text-gray-600">Buyer: {order.buyerName}</p>
                            <p className="text-sm text-gray-600">Status: {order.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">₹{order.amount}</p>
                            <button
                              onClick={() => console.log('View order:', order._id)}
                              className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4 text-gray-300">📦</div>
                    <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
                    <p className="mt-2 text-gray-500">
                      You haven't received any orders yet. Create listings to get started.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'offers' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Offers</h3>
                {offers.length > 0 ? (
                  <div className="space-y-4">
                    {offers.map(offer => (
                      <div key={offer._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{offer.listingTitle}</p>
                            <p className="text-sm text-gray-600">From: {offer.buyerName}</p>
                            <p className="text-sm text-gray-600">Offer: ₹{offer.amount}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                              Accept
                            </button>
                            <button className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4 text-gray-300">💌</div>
                    <h3 className="text-lg font-medium text-gray-900">No Offers Yet</h3>
                    <p className="mt-2 text-gray-500">
                      You haven't received any offers yet. Promote your listings to get offers.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Withdraw Earnings</h3>
                <div className="text-center py-8">
                  <div className="text-5xl mb-4 text-gray-300">💰</div>
                  <h3 className="text-lg font-medium text-gray-900">No Earnings Available</h3>
                  <p className="mt-2 text-gray-500 mb-6">
                    Complete orders to start earning. Connect Stripe to withdraw funds.
                  </p>
                  <button
                    onClick={() => console.log('Connect Stripe')}
                    className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600"
                  >
                    Connect Stripe Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;