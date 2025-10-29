import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getSellerOrders, getReceivedOffers, checkStripeStatus } from '../../api';
import axios from 'axios';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import OrderCreation from '../../components/marketplae/seller/OrderCreation';
import PaymentStatusBadge from '../../components/marketplae/seller/PaymentStatusBadge';
import StripeAccountStatus from '../../components/marketplae/seller/StripeAccountStatus';
import StatCard from '../../components/marketplae/seller/StatCard';
import UserListings from '../../components/marketplae/seller/UserListings';
import OrderReceivedPage from '../../components/marketplae/seller/OrderReceivedPage';

const API_BASE_URL = 'http://localhost:3000';

interface StripeStatus {
  connected: boolean;
  status: string;
}

interface Order {
  _id: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
  };
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface Offer {
  _id: string;
  status: string;
  amount: number;
  message?: string;
  createdAt: string;
  listingId: {
    _id: string;
    title: string;
    price?: number;
  };
  buyerId: {
    _id: string;
    username: string;
  };
}

interface Listing {
  _id: string;
  status: string;
  price: number;
}

interface ListingsData {
  listings: Listing[];
  user: {
    _id: string;
    username: string;
  };
}

const SellerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listingsData, setListingsData] = useState<ListingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showOrderCreation, setShowOrderCreation] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'accepted':
      case 'active':
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
      case 'sold':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'rejected':
      case 'inactive':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending_payment').length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  
  // Listings stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing) => listing.status === 'sold').length || 0;

  useEffect(() => {
    fetchDashboardData();
    checkStripeAccountStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();

      const [ordersResponse, offersResponse] = await Promise.all([
        getSellerOrders().catch(err => {
          console.error('Error fetching orders:', err);
          return [];
        }),
        getReceivedOffers().catch(err => {
          console.error('Error fetching offers:', err);
          return [];
        })
      ]);

      let listingsResponse = null;
      if (currentUserId) {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          listingsResponse = await axios.get(
            `${API_BASE_URL}/marketplace/listings/user/${currentUserId}/listings`,
            {
              params: { page: 1, limit: 1000 },
              headers,
              timeout: 10000
            }
          );
        } catch (err) {
          console.log('Listings fetch failed, continuing without listings data');
        }
      }

      const ordersData = Array.isArray(ordersResponse) 
        ? ordersResponse 
        : (ordersResponse?.data || []);
      
      const offersData = Array.isArray(offersResponse) 
        ? offersResponse 
        : (offersResponse?.data || []);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      
      if (listingsResponse?.data?.success) {
        setListingsData(listingsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      const response = await checkStripeStatus();
      setStripeStatus(response);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setStripeStatus({ connected: false, status: 'unknown' });
    }
  };

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleOfferAction = async (offerId: string, action: string) => {
    try {
      setError('');
      
      if (action === 'accept') {
        await checkStripeAccountStatus();
        
        if (!stripeStatus?.connected || stripeStatus?.status !== 'active') {
          setShowStripeSetup(true);
          return;
        }

        const offer = offers.find(o => o._id === offerId);
        if (offer) {
          setSelectedOffer(offer);
          setShowOrderCreation(true);
        }
      } else {
        console.log(`Rejecting offer:`, offerId);
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      setError('Failed to update offer');
    }
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    fetchDashboardData();
  };

  const handleOrderUpdate = async (orderId: string, newStatus: string) => {
    try {
      console.log(`Updating order ${orderId} to ${newStatus}`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating order:', error);
      setError('Failed to update order');
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          <StripeAccountStatus 
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
          />

          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
                { id: 'orders', label: 'Orders Received', icon: '📦', badge: totalOrders }
              ].map(({ id, label, icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={() => {
                setShowStripeSetup(false);
                checkStripeAccountStatus();
              }}
            />
          )}

          {showOrderCreation && selectedOffer && (
            <OrderCreation
              offer={selectedOffer}
              onOrderCreated={handleOrderCreated}
              onClose={() => {
                setShowOrderCreation(false);
                setSelectedOffer(null);
              }}
            />
          )}

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  title="Total Listings"
                  value={totalListings}
                  icon="🏠"
                  color="blue"
                  onClick={() => setActiveTab('listings')}
                />
                <StatCard
                  title="Active Listings"
                  value={activeListings}
                  icon="✅"
                  color="green"
                />
                <StatCard
                  title="Sold Listings"
                  value={soldListings}
                  icon="🛒"
                  color="orange"
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  icon="📦"
                  color="purple"
                  onClick={() => setActiveTab('orders')}
                />
                <StatCard
                  title="Pending Offers"
                  value={pendingOffers}
                  icon="💼"
                  color="yellow"
                  onClick={() => setActiveTab('offers')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                      >
                        View All
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">📦</div>
                          <p className="text-gray-500 font-medium">No orders yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border border-blue-200">
                                  <span className="text-sm font-medium text-blue-600">
                                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {order.listingId?.title || 'Unknown Listing'}
                                  </p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username || 'Unknown Buyer'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{formatCurrency(order.amount || 0)}</p>
                                <div className="flex flex-col items-end gap-1 mt-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                    {order.status || 'unknown'}
                                  </span>
                                  <PaymentStatusBadge order={order} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Listing
                      </button>
                      {!(stripeStatus?.connected && stripeStatus?.status === 'active') && (
                        <button
                          onClick={() => setShowStripeSetup(true)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Setup Payments
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        View All Orders
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Upload high-quality photos of your items</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Write clear and detailed descriptions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Respond quickly to buyer inquiries</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Setup Stripe payments to accept orders</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'offers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="p-6">
                {offers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💼</div>
                    <h3 className="text-lg font-medium text-gray-900">No offers yet</h3>
                    <p className="mt-2 text-gray-500">When buyers make offers on your listings, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {offers.map(offer => (
                      <div key={offer._id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 
                                className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                onClick={() => handleViewListingDetails(offer.listingId._id)}
                              >
                                {offer.listingId?.title || 'Unknown Listing'}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                                {offer.status ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1) : 'Unknown'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Buyer</p>
                                <p className="font-medium text-gray-900">{offer.buyerId?.username || 'Unknown Buyer'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Original Price</p>
                                <p className="font-medium text-gray-900">{formatCurrency(offer.listingId?.price || 0)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Offer Amount</p>
                                <p className="font-medium text-green-600">{formatCurrency(offer.amount || 0)}</p>
                              </div>
                            </div>

                            {offer.message && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Buyer's Message</p>
                                <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                                  {offer.message}
                                </p>
                              </div>
                            )}

                            <div className="text-sm text-gray-500">
                              Received {new Date(offer.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {offer.status === 'pending' && (
                          <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleOfferAction(offer._id, 'accept')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleOfferAction(offer._id, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Decline Offer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <UserListings />
          )}

          {activeTab === 'orders' && (
            <OrderReceivedPage 
              orders={orders}
              onOrderUpdate={handleOrderUpdate}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;