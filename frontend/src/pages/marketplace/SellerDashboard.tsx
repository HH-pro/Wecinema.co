// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import { useNavigate } from 'react-router-dom';

// Import API functions
import marketplaceApi, { 
  listingsApi, 
  ordersApi, 
  offersApi, 
  formatCurrency 
} from '../../api/marketplaceApi';

// Import components
import DashboardHeader from '../../components/marketplae/seller/DashboardHeader';
import TabNavigation from '../../components/marketplae/seller/TabNavigation';
import StatsGrid from '../../components/marketplae/seller/StatsGrid';
import WelcomeCard from '../../components/marketplae/seller/WelcomeCard';
import RecentOrders from '../../components/marketplae/seller/RecentOrders';
import ActionCard from '../../components/marketplae/seller/ActionCard';
import OrderWorkflowGuide from '../../components/marketplae/seller/OrderWorkflowGuide';
import StripeAccountStatus from '../../components/marketplae/seller/StripeAccountStatus';
import StripeSuccessAlert from '../../components/marketplae/seller/StripeSuccessAlert';
import WithdrawBalance from '../../components/marketplae/seller/WithdrawBalance';

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
  deadline?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  videoUrl?: string;
  requirements?: string;
  messages?: Array<{
    sender: string;
    message: string;
    timestamp: string;
  }>;
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
  message?: string;
  createdAt: string;
  videoUrl?: string;
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
  images?: string[];
  videoUrl?: string;
  deliveryTime?: number;
  revisions?: number;
  featured?: boolean;
}

interface ListingsData {
  listings: Listing[];
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

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  accountId?: string;
  email?: string;
  country?: string;
  status?: string;
  payoutsEnabled?: boolean;
  name?: string;
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
  const [showStripeSuccessAlert, setShowStripeSuccessAlert] = useState(false);
  const navigate = useNavigate();
  
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
  
  // Separate loading states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  
  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
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

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings > 0 ? totalListings : null },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders > 0 ? orderStats.activeOrders : null },
    { id: 'offers', label: 'Offers', icon: '💌', badge: pendingOffers > 0 ? pendingOffers : null }
  ];

  // Action Cards
  const [actionCards, setActionCards] = useState([
    {
      title: 'Analytics Dashboard',
      description: 'View detailed analytics and performance metrics for your listings.',
      icon: '📊',
      iconBg: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      actions: [
        {
          label: 'View Analytics',
          onClick: () => navigate('/marketplace/analytics'),
          variant: 'primary' as const
        }
      ]
    },
    {
      title: 'Seller Resources',
      description: 'Access guides, tutorials, and tips to grow your business on Marketplace.',
      icon: '📚',
      iconBg: 'from-orange-500 to-orange-600',
      bgGradient: 'from-orange-50 to-amber-50',
      borderColor: 'border-orange-200',
      actions: [
        {
          label: 'Learn More',
          onClick: () => navigate('/marketplace/seller/resources'),
          variant: 'secondary' as const
        }
      ]
    }
  ]);

  // ✅ FIXED: Check URL params for Stripe return success
  useEffect(() => {
    const checkStripeReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const stripeStatus = urlParams.get('stripe');
      const accountId = urlParams.get('account_id');
      
      if (stripeStatus === 'success' && accountId) {
        console.log('✅ Stripe connected successfully');
        // Show success alert
        setShowStripeSuccessAlert(true);
        
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        // Update Stripe status after 1 second
        setTimeout(() => {
          checkStripeAccountStatus();
          fetchDashboardData();
        }, 1000);
        
        // Show success message
        setSuccessMessage('Stripe account connected successfully! You can now accept payments.');
      }
    };
    
    checkStripeReturn();
  }, []);

  // ✅ Update action cards based on Stripe status
  useEffect(() => {
    const stripeConnected = stripeStatus?.connected && stripeStatus?.chargesEnabled;
    
    if (!stripeConnected && !actionCards.some(card => card.title === 'Setup Payments')) {
      setActionCards(prev => [
        ...prev,
        {
          title: 'Setup Payments',
          description: 'Connect your Stripe account to start accepting payments and receiving payouts.',
          icon: '💰',
          iconBg: 'from-green-500 to-emerald-600',
          bgGradient: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          actions: [
            {
              label: 'Connect Stripe',
              onClick: () => setShowStripeSetup(true),
              variant: 'primary' as const
            }
          ]
        }
      ]);
    } else if (stripeConnected) {
      setActionCards(prev => prev.filter(card => card.title !== 'Setup Payments'));
    }
  }, [stripeStatus]);

  // ✅ Calculate order stats
  const calculateOrderStats = useCallback((orders: Order[]): OrderStats => {
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
  }, []);

  // ✅ FIXED: Check Stripe account status with proper error handling
  const checkStripeAccountStatus = async (): Promise<StripeStatus | null> => {
    try {
      console.log('🔍 Checking Stripe status...');
      
      // For development, you can use mock data if API doesn't exist
      // Uncomment the following for development mode:
      // if (process.env.NODE_ENV === 'development') {
      //   console.log('🛠️ Using development mock for Stripe status');
      //   await new Promise(resolve => setTimeout(resolve, 1000));
      //   const mockStatus: StripeStatus = {
      //     connected: true,
      //     chargesEnabled: true,
      //     detailsSubmitted: true,
      //     status: 'active',
      //     accountId: 'acct_dev_123',
      //     email: 'seller@example.com',
      //     country: 'US',
      //     payoutsEnabled: true,
      //     name: 'Test Seller'
      //   };
      //   setStripeStatus(mockStatus);
      //   return mockStatus;
      // }
      
      // Try to fetch from API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch('/marketplace/stripe/status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Stripe status API response:', data);
        setStripeStatus(data);
        return data;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - API endpoint not responding');
        }
        throw fetchError;
      }
      
    } catch (err) {
      console.warn('⚠️ Stripe status check failed:', err.message);
      
      // Set a default status for development/fallback
      const fallbackStatus: StripeStatus = {
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        status: 'not_connected'
      };
      
      setStripeStatus(fallbackStatus);
      setError('Payment service temporarily unavailable. You can continue managing your listings.');
      
      return fallbackStatus;
    }
  };

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // Fetch orders using API file
      const ordersData = await ordersApi.getMySales();
      
      if (ordersData.length > 0) {
        const stats = calculateOrderStats(ordersData);
        setOrders(ordersData);
        setOrderStats(stats);
      }

      // Fetch offers and listings in parallel
      const [offersResponse, listingsResponse] = await Promise.allSettled([
        offersApi.getReceivedOffers(),
        listingsApi.getMyListings({ limit: 5 })
      ]);

      // Process offers
      if (offersResponse.status === 'fulfilled' && offersResponse.value.success) {
        const offersData = offersResponse.value.offers || [];
        setOffers(offersData);
      }

      // Process listings
      if (listingsResponse.status === 'fulfilled' && listingsResponse.value.success) {
        setListingsData(listingsResponse.value);
      }

      setInitialDataLoaded(true);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch orders for OrdersTab
  const fetchSellerOrders = async () => {
    try {
      setOrdersLoading(true);
      
      const ordersData = await ordersApi.getMySales();
      
      if (ordersData.length > 0) {
        // Filter orders if needed
        let filteredOrders = ordersData;
        if (ordersFilter !== 'all') {
          filteredOrders = ordersData.filter(order => order.status === ordersFilter);
        }
        
        // Paginate
        const startIndex = (ordersPage - 1) * ordersLimit;
        const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersLimit);
        
        // Update state
        setOrders(paginatedOrders);
        
        // Calculate stats from ALL orders (not just paginated)
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
      }
    } catch (error: any) {
      console.error('Error fetching seller orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // ✅ Fetch listings
  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      
      const params: any = {
        page: listingsPage,
        limit: listingsLimit
      };
      
      if (listingsStatusFilter) {
        params.status = listingsStatusFilter;
      }
      
      const response = await listingsApi.getMyListings(params);
      
      if (response.success) {
        setListingsData(response);
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
    } finally {
      setListingsLoading(false);
    }
  };

  // ✅ Fetch offers
  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      
      const response = await offersApi.getReceivedOffers();
      
      if (response.success) {
        setOffers(response.offers || []);
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error);
    } finally {
      setOffersLoading(false);
    }
  };

  // ✅ Handle Edit Listing
  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setShowEditModal(true);
  };

  const handleEditModalSave = async (updatedData: { title: string; description: string; price: number }) => {
    if (!editingListing) return;

    try {
      setListingActionLoading(`edit-${editingListing._id}`);
      
      const response = await listingsApi.editListing(editingListing._id, updatedData);

      if (response.success) {
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.map(l => {
            if (l._id === editingListing._id) {
              return {
                ...l,
                title: updatedData.title,
                description: updatedData.description,
                price: updatedData.price,
                updatedAt: new Date().toISOString(),
                ...response.listing
              };
            }
            return l;
          });
          
          return {
            ...prev,
            listings: updatedListings
          };
        });
        
        setShowEditModal(false);
        setEditingListing(null);
        
      } else {
        console.log('Edit failed:', response.error);
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Handle Delete Listing
  const handleDeleteListing = (listing: Listing) => {
    setDeletingListing(listing);
    setShowDeleteModal(true);
  };

  const handleDeleteModalConfirm = async () => {
    if (!deletingListing) return;

    try {
      setListingActionLoading(`delete-${deletingListing._id}`);
      
      const response = await listingsApi.deleteListing(deletingListing._id);

      if (response.success) {
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.filter(l => l._id !== deletingListing._id);
          
          return {
            ...prev,
            listings: updatedListings,
            pagination: {
              ...prev.pagination,
              total: (prev.pagination?.total || 1) - 1
            }
          };
        });
        
        setShowDeleteModal(false);
        setDeletingListing(null);
        
      } else {
        console.log('Delete failed:', response.error);
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Handle Toggle Listing Status
  const handleToggleListingStatus = async (listing: Listing) => {
    try {
      setListingActionLoading(`toggle-${listing._id}`);

      const response = await listingsApi.toggleListingStatus(listing._id);

      if (response.success) {
        const newStatus = response.newStatus || (listing.status === 'active' ? 'inactive' : 'active');
        
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.map(l => {
            if (l._id === listing._id) {
              return {
                ...l,
                status: newStatus,
                updatedAt: response.listing?.updatedAt || new Date().toISOString(),
                ...response.listing
              };
            }
            return l;
          });
          
          return {
            ...prev,
            listings: updatedListings
          };
        });
        
      } else {
        console.log('Toggle failed:', response.error);
      }
      
    } catch (error: any) {
      console.error('Error toggling listing status:', error);
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Order management functions
  const handleSimpleStartProcessing = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'processing');

      if (response.success) {
        updateOrderInState(order._id, 'processing', {
          processingAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleStartWork = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'in_progress');

      if (response.success) {
        updateOrderInState(order._id, 'in_progress', {
          startedAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error starting work:', error);
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleDeliver = async (order: Order) => {
    try {
      setSelectedOrder(order);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'delivered');

      if (response.success) {
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error delivering order:', error);
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        setOrderActionLoading(order._id);
        
        const response = await ordersApi.updateOrderStatus(order._id, 'cancelled');

        if (response.success) {
          updateOrderInState(order._id, 'cancelled', {
            cancelledAt: new Date().toISOString()
          });
        }
      } catch (error: any) {
        console.error('Error cancelling order:', error);
      } finally {
        setOrderActionLoading(null);
      }
    }
  };

  const handleSimpleCompleteRevision = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'delivered');

      if (response.success) {
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error completing revision:', error);
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
          updatedAt: new Date().toISOString(),
          ...updates
        };
      }
      return order;
    }));
    
    // Recalculate stats with updated orders
    const updatedOrders = orders.map(order => 
      order._id === orderId ? { ...order, status: newStatus, ...updates } : order
    );
    const updatedStats = calculateOrderStats(updatedOrders);
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

  // ✅ Handle offer actions
  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setOrderActionLoading(offerId);
      
      let response;
      if (action === 'accept') {
        response = await offersApi.acceptOffer(offerId);
      } else {
        response = await offersApi.rejectOffer(offerId);
      }

      if (response.success) {
        setOffers(prev => prev.filter(offer => offer._id !== offerId));
      }
    } catch (error: any) {
      console.error(`Error ${action}ing offer:`, error);
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 1000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      await fetchDashboardData();
      await checkStripeAccountStatus();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Handle withdraw success
  const handleWithdrawSuccess = () => {
    // Refresh data after successful withdrawal
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 1000);
  };

  // ✅ Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchDashboardData();
        await checkStripeAccountStatus();
      } catch (error) {
        console.error('Initial data loading error:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // ✅ Fetch listings when tab changes
  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings();
    }
  }, [activeTab, listingsPage, listingsStatusFilter]);

  // ✅ Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchSellerOrders();
    }
  }, [activeTab, ordersPage, ordersFilter]);

  // ✅ Fetch offers when offers tab is active
  useEffect(() => {
    if (activeTab === 'offers') {
      fetchOffers();
    }
  }, [activeTab]);

  // Determine loading state
  const getCurrentLoadingState = () => {
    if (activeTab === 'overview') return loading && !initialDataLoaded;
    if (activeTab === 'listings') return listingsLoading;
    if (activeTab === 'orders') return ordersLoading;
    if (activeTab === 'offers') return offersLoading;
    return loading;
  };

  const currentLoading = getCurrentLoadingState();

  // Show loading only on initial load
  if (loading && !initialDataLoaded) {
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

  // Calculate if user can withdraw (connected and charges enabled)
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ✅ Stripe Success Alert */}
          <StripeSuccessAlert 
            show={showStripeSuccessAlert}
            onClose={() => setShowStripeSuccessAlert(false)}
          />

          {/* Header */}
          <DashboardHeader
            title="Seller Dashboard"
            subtitle="Manage orders, track earnings, and grow your business"
            earnings={formatCurrency(orderStats.totalRevenue)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            stripeStatus={stripeStatus}
          />

          {/* ✅ Show error if Stripe check failed */}
          {error && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start">
                <div className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.73 0L4.408 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">{error}</p>
                  <button
                    onClick={() => {
                      setError('');
                      checkStripeAccountStatus();
                    }}
                    className="mt-2 text-sm text-yellow-700 hover:text-yellow-800 font-medium underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Stripe Account Status */}
          <StripeAccountStatus
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
            isLoading={stripeStatus === null}
          />

          {/* ✅ Conditional Stripe Setup Banner */}
          {!stripeStatus?.chargesEnabled && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Setup Payments to Get Started</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {stripeStatus?.connected 
                        ? 'Complete your Stripe verification to start accepting payments.'
                        : 'Connect your Stripe account to receive payments from buyers.'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStripeSetup(true)}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow whitespace-nowrap"
                >
                  {stripeStatus?.connected ? 'Complete Verification' : 'Setup Payments Now'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="mt-2">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Welcome Card */}
                <WelcomeCard
                  title="Welcome back, Seller! 👋"
                  subtitle="Manage your business efficiently with real-time insights and quick actions."
                  primaryAction={{
                    label: '+ Create New Listing',
                    onClick: () => navigate('/marketplace/create')
                  }}
                  secondaryAction={{
                    label: '💰 Setup Payments',
                    onClick: () => setShowStripeSetup(true),
                    visible: !canWithdraw
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
                {orders.length > 0 ? (
                  <RecentOrders
                    orders={orders.slice(0, 5)}
                    onViewOrderDetails={handleViewOrderDetails}
                    onStartProcessing={handleSimpleStartProcessing}
                    onStartWork={handleSimpleStartWork}
                    onDeliver={handleSimpleDeliver}
                    onCancel={handleSimpleCancel}
                    onCompleteRevision={handleSimpleCompleteRevision}
                    onViewAll={() => setActiveTab('orders')}
                    onCreateListing={() => navigate('/marketplace/create')}
                    orderActionLoading={orderActionLoading}
                  />
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-8 text-center">
                    <div className="text-5xl mb-4 text-gray-300">📦</div>
                    <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
                    <p className="mt-2 text-gray-500 mb-6">
                      {canWithdraw 
                        ? 'You can accept payments. Create listings to start receiving orders!'
                        : 'Create listings to start receiving orders.'
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => navigate('/marketplace/create')}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
                      >
                        + Create Your First Listing
                      </button>
                      {!canWithdraw && (
                        <button
                          onClick={() => setShowStripeSetup(true)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow"
                        >
                          💰 Setup Payments
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {actionCards.map((card, index) => (
                    <ActionCard
                      key={index}
                      title={card.title}
                      description={card.description}
                      icon={card.icon}
                      iconBg={card.iconBg}
                      bgGradient={card.bgGradient}
                      borderColor={card.borderColor}
                      actions={card.actions}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offers Tab */}
            {activeTab === 'offers' && (
              <OffersTab
                offers={offers}
                loading={offersLoading}
                onOfferAction={handleOfferAction}
                onPlayVideo={handlePlayVideo}
                onRefresh={() => fetchOffers()}
                actionLoading={orderActionLoading}
              />
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <ListingsTab
                listingsData={listingsData}
                loading={listingsLoading}
                statusFilter={listingsStatusFilter}
                currentPage={listingsPage}
                onStatusFilterChange={setListingsStatusFilter}
                onPageChange={setListingsPage}
                onEditListing={handleEditListing}
                onDeleteListing={handleDeleteListing}
                onToggleStatus={handleToggleListingStatus}
                onPlayVideo={handlePlayVideo}
                onRefresh={fetchListings}
                actionLoading={listingActionLoading}
                onCreateListing={() => navigate('/marketplace/create')}
              />
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                loading={ordersLoading}
                filter={ordersFilter}
                onFilterChange={setOrdersFilter}
                onViewOrderDetails={handleViewOrderDetails}
                onPlayVideo={handlePlayVideo}
                onRefresh={() => fetchSellerOrders()}
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
                stats={orderStats}
              />
            )}
          </div>

          {/* Modals */}
          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
              stripeConnected={canWithdraw}
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
              onSave={handleEditModalSave}
              loading={listingActionLoading?.startsWith('edit-') || false}
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
              onConfirm={handleDeleteModalConfirm}
              loading={listingActionLoading?.startsWith('delete-') || false}
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