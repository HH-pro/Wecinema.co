// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Import Layout component
import MarketplaceLayout from '../../components/Layout';

// Import helper function
import { getCurrentUserId } from '../../utilities/helperfFunction';

// Import Direct Payments API
import paymentsApi from '../../../src/api/paymentsApi';

// Import other APIs
import marketplaceApi from '../../api/marketplaceApi';

// Access API methods
const listingsApi = marketplaceApi.listings;
const ordersApi = marketplaceApi.orders;
const offersApi = marketplaceApi.offers;

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

// Import tab components
import OffersTab from '../../components/marketplae/seller/OffersTab';
import ListingsTab from '../../components/marketplae/seller/ListingsTab';
import OrdersTab from '../../components/marketplae/seller/OrdersTab';
import WithdrawTab from '../../components/marketplae/seller/WithdrawTab';
import EarningsTab from '../../components/marketplae/seller/EarningsTab';

// Import modals
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import OrderDetailsModal from '../../components/marketplae/seller/OrderDetailsModal';
import EditListingModal from '../../components/marketplae/seller/EditListingModal';
import DeleteListingModal from '../../components/marketplae/seller/DeleteListingModal';
import VideoPlayerModal from '../../components/marketplae/seller/VideoPlayerModal';

// Simple fallback components
const SimpleFallback = ({ name }: { name: string }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
    <p className="text-gray-600">Component "{name}" is loading...</p>
  </div>
);

// Safe component imports
const SafeDashboardHeader = DashboardHeader || (() => <SimpleFallback name="DashboardHeader" />);
const SafeTabNavigation = TabNavigation || (() => <SimpleFallback name="TabNavigation" />);
const SafeWelcomeCard = WelcomeCard || (() => <SimpleFallback name="WelcomeCard" />);
const SafeStatsGrid = StatsGrid || (() => <SimpleFallback name="StatsGrid" />);
const SafeRecentOrders = RecentOrders || (() => <SimpleFallback name="RecentOrders" />);
const SafeActionCard = ActionCard || (() => <SimpleFallback name="ActionCard" />);
const SafeOrderWorkflowGuide = OrderWorkflowGuide || (() => <SimpleFallback name="OrderWorkflowGuide" />);
const SafeStripeAccountStatus = StripeAccountStatus || (() => <SimpleFallback name="StripeAccountStatus" />);
const SafeStripeSuccessAlert = StripeSuccessAlert || (() => <SimpleFallback name="StripeSuccessAlert" />);
const SafeOffersTab = OffersTab || (() => <SimpleFallback name="OffersTab" />);
const SafeListingsTab = ListingsTab || (() => <SimpleFallback name="ListingsTab" />);
const SafeOrdersTab = OrdersTab || (() => <SimpleFallback name="OrdersTab" />);
const SafeWithdrawTab = WithdrawTab || (() => <SimpleFallback name="WithdrawTab" />);
const SafeEarningsTab = EarningsTab || (() => <SimpleFallback name="EarningsTab" />);
const SafeStripeSetupModal = StripeSetupModal || (() => <SimpleFallback name="StripeSetupModal" />);
const SafeOrderDetailsModal = OrderDetailsModal || (() => <SimpleFallback name="OrderDetailsModal" />);
const SafeEditListingModal = EditListingModal || (() => <SimpleFallback name="EditListingModal" />);
const SafeDeleteListingModal = DeleteListingModal || (() => <SimpleFallback name="DeleteListingModal" />);
const SafeVideoPlayerModal = VideoPlayerModal || (() => <SimpleFallback name="VideoPlayerModal" />);

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
  amount: number; // in dollars
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
  totalRevenue: number; // in cents
  pendingRevenue: number; // in cents
  thisMonthOrders: number;
  thisMonthRevenue: number; // in cents
  availableBalance?: number; // in cents
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
  balance?: number; // in cents
  availableBalance?: number; // in cents
  pendingBalance?: number; // in cents
}

interface Withdrawal {
  _id: string;
  amount: number; // in cents
  status: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  destination?: string;
  description?: string;
}

interface WithdrawalHistory {
  withdrawals: Withdrawal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  balance?: {
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalWithdrawn: number;
  };
}

