// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  getSellerOrders, 
  getReceivedOffers, 
  checkStripeStatus,
  marketplaceAPI 
} from '../../api';
import axios from 'axios';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import StripeAccountStatus from '../../components/marketplae/seller/StripeAccountStatus';
import StatCard from '../../components/marketplae/seller/StatCard';
import OrderDetailsModal from '../../components/marketplae/seller/OrderDetailsModal';
import EditListingModal from '../../components/marketplae/seller/EditListingModal';
import DeleteListingModal from '../../components/marketplae/seller/DeleteListingModal';
import VideoPlayerModal from '../../components/marketplae/seller/VideoPlayerModal';
import OffersTab from '../../components/marketplae/seller/OffersTab';
import ListingsTab from '../../components/marketplae/seller/ListingsTab';
import OrdersTab from '../../components/marketplae/seller/OrdersTab';

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
    email?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
    mediaUrls?: string[];
    description?: string;
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
    mediaUrls?: string[];
  };
  buyerId: {
    _id: string;
    username: string;
  };
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  tags: string[];
  mediaUrls: string[];
  status: string;
  views?: number;
  sellerId: {
    _id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ListingsData {
  listings: Listing[];
  user: {
    _id: string;
    username: string;
  };
  pagination?: {
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
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingListing, setDeletingListing] = useState<Listing | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  
  // Video player modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>('');
  
  // Listing management states
  const [listingActionLoading, setListingActionLoading] = useState<string | null>(null);
  const [listingsPage, setListingsPage] = useState(1);
  const [listingsLimit] = useState(10);
  const [listingsStatusFilter, setListingsStatusFilter] = useState<string>('');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing) => listing.status === 'sold').length || 0;

  useEffect(() => {
    console.log('🎯 SellerDashboard mounted');
    fetchDashboardData();
    checkStripeAccountStatus();
    handleStripeReturn();
  }, []);

  // Fetch listings when tab changes or page/filter changes
  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings();
    }
  }, [activeTab, listingsPage, listingsStatusFilter]);

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
            
            if (response.data.success && response.data.sales) {
              return response.data.sales;
            }
            
            return response.data.data || response.data.orders || [];
          } catch (err: any) {
            console.error('❌ Error fetching orders:', err.response?.data || err.message);
            
            try {
              console.log('🔄 Trying fallback API function getSellerOrders()');
              const fallback = await getSellerOrders();
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

      // Process orders response
      let ordersData = [];
      if (ordersResponse.status === 'fulfilled') {
        const result = ordersResponse.value;
        ordersData = Array.isArray(result) ? result : [];
        console.log('📊 Processed Orders Data:', {
          count: ordersData.length,
        });
      } else {
        console.error('Orders promise rejected:', ordersResponse.reason);
      }

      // Process offers response
      let offersData = [];
      if (offersResponse.status === 'fulfilled') {
        const result = offersResponse.value;
        offersData = Array.isArray(result) ? result : [];
      }

      setOrders(ordersData);
      setOffers(offersData);
      
      console.log('✅ Dashboard data loaded:', {
        orders: ordersData.length,
        offers: offersData.length
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setError('User not authenticated. Please log in again.');
        return;
      }

      console.log('📝 Fetching listings for user:', currentUserId);
      
      const params: any = {
        page: listingsPage,
        limit: listingsLimit,
        _t: new Date().getTime()
      };
      
      if (listingsStatusFilter) {
        params.status = listingsStatusFilter;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/my-listings`,
        {
          params,
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (response.data.success) {
        setListingsData(response.data);
      } else {
        setError(response.data.error || 'Failed to fetch listings');
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError('Failed to load listings. Please try again.');
    }
  };

  const forceRefreshListings = async () => {
    console.log('🔄 Force refreshing listings...');
    
    setListingsPage(1);
    
    const timestamp = new Date().getTime();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/my-listings?_force=${timestamp}`,
        {
          params: {
            page: 1,
            limit: listingsLimit,
            status: listingsStatusFilter || undefined
          },
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      if (response.data.success) {
        setListingsData(response.data);
      }
    } catch (error) {
      console.error('Error force refreshing listings:', error);
      await fetchListings();
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      console.log('🔄 Checking Stripe account status...');
      
      const response = await checkStripeStatus();
      console.log('✅ Stripe status response:', response);
      setStripeStatus(response);
      
      if (response.connected && response.chargesEnabled) {
        setShowStripeSetup(false);
        console.log('🎉 Stripe is connected and active - hiding setup modal');
      }
    } catch (err) {
      console.error('❌ Error checking Stripe status:', err);
      setStripeStatus({ 
        connected: false, 
        status: 'error',
        chargesEnabled: false 
      });
    }
  };

  const handleStripeReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe');
    
    if (stripeStatus === 'success') {
      console.log('🎉 Returned from Stripe onboarding - refreshing status');
      setSuccessMessage('Stripe account setup completed successfully!');
      
      setTimeout(() => {
        checkStripeAccountStatus();
        fetchDashboardData();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 3000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      checkStripeAccountStatus()
    ]);
    
    if (activeTab === 'listings') {
      await forceRefreshListings();
    }
    
    setRefreshing(false);
  };

  // Video Player Functions
  const handlePlayVideo = (videoUrl: string, title: string) => {
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(title);
    setShowVideoModal(true);
  };

  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  const handleOrderUpdateFromModal = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(order => 
      order._id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  // Listing Management Functions
  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setShowEditModal(true);
  };

  const handleUpdateListing = async (updatedData: any) => {
    if (!editingListing) return;
    
    try {
      setListingActionLoading('updating');
      setError('');
      
      const response = await marketplaceAPI.listings.update(
        editingListing._id, 
        updatedData,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Listing updated successfully!');
        await forceRefreshListings();
        setShowEditModal(false);
        setEditingListing(null);
        fetchDashboardData();
      } else {
        setError(response.error || 'Failed to update listing');
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      setError('Failed to update listing. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  const handleDeleteListing = (listing: Listing) => {
    setDeletingListing(listing);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteListing = async () => {
    if (!deletingListing) return;
    
    try {
      setListingActionLoading('deleting');
      setError('');
      
      const response = await marketplaceAPI.listings.delete(
        deletingListing._id,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Listing deleted successfully!');
        await forceRefreshListings();
        setShowDeleteModal(false);
        setDeletingListing(null);
        fetchDashboardData();
      } else {
        setError(response.error || 'Failed to delete listing');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  const handleToggleListingStatus = async (listing: Listing) => {
    try {
      setListingActionLoading(`toggling-${listing._id}`);
      setError('');
      
      const response = await marketplaceAPI.listings.toggleStatus(
        listing._id,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage(`Listing ${response.newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
        await forceRefreshListings();
        fetchDashboardData();
      } else {
        setError(response.error || 'Failed to toggle listing status');
      }
    } catch (error: any) {
      console.error('Error toggling listing status:', error);
      setError('Failed to toggle listing status. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // Offer Functions
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

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    setSuccessMessage('Stripe account setup completed!');
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 2000);
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

  if (loading && activeTab !== 'listings') {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-700 font-medium">Loading your dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Getting everything ready for you</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Seller Dashboard
                </h1>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  Welcome back! Manage your listings, track sales, and grow your business in one place.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
                >
                  <svg 
                    className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {successMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stripe Status Banner */}
          <div className="mb-8">
            <StripeAccountStatus 
              stripeStatus={stripeStatus}
              onSetupClick={() => setShowStripeSetup(true)}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                  { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
                  { id: 'orders', label: 'Orders', icon: '📦', badge: totalOrders }
                ].map(({ id, label, icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`py-4 px-1 font-medium text-sm flex items-center whitespace-nowrap transition-all duration-200 relative ${
                      activeTab === id
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2 text-lg">{icon}</span>
                    {label}
                    {badge !== undefined && badge > 0 && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {badge}
                      </span>
                    )}
                    {activeTab === id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Modals */}
          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
            />
          )}

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

          {showEditModal && editingListing && (
            <EditListingModal
              listing={editingListing}
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setEditingListing(null);
              }}
              onUpdate={handleUpdateListing}
              loading={listingActionLoading === 'updating'}
            />
          )}

          {showDeleteModal && deletingListing && (
            <DeleteListingModal
              listing={deletingListing}
              isOpen={showDeleteModal}
              onClose={() => {
                setShowDeleteModal(false);
                setDeletingListing(null);
              }}
              onConfirm={handleConfirmDeleteListing}
              loading={listingActionLoading === 'deleting'}
            />
          )}

          {showVideoModal && (
            <VideoPlayerModal
              videoUrl={currentVideoUrl}
              title={currentVideoTitle}
              isOpen={showVideoModal}
              onClose={() => setShowVideoModal(false)}
            />
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Overview */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(totalRevenue)}
                    icon="💰"
                    color="green"
                    description="Total earnings from completed orders"
                  />
                  <StatCard
                    title="Active Listings"
                    value={activeListings}
                    icon="✅"
                    color="blue"
                    description="Listings currently available for sale"
                    onClick={() => setActiveTab('listings')}
                  />
                  <StatCard
                    title="Pending Offers"
                    value={pendingOffers}
                    icon="💼"
                    color="yellow"
                    description="Offers awaiting your response"
                    onClick={() => setActiveTab('offers')}
                  />
                  <StatCard
                    title="Orders This Month"
                    value={totalOrders}
                    icon="📦"
                    color="purple"
                    description="Total orders received"
                    onClick={() => setActiveTab('orders')}
                  />
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                      <p className="text-sm text-gray-600 mt-1">Latest orders and updates</p>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="text-5xl mb-4 text-gray-300">📦</div>
                          <h3 className="text-lg font-medium text-gray-900">No recent activity</h3>
                          <p className="mt-2 text-gray-500">When you receive orders, they'll appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div 
                              key={order._id} 
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
                              onClick={() => handleViewOrderDetails(order._id)}
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center border border-blue-200 group-hover:border-blue-300">
                                  <span className="text-lg font-semibold text-blue-600">
                                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 group-hover:text-blue-600">
                                    {order.listingId?.title || 'Unknown Listing'}
                                  </p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username || 'Unknown Buyer'}</p>
                                  <p className="text-xs text-gray-400 mt-1">{formatDate(order.createdAt)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600 text-lg">{formatCurrency(order.amount || 0)}</p>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                  {order.status ? order.status.replace('_', ' ') : 'Processing'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {orders.length > 0 && (
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <button 
                          onClick={() => setActiveTab('orders')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                        >
                          View All Orders
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions & Tips */}
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <button
                        onClick={() => window.open('/create-listing', '_blank')}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Listing
                      </button>
                      {!(stripeStatus?.connected && stripeStatus?.chargesEnabled) && (
                        <button
                          onClick={() => setShowStripeSetup(true)}
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Setup Payments
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('listings')}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center hover:shadow-sm"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Manage Listings
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>High-quality media increases sales by up to 40%</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Respond to offers within 24 hours for best results</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Clear descriptions reduce customer inquiries by 60%</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Setup Stripe to receive payments instantly</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <OffersTab
              offers={offers}
              loading={loading}
              onOfferAction={handleOfferAction}
              onPlayVideo={handlePlayVideo}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'listings' && (
            <ListingsTab
              listingsData={listingsData}
              loading={loading && activeTab === 'listings'}
              statusFilter={listingsStatusFilter}
              currentPage={listingsPage}
              onStatusFilterChange={setListingsStatusFilter}
              onPageChange={setListingsPage}
              onEditListing={handleEditListing}
              onDeleteListing={handleDeleteListing}
              onToggleStatus={handleToggleListingStatus}
              onPlayVideo={handlePlayVideo}
              onRefresh={forceRefreshListings}
              actionLoading={listingActionLoading}
              onCreateListing={() => window.open('/create-listing', '_blank')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={loading}
              onViewOrderDetails={handleViewOrderDetails}
              onPlayVideo={handlePlayVideo}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;