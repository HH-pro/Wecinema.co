import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  getSellerOrders, 
  getReceivedOffers, 
  checkStripeStatus, 
  createStripeAccount,
  getMyListings,
  updateOrderStatus,
  acceptOffer,
  rejectOffer,
  toggleListingStatus,
  deleteListing,
  type Listing,
  type Order,
  type Offer
} from '../../api/marketplace';
import axios from 'axios';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import StripeSetupModal from '../../components/marketplace/seller/StripeSetupModal';
import OrderCreation from '../../components/marketplace/seller/OrderCreation';
import PaymentStatusBadge from '../../components/marketplace/seller/PaymentStatusBadge';
import StripeAccountStatus from '../../components/marketplace/seller/StripeAccountStatus';
import StatCard from '../../components/marketplace/seller/StatCard';
import UserListings from '../../components/marketplace/seller/UserListings';
import OrderReceivedPage from '../../components/marketplace/seller/OrderReceivedPage';
import OrderDetailsModal from '../../components/marketplace/seller/OrderDetailsModal';

const API_BASE_URL = 'http://localhost:3000';

interface StripeStatus {
  connected: boolean;
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string;
}

interface ListingsData {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
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
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  // Get status color
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
      case 'pending_acceptance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
      case 'sold':
      case 'in_progress':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'rejected':
      case 'inactive':
      case 'failed':
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch data using new API functions
      const [ordersResponse, offersResponse, listingsResponse] = await Promise.allSettled([
        getSellerOrders(),
        getReceivedOffers(),
        getMyListings({ page: 1, limit: 1000 })
      ]);

      // Process orders
      if (ordersResponse.status === 'fulfilled' && ordersResponse.value.success) {
        setOrders(ordersResponse.value.data || []);
      }

      // Process offers
      if (offersResponse.status === 'fulfilled' && offersResponse.value.success) {
        setOffers(offersResponse.value.data || []);
      }

      // Process listings
      if (listingsResponse.status === 'fulfilled' && listingsResponse.value.success) {
        setListingsData(listingsResponse.value.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Check Stripe status
  const checkStripeAccountStatus = async () => {
    try {
      const response = await checkStripeStatus();
      if (response.success) {
        setStripeStatus(response.data);
      }
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setStripeStatus({ 
        connected: false, 
        status: 'error',
        chargesEnabled: false 
      });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      checkStripeAccountStatus()
    ]);
    setRefreshing(false);
  };

  // Handle offer action
  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setError('');
      setSuccessMessage('');

      const response = action === 'accept' 
        ? await acceptOffer(offerId)
        : await rejectOffer(offerId);

      if (response.success) {
        const message = action === 'accept' 
          ? 'Offer accepted successfully!' 
          : 'Offer rejected successfully!';
        setSuccessMessage(message);
        
        // Update local state
        setOffers(prev => prev.map(offer => 
          offer._id === offerId 
            ? { ...offer, status: action === 'accept' ? 'accepted' : 'rejected' } 
            : offer
        ));
      } else {
        setError(response.error || `Failed to ${action} offer`);
      }
    } catch (error: any) {
      console.error('Error updating offer:', error);
      setError(error.message || 'Failed to update offer');
    }
  };

  // Handle order update
  const handleOrderUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await updateOrderStatus(orderId, newStatus);
      if (response.success) {
        setSuccessMessage('Order status updated successfully!');
        
        // Update local state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
      } else {
        setError(response.error || 'Failed to update order status');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      setError(error.message || 'Failed to update order');
    }
  };

  // Handle listing status toggle
  const handleToggleListingStatus = async (listingId: string) => {
    try {
      const response = await toggleListingStatus(listingId);
      if (response.success && response.data) {
        setSuccessMessage('Listing status updated successfully!');
        
        // Update local state
        if (listingsData) {
          setListingsData(prev => ({
            ...prev!,
            listings: prev!.listings.map(listing => 
              listing._id === listingId 
                ? { ...listing, status: response.data!.listing.status } 
                : listing
            )
          }));
        }
      } else {
        setError(response.error || 'Failed to update listing status');
      }
    } catch (error: any) {
      console.error('Error toggling listing status:', error);
      setError(error.message || 'Failed to update listing status');
    }
  };

  // Handle listing delete
  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const response = await deleteListing(listingId);
      if (response.success) {
        setSuccessMessage('Listing deleted successfully!');
        
        // Update local state
        if (listingsData) {
          setListingsData(prev => ({
            ...prev!,
            listings: prev!.listings.filter(listing => listing._id !== listingId)
          }));
        }
      } else {
        setError(response.error || 'Failed to delete listing');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      setError(error.message || 'Failed to delete listing');
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      timers.push(timer);
    }
    
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 8000);
      timers.push(timer);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [successMessage, error]);

  // Calculate stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => 
    order.status === 'pending_payment' || 
    order.paymentStatus === 'pending' ||
    order.status === 'pending_acceptance'
  ).length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed' || order.paymentStatus === 'paid')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter(listing => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter(listing => listing.status === 'sold').length || 0;

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Getting your seller information...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Seller Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your listings, offers, and track your sales performance
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <svg 
                    className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh Dashboard'}</span>
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(totalRevenue)}
                icon="💰"
                color="green"
                trend="up"
              />
              <StatCard
                title="Active Listings"
                value={activeListings}
                icon="🏠"
                color="blue"
                onClick={() => setActiveTab('listings')}
              />
              <StatCard
                title="Pending Orders"
                value={pendingOrders}
                icon="📦"
                color="yellow"
                onClick={() => setActiveTab('orders')}
              />
              <StatCard
                title="New Offers"
                value={pendingOffers}
                icon="💼"
                color="purple"
                onClick={() => setActiveTab('offers')}
              />
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stripe Status */}
          <div className="mb-8">
            <StripeAccountStatus 
              stripeStatus={stripeStatus}
              onSetupClick={() => setShowStripeSetup(true)}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  {[
                    { id: 'overview', label: 'Overview', icon: '📊' },
                    { id: 'listings', label: 'My Listings', icon: '🏠' },
                    { id: 'offers', label: 'Offers', icon: '💼' },
                    { id: 'orders', label: 'Orders', icon: '📦' }
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200 ${
                        activeTab === id
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-lg mb-1">{icon}</span>
                        <span>{label}</span>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Recent Orders */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
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
                        <div className="space-y-4">
                          {orders.slice(0, 3).map(order => (
                            <div 
                              key={order._id} 
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
                              onClick={() => {
                                setSelectedOrderId(order._id);
                                setShowOrderModal(true);
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">📦</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 group-hover:text-blue-600">
                                    {order.listingId?.title || 'Unknown Listing'}
                                  </p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{formatCurrency(order.amount)}</p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))}
                          {orders.length === 0 && (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-4">📦</div>
                              <p className="text-gray-500">No orders yet</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recent Offers */}
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Recent Offers</h3>
                          <button 
                            onClick={() => setActiveTab('offers')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                          >
                            View All
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-4">
                          {offers.slice(0, 3).map(offer => (
                            <div key={offer._id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-900">{offer.listingId?.title}</p>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                                  {offer.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-600">From: {offer.buyerId?.username}</p>
                                  <p className="text-sm text-gray-600">Offer: {formatCurrency(offer.amount)}</p>
                                </div>
                                {offer.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleOfferAction(offer._id, 'accept')}
                                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleOfferAction(offer._id, 'reject')}
                                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {offers.length === 0 && (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-4">💼</div>
                              <p className="text-gray-500">No offers yet</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => window.location.href = '/create-listing'}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                              <span className="text-blue-600">🏠</span>
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900">Create Listing</p>
                              <p className="text-sm text-gray-500">Add new product</p>
                            </div>
                          </div>
                        </button>
                        
                        {!(stripeStatus?.connected && stripeStatus?.chargesEnabled) && (
                          <button
                            onClick={() => setShowStripeSetup(true)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                                <span className="text-green-600">💰</span>
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-gray-900">Setup Payments</p>
                                <p className="text-sm text-gray-500">Connect Stripe</p>
                              </div>
                            </div>
                          </button>
                        )}
                        
                        <button
                          onClick={() => window.location.href = '/marketplace'}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                              <span className="text-purple-600">🛍️</span>
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900">Browse Marketplace</p>
                              <p className="text-sm text-gray-500">View all listings</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'listings' && listingsData && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">My Listings ({listingsData.listings.length})</h3>
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                      >
                        + Add New Listing
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listingsData.listings.map(listing => (
                        <div key={listing._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                          {listing.mediaUrls && listing.mediaUrls[0] && (
                            <div className="h-48 overflow-hidden">
                              <img 
                                src={listing.mediaUrls[0]} 
                                alt={listing.title}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 truncate">{listing.title}</h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                                {listing.status}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{listing.description}</p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-gray-900">{formatCurrency(listing.price)}</p>
                                <p className="text-xs text-gray-500">{listing.category}</p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => window.location.href = `/edit-listing/${listing._id}`}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleToggleListingStatus(listing._id)}
                                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title={listing.status === 'active' ? 'Deactivate' : 'Activate'}
                                >
                                  {listing.status === 'active' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteListing(listing._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {listingsData.listings.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🏠</div>
                        <h3 className="text-lg font-medium text-gray-900">No listings yet</h3>
                        <p className="mt-2 text-gray-500 mb-6">Create your first listing to start selling</p>
                        <button
                          onClick={() => window.location.href = '/create-listing'}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                        >
                          Create Your First Listing
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'offers' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Received Offers ({offers.length})</h3>
                    </div>
                    
                    {offers.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">💼</div>
                        <h3 className="text-lg font-medium text-gray-900">No offers yet</h3>
                        <p className="mt-2 text-gray-500">When buyers make offers on your listings, they'll appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {offers.map(offer => (
                          <div key={offer._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-1">{offer.listingId?.title}</h4>
                                <p className="text-sm text-gray-600 mb-3">From: {offer.buyerId?.username}</p>
                                <div className="flex items-center space-x-6">
                                  <div>
                                    <p className="text-sm text-gray-600">Original Price</p>
                                    <p className="font-medium text-gray-900">{formatCurrency(offer.listingId?.price || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Offer Amount</p>
                                    <p className="font-semibold text-green-600">{formatCurrency(offer.amount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                                      {offer.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {offer.message && (
                              <div className="mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm text-gray-600 mb-1">Buyer's Message:</p>
                                <p className="text-gray-900">{offer.message}</p>
                              </div>
                            )}
                            
                            {offer.status === 'pending' && (
                              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => handleOfferAction(offer._id, 'accept')}
                                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                                >
                                  Accept Offer
                                </button>
                                <button
                                  onClick={() => handleOfferAction(offer._id, 'reject')}
                                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
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
                )}

                {activeTab === 'orders' && (
                  <OrderReceivedPage 
                    orders={orders}
                    onOrderUpdate={handleOrderUpdate}
                    onViewOrderDetails={(orderId) => {
                      setSelectedOrderId(orderId);
                      setShowOrderModal(true);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showStripeSetup && (
          <StripeSetupModal
            show={showStripeSetup}
            onClose={() => setShowStripeSetup(false)}
            onSuccess={() => {
              setShowStripeSetup(false);
              setSuccessMessage('Stripe account setup completed!');
              checkStripeAccountStatus();
            }}
          />
        )}

        {showOrderModal && selectedOrderId && (
          <OrderDetailsModal
            orderId={selectedOrderId}
            isOpen={showOrderModal}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedOrderId(null);
            }}
            onOrderUpdate={handleOrderUpdate}
          />
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;