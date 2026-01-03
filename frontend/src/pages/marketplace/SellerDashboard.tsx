// src/pages/seller/SellerDashboard.tsx - COMPLETE UPDATED VERSION WITH AUTO-REFRESH ON ACTIONS
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Import Layout component
import MarketplaceLayout from '../../components/Layout';

// Import helper function
import { getCurrentUserId } from '../../utilities/helperfFunction';

// Import API
import marketplaceApi, { 
  Listing, 
  Order, 
  Offer, 
  OrderStats as ApiOrderStats,
  SellerStats,
  SellerAccountStatus 
} from '../../api/marketplaceApi';

// Access API methods
const listingsApi = marketplaceApi.listings;
const ordersApi = marketplaceApi.orders;
const offersApi = marketplaceApi.offers;
const paymentsApi = marketplaceApi.payments;

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

// Define local interfaces
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
  availableBalance?: number;
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
  balance?: number;
  availableBalance?: number;
  pendingBalance?: number;
}

interface Withdrawal {
  _id: string;
  amount: number;
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
}

// For now, create a simple formatCurrency function
const formatCurrency = (amount: number) => {
  // If amount is less than 100, assume it's already in dollars
  if (amount < 100) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  // Otherwise, assume it's cents and convert to dollars
  const amountInDollars = amount / 100;
  return `$${amountInDollars.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// Simple fallback components
const SimpleFallback = ({ name }: { name: string }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
    <p className="text-gray-600">Component "{name}" is loading...</p>
  </div>
);

// Use simple checks for components
const SafeDashboardHeader = (typeof DashboardHeader === 'function' || typeof DashboardHeader === 'object') ? DashboardHeader : () => <SimpleFallback name="DashboardHeader" />;
const SafeTabNavigation = (typeof TabNavigation === 'function' || typeof TabNavigation === 'object') ? TabNavigation : () => <SimpleFallback name="TabNavigation" />;
const SafeWelcomeCard = (typeof WelcomeCard === 'function' || typeof WelcomeCard === 'object') ? WelcomeCard : () => <SimpleFallback name="WelcomeCard" />;
const SafeStatsGrid = (typeof StatsGrid === 'function' || typeof StatsGrid === 'object') ? StatsGrid : () => <SimpleFallback name="StatsGrid" />;
const SafeRecentOrders = (typeof RecentOrders === 'function' || typeof RecentOrders === 'object') ? RecentOrders : () => <SimpleFallback name="RecentOrders" />;
const SafeActionCard = (typeof ActionCard === 'function' || typeof ActionCard === 'object') ? ActionCard : () => <SimpleFallback name="ActionCard" />;
const SafeOrderWorkflowGuide = (typeof OrderWorkflowGuide === 'function' || typeof OrderWorkflowGuide === 'object') ? OrderWorkflowGuide : () => <SimpleFallback name="OrderWorkflowGuide" />;
const SafeStripeAccountStatus = (typeof StripeAccountStatus === 'function' || typeof StripeAccountStatus === 'object') ? StripeAccountStatus : () => <SimpleFallback name="StripeAccountStatus" />;
const SafeStripeSuccessAlert = (typeof StripeSuccessAlert === 'function' || typeof StripeSuccessAlert === 'object') ? StripeSuccessAlert : () => <SimpleFallback name="StripeSuccessAlert" />;
const SafeListingsTab = (typeof ListingsTab === 'function' || typeof ListingsTab === 'object') ? ListingsTab : () => <SimpleFallback name="ListingsTab" />;
const SafeOrdersTab = (typeof OrdersTab === 'function' || typeof OrdersTab === 'object') ? OrdersTab : () => <SimpleFallback name="OrdersTab" />;
const SafeWithdrawTab = (typeof WithdrawTab === 'function' || typeof WithdrawTab === 'object') ? WithdrawTab : () => <SimpleFallback name="WithdrawTab" />;
const SafeEarningsTab = (typeof EarningsTab === 'function' || typeof EarningsTab === 'object') ? EarningsTab : () => <SimpleFallback name="EarningsTab" />;
const SafeStripeSetupModal = (typeof StripeSetupModal === 'function' || typeof StripeSetupModal === 'object') ? StripeSetupModal : () => <SimpleFallback name="StripeSetupModal" />;
const SafeOrderDetailsModal = (typeof OrderDetailsModal === 'function' || typeof OrderDetailsModal === 'object') ? OrderDetailsModal : () => <SimpleFallback name="OrderDetailsModal" />;
const SafeEditListingModal = (typeof EditListingModal === 'function' || typeof EditListingModal === 'object') ? EditListingModal : () => <SimpleFallback name="EditListingModal" />;
const SafeDeleteListingModal = (typeof DeleteListingModal === 'function' || typeof DeleteListingModal === 'object') ? DeleteListingModal : () => <SimpleFallback name="DeleteListingModal" />;
const SafeVideoPlayerModal = (typeof VideoPlayerModal === 'function' || typeof VideoPlayerModal === 'object') ? VideoPlayerModal : () => <SimpleFallback name="VideoPlayerModal" />;

const SellerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState<SellerAccountStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showStripeSuccessAlert, setShowStripeSuccessAlert] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0); // ✅ NEW: For triggering refreshes
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
  
  // Seller stats from API
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  
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

  // Calculate derived stats
  const totalListings = listings.length;
  const activeListings = listings.filter(listing => listing.status === 'active').length;
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  const totalWithdrawals = withdrawalHistory?.withdrawals?.length || 0;

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'earnings', label: 'Earnings', icon: '💰', badge: null },
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

  // ✅ Calculate order stats from orders
  const calculateOrderStats = useCallback((orders: Order[]): OrderStats => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const thisMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === thisMonth && 
             orderDate.getFullYear() === thisYear;
    });

    // Calculate total revenue (amount is in cents)
    const totalRevenue = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.amount || 0), 0) / 100; // Convert cents to dollars

    // Calculate pending revenue
    const pendingRevenue = orders
      .filter(order => ['pending_payment', 'paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
      .reduce((sum, order) => sum + (order.amount || 0), 0) / 100;

    // Calculate this month revenue
    const thisMonthRevenue = thisMonthOrders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + (order.amount || 0), 0) / 100;

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(order => 
        ['pending_payment', 'paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
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
      thisMonthRevenue,
      availableBalance: stripeStatus?.account?.charges_enabled ? (stripeStatus.account.balance || 0) / 100 : 0
    };
  }, [stripeStatus]);

  // ✅ Check Stripe account status
  const checkStripeAccountStatus = async () => {
    try {
      console.log('🔍 Checking Stripe account status...');
      const response = await ordersApi.getSellerAccountStatus();
      
      if (response.success && response.data) {
        console.log('✅ Stripe status:', response.data);
        setStripeStatus(response.data);
      } else {
        console.warn('⚠️ Stripe status API failed:', response.error);
        // Set default status
        setStripeStatus({
          account: {
            id: '',
            business_type: '',
            business_profile: {},
            charges_enabled: false,
            payouts_enabled: false,
            details_submitted: false,
            capabilities: {},
            requirements: {
              currently_due: [],
              eventually_due: [],
              past_due: [],
              disabled_reason: ''
            }
          },
          status: {
            canReceivePayments: false,
            missingRequirements: [],
            needsAction: false,
            isActive: false
          },
          message: 'Please connect your Stripe account to receive payments'
        });
      }
    } catch (err: any) {
      console.error('❌ Error checking Stripe status:', err);
      setError('Failed to check Stripe account status. Please try again.');
    }
  };

  // ✅ Fetch seller statistics
  const fetchSellerStats = async () => {
    try {
      console.log('📊 Fetching seller stats...');
      const response = await ordersApi.getSellerStats();
      
      if (response.success && response.data) {
        console.log('✅ Seller stats:', response.data);
        setSellerStats(response.data);
      } else {
        console.warn('⚠️ Seller stats API failed:', response.error);
      }
    } catch (err: any) {
      console.error('❌ Error fetching seller stats:', err);
    }
  };

  // ✅ Fetch orders for seller
  const fetchSellerOrders = async () => {
    try {
      setOrdersLoading(true);
      
      console.log('📦 Fetching seller orders...');
      const response = await ordersApi.getMySales();
      
      if (response.success && response.data) {
        const ordersData = response.data.sales || [];
        console.log(`✅ Found ${ordersData.length} orders`);
        
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
        
        // Calculate stats
        const stats = calculateOrderStats(ordersData);
        
        // Merge with API stats if available
        const apiStats = response.data.stats;
        if (apiStats) {
          const mergedStats: OrderStats = {
            ...stats,
            totalOrders: apiStats.total || stats.totalOrders,
            totalRevenue: (apiStats.totalRevenue || 0) / 100, // Convert cents to dollars
            pendingRevenue: (apiStats.pendingRevenue || 0) / 100,
            thisMonthRevenue: (apiStats.thisMonthRevenue || 0) / 100
          };
          setOrderStats(mergedStats);
        } else {
          setOrderStats(stats);
        }
      } else {
        console.warn('⚠️ No orders found or API error:', response.error);
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
    } catch (error: any) {
      console.error('❌ Error fetching seller orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  };

  // SellerDashboard.tsx - SIMPLIFIED fetchListings

const fetchListings = async () => {
  try {
    setListingsLoading(true);
    setError('');
    
    console.log('🏠 Fetching seller listings...');
    
    const params = {
      page: listingsPage,
      limit: listingsLimit,
      status: listingsStatusFilter || undefined
    };
    
    console.log('📋 Fetch params:', params);
    
    const response = await listingsApi.getMyListings(params);
    
    console.log('📦 API Response:', {
      success: response.success,
      hasData: !!response.data,
      hasListings: !!response.data?.listings || !!response.data?.data?.listings
    });
    
    if (response.success) {
      // ✅ Handle both response formats
      let listingsData: Listing[] = [];
      
      if (response.data?.listings) {
        // Direct format: { listings: [], pagination: {} }
        listingsData = response.data.listings;
      } else if (response.data?.data?.listings) {
        // Nested format: { data: { listings: [], pagination: {} } }
        listingsData = response.data.data.listings;
      }
      
      console.log(`✅ Loaded ${listingsData.length} listings`);
      setListings(listingsData);
      
      if (listingsData.length === 0) {
        setSuccessMessage('No listings found. Create your first listing!');
      }
    } else {
      console.warn('⚠️ API returned error:', response.error);
      setListings([]);
      setError(response.error || 'Failed to load listings');
    }
    
  } catch (error: any) {
    console.error('❌ Error in fetchListings:', error);
    setListings([]);
    setError('Failed to load listings');
  } finally {
    setListingsLoading(false);
  }
};
  // ✅ Fetch offers received
  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      
      console.log('💌 Fetching received offers...');
      const response = await offersApi.getReceivedOffers();
      
      if (response.success && response.data) {
        const offersData = response.data.offers || [];
        console.log(`✅ Found ${offersData.length} offers`);
        setOffers(offersData);
      } else {
        console.warn('⚠️ No offers found or API error:', response.error);
        setOffers([]);
        setError('Failed to load offers. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching offers:', error);
      setError('Failed to load offers. Please try again.');
    } finally {
      setOffersLoading(false);
    }
  };

  // ✅ Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    try {
      setWithdrawalsLoading(true);
      
      // For now, use mock data since we don't have a withdrawals API
      console.log('💸 Fetching withdrawal history...');
      
      // Mock withdrawal data
      const mockWithdrawals: Withdrawal[] = [
        {
          _id: '1',
          amount: 5000,
          status: 'completed',
          stripeTransferId: 'tr_123',
          stripePayoutId: 'po_123',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'Bank Account •••• 4321',
          description: 'Weekly withdrawal'
        },
        {
          _id: '2',
          amount: 3000,
          status: 'pending',
          stripeTransferId: 'tr_456',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          destination: 'Bank Account •••• 4321',
          description: 'Withdrawal request'
        }
      ];
      
      setWithdrawalHistory({
        withdrawals: mockWithdrawals,
        pagination: {
          page: 1,
          limit: 10,
          total: mockWithdrawals.length,
          pages: 1
        }
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching withdrawal history:', error);
      setError('Failed to load withdrawal history. Please try again.');
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // ✅ ✅ ✅ MAJOR UPDATE: Function to refresh specific data after actions
  const refreshDataAfterAction = async (actionType: 'listing' | 'order' | 'offer' | 'stripe' | 'withdrawal') => {
    console.log(`🔄 Refreshing data after ${actionType} action...`);
    
    try {
      // Always refresh stats and Stripe status
      await Promise.all([
        fetchSellerStats(),
        checkStripeAccountStatus()
      ]);

      // Refresh specific data based on action type
      switch (actionType) {
        case 'listing':
          await fetchListings();
          break;
        case 'order':
          await fetchSellerOrders();
          break;
        case 'offer':
          await fetchOffers();
          break;
        case 'withdrawal':
          await fetchWithdrawalHistory();
          break;
      }

      // Also refresh current tab data
      if (activeTab === 'overview') {
        // For overview tab, refresh all relevant data
        await Promise.all([
          fetchSellerOrders(),
          fetchListings(),
          fetchOffers()
        ]);
      } else if (activeTab === 'listings') {
        await fetchListings();
      } else if (activeTab === 'orders') {
        await fetchSellerOrders();
      } else if (activeTab === 'offers') {
        await fetchOffers();
      } else if (activeTab === 'withdraw') {
        await fetchWithdrawalHistory();
      }

      console.log(`✅ ${actionType} data refreshed successfully`);
    } catch (error) {
      console.error(`❌ Error refreshing ${actionType} data:`, error);
    }
  };

  // ✅ Fetch all dashboard data
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

      console.log('🚀 Fetching dashboard data...');
      
      // Fetch data in parallel
      await Promise.all([
        fetchSellerOrders(),
        fetchListings(),
        fetchOffers(),
        fetchSellerStats(),
        checkStripeAccountStatus()
      ]);

      setInitialDataLoaded(true);
      console.log('✅ Dashboard data loaded successfully');

    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle withdrawal request - UPDATED with auto-refresh
  const handleWithdrawRequest = async (amount: number) => {
    try {
      setRefreshing(true);
      
      // Convert amount to cents
      const amountInCents = amount * 100;
      
      // For now, show success message
      const mockWithdrawal: Withdrawal = {
        _id: Date.now().toString(),
        amount: amountInCents,
        status: 'pending',
        stripeTransferId: 'tr_mock_' + Date.now(),
        createdAt: new Date().toISOString(),
        destination: 'Bank Account •••• 4321',
        description: `Withdrawal of $${amount.toFixed(2)}`
      };
      
      // Add to history
      setWithdrawalHistory(prev => {
        if (!prev) {
          return {
            withdrawals: [mockWithdrawal],
            pagination: { page: 1, limit: 10, total: 1, pages: 1 }
          };
        }
        
        return {
          ...prev,
          withdrawals: [mockWithdrawal, ...prev.withdrawals],
          pagination: {
            ...prev.pagination,
            total: (prev.pagination?.total || 0) + 1
          }
        };
      });
      
      setSuccessMessage(`Withdrawal request of $${amount.toFixed(2)} submitted successfully! Funds will arrive in 2-3 business days.`);
      
      // ✅ AUTO-REFRESH after withdrawal
      setTimeout(() => {
        refreshDataAfterAction('withdrawal');
        setRefreshCounter(prev => prev + 1);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error processing withdrawal:', error);
      setError('Failed to process withdrawal. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Handle Edit Listing - UPDATED with auto-refresh
  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setShowEditModal(true);
  };

  const handleEditModalSave = async (updatedData: { title: string; description: string; price: number }) => {
    if (!editingListing) return;

    try {
      setListingActionLoading(`edit-${editingListing._id}`);
      
      const response = await listingsApi.editListing(editingListing._id, updatedData);

      if (response.success && response.data) {
        // Update local state
        setListings(prev => prev.map(listing => 
          listing._id === editingListing._id 
            ? { ...listing, ...updatedData, ...response.data?.listing }
            : listing
        ));
        
        setShowEditModal(false);
        setEditingListing(null);
        setSuccessMessage('Listing updated successfully!');
        
        // ✅ AUTO-REFRESH after edit
        setTimeout(() => {
          refreshDataAfterAction('listing');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to update listing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error updating listing:', error);
      setError('Failed to update listing. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Handle Delete Listing - UPDATED with auto-refresh
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
        // Remove from local state
        setListings(prev => prev.filter(listing => listing._id !== deletingListing._id));
        
        setShowDeleteModal(false);
        setDeletingListing(null);
        setSuccessMessage('Listing deleted successfully!');
        
        // ✅ AUTO-REFRESH after delete
        setTimeout(() => {
          refreshDataAfterAction('listing');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to delete listing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error deleting listing:', error);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Handle Toggle Listing Status - UPDATED with auto-refresh
  const handleToggleListingStatus = async (listing: Listing) => {
    try {
      setListingActionLoading(`toggle-${listing._id}`);

      const response = await listingsApi.toggleListingStatus(listing._id);

      if (response.success && response.data) {
        const updatedListing = response.data.listing;
        
        // Update local state
        setListings(prev => prev.map(l => 
          l._id === listing._id ? { ...l, ...updatedListing } : l
        ));
        
        setSuccessMessage(`Listing ${updatedListing.status === 'active' ? 'activated' : 'deactivated'} successfully!`);
        
        // ✅ AUTO-REFRESH after status change
        setTimeout(() => {
          refreshDataAfterAction('listing');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to update listing status. Please try again.');
      }
      
    } catch (error: any) {
      console.error('❌ Error toggling listing status:', error);
      setError('Failed to update listing status. Please try again.');
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Order management functions - ALL UPDATED with auto-refresh
  const handleSimpleStartProcessing = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'processing');

      if (response.success && response.data) {
        // Update local state
        setOrders(prev => prev.map(o => 
          o._id === order._id 
            ? { ...o, status: 'processing', ...response.data?.order }
            : o
        ));
        
        setSuccessMessage('Order is now being processed!');
        
        // ✅ AUTO-REFRESH after order status change
        setTimeout(() => {
          refreshDataAfterAction('order');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to start processing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error starting processing:', error);
      setError('Failed to start processing. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleStartWork = async (order: Order) => {
    try {
      setOrderActionLoading(order._id);
      
      const response = await ordersApi.updateOrderStatus(order._id, 'in_progress');

      if (response.success && response.data) {
        setOrders(prev => prev.map(o => 
          o._id === order._id 
            ? { ...o, status: 'in_progress', ...response.data?.order }
            : o
        ));
        
        setSuccessMessage('Work started on order!');
        
        // ✅ AUTO-REFRESH after order status change
        setTimeout(() => {
          refreshDataAfterAction('order');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to start work. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error starting work:', error);
      setError('Failed to start work. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleDeliver = async (order: Order) => {
    try {
      setSelectedOrder(order);
      setOrderActionLoading(order._id);
      
      // For delivery, we need to call the deliver endpoint with delivery data
      const deliveryData = {
        deliveryMessage: 'Your order is ready!',
        isFinalDelivery: true
      };
      
      const response = await ordersApi.deliverOrder(order._id, deliveryData);

      if (response.success && response.data) {
        setOrders(prev => prev.map(o => 
          o._id === order._id 
            ? { ...o, status: 'delivered', ...response.data?.order }
            : o
        ));
        
        setSuccessMessage('Order delivered successfully!');
        
        // ✅ AUTO-REFRESH after delivery
        setTimeout(() => {
          refreshDataAfterAction('order');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || 'Failed to deliver order. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error delivering order:', error);
      setError('Failed to deliver order. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    if (window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      try {
        setOrderActionLoading(order._id);
        
        const response = await ordersApi.cancelOrderBySeller(order._id, 'Seller requested cancellation');

        if (response.success && response.data) {
          setOrders(prev => prev.map(o => 
            o._id === order._id 
              ? { ...o, status: 'cancelled', ...response.data?.order }
              : o
          ));
          
          setSuccessMessage('Order cancelled successfully!');
          
          // ✅ AUTO-REFRESH after cancellation
          setTimeout(() => {
            refreshDataAfterAction('order');
            setRefreshCounter(prev => prev + 1);
          }, 300);
          
        } else {
          setError(response.error || 'Failed to cancel order. Please try again.');
        }
      } catch (error: any) {
        console.error('❌ Error cancelling order:', error);
        setError('Failed to cancel order. Please try again.');
      } finally {
        setOrderActionLoading(null);
      }
    }
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

  // ✅ Handle offer actions - UPDATED with auto-refresh
  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setOrderActionLoading(offerId);
      
      let response;
      if (action === 'accept') {
        response = await offersApi.acceptOffer(offerId);
      } else {
        response = await offersApi.rejectOffer(offerId, 'Seller rejected the offer');
      }

      if (response.success && response.data) {
        // Remove offer from list
        setOffers(prev => prev.filter(offer => offer._id !== offerId));
        setSuccessMessage(`Offer ${action}ed successfully!`);
        
        // ✅ AUTO-REFRESH after offer action
        setTimeout(() => {
          refreshDataAfterAction('offer');
          setRefreshCounter(prev => prev + 1);
        }, 300);
        
      } else {
        setError(response.error || `Failed to ${action} offer. Please try again.`);
      }
    } catch (error: any) {
      console.error(`❌ Error ${action}ing offer:`, error);
      setError(`Failed to ${action} offer. Please try again.`);
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    setShowStripeSuccessAlert(true);
    setSuccessMessage('Stripe account connected successfully! You can now receive payments.');
    
    // ✅ AUTO-REFRESH after Stripe setup
    setTimeout(() => {
      refreshDataAfterAction('stripe');
      setRefreshCounter(prev => prev + 1);
    }, 1500);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await fetchDashboardData();
      setSuccessMessage('Dashboard refreshed successfully!');
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('❌ Refresh error:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ Handle open Stripe setup
  const handleOpenStripeSetup = () => {
    setShowStripeSetup(true);
  };

  // ✅ Initial data loading
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ✅ Fetch data when tab changes OR when refreshCounter changes
  useEffect(() => {
    if (activeTab === 'listings') {
      fetchListings();
    } else if (activeTab === 'orders') {
      fetchSellerOrders();
    } else if (activeTab === 'offers') {
      fetchOffers();
    } else if (activeTab === 'withdraw') {
      fetchWithdrawalHistory();
    }
  }, [activeTab, listingsPage, listingsStatusFilter, ordersPage, ordersFilter, withdrawalsPage, refreshCounter]); // ✅ Added refreshCounter dependency

  // Determine loading state
  const getCurrentLoadingState = () => {
    if (activeTab === 'overview') return loading && !initialDataLoaded;
    if (activeTab === 'earnings') return false;
    if (activeTab === 'listings') return listingsLoading;
    if (activeTab === 'orders') return ordersLoading;
    if (activeTab === 'offers') return offersLoading;
    if (activeTab === 'withdraw') return withdrawalsLoading;
    return loading;
  };

  const currentLoading = getCurrentLoadingState();

  // Calculate total withdrawn amount
  const totalWithdrawn = withdrawalHistory?.withdrawals?.reduce(
    (sum, w) => sum + (w.status === 'completed' ? w.amount : 0), 
    0
  ) || 0;

  // Prepare stats for StatsGrid
  const statsForGrid = {
    totalRevenue: orderStats.totalRevenue,
    totalOrders: orderStats.totalOrders,
    activeOrders: orderStats.activeOrders,
    pendingOffers: pendingOffers,
    totalListings: totalListings,
    activeListings: activeListings,
    thisMonthRevenue: orderStats.thisMonthRevenue,
    thisMonthOrders: orderStats.thisMonthOrders,
    availableBalance: orderStats.availableBalance || 0,
    totalWithdrawn: totalWithdrawn / 100 // Convert cents to dollars
  };

  // ✅ NEW: Auto-refresh indicator
  const [showAutoRefreshIndicator, setShowAutoRefreshIndicator] = useState(false);

  // Show auto-refresh indicator briefly when refreshCounter changes
  useEffect(() => {
    if (refreshCounter > 0) {
      setShowAutoRefreshIndicator(true);
      const timer = setTimeout(() => {
        setShowAutoRefreshIndicator(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [refreshCounter]);

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

  // Safe currency formatting function
  const safeFormatCurrency = (amount: number) => {
    return formatCurrency(amount);
  };

  // Helper to get buyer name from order
  const getBuyerName = (order: Order): string => {
    if (typeof order.buyerId === 'object' && order.buyerId.username) {
      return order.buyerId.username;
    }
    return 'Unknown Buyer';
  };

  // Helper to get listing title from order
  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId.title) {
      return order.listingId.title;
    }
    return 'Unknown Listing';
  };

  // Prepare orders for RecentOrders component
  const recentOrdersForDisplay = orders.slice(0, 5).map(order => ({
    ...order,
    buyerName: getBuyerName(order),
    listingTitle: getListingTitle(order)
  }));

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ✅ Auto-Refresh Indicator */}
          {showAutoRefreshIndicator && (
            <div className="fixed top-4 right-4 z-50 animate-bounce">
              <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center">
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Data Updated!</span>
              </div>
            </div>
          )}

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
            earnings={safeFormatCurrency(orderStats.totalRevenue)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            stripeStatus={{
              connected: stripeStatus?.account?.charges_enabled || false,
              chargesEnabled: stripeStatus?.account?.charges_enabled || false,
              detailsSubmitted: stripeStatus?.account?.details_submitted || false,
              status: stripeStatus?.account?.charges_enabled ? 'active' : 'inactive',
              availableBalance: stripeStatus?.account?.balance || 0
            }}
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
                      Using real API data. Auto-refresh enabled on all actions.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-white border border-purple-300 text-purple-600 hover:bg-purple-50 text-sm font-medium rounded-lg transition duration-200"
                  >
                    Refresh Data
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
          {!stripeStatus?.account?.charges_enabled && (
            <SafeStripeAccountStatus
              stripeStatus={{
                connected: stripeStatus?.account?.charges_enabled || false,
                chargesEnabled: stripeStatus?.account?.charges_enabled || false,
                detailsSubmitted: stripeStatus?.account?.details_submitted || false,
                status: stripeStatus?.account?.charges_enabled ? 'active' : 'inactive'
              }}
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
                      secondaryAction={{
                        label: '💰 Setup Payments',
                        onClick: handleOpenStripeSetup,
                        visible: !stripeStatus?.account?.charges_enabled
                      }}
                    />

                    {/* Stats Grid */}
                    <SafeStatsGrid
                      stats={statsForGrid}
                      onTabChange={setActiveTab}
                    />

                    {/* Order Workflow Guide */}
                    <SafeOrderWorkflowGuide />

                    {/* Recent Orders */}
                    {orders.length > 0 ? (
                      <SafeRecentOrders
                        orders={recentOrdersForDisplay}
                        onViewOrderDetails={handleViewOrderDetails}
                        onStartProcessing={handleSimpleStartProcessing}
                        onStartWork={handleSimpleStartWork}
                        onDeliver={handleSimpleDeliver}
                        onCancel={handleSimpleCancel}
                        onCompleteRevision={() => {}}
                        onViewAll={() => setActiveTab('orders')}
                        onCreateListing={() => navigate('/marketplace/create')}
                        orderActionLoading={orderActionLoading}
                      />
                    ) : (
                      <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-8 text-center">
                        <div className="text-5xl mb-4 text-gray-300">📦</div>
                        <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
                        <p className="mt-2 text-gray-500 mb-6">
                          {stripeStatus?.account?.charges_enabled 
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
                          {!stripeStatus?.account?.charges_enabled && (
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
                    stripeStatus={{
                      connected: stripeStatus?.account?.charges_enabled || false,
                      chargesEnabled: stripeStatus?.account?.charges_enabled || false,
                      detailsSubmitted: stripeStatus?.account?.details_submitted || false,
                      status: stripeStatus?.account?.charges_enabled ? 'active' : 'inactive',
                      balance: stripeStatus?.account?.balance || 0,
                      availableBalance: stripeStatus?.account?.balance || 0,
                      pendingBalance: 0
                    }}
                    orderStats={orderStats}
                    sellerStats={sellerStats}
                    onWithdrawRequest={handleWithdrawRequest}
                    loading={earningsLoading}
                    onRefresh={checkStripeAccountStatus}
                  />
                )}

                {/* Listings Tab */}
              // SellerDashboard.tsx mein ListingsTab section update karein

{/* Listings Tab */}
{activeTab === 'listings' && (
  <SafeListingsTab
    // ✅ CHANGE THIS: listings prop ko listingsData ki jagah
    listingsData={{
      listings: listings,
      pagination: {
        page: listingsPage,
        limit: listingsLimit,
        total: listings.length,
        pages: Math.ceil(listings.length / listingsLimit)
      }
    }}
    loading={listingsLoading}
    statusFilter={listingsStatusFilter}
    currentPage={listingsPage}
    totalPages={Math.ceil(listings.length / listingsLimit)}
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

                {/* Withdraw Tab */}
                {activeTab === 'withdraw' && (
                  <SafeWithdrawTab
                    stripeStatus={{
                      connected: stripeStatus?.account?.charges_enabled || false,
                      chargesEnabled: stripeStatus?.account?.charges_enabled || false,
                      detailsSubmitted: stripeStatus?.account?.details_submitted || false,
                      status: stripeStatus?.account?.charges_enabled ? 'active' : 'inactive',
                      balance: stripeStatus?.account?.balance || 0,
                      availableBalance: stripeStatus?.account?.balance || 0,
                      pendingBalance: 0
                    }}
                    withdrawalHistory={withdrawalHistory}
                    loading={withdrawalsLoading}
                    currentPage={withdrawalsPage}
                    onPageChange={setWithdrawalsPage}
                    onWithdrawRequest={handleWithdrawRequest}
                    onRefresh={() => fetchWithdrawalHistory()}
                    totalRevenue={orderStats.totalRevenue}
                    thisMonthRevenue={orderStats.thisMonthRevenue}
                    pendingRevenue={orderStats.pendingRevenue}
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
              stripeConnected={stripeStatus?.account?.charges_enabled || false}
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
                fetchSellerStats();
                setRefreshCounter(prev => prev + 1);
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