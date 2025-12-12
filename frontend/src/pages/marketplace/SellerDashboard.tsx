// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import { formatCurrency } from '../../api';
import axios from 'axios';

// Import new components
import DashboardHeader from '../../components/marketplae/seller/DashboardHeader';
import AlertMessage from '../../components/marketplae/seller/AlertMessage';
import TabNavigation from '../../components/marketplae/seller/TabNavigation';
import StatsGrid from '../../components/marketplae/seller/StatsGrid';
import WelcomeCard from '../../components/marketplae/seller/WelcomeCard';
import RecentOrders from '../../components/marketplae/seller/RecentOrders';
import ActionCard from '../../components/marketplae/seller/ActionCard';
import OrderWorkflowGuide from '../../components/marketplae/seller/OrderWorkflowGuide';

// Import tab components
import OffersTab from '../../components/marketplae/seller/OffersTab';
import ListingsTab from '../../components/marketplae/seller/ListingsTab';
import OrdersTab from '../../components/marketplae/seller/OrdersTab';

// Import modals
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import OrderDetailsModal from '../../components/marketplae/seller/OrderDetailsModal';
import EditListingModal from '../../components/marketplae/seller/EditListingModal';
import DeleteListingModal from '../../components/marketplae/seller/DeleteListingModal';
import VideoPlayerModal from '../../components/marketplae/seller/VideoPlayerModal';

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
  orderNumber: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  sellerId: {
    _id: string;
    username: string;
    email?: string;
    avatar?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
    mediaUrls?: string[];
    description?: string;
    type?: string;
  };
  offerId?: {
    _id: string;
    amount: number;
    message?: string;
  };
  createdAt: string;
  updatedAt: string;
  orderDate: string;
  paidAt?: string;
  processingAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
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

interface OrderStats {
  totalOrders: number;
  activeOrders: number;
  pendingPayment: number;
  processing: number;
  inProgress: number;
  delivered: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  pendingRevenue: number;
  thisMonthOrders: number;
  thisMonthRevenue: number;
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
  