interface EarningsData {
  availableBalance: number; // in cents
  pendingBalance: number; // in cents
  totalEarnings: number; // in cents
  totalWithdrawn: number; // in cents
  thisMonthRevenue: number; // in cents
  lastWithdrawal: string | null;
  nextPayoutDate: string;
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
    thisMonthRevenue: 0,
    availableBalance: 0
  });
  
  // Earnings data
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  
  // Withdrawal states
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory | null>(null);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [withdrawalsLimit] = useState(10);
  
  // Separate loading states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
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
  const totalWithdrawals = withdrawalHistory?.withdrawals?.length || 0;

  // Tab configuration - WITH EARNINGS TAB
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { 
      id: 'earnings', 
      label: 'Earnings', 
      icon: '💰', 
      badge: earningsData?.availableBalance && earningsData.availableBalance > 0 ? 
        paymentsApi.formatCurrency(earningsData.availableBalance).replace('$', '') : 
        null 
    },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings > 0 ? totalListings : null },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders > 0 ? orderStats.activeOrders : null },
    { id: 'offers', label: 'Offers', icon: '💌', badge: pendingOffers > 0 ? pendingOffers : null },
    { id: 'withdraw', label: 'Withdraw', icon: '💸', badge: null }
  ];

  // Action Cards
  const [actionCards] = useState([
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

  // ✅ Get mock Stripe status for development
  const getMockStripeStatus = (): StripeStatus => {
    const savedStatus = localStorage.getItem('stripe_status');
    if (savedStatus) {
      return JSON.parse(savedStatus);
    }
    
    return {
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      status: 'not_connected',
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0
    };
  };

  // ✅ Handle mock Stripe connection for development
  const handleMockStripeConnect = () => {
    // Calculate total balance from completed orders (convert dollars to cents)
    const completedOrdersRevenue = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.amount * 100), 0); // Convert to cents
    
    // Calculate pending balance from active orders
    const pendingOrdersRevenue = orders
      .filter(order => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
      .reduce((sum, order) => sum + (order.amount * 100), 0);
    
    const mockStatus: StripeStatus = {
      connected: true,
      chargesEnabled: true,
      detailsSubmitted: true,
      status: 'active',
      accountId: 'acct_mock_' + Date.now(),
      email: 'seller@example.com',
      country: 'US',
      payoutsEnabled: true,
      name: 'Test Seller',
      balance: completedOrdersRevenue + pendingOrdersRevenue,
      availableBalance: completedOrdersRevenue,
      pendingBalance: pendingOrdersRevenue
    };
    
    localStorage.setItem('stripe_status', JSON.stringify(mockStatus));
    setStripeStatus(mockStatus);
    
    // Update earnings data with mock values
    setEarningsData({
      availableBalance: completedOrdersRevenue,
      pendingBalance: pendingOrdersRevenue,
      totalEarnings: completedOrdersRevenue,
      totalWithdrawn: 0,
      thisMonthRevenue: calculateThisMonthRevenue(orders),
      lastWithdrawal: null,
      nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    setShowStripeSuccessAlert(true);
    setSuccessMessage('Mock Stripe account connected successfully! You can now test payment features.');
    setShowStripeSetup(false);
    setError('');
    
    // Update order stats with available balance
    setOrderStats(prev => ({
      ...prev,
      availableBalance: completedOrdersRevenue
    }));
  };

  // Calculate this month's revenue from orders
  const calculateThisMonthRevenue = (orders: Order[]): number => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    return orders
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === thisMonth && 
               orderDate.getFullYear() === thisYear &&
               order.status === 'completed';
      })
      .reduce((sum, order) => sum + (order.amount * 100), 0); // Convert to cents
  };

  // ✅ Check URL params for Stripe return success
  useEffect(() => {
    const checkStripeReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const stripeStatus = urlParams.get('stripe');
      const accountId = urlParams.get('account_id');
      
      if (stripeStatus === 'success' && accountId) {
        console.log('✅ Stripe connected successfully via URL params');
        
        // Show success alert
        setShowStripeSuccessAlert(true);
        
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        
        // Update Stripe status
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

    // Calculate total revenue from completed orders (in cents)
    const totalRevenue = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.amount * 100), 0);

    // Calculate pending revenue from active orders (in cents)
    const pendingRevenue = orders
      .filter(order => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
      .reduce((sum, order) => sum + (order.amount * 100), 0);

    // Calculate this month revenue (in cents)
    const thisMonthRevenue = thisMonthOrders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.amount * 100), 0);

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
      totalRevenue,
      pendingRevenue,
      thisMonthOrders: thisMonthOrders.length,
      thisMonthRevenue
    };
  }, []);

  // ✅ Check Stripe account status with fallback to mock data
  const checkStripeAccountStatus = async (): Promise<StripeStatus | null> => {
    try {
      console.log('🔍 Checking Stripe status...');
      
      // Check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           process.env.NODE_ENV === 'development';
      
      // Always use mock data in development for now
      if (isDevelopment) {
        console.log('🛠️ Development mode: Using mock Stripe data');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const mockStatus = getMockStripeStatus();
        setStripeStatus(mockStatus);
        return mockStatus;
      }
      
      // Production: Try real API
      try {
        const response = await marketplaceApi.stripe.getStripeStatus();
        if (response.success) {
          setStripeStatus(response);
          return response;
        } else {
          throw new Error('Stripe status API failed');
        }
      } catch (apiError: any) {
        console.warn('API unavailable:', apiError.message);
        // Fall back to mock data
        const mockStatus = getMockStripeStatus();
        setStripeStatus(mockStatus);
        return mockStatus;
      }
      
    } catch (err: any) {
      console.warn('Stripe check failed:', err.message);
      const mockStatus = getMockStripeStatus();
      setStripeStatus(mockStatus);
      return mockStatus;
    }
  };

  // ✅ Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setLoading(false);
        navigate('/login');
        return;
      }

      // Check if ordersApi exists
      if (!ordersApi || typeof ordersApi.getMySales !== 'function') {
        console.error('ordersApi.getMySales is not available');
        setError('API configuration error. Please check your API setup.');
        setLoading(false);
        return;
      }

      // Fetch orders using API file
      const ordersData = await ordersApi.getMySales();
      
      if (ordersData && ordersData.length > 0) {
        const stats = calculateOrderStats(ordersData);
        setOrders(ordersData);
        setOrderStats(stats);
        
        // Update earnings data based on orders
        const completedRevenue = ordersData
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.amount * 100), 0);
        
        const pendingRevenue = ordersData
          .filter(order => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
          .reduce((sum, order) => sum + (order.amount * 100), 0);
        
        setEarningsData(prev => ({
          ...prev,
          availableBalance: completedRevenue,
          pendingBalance: pendingRevenue,
          totalEarnings: completedRevenue,
          thisMonthRevenue: calculateThisMonthRevenue(ordersData)
        }));
      } else {
        setOrders([]);
        setOrderStats({
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
          thisMonthRevenue: 0,
          availableBalance: 0
        });
      }

      // Fetch offers and listings in parallel with error handling
      try {
        const [offersResponse, listingsResponse] = await Promise.allSettled([
          offersApi?.getReceivedOffers ? offersApi.getReceivedOffers() : Promise.resolve({ success: false, offers: [] }),
          listingsApi?.getMyListings ? listingsApi.getMyListings({ limit: 5 }) : Promise.resolve({ success: false, listings: [] })
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
      } catch (fetchError) {
        console.warn('Error fetching offers/listings:', fetchError);
      }

      setInitialDataLoaded(true);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch earnings data using paymentsApi
  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      
      // Use paymentsApi to fetch earnings data
      const [balanceResponse, monthlyResponse, historyResponse] = await Promise.all([
        paymentsApi.getEarningsBalance(),
        paymentsApi.getMonthlyEarnings({ months: 6 }),
        paymentsApi.getEarningsHistory({ limit: 5 })
      ]);
      
      // Process balance data
      if (balanceResponse.success && balanceResponse.data) {
        setEarningsData(balanceResponse.data);
      }
      
      // Process monthly earnings
      if (monthlyResponse.success && monthlyResponse.data) {
        setMonthlyEarnings(monthlyResponse.data);
      }
      
      // Process earnings history
      if (historyResponse.success && historyResponse.data) {
        setEarningsHistory(historyResponse.data.earnings || []);
      }
      
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setEarningsLoading(false);
    }
  };

  // ✅ Handle "Go to Withdrawals" navigation
  const handleGoToWithdraw = () => {
    setActiveTab('withdraw');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ Fetch orders for OrdersTab
  const fetchSellerOrders = async () => {
    try {
      setOrdersLoading(true);
      
      if (!ordersApi || typeof ordersApi.getMySales !== 'function') {
        console.error('ordersApi.getMySales is not available');
        return;
      }
      
      const ordersData = await ordersApi.getMySales();
      
      if (ordersData && ordersData.length > 0) {
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
      setError('Failed to load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  };

  // ✅ Fetch listings
  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      
      if (!listingsApi || typeof listingsApi.getMyListings !== 'function') {
        console.error('listingsApi.getMyListings is not available');
        return;
      }
      
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
      } else {
        console.error('Failed to fetch listings:', response.error);
        setError('Failed to load listings. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError('Failed to load listings. Please try again.');
    } finally {
      setListingsLoading(false);
    }
  };

  // ✅ Fetch offers
  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      
      if (!offersApi || typeof offersApi.getReceivedOffers !== 'function') {
        console.error('offersApi.getReceivedOffers is not available');
        return;
      }
      
      const response = await offersApi.getReceivedOffers();
      
      if (response.success) {
        setOffers(response.offers || []);
      } else {
        console.error('Failed to fetch offers:', response.error);
        setError('Failed to load offers. Please try again.');
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      setError('Failed to load offers. Please try again.');
    } finally {
      setOffersLoading(false);
    }
  };

  // ✅ Fetch withdrawal history using paymentsApi
  const fetchWithdrawalHistory = async () => {
    try {
      setWithdrawalsLoading(true);
      
      const response = await paymentsApi.getWithdrawalHistory({
        page: withdrawalsPage,
        limit: withdrawalsLimit
      });
      
      if (response.success && response.data) {
        setWithdrawalHistory(response.data);
      } else {
        console.log('No withdrawal history found');
        setWithdrawalHistory({
          withdrawals: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1
          }
        });
      }
      
    } catch (error: any) {
      console.error('Error fetching withdrawal history:', error);
      setError('Failed to load withdrawal history. Please try again.');
      setWithdrawalHistory({
        withdrawals: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        }
      });
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // ✅ Handle withdrawal request using paymentsApi
  const handleWithdrawRequest = async (amountInCents: number) => {
    try {
      setRefreshing(true);
      
      const response = await paymentsApi.requestWithdrawal(amountInCents);
      
      if (response.success) {
        // Update Stripe balance
        setStripeStatus(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            availableBalance: (prev.availableBalance || 0) - amountInCents,
            balance: (prev.balance || 0) - amountInCents
          };
        });
        
        // Update earnings data
        setEarningsData(prev => prev ? {
          ...prev,
          availableBalance: prev.availableBalance - amountInCents,
          totalWithdrawn: prev.totalWithdrawn + amountInCents,
          lastWithdrawal: new Date().toISOString()
        } : null);
        
        setSuccessMessage(`Withdrawal request of ${paymentsApi.formatCurrency(amountInCents)} submitted successfully! Funds will arrive in 2-3 business days.`);
        
        // Refresh withdrawal history
        fetchWithdrawalHistory();
        fetchEarningsData();
      } else {
        setError(response.error || 'Failed to process withdrawal');
      }
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      setError('Failed to process withdrawal. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Handle Edit Listing
  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setShowEditModal(true);
  };

  const handleEditModalSave = async (updatedData: { title: string; description: string; price: number }) => {
    if (!editingListing || !listingsApi || typeof listingsApi.editListing !== 'function') return;

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
        setSuccessMessage('Listing updated successfully!');
        
        // Refresh listings after edit
        fetchListings();
      } else {
        console.log('Edit failed:', response.error);
        setError('Failed to update listing. Please try again.');
      }
    } catch (error: any) {
      console.error('Error updating listing:', error);
      setError('Failed to update listing. Please try again.');
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
    if (!deletingListing || !listingsApi || typeof listingsApi.deleteListing !== 'function') return;

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
        setSuccessMessage('Listing deleted successfully!');
        
        // Refresh listings after delete
        fetchListings();
      } else {
        console.log('Delete failed:', response.error);
        setError('Failed to delete listing. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Handle Toggle Listing Status
  const handleToggleListingStatus = async (listing: Listing) => {
    if (!listingsApi || typeof listingsApi.toggleListingStatus !== 'function') return;

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
        
        setSuccessMessage(`Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      } else {
        console.log('Toggle failed:', response.error);
        setError('Failed to update listing status. Please try again.');
      }
      
    } catch (error: any) {
      console.error('Error toggling listing status:', error);
      setError('Failed to update listing status. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Order management functions
  const handleSimpleStartProcessing = async (order: Order) => {
    if (!ordersApi || typeof ordersApi.updateOrderStatus !== 'function') return;

    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'processing');

      if (response.success) {
        updateOrderInState(order._id, 'processing', {
          processingAt: new Date().toISOString()
        });
        setSuccessMessage('Order is now being processed!');
      } else {
        setError('Failed to start processing. Please try again.');
      }
    } catch (error: any) {
      console.error('Error starting processing:', error);
      setError('Failed to start processing. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleStartWork = async (order: Order) => {
    if (!ordersApi || typeof ordersApi.updateOrderStatus !== 'function') return;

    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'in_progress');

      if (response.success) {
        updateOrderInState(order._id, 'in_progress', {
          startedAt: new Date().toISOString()
        });
        setSuccessMessage('Work started on order!');
      } else {
        setError('Failed to start work. Please try again.');
      }
    } catch (error: any) {
      console.error('Error starting work:', error);
      setError('Failed to start work. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleDeliver = async (order: Order) => {
    if (!ordersApi || typeof ordersApi.updateOrderStatus !== 'function') return;

    try {
      setSelectedOrder(order);
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'delivered');

      if (response.success) {
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
        setSuccessMessage('Order delivered successfully!');
      } else {
        setError('Failed to deliver order. Please try again.');
      }
    } catch (error: any) {
      console.error('Error delivering order:', error);
      setError('Failed to deliver order. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    if (!ordersApi || typeof ordersApi.updateOrderStatus !== 'function') return;

    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      try {
        setOrderActionLoading(order._id);
        
        const response = await ordersApi.updateOrderStatus(order._id, 'cancelled');

        if (response.success) {
          updateOrderInState(order._id, 'cancelled', {
            cancelledAt: new Date().toISOString()
          });
          setSuccessMessage('Order cancelled successfully!');
        } else {
          setError('Failed to cancel order. Please try again.');
        }
      } catch (error: any) {
        console.error('Error cancelling order:', error);
        setError('Failed to cancel order. Please try again.');
      } finally {
        setOrderActionLoading(null);
      }
    }
  };

  const handleSimpleCompleteRevision = async (order: Order) => {
    if (!ordersApi || typeof ordersApi.updateOrderStatus !== 'function') return;

    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'delivered');

      if (response.success) {
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
        setSuccessMessage('Revision completed and order delivered!');
      } else {
        setError('Failed to complete revision. Please try again.');
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
    if (!offersApi) return;

    try {
      setOrderActionLoading(offerId);
      
      let response;
      if (action === 'accept') {
        if (typeof offersApi.acceptOffer !== 'function') return;
        response = await offersApi.acceptOffer(offerId);
      } else {
        if (typeof offersApi.rejectOffer !== 'function') return;
        response = await offersApi.rejectOffer(offerId);
      }

      if (response.success) {
        setOffers(prev => prev.filter(offer => offer._id !== offerId));
        setSuccessMessage(`Offer ${action}ed successfully!`);
        
        // Refresh offers list
        fetchOffers();
      } else {
        setError(`Failed to ${action} offer. Please try again.`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing offer:`, error);
      setError(`Failed to ${action} offer. Please try again.`);
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    
    // In development, simulate successful connection
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      handleMockStripeConnect();
    } else {
      setTimeout(() => {
        checkStripeAccountStatus();
        fetchDashboardData();
      }, 1000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await fetchDashboardData();
      await checkStripeAccountStatus();
      setSuccessMessage('Dashboard refreshed successfully!');
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Handle open Stripe setup with development check
  const handleOpenStripeSetup = () => {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      const useMock = window.confirm(
        'Development Mode: Would you like to use a mock Stripe connection for testing?\n\nClick OK for mock connection or Cancel for real setup.'
      );
      
      if (useMock) {
        handleMockStripeConnect();
        return;
      }
    }
    
    setShowStripeSetup(true);
  };

  // ✅ Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchDashboardData(),
          checkStripeAccountStatus()
        ]);
      } catch (error) {
        console.error('Initial data loading error:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // ✅ Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings();
    } else if (activeTab === 'orders') {
      fetchSellerOrders();
    } else if (activeTab === 'offers') {
      fetchOffers();
    } else if (activeTab === 'withdraw') {
      fetchWithdrawalHistory();
    } else if (activeTab === 'earnings' && stripeStatus?.chargesEnabled) {
      fetchEarningsData();
    }
  }, [activeTab, listingsPage, listingsStatusFilter, ordersPage, ordersFilter, withdrawalsPage]);

  // Determine loading state
  const getCurrentLoadingState = () => {
    if (activeTab === 'overview') return loading && !initialDataLoaded;
    if (activeTab === 'earnings') return earningsLoading;
    if (activeTab === 'listings') return listingsLoading;
    if (activeTab === 'orders') return ordersLoading;
    if (activeTab === 'offers') return offersLoading;
    if (activeTab === 'withdraw') return withdrawalsLoading;
    return loading;
  };

  const currentLoading = getCurrentLoadingState();

  // Calculate total withdrawn amount in cents
  const totalWithdrawn = withdrawalHistory?.withdrawals?.reduce(
    (sum, w) => sum + (w.status === 'completed' ? w.amount : 0), 
    0
  ) || withdrawalHistory?.balance?.totalWithdrawn || 0;

  // Convert dollars to cents for display
  const totalRevenueInCents = orderStats.totalRevenue;
  const thisMonthRevenueInCents = orderStats.thisMonthRevenue;
  const pendingRevenueInCents = orderStats.pendingRevenue;

  // Show loading only on initial load
  if (loading && !initialDataLoaded) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800 font-medium">Loading your dashboard...</p>
            <p className="text-gray-600 mt-2">This may take a few moments</p>
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
          {showStripeSuccessAlert && (
            <SafeStripeSuccessAlert 
              show={showStripeSuccessAlert}
              onClose={() => setShowStripeSuccessAlert(false)}
            />
          )}

          {/* Header */}
          <SafeDashboardHeader
            title="Seller Dashboard"
            subtitle="Manage orders, track earnings, and grow your business"
            earnings={earningsData?.availableBalance ? paymentsApi.formatCurrency(earningsData.availableBalance) : '$0.00'}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            stripeStatus={stripeStatus}
            onCheckStripe={checkStripeAccountStatus}
          />

          {/* ✅ Development Mode Banner */}
          {(process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <span className="text-purple-600 text-xl">🛠️</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-purple-800">Development Mode</h3>
                    <p className="text-sm text-purple-700">
                      Using paymentsApi for withdrawals and earnings. Mock data available for testing.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!stripeStatus?.chargesEnabled ? (
                    <button
                      onClick={handleMockStripeConnect}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition duration-200 shadow-md hover:shadow"
                    >
                      Connect Mock Stripe
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const mockStatus: StripeStatus = {
                          connected: false,
                          chargesEnabled: false,
                          detailsSubmitted: false,
                          status: 'not_connected',
                          balance: 0,
                          availableBalance: 0,
                          pendingBalance: 0
                        };
                        localStorage.setItem('stripe_status', JSON.stringify(mockStatus));
                        setStripeStatus(mockStatus);
                        setSuccessMessage('Mock Stripe disconnected. You can reconnect anytime.');
                      }}
                      className="px-4 py-2 bg-white border border-purple-300 text-purple-600 hover:bg-purple-50 text-sm font-medium rounded-lg transition duration-200"
                    >
                      Disconnect Mock
                    </button>
                  )}
                  <button
                    onClick={checkStripeAccountStatus}
                    className="px-4 py-2 bg-white border border-purple-300 text-purple-600 hover:bg-purple-50 text-sm font-medium rounded-lg transition duration-200"
                  >
                    Refresh Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-green-600 mr-3 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800">{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ✅ Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 text-red-600 mr-3 flex-shrink-0">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ✅ Stripe Account Status (Only show if not connected) */}
          {!stripeStatus?.chargesEnabled && (
            <SafeStripeAccountStatus
              stripeStatus={stripeStatus}
              onSetupClick={handleOpenStripeSetup}
              isLoading={stripeStatus === null}
            />
          )}

          {/* ✅ Navigation */}
          <SafeTabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="mt-2">
            {currentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading {activeTab}...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Welcome Card */}
                    <SafeWelcomeCard
                      title="Welcome back, Seller! 👋"
                      subtitle="Manage your business efficiently with real-time insights and quick actions."
                      primaryAction={{
                        label: '+ Create New Listing',
                        onClick: () => navigate('/marketplace/create')
                      }}
                    />

                    {/* Stats Grid */}
                    <SafeStatsGrid
                      stats={{
                        totalRevenue: totalRevenueInCents,
                        totalOrders: orderStats.totalOrders,
                        activeOrders: orderStats.activeOrders,
                        pendingOffers: pendingOffers,
                        totalListings: totalListings,
                        activeListings: activeListings,
                        thisMonthRevenue: thisMonthRevenueInCents,
                        thisMonthOrders: orderStats.thisMonthOrders,
                        availableBalance: earningsData?.availableBalance || 0,
                        totalWithdrawn: totalWithdrawn
                      }}
                      onTabChange={setActiveTab}
                      formatCurrency={paymentsApi.formatCurrency}
                    />

                    {/* Order Workflow Guide */}
                    <SafeOrderWorkflowGuide />

                    {/* Recent Orders */}
                    {orders.length > 0 ? (
                      <SafeRecentOrders
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
                          {stripeStatus?.chargesEnabled 
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
                          {!stripeStatus?.chargesEnabled && (
                            <button
                              onClick={handleOpenStripeSetup}
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
                        <SafeActionCard
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

                {/* Earnings Tab */}
                {activeTab === 'earnings' && (
                  <SafeEarningsTab
                    stripeStatus={stripeStatus}
                    orderStats={orderStats}
                    balanceData={earningsData}
                    monthlyEarnings={monthlyEarnings}
                    earningsHistory={earningsHistory}
                    onWithdrawSuccess={handleWithdrawRequest}
                    loading={earningsLoading}
                    onRefresh={() => {
                      fetchEarningsData();
                      checkStripeAccountStatus();
                    }}
                    onGoToWithdraw={handleGoToWithdraw}
                    formatCurrency={paymentsApi.formatCurrency}
                  />
                )}

                {/* Offers Tab */}
                {activeTab === 'offers' && (
                  <SafeOffersTab
                    offers={offers}
                    loading={offersLoading}
                    onOfferAction={handleOfferAction}
                    onPlayVideo={handlePlayVideo}
                    onRefresh={() => fetchOffers()}
                    actionLoading={orderActionLoading}
                    onViewListing={(listingId) => navigate(`/marketplace/listing/${listingId}`)}
                  />
                )}

                {/* Listings Tab */}
                {activeTab === 'listings' && (
                  <SafeListingsTab
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
                    onViewListing={(id) => navigate(`/marketplace/listing/${id}`)}
                  />
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                  <SafeOrdersTab
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
                    onPageChange={setOrdersPage}
                    currentPage={ordersPage}
                    formatCurrency={paymentsApi.formatCurrency}
                  />
                )}

                {/* Withdraw Tab */}
                {activeTab === 'withdraw' && (
                  <SafeWithdrawTab
                    stripeStatus={stripeStatus}
                    withdrawalHistory={withdrawalHistory}
                    loading={withdrawalsLoading}
                    currentPage={withdrawalsPage}
                    onPageChange={setWithdrawalsPage}
                    onWithdrawRequest={handleWithdrawRequest}
                    onRefresh={() => fetchWithdrawalHistory()}
                    totalRevenue={totalRevenueInCents}
                    thisMonthRevenue={thisMonthRevenueInCents}
                    pendingRevenue={pendingRevenueInCents}
                    formatCurrency={paymentsApi.formatCurrency}
                  />
                )}
              </>
            )}
          </div>

          {/* Modals */}
          {showStripeSetup && (
            <SafeStripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={handleStripeSetupSuccess}
              stripeConnected={stripeStatus?.chargesEnabled || false}
            />
          )}

          {selectedOrderId && (
            <SafeOrderDetailsModal
              orderId={selectedOrderId}
              isOpen={showOrderModal}
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

          {showEditModal && editingListing && (
            <SafeEditListingModal
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
            <SafeDeleteListingModal
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
            <SafeVideoPlayerModal
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