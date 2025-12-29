// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import { useNavigate, useLocation } from 'react-router-dom';

// Import API functions
import marketplaceApi, { 
  listingsApi, 
  ordersApi, 
  offersApi, 
  formatCurrency 
} from '../../api/marketplaceApi';

// Import components
import DashboardHeader from '../../components/marketplace/seller/DashboardHeader';
import TabNavigation from '../../components/marketplace/seller/TabNavigation';
import StatsGrid from '../../components/marketplace/seller/StatsGrid';
import WelcomeCard from '../../components/marketplace/seller/WelcomeCard';
import RecentOrders from '../../components/marketplace/seller/RecentOrders';
import ActionCard from '../../components/marketplace/seller/ActionCard';
import OrderWorkflowGuide from '../../components/marketplace/seller/OrderWorkflowGuide';
import StripeAccountStatus from '../../components/marketplace/seller/StripeAccountStatus';
import StripeSuccessAlert from '../../components/marketplace/seller/StripeSuccessAlert';
import WithdrawBalance from '../../components/marketplace/seller/WithdrawBalance';

// Import tab components
import OffersTab from '../../components/marketplace/seller/OffersTab';
import ListingsTab from '../../components/marketplace/seller/ListingsTab';
import OrdersTab from '../../components/marketplace/seller/OrdersTab';