  // Order stats
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    activeOrders: 0,
    pendingPayment: 0,
    processing: 0,
    inProgress: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    thisMonthOrders: 0,
    thisMonthRevenue: 0
  });
  
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

  // Order management states
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  const [ordersFilter, setOrdersFilter] = useState<string>('all');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit] = useState(10);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Calculate stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

  // Tab configuration - MOVE THIS AFTER pendingOffers is calculated
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders }
  ];

  // Action cards data
  const actionCards = [
    {
      title: 'Need Help with an Order?',
      description: 'Learn how to manage orders step by step',
      icon: '❓',
      iconBg: 'from-yellow-500 to-yellow-600',
      bgGradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-200',
      actions: [
        { label: 'View Tutorial', onClick: () => window.open('/help/orders', '_blank'), variant: 'secondary' as const },
        { label: 'Contact Support', onClick: () => window.open('/help/support', '_blank'), variant: 'primary' as const }
      ]
    },
    {
      title: 'Boost Your Sales',
      description: 'Tips to get more orders and grow your business',
      icon: '🚀',
      iconBg: 'from-green-500 to-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      actions: [
        { label: 'Optimize Listings', onClick: () => window.open('/help/optimize', '_blank'), variant: 'secondary' as const },
        { label: 'View Analytics', onClick: () => setActiveTab('listings'), variant: 'primary' as const }
      ]
    }
  ];

  useEffect(() => {
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

  // Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchSellerOrders();
    }
  }, [activeTab, ordersPage, ordersFilter]);

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

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const [ordersResponse, offersResponse, listingsResponse] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/marketplace/my-sales`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }),
        axios.get(`${API_BASE_URL}/marketplace/offers/received`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/marketplace/listings/my-listings`, {
          params: { limit: 5 },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Process orders response
      let ordersData: Order[] = [];
      if (ordersResponse.status === 'fulfilled') {
        const response = ordersResponse.value;
        if (response.data.success) {
          ordersData = response.data.sales || response.data.orders || [];
        }
      }

      // Process offers response
      let offersData: Offer[] = [];
      if (offersResponse.status === 'fulfilled') {
        const response = offersResponse.value;
        if (response.data.success) {
          offersData = response.data.offers || [];
        }
      }

      // Process listings response
      if (listingsResponse.status === 'fulfilled') {
        const response = listingsResponse.value;
        if (response.data.success) {
          setListingsData(response.data);
        }
      }

      // Calculate order stats
      const stats = calculateOrderStats(ordersData);
      setOrderStats(stats);
      setOrders(ordersData);
      setOffers(offersData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderStats = (orders: Order[]): OrderStats => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const thisMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === thisMonth && 
             orderDate.getFullYear() === thisYear;
    });

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(order => 
        ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
      ).length,
      pendingPayment: orders.filter(order => order.status === 'pending_payment').length,
      processing: orders.filter(order => order.status === 'processing').length,
      inProgress: orders.filter(order => order.status === 'in_progress').length,
      delivered: orders.filter(order => order.status === 'delivered').length,
      completed: orders.filter(order => order.status === 'completed').length,
      cancelled: orders.filter(order => order.status === 'cancelled').length,
      totalRevenue: orders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.amount, 0),
      pendingRevenue: orders
        .filter(order => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
        .reduce((sum, order) => sum + order.amount, 0),
      thisMonthOrders: thisMonthOrders.length,
      thisMonthRevenue: thisMonthOrders
        .filter(order => order.status === 'completed')
        .reduce((sum, order) => sum + order.amount, 0)
    };
  };

  const fetchSellerOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const params: any = {
        page: ordersPage,
        limit: ordersLimit
      };
      
      if (ordersFilter !== 'all') {
        params.status = ordersFilter;
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        {
          params,
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      if (response.data.success) {
        const ordersData = response.data.sales || response.data.orders || [];
        setOrders(ordersData);
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
      }
    } catch (error: any) {
      console.error('Error fetching seller orders:', error);
      setError('Failed to load orders. Please try again.');
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
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      if (response.data.success) {
        setListingsData(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError('Failed to load listings. Please try again.');
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      // Your Stripe status check logic here
    } catch (err) {
      console.error('Error checking Stripe status:', err);
    }
  };

  const handleStripeReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe');
    
    if (stripeStatus === 'success') {
      setSuccessMessage('Stripe account setup completed successfully!');
      setTimeout(() => {
        checkStripeAccountStatus();
        fetchDashboardData();
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
      await fetchListings();
    } else if (activeTab === 'orders') {
      await fetchSellerOrders();
    }
    
    setRefreshing(false);
  };

  // Simplified order management functions
  const handleSimpleStartProcessing = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${order._id}/status`,
        { status: 'processing' },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Order processing started!');
        updateOrderInState(order._id, 'processing', {
          processingAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
      setError('Failed to start processing. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleStartWork = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${order._id}/status`,
        { status: 'in_progress' },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Work started!');
        updateOrderInState(order._id, 'in_progress', {
          startedAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error starting work:', error);
      setError('Failed to start work. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleDeliver = async (order: Order) => {
    try {
      setSelectedOrder(order);
      // You can create a delivery modal component
      setSuccessMessage('Delivery functionality - create a delivery modal component');
    } catch (error: any) {
      console.error('Error in deliver:', error);
      setError('Failed to deliver. Please try again.');
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    try {
      setSelectedOrder(order);
      // You can create a cancellation modal component
      setSuccessMessage('Cancellation functionality - create a cancellation modal component');
    } catch (error: any) {
      console.error('Error in cancel:', error);
      setError('Failed to cancel. Please try again.');
    }
  };

  const handleSimpleCompleteRevision = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${order._id}/status`,
        { status: 'delivered' },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Revision completed!');
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error completing revision:', error);
      setError('Failed to complete revision. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const updateOrderInState = (orderId: string, newStatus: string, updates?: any) => {
    setOrders(prev => prev.map(order => {
      if (order._id === orderId) {
        return { 
          ...order, 
          status: newStatus,
          ...updates
        };
      }
      return order;
    }));
    
    const updatedStats = calculateOrderStats(
      orders.map(order => order._id === orderId ? { ...order, status: newStatus } : order)
    );
    setOrderStats(updatedStats);
  };

  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  const handlePlayVideo = (videoUrl: string, title: string) => {
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(title);
    setShowVideoModal(true);
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setShowEditModal(true);
  };

  const handleDeleteListing = (listing: Listing) => {
    setDeletingListing(listing);
    setShowDeleteModal(true);
  };

  const handleOfferAction = async (offerId: string, action: string) => {
    // Your offer action logic here
  };

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    setSuccessMessage('Stripe account connected successfully!');
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

  if (loading && activeTab !== 'listings' && activeTab !== 'orders') {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <DashboardHeader
            title="Seller Dashboard"
            subtitle="Manage orders, track earnings, and grow your business"
            earnings={formatCurrency(orderStats.totalRevenue)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            // showStripeButton={!(stripeStatus?.connected && stripeStatus?.chargesEnabled)}
            onStripeSetup={() => setShowStripeSetup(true)}
          />

          {/* Alerts */}
          <div className="mb-8 space-y-4">
            {successMessage && (
              <AlertMessage type="success" message={successMessage} />
            )}
            {error && (
              <AlertMessage type="error" message={error} />
            )}
          </div>

          {/* Navigation */}
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Welcome Card */}
              <WelcomeCard
                title="Welcome back, Seller! 👋"
                subtitle="Manage your business efficiently with real-time insights and quick actions."
                primaryAction={{
                  label: '+ Create New Listing',
                  onClick: () => window.open('/create-listing', '_blank')
                }}
                secondaryAction={{
                  label: '💰 Setup Payments',
                  onClick: () => setShowStripeSetup(true),
                  visible: !(stripeStatus?.connected && stripeStatus?.chargesEnabled)
                }}
              />

              {/* Stats Grid */}
              <StatsGrid
                stats={{
                  totalRevenue: orderStats.totalRevenue,
                  totalOrders: orderStats.totalOrders,
                  activeOrders: orderStats.activeOrders,
                  pendingOffers: pendingOffers,
                  totalListings: totalListings,
                  activeListings: activeListings
                }}
                onTabChange={setActiveTab}
              />

              {/* Order Workflow Guide */}
              <OrderWorkflowGuide />

              {/* Recent Orders */}
              <RecentOrders
                orders={orders.slice(0, 5)}
                onViewOrderDetails={handleViewOrderDetails}
                onStartProcessing={handleSimpleStartProcessing}
                onStartWork={handleSimpleStartWork}
                onDeliver={handleSimpleDeliver}
                onCancel={handleSimpleCancel}
                onCompleteRevision={handleSimpleCompleteRevision}
                onViewAll={() => setActiveTab('orders')}
                onCreateListing={() => window.open('/create-listing', '_blank')}
                orderActionLoading={orderActionLoading}
              />

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {actionCards.map((card, index) => (
                  <ActionCard key={index} {...card} />
                ))}
              </div>
            </div>
          )}

          {/* Other Tabs */}
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
              onPlayVideo={handlePlayVideo}
              onRefresh={fetchListings}
              actionLoading={listingActionLoading}
              onCreateListing={() => window.open('/create-listing', '_blank')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={loading}
              filter={ordersFilter}
              onFilterChange={setOrdersFilter}
              onViewOrderDetails={handleViewOrderDetails}
              onPlayVideo={handlePlayVideo}
              onRefresh={handleRefresh}
              onStartProcessing={(orderId) => {
                const order = orders.find(o => o._id === orderId);
                if (order) handleSimpleStartProcessing(order);
              }}
              onStartWork={(orderId) => {
                const order = orders.find(o => o._id === orderId);
                if (order) handleSimpleStartWork(order);
              }}
              onDeliver={(order) => handleSimpleDeliver(order)}
              onCancel={(order) => handleSimpleCancel(order)}
              onCompleteRevision={(order) => handleSimpleCompleteRevision(order)}
              actionLoading={orderActionLoading}
            />
          )}

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
              onUpdate={() => {}}
              loading={false}
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
              onConfirm={() => {}}
              loading={false}
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
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;