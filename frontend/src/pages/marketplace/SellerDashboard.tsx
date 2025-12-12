import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getSellerOrders, getReceivedOffers, checkStripeStatus, createStripeAccount } from '../../api';
import { 
  getMyListings, 
  toggleListingStatus, 
  deleteListing,
  formatPriceINR,
  getStatusColorClass,
  type Listing as MarketplaceListing,
  type MyListingsResponse 
} from '../../api/marketplace';
import axios from 'axios';
import { getCurrentUserId } from '../../utilities/helperFunction';
import StripeSetupModal from '../../components/marketplace/seller/StripeSetupModal';
import OrderCreation from '../../components/marketplace/seller/OrderCreation';
import PaymentStatusBadge from '../../components/marketplace/seller/PaymentStatusBadge';
import StripeAccountStatus from '../../components/marketplace/seller/StripeAccountStatus';
import StatCard from '../../components/marketplace/seller/StatCard';
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
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
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

  const formatCurrency = (amount: number): string => {
    return formatPriceINR(amount || 0);
  };

  const getStatusColor = (status: string): string => {
    return getStatusColorClass(status);
  };

  // Stats calculation
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
  
  // Listings stats
  const totalListings = marketplaceListings?.length || 0;
  const activeListings = marketplaceListings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = marketplaceListings?.filter((listing) => listing.status === 'sold').length || 0;

  useEffect(() => {
    console.log('🎯 SellerDashboard mounted');
    fetchDashboardData();
    checkStripeAccountStatus();
    handleStripeReturn();
  }, []);

  const fetchMarketplaceListings = async () => {
    try {
      console.log('📝 Fetching marketplace listings via new API...');
      const response = await getMyListings({ page: 1, limit: 1000 });
      
      if (response.success && response.data) {
        const listingsData = response.data;
        console.log('✅ Marketplace listings fetched successfully:', listingsData.listings.length);
        setMarketplaceListings(listingsData.listings);
        
        // Old format for compatibility
        const oldFormatListings: Listing[] = listingsData.listings.map(listing => ({
          _id: listing._id,
          status: listing.status,
          price: listing.price
        }));
        
        setListingsData({
          listings: oldFormatListings,
          user: {
            _id: getCurrentUserId() || '',
            username: 'Current User'
          }
        });
      } else {
        console.error('❌ Failed to fetch marketplace listings:', response.error);
        await fetchOldListings();
      }
    } catch (error) {
      console.error('❌ Error fetching marketplace listings:', error);
      await fetchOldListings();
    }
  };

  const fetchOldListings = async () => {
    try {
      const currentUserId = getCurrentUserId();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/user/${currentUserId}/listings`,
        {
          params: { page: 1, limit: 1000 },
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );
      
      if (response.data.success) {
        const oldListings = response.data.listings || [];
        const convertedListings: MarketplaceListing[] = oldListings.map((oldListing: any) => ({
          _id: oldListing._id,
          sellerId: oldListing.sellerId || currentUserId,
          title: oldListing.title || '',
          description: oldListing.description || '',
          price: oldListing.price || 0,
          type: oldListing.type || 'product',
          category: oldListing.category || '',
          tags: Array.isArray(oldListing.tags) ? oldListing.tags : [],
          mediaUrls: Array.isArray(oldListing.mediaUrls) ? oldListing.mediaUrls : [],
          status: oldListing.status || 'active',
          createdAt: oldListing.createdAt || new Date(),
          updatedAt: oldListing.updatedAt || new Date()
        }));
        
        setMarketplaceListings(convertedListings);
      }
    } catch (error) {
      console.error('❌ Fallback listings fetch failed:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();
      console.log('👤 Current User ID:', currentUserId);

      if (!currentUserId) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const [ordersResponse, offersResponse] = await Promise.allSettled([
        (async () => {
          try {
            console.log('📦 Fetching seller orders from /marketplace/my-sales');
            const response = await axios.get(
              `${API_BASE_URL}/marketplace/my-sales`,
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
              }
            );
            
            console.log('✅ Orders API Response:', {
              success: response.data.success,
              salesCount: response.data.sales?.length,
              data: response.data
            });
            
            if (response.data.success && response.data.sales) {
              return response.data.sales;
            }
            
            return response.data.data || response.data.orders || [];
          } catch (err: any) {
            console.error('❌ Error fetching orders:', err.response?.data || err.message);
            
            try {
              console.log('🔄 Trying fallback API function getSellerOrders()');
              const fallback = await getSellerOrders();
              console.log('Fallback response:', fallback);
              return Array.isArray(fallback) ? fallback : (fallback?.data || fallback?.sales || []);
            } catch (fallbackErr) {
              console.error('Fallback also failed:', fallbackErr);
              return [];
            }
          }
        })(),
        
        (async () => {
          try {
            const offers = await getReceivedOffers();
            return Array.isArray(offers) ? offers : (offers?.data || []);
          } catch (err) {
            console.error('Error fetching offers:', err);
            return [];
          }
        })(),
      ]);

      await fetchMarketplaceListings();

      let ordersData = [];
      if (ordersResponse.status === 'fulfilled') {
        const result = ordersResponse.value;
        ordersData = Array.isArray(result) ? result : [];
        console.log('📊 Processed Orders Data:', {
          count: ordersData.length,
          firstFew: ordersData.slice(0, 3)
        });
      } else {
        console.error('Orders promise rejected:', ordersResponse.reason);
      }

      let offersData = [];
      if (offersResponse.status === 'fulfilled') {
        const result = offersResponse.value;
        offersData = Array.isArray(result) ? result : [];
      }

      setOrders(ordersData);
      setOffers(offersData);
      
      console.log('✅ Dashboard data loaded:', {
        orders: ordersData.length,
        offers: offersData.length,
        marketplaceListings: marketplaceListings.length
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      console.log('🔄 Checking Stripe account status...');
      setDebugInfo('Checking Stripe status...');
      
      const response = await checkStripeStatus();
      console.log('✅ Stripe status response:', response);
      setStripeStatus(response);
      
      setDebugInfo(`Stripe Status: ${response.connected ? 'Connected' : 'Not Connected'}, Charges Enabled: ${response.chargesEnabled}`);
      
      if (response.connected && response.chargesEnabled) {
        setShowStripeSetup(false);
        console.log('🎉 Stripe is connected and active - hiding setup modal');
      } else {
        console.log('ℹ️ Stripe not fully setup:', response);
      }
    } catch (err) {
      console.error('❌ Error checking Stripe status:', err);
      setStripeStatus({ 
        connected: false, 
        status: 'error',
        chargesEnabled: false 
      });
      setDebugInfo('Error checking Stripe status');
    }
  };

  const handleStripeReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe');
    const accountId = urlParams.get('account_id');
    
    console.log('🔍 Checking URL params for Stripe return:', {
      stripeStatus,
      accountId,
      fullUrl: window.location.href
    });
    
    if (stripeStatus === 'success') {
      console.log('🎉 Returned from Stripe onboarding - refreshing status');
      setSuccessMessage('Stripe account setup completed successfully!');
      
      setTimeout(() => {
        checkStripeAccountStatus();
        fetchDashboardData();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        console.log('🧹 Cleaned URL after Stripe return');
      }, 3000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setDebugInfo('Refreshing dashboard...');
    await Promise.all([
      fetchDashboardData(),
      checkStripeAccountStatus()
    ]);
    setRefreshing(false);
    setDebugInfo('Dashboard refreshed');
  };

  const handleDebugStripe = async () => {
    try {
      setDebugInfo('Running debug check...');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/debug-stripe-status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('🔧 Debug Stripe Status:', response.data);
      setDebugInfo(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('Debug error:', error);
      setDebugInfo('Debug failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  const handleOrderUpdateFromModal = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(order => 
      order._id === orderId ? { ...order, status: newStatus } : order
    ));
    
    handleOrderUpdate(orderId, newStatus);
  };

  const handleToggleListingStatus = async (listingId: string) => {
    try {
      const response = await toggleListingStatus(listingId);
      if (response.success && response.data) {
        const message = response.data.newStatus === 'active' ? 'Listing activated!' : 'Listing deactivated!';
        setSuccessMessage(message);
        
        setMarketplaceListings(prev => prev.map(listing => 
          listing._id === listingId 
            ? { ...listing, status: response.data!.newStatus } 
            : listing
        ));
        
        await fetchMarketplaceListings();
      } else {
        setError(response.error || 'Failed to update listing status');
      }
    } catch (error: any) {
      console.error('Error toggling listing status:', error);
      setError(error.message || 'Failed to update listing status');
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const response = await deleteListing(listingId);
      if (response.success) {
        setSuccessMessage('Listing deleted successfully!');
        
        setMarketplaceListings(prev => prev.filter(listing => listing._id !== listingId));
        
        await fetchMarketplaceListings();
      } else {
        setError(response.error || 'Failed to delete listing');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      setError(error.message || 'Failed to delete listing');
    }
  };

  const handleEditListing = (listingId: string) => {
    window.location.href = `/edit-listing/${listingId}`;
  };

  const handleOfferAction = async (offerId: string, action: string) => {
    try {
      setError('');
      setSuccessMessage('');
      
      const offer = offers.find(o => o._id === offerId);
      if (!offer) {
        setError('Offer not found');
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      if (action === 'accept') {
        try {
          const response = await axios.put(
            `${API_BASE_URL}/marketplace/offers/accept-offer/${offerId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );

          if (response.data.success) {
            setSuccessMessage('Offer accepted successfully! Buyer will now complete payment.');
            console.log('✅ Offer accepted:', response.data);
            
            setOffers(prev => prev.map(o => 
              o._id === offerId ? { ...o, status: 'accepted' } : o
            ));
            
            if (response.data.order) {
              setOrders(prev => [response.data.order, ...prev]);
            }
            
            setTimeout(() => {
              fetchDashboardData();
            }, 1000);
          }
        } catch (err: any) {
          console.error('Error accepting offer:', err);
          const errorMessage = err.response?.data?.error || 
                             err.response?.data?.details || 
                             err.message || 
                             'Failed to accept offer';
          setError(errorMessage);
        }
      } else {
        try {
          const response = await axios.put(
            `${API_BASE_URL}/marketplace/offers/reject-offer/${offerId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );

          if (response.data.success) {
            setSuccessMessage('Offer rejected successfully');
            setOffers(prev => prev.map(o => 
              o._id === offerId ? { ...o, status: 'rejected' } : o
            ));
          }
        } catch (err: any) {
          console.error('Error rejecting offer:', err);
          const errorMessage = err.response?.data?.error || 
                             err.response?.data?.details || 
                             err.message || 
                             'Failed to reject offer';
          setError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Error updating offer:', error);
      setError(error.message || 'Failed to update offer');
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

  const handleStripeSetupSuccess = () => {
    console.log('✅ Stripe setup success handler called');
    setShowStripeSetup(false);
    setSuccessMessage('Stripe account setup completed!');
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 2000);
  };

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDebugStripe}
                  className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Debug Stripe</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg 
                    className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-4 bg-gray-100 border border-gray-300 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Debug Info:</span>
                <button 
                  onClick={() => setDebugInfo('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
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

          {/* Stripe Status */}
          <StripeAccountStatus 
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
          />

          {/* Navigation Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
                { id: 'orders', label: 'Orders Received', icon: '📦', badge: totalOrders }
              ].map(({ id, label, icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap transition-all duration-200 ${
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

          {/* Modals */}
          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
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

          {/* Order Details Modal */}
          {selectedOrderId && (
            <OrderDetailsModal
              orderId={selectedOrderId}
              isOpen={showOrderModal}
              onClose={() => {
                setShowOrderModal(false);
                setSelectedOrderId(null);
              }}
              onOrderUpdate={handleOrderUpdateFromModal}
            />
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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

              {/* Recent Orders & Quick Actions */}
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
                          <p className="text-sm text-gray-400 mt-1">Start selling to see your orders here</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div 
                              key={order._id} 
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-blue-50 transition-colors cursor-pointer"
                              onClick={() => handleViewOrderDetails(order._id)}
                            >
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
                                    {order.status ? order.status.replace('_', ' ') : 'unknown'}
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
                      {!(stripeStatus?.connected && stripeStatus?.chargesEnabled) && (
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
                        <span>Setup Stripe payments to receive payouts</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
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

                        {/* Show info for accepted offers */}
                        {offer.status === 'accepted' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-green-800 text-sm">
                                  Offer accepted! Waiting for buyer to complete payment.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show info for rejected offers */}
                        {offer.status === 'rejected' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <p className="text-red-800 text-sm">
                                  Offer declined.
                                </p>
                              </div>
                            </div>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage your product listings</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => window.location.href = '/create-listing'}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Listing
                  </button>
                </div>
              </div>
              <div className="p-6">
                {marketplaceListings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏠</div>
                    <h3 className="text-lg font-medium text-gray-900">No listings yet</h3>
                    <p className="mt-2 text-gray-500">Create your first listing to start selling</p>
                    <button
                      onClick={() => window.location.href = '/create-listing'}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                    >
                      Create Your First Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {marketplaceListings.map(listing => (
                      <div key={listing._id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* Listing Image */}
                        {listing.mediaUrls && listing.mediaUrls[0] && (
                          <div className="h-48 overflow-hidden">
                            <img 
                              src={listing.mediaUrls[0]} 
                              alt={listing.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        
                        {/* Listing Details */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 
                              className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer truncate"
                              onClick={() => handleViewListingDetails(listing._id)}
                              title={listing.title}
                            >
                              {listing.title}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(listing.status)}`}>
                              {listing.status}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-bold text-gray-900">{formatCurrency(listing.price)}</p>
                              <p className="text-xs text-gray-500">{listing.category}</p>
                            </div>
                            {listing.views && (
                              <div className="text-xs text-gray-500">
                                👁️ {listing.views} views
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewListingDetails(listing._id)}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1.5 rounded text-sm transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEditListing(listing._id)}
                              className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1.5 rounded text-sm transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleListingStatus(listing._id)}
                              className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-medium py-1.5 rounded text-sm transition-colors"
                              title={listing.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {listing.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteListing(listing._id)}
                              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1.5 rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderReceivedPage 
              orders={orders}
              onOrderUpdate={handleOrderUpdate}
              onViewOrderDetails={handleViewOrderDetails}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;