// Import modals
import StripeSetupModal from '../../components/marketplace/seller/StripeSetupModal';
import OrderDetailsModal from '../../components/marketplace/seller/OrderDetailsModal';
import EditListingModal from '../../components/marketplace/seller/EditListingModal';
import DeleteListingModal from '../../components/marketplace/seller/DeleteListingModal';
import VideoPlayerModal from '../../components/marketplace/seller/VideoPlayerModal';

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
  message?: string;
  balance?: number;
  availableBalance?: number;
  pendingBalance?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
  const location = useLocation();
  
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
    console.log('🔍 Checking URL params:', location.search);
    
    const checkStripeReturn = () => {
      const urlParams = new URLSearchParams(location.search);
      const stripeStatusParam = urlParams.get('stripe');
      const accountId = urlParams.get('account_id');
      
      console.log('📊 URL Params found:', { stripeStatusParam, accountId });
      
      if (stripeStatusParam === 'success' && accountId) {
        console.log('🎉 Stripe connected successfully via URL params!');
        
        // Store in localStorage to persist across refreshes
        localStorage.setItem('stripe_redirect_success', 'true');
        localStorage.setItem('stripe_account_id', accountId);
        
        // Clear URL params
        const newUrl = location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Show success alert immediately
        setShowStripeSuccessAlert(true);
        
        // Set success message
        setSuccessMessage('Stripe account connected successfully! Checking verification status...');
        
        // Force check Stripe status immediately
        setTimeout(() => {
          checkStripeAccountStatus(true);
        }, 500);
        
        // Set up polling for verification status
        const maxAttempts = 30; // 30 attempts = 60 seconds
        let attempts = 0;
        
        const checkVerification = async () => {
          attempts++;
          console.log(`🔄 Verification check attempt ${attempts}/${maxAttempts}`);
          
          const status = await checkStripeAccountStatus(true);
          
          if (status?.chargesEnabled) {
            console.log('✅ Account verified! Stopping checks.');
            setSuccessMessage('Stripe account is now verified and ready to accept payments!');
            fetchDashboardData();
            return;
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkVerification, 2000); // Check every 2 seconds
          } else {
            console.log('⏰ Max verification checks reached');
            setSuccessMessage('Verification is taking longer than expected. Please refresh the page in a few minutes.');
          }
        };
        
        // Start checking
        checkVerification();
      }
    };
    
    // Run check
    checkStripeReturn();
    
    // Also check localStorage for previous redirect
    const hadRedirect = localStorage.getItem('stripe_redirect_success');
    const savedAccountId = localStorage.getItem('stripe_account_id');
    
    if (hadRedirect === 'true' && savedAccountId) {
      console.log('🔍 Found previous Stripe redirect, checking status...');
      
      // If status is not yet verified, check again
      if (!stripeStatus?.chargesEnabled) {
        setTimeout(() => {
          checkStripeAccountStatus(true);
        }, 1000);
      }
      
      // Clear localStorage after checking
      localStorage.removeItem('stripe_redirect_success');
      localStorage.removeItem('stripe_account_id');
    }
    
  }, [location.search]);

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

  // ✅ Log Stripe status changes for debugging
  useEffect(() => {
    console.log('🔄 Stripe Status Changed:', stripeStatus);
    
    if (stripeStatus?.connected && stripeStatus?.chargesEnabled) {
      console.log('🎉 STRIPE IS ACTIVE - CHARGES ENABLED!');
      
      // Show success alert if not already showing
      if (!showStripeSuccessAlert) {
        setShowStripeSuccessAlert(true);
      }
      
      // Set success message
      setSuccessMessage('Your Stripe account is fully verified and ready to accept payments!');
      
      // Clear any errors
      setError('');
    }
  }, [stripeStatus, showStripeSuccessAlert]);

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

  // ✅ FIXED: Check Stripe account status with force refresh
  const checkStripeAccountStatus = async (force = false): Promise<StripeStatus | null> => {
    try {
      console.log('🔍 Checking Stripe status...', { force });
      setRefreshing(true);
      
      // Use force endpoint if specified, otherwise simple
      const endpoint = force 
        ? '/api/marketplace/stripe/status' 
        : '/api/marketplace/stripe/status-simple';
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Stripe status response:', data);
        
        // Update state
        setStripeStatus(data);
        
        // If connected but charges not enabled, log it
        if (data.connected && !data.chargesEnabled) {
          console.log('⚠️ Connected but charges not enabled yet');
          setSuccessMessage('Stripe account connected. Verification in progress...');
        }
        
        return data;
      } else {
        console.error('❌ Stripe status check failed:', response.status);
        const fallbackStatus: StripeStatus = {
          connected: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          status: 'error'
        };
        setStripeStatus(fallbackStatus);
        return fallbackStatus;
      }
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      const fallbackStatus: StripeStatus = {
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        status: 'error'
      };
      setStripeStatus(fallbackStatus);
      return fallbackStatus;
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Auto-refresh Stripe status when verification is pending
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    // If connected but charges not enabled, check every 5 seconds
    if (stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
      console.log('⏰ Setting up auto-refresh for Stripe verification...');
      
      intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing Stripe status...');
        checkStripeAccountStatus(true);
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (intervalId) {
        console.log('🛑 Clearing Stripe auto-refresh interval');
        clearInterval(intervalId);
      }
    };
  }, [stripeStatus]);

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
      checkStripeAccountStatus(true);
      fetchDashboardData();
    }, 1000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      await fetchDashboardData();
      await checkStripeAccountStatus(true);
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
      checkStripeAccountStatus(true);
      fetchDashboardData();
    }, 1000);
  };

  // ✅ Handle manual Stripe status check
  const handleManualStripeCheck = async () => {
    try {
      setRefreshing(true);
      const status = await checkStripeAccountStatus(true);
      
      if (status?.chargesEnabled) {
        setSuccessMessage('✅ Stripe account is verified and ready!');
      } else {
        setSuccessMessage('⏳ Verification still in progress. Please wait...');
      }
    } catch (error) {
      console.error('Manual check error:', error);
      setError('Failed to check Stripe status');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🚀 Loading initial dashboard data...');
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

  // Calculate if user can withdraw (connected and charges enabled)
  const canWithdraw = stripeStatus?.connected && stripeStatus?.chargesEnabled;

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
            onCheckStripe={handleManualStripeCheck}
          />

          {/* ✅ Stripe Account Status */}
          <StripeAccountStatus
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
            isLoading={stripeStatus === null}
          />

          {/* ✅ Manual Check Button for Pending Verification */}
          {stripeStatus?.connected && !stripeStatus?.chargesEnabled && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start">
                  <div className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Verification In Progress
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {stripeStatus.message || 'Your Stripe account is connected. Verification usually completes within 2-3 minutes.'}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Auto-checking every 5 seconds...
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleManualStripeCheck}
                    disabled={refreshing}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {refreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Check Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Success Message Display */}
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-green-600 mr-3 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* ✅ Error Message Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-red-600 mr-3 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* ✅ Tab Navigation */}
          <div className="mb-8">
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* ✅ Main Content based on Active Tab */}
          {currentLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Welcome Card */}
                  <WelcomeCard
                    title="Welcome Back, Seller!"
                    message="Here's what's happening with your business today."
                    onViewTutorial={() => navigate('/marketplace/seller/guide')}
                  />

                  {/* Stats Grid */}
                  <StatsGrid
                    orderStats={orderStats}
                    totalListings={totalListings}
                    activeListings={activeListings}
                    pendingOffers={pendingOffers}
                  />

                  {/* Withdraw Balance Component */}
                  {canWithdraw && stripeStatus?.availableBalance && stripeStatus.availableBalance > 0 && (
                    <WithdrawBalance
                      availableBalance={stripeStatus.availableBalance}
                      pendingBalance={stripeStatus.pendingBalance || 0}
                      onWithdrawSuccess={handleWithdrawSuccess}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Recent Orders & Order Workflow */}
                    <div className="lg:col-span-2 space-y-8">
                      {/* Recent Orders */}
                      <RecentOrders
                        orders={orders.slice(0, 5)}
                        loading={ordersLoading}
                        onViewOrder={handleViewOrderDetails}
                        onStartProcessing={handleSimpleStartProcessing}
                        onStartWork={handleSimpleStartWork}
                        onDeliver={handleSimpleDeliver}
                        onCancel={handleSimpleCancel}
                        onCompleteRevision={handleSimpleCompleteRevision}
                        orderActionLoading={orderActionLoading}
                      />

                      {/* Order Workflow Guide */}
                      <OrderWorkflowGuide />
                    </div>

                    {/* Right Column: Action Cards */}
                    <div className="space-y-8">
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
                </div>
              )}

              {/* Listings Tab */}
              {activeTab === 'listings' && (
                <ListingsTab
                  listingsData={listingsData}
                  loading={listingsLoading}
                  currentPage={listingsPage}
                  pageSize={listingsLimit}
                  statusFilter={listingsStatusFilter}
                  actionLoading={listingActionLoading}
                  onPageChange={setListingsPage}
                  onStatusFilterChange={setListingsStatusFilter}
                  onEditListing={handleEditListing}
                  onDeleteListing={handleDeleteListing}
                  onToggleStatus={handleToggleListingStatus}
                  onCreateListing={() => navigate('/marketplace/create-listing')}
                  onViewListing={(id) => navigate(`/marketplace/listing/${id}`)}
                />
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  loading={ordersLoading}
                  currentPage={ordersPage}
                  pageSize={ordersLimit}
                  statusFilter={ordersFilter}
                  orderActionLoading={orderActionLoading}
                  onPageChange={setOrdersPage}
                  onStatusFilterChange={setOrdersFilter}
                  onViewOrderDetails={handleViewOrderDetails}
                  onStartProcessing={handleSimpleStartProcessing}
                  onStartWork={handleSimpleStartWork}
                  onDeliver={handleSimpleDeliver}
                  onCancel={handleSimpleCancel}
                  onCompleteRevision={handleSimpleCompleteRevision}
                  onPlayVideo={handlePlayVideo}
                />
              )}

              {/* Offers Tab */}
              {activeTab === 'offers' && (
                <OffersTab
                  offers={offers}
                  loading={offersLoading}
                  actionLoading={orderActionLoading}
                  onAcceptOffer={(offerId) => handleOfferAction(offerId, 'accept')}
                  onRejectOffer={(offerId) => handleOfferAction(offerId, 'reject')}
                  onViewListing={(listingId) => navigate(`/marketplace/listing/${listingId}`)}
                />
              )}
            </>
          )}

          {/* Modals */}
          {/* Stripe Setup Modal */}
          {showStripeSetup && (
            <StripeSetupModal
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
            />
          )}

          {/* Order Details Modal */}
          {showOrderModal && selectedOrderId && (
            <OrderDetailsModal
              orderId={selectedOrderId}
              onClose={() => {
                setShowOrderModal(false);
                setSelectedOrderId(null);
              }}
              onStatusUpdate={() => {
                fetchSellerOrders();
                fetchDashboardData();
              }}
            />
          )}

          {/* Edit Listing Modal */}
          {showEditModal && editingListing && (
            <EditListingModal
              listing={editingListing}
              onClose={() => {
                setShowEditModal(false);
                setEditingListing(null);
              }}
              onSave={handleEditModalSave}
              loading={listingActionLoading === `edit-${editingListing._id}`}
            />
          )}

          {/* Delete Listing Modal */}
          {showDeleteModal && deletingListing && (
            <DeleteListingModal
              listing={deletingListing}
              onClose={() => {
                setShowDeleteModal(false);
                setDeletingListing(null);
              }}
              onConfirm={handleDeleteModalConfirm}
              loading={listingActionLoading === `delete-${deletingListing._id}`}
            />
          )}

          {/* Video Player Modal */}
          {showVideoModal && (
            <VideoPlayerModal
              videoUrl={currentVideoUrl}
              title={currentVideoTitle}
              onClose={() => setShowVideoModal(false)}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;