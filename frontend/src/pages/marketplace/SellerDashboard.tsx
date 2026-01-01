import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Import Layout component
import MarketplaceLayout from '../../components/Layout';

// Import helper function
import { getCurrentUserId } from '../../utilities/helperfFunction';

// Import API
import marketplaceApi from '../../api/marketplaceApi';

// Import components (keep your existing imports)
// ... existing component imports ...

// For now, create a simple formatCurrency function
const formatCurrency = (amount: number) => {
  // Convert cents to dollars
  const amountInDollars = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amountInDollars);
};

// Simple fallback components
const SimpleFallback = ({ name }: { name: string }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
    <p className="text-gray-600">Component "{name}" is loading...</p>
  </div>
);

// Use simple checks for components
const SafeDashboardHeader = (typeof DashboardHeader === 'function' || typeof DashboardHeader === 'object') ? DashboardHeader : () => <SimpleFallback name="DashboardHeader" />;
// ... other safe components ...

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
  amount: number; // in cents
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

interface EarningsBalance {
  availableBalance: number; // in cents
  pendingBalance: number; // in cents
  totalEarnings: number; // in cents
  totalWithdrawn: number; // in cents
  thisMonthRevenue: number; // in cents
  lastWithdrawal: string | null;
  nextPayoutDate: string;
  lifetimeRevenue?: number; // in cents
}

const SellerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [listingsData, setListingsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState<any>(null);
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
  
  // Earnings balance for EarningsTab
  const [earningsBalance, setEarningsBalance] = useState<EarningsBalance | null>(null);
  
  // Separate loading states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  // Track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // ✅ IMPROVED: Calculate order stats (amounts in cents)
  const calculateOrderStats = useCallback((orders: Order[]): OrderStats => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const thisMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === thisMonth && 
             orderDate.getFullYear() === thisYear;
    });

    // Calculate total revenue from ALL orders (not just completed)
    const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

    // Calculate pending revenue from active orders (in cents)
    const pendingRevenue = orders
      .filter(order => ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status))
      .reduce((sum, order) => sum + (order.amount || 0), 0);

    // Calculate this month revenue (in cents)
    const thisMonthRevenue = thisMonthOrders
      .reduce((sum, order) => sum + (order.amount || 0), 0);

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

  // ✅ NEW: Calculate earnings from orders with commission
  const calculateEarningsFromOrders = async (orders: Order[]) => {
    try {
      console.log('📊 Calculating earnings from orders:', orders.length);
      
      // Filter completed orders
      const completedOrders = orders.filter(order => 
        order.status === 'completed' || order.status === 'delivered'
      );
      
      // Filter pending orders
      const pendingOrders = orders.filter(order => 
        ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
      );
      
      // Calculate commission (10%)
      const commissionRate = 0.10; // 10% commission
      
      // Calculate earnings
      const completedEarnings = completedOrders.reduce((sum, order) => {
        const orderAmount = order.amount || 0;
        const commission = Math.round(orderAmount * commissionRate);
        return sum + (orderAmount - commission);
      }, 0);
      
      const pendingEarnings = pendingOrders.reduce((sum, order) => {
        const orderAmount = order.amount || 0;
        const commission = Math.round(orderAmount * commissionRate);
        return sum + (orderAmount - commission);
      }, 0);
      
      // Calculate this month revenue
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const thisMonthRevenue = completedOrders
        .filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate.getMonth() === thisMonth && 
                 orderDate.getFullYear() === thisYear;
        })
        .reduce((sum, order) => {
          const orderAmount = order.amount || 0;
          const commission = Math.round(orderAmount * commissionRate);
          return sum + (orderAmount - commission);
        }, 0);
      
      const earningsData: EarningsBalance = {
        availableBalance: completedEarnings,
        pendingBalance: pendingEarnings,
        totalEarnings: completedEarnings + pendingEarnings,
        totalWithdrawn: 0, // This should come from withdrawal history
        thisMonthRevenue: thisMonthRevenue,
        lastWithdrawal: null,
        nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lifetimeRevenue: completedEarnings + pendingEarnings
      };
      
      console.log('📈 Earnings calculated:', {
        completedEarnings: formatCurrency(completedEarnings),
        pendingEarnings: formatCurrency(pendingEarnings),
        thisMonthRevenue: formatCurrency(thisMonthRevenue),
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length
      });
      
      setEarningsBalance(earningsData);
      setOrderStats(prev => ({
        ...prev,
        availableBalance: earningsData.availableBalance
      }));
      
      return earningsData;
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return null;
    }
  };

  // ✅ Fetch earnings data for EarningsTab
  const fetchEarningsData = async () => {
    try {
      setEarningsLoading(true);
      console.log('📊 Fetching earnings data...');
      
      const currentUserId = getCurrentUserId();
      if (!currentUserId) return;
      
      // First try seller-specific earnings API
      try {
        const response = await marketplaceApi.earnings.getSellerEarningsDashboard(currentUserId);
        
        if (response.success && response.data) {
          const data = response.data;
          
          const earningsData: EarningsBalance = {
            availableBalance: data.availableBalance || 0,
            pendingBalance: data.pendingBalance || 0,
            totalEarnings: data.totalEarnings || 0,
            totalWithdrawn: data.totalWithdrawn || 0,
            thisMonthRevenue: data.thisMonthRevenue || 0,
            lastWithdrawal: data.lastWithdrawal || null,
            nextPayoutDate: data.nextPayoutDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            lifetimeRevenue: data.lifetimeRevenue || data.totalEarnings || 0
          };
          
          console.log('📈 Seller earnings from API:', earningsData);
          setEarningsBalance(earningsData);
          
          // Update order stats with available balance
          setOrderStats(prev => ({
            ...prev,
            availableBalance: earningsData.availableBalance
          }));
          
          return;
        }
      } catch (apiError) {
        console.log('Seller earnings API failed, trying regular API...');
      }
      
      // Fallback: Try regular earnings API
      try {
        const response = await marketplaceApi.earnings.getEarningsDashboard();
        
        if (response.success && response.data) {
          const data = response.data;
          
          const earningsData: EarningsBalance = {
            availableBalance: data.availableBalance || 0,
            pendingBalance: data.pendingBalance || 0,
            totalEarnings: data.totalEarnings || 0,
            totalWithdrawn: data.totalWithdrawn || 0,
            thisMonthRevenue: data.thisMonthRevenue || 0,
            lastWithdrawal: data.lastWithdrawal || null,
            nextPayoutDate: data.nextPayoutDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            lifetimeRevenue: data.lifetimeRevenue || data.totalEarnings || 0
          };
          
          console.log('📈 Earnings from regular API:', earningsData);
          setEarningsBalance(earningsData);
          
          // Update order stats with available balance
          setOrderStats(prev => ({
            ...prev,
            availableBalance: earningsData.availableBalance
          }));
          
          return;
        }
      } catch (regularError) {
        console.log('Regular earnings API also failed, calculating from orders...');
      }
      
      // Final fallback: Calculate from orders
      if (orders.length > 0) {
        await calculateEarningsFromOrders(orders);
      } else {
        // If no orders, fetch orders first
        await fetchSellerOrders(true);
      }
      
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      
      // Fallback to calculated earnings
      if (orders.length > 0) {
        await calculateEarningsFromOrders(orders);
      }
    } finally {
      setEarningsLoading(false);
    }
  };

  // ✅ Fetch seller orders with improved logic
  const fetchSellerOrders = async (forEarnings = false) => {
    try {
      if (!forEarnings) setOrdersLoading(true);
      
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        setError('User not authenticated');
        return;
      }
      
      console.log('🛒 Fetching orders for seller:', currentUserId);
      
      // Try seller-specific orders API first
      const response = await marketplaceApi.orders.getSellerOrders(currentUserId, {
        page: ordersPage,
        limit: 100, // Get more for earnings calculation
        status: ordersFilter !== 'all' ? ordersFilter : ''
      });
      
      if (response.success) {
        let ordersData = response.data?.orders || response.data || [];
        
        // Ensure it's an array
        if (!Array.isArray(ordersData)) {
          ordersData = [];
        }
        
        console.log(`✅ Found ${ordersData.length} orders for seller`);
        
        // Filter orders if needed (for orders tab only)
        let filteredOrders = ordersData;
        if (!forEarnings && ordersFilter !== 'all') {
          filteredOrders = ordersData.filter(order => order.status === ordersFilter);
        }
        
        // Paginate (for orders tab only)
        let paginatedOrders = filteredOrders;
        if (!forEarnings) {
          const startIndex = (ordersPage - 1) * ordersLimit;
          paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersLimit);
        }
        
        // Set orders
        setOrders(paginatedOrders);
        
        // Calculate stats from ALL orders (not just filtered/paginated)
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
        
        // Log order details for debugging
        console.log('📋 Order Details:', ordersData.map(order => ({
          id: order._id,
          amount: order.amount,
          status: order.status,
          sellerId: order.sellerId,
          buyerId: order.buyerId,
          title: order.listingTitle
        })));
        
        // If fetching for earnings, calculate earnings
        if (forEarnings) {
          await calculateEarningsFromOrders(ordersData);
        }
        
        return ordersData;
      } else {
        console.error('Failed to fetch seller orders:', response.error);
        
        // Fallback to getMySales
        const fallbackOrders = await marketplaceApi.orders.getMySales();
        if (Array.isArray(fallbackOrders) && fallbackOrders.length > 0) {
          console.log(`🔄 Fallback: Found ${fallbackOrders.length} orders from getMySales`);
          setOrders(fallbackOrders);
          const stats = calculateOrderStats(fallbackOrders);
          setOrderStats(stats);
          
          if (forEarnings) {
            await calculateEarningsFromOrders(fallbackOrders);
          }
          
          return fallbackOrders;
        }
        
        setError('No orders found. Please try again.');
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching seller orders:', error);
      setError('Failed to load orders. Please try again.');
      return [];
    } finally {
      if (!forEarnings) setOrdersLoading(false);
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

      console.log('📊 Fetching dashboard data for seller:', currentUserId);

      // Fetch orders for this seller
      const ordersData = await fetchSellerOrders(false);
      
      // Fetch offers and listings in parallel
      try {
        const [offersResponse, listingsResponse] = await Promise.allSettled([
          marketplaceApi.offers.getReceivedOffers(),
          marketplaceApi.listings.getMyListings({ limit: 5 })
        ]);

        // Process offers
        if (offersResponse.status === 'fulfilled' && offersResponse.value.success) {
          const offersData = offersResponse.value.offers || offersResponse.value.data || [];
          console.log('💌 Offers fetched:', offersData.length);
          setOffers(offersData);
        }

        // Process listings
        if (listingsResponse.status === 'fulfilled' && listingsResponse.value.success) {
          console.log('🏠 Listings fetched');
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

  // ✅ Check Stripe account status
  const checkStripeAccountStatus = async () => {
    try {
      console.log('🔍 Checking Stripe status...');
      
      // Try API first
      const response = await marketplaceApi.stripe.getStripeStatusSimple();
      
      if (response.success) {
        setStripeStatus(response.data);
        return response.data;
      } else {
        throw new Error('Stripe status API failed');
      }
    } catch (err: any) {
      console.warn('Stripe check failed:', err.message);
      // Return null or default status
      return null;
    }
  };

  // ✅ Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await fetchDashboardData();
      await checkStripeAccountStatus();
      
      // If earnings tab is active, also refresh earnings data
      if (activeTab === 'earnings') {
        await fetchEarningsData();
      }
      
      setSuccessMessage('Dashboard refreshed successfully!');
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
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

  // ✅ Fetch earnings data when earnings tab is active
  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarningsData();
    }
  }, [activeTab]);

  // Calculate stats for display
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing: any) => listing.status === 'active').length || 0;
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊', badge: null },
    { id: 'earnings', label: 'Earnings', icon: '💰', badge: null },
    { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings > 0 ? totalListings : null },
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders > 0 ? orderStats.activeOrders : null },
    { id: 'offers', label: 'Offers', icon: '💌', badge: pendingOffers > 0 ? pendingOffers : null },
    { id: 'withdraw', label: 'Withdraw', icon: '💸', badge: null }
  ];

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

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <SafeDashboardHeader
            title="Seller Dashboard"
            subtitle="Manage orders, track earnings, and grow your business"
            earnings={safeFormatCurrency(earningsBalance?.totalEarnings || orderStats.totalRevenue)}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            stripeStatus={stripeStatus}
            onCheckStripe={checkStripeAccountStatus}
          />

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

          {/* ✅ Navigation */}
          <SafeTabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Tab Content */}
          <div className="mt-2">
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
                    onClick: () => setShowStripeSetup(true),
                    visible: !stripeStatus?.chargesEnabled
                  }}
                />

                {/* Stats Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700">Total Orders</p>
                          <p className="text-2xl font-bold text-blue-900">{orderStats.totalOrders}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <span className="text-blue-600 text-xl">📦</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-900">{safeFormatCurrency(orderStats.totalRevenue)}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <span className="text-green-600 text-xl">💰</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-700">Available Balance</p>
                          <p className="text-2xl font-bold text-yellow-900">
                            {safeFormatCurrency(earningsBalance?.availableBalance || 0)}
                          </p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <span className="text-yellow-600 text-xl">💳</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-700">Active Listings</p>
                          <p className="text-2xl font-bold text-purple-900">{activeListings}</p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-lg">
                          <span className="text-purple-600 text-xl">🏠</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                {orders.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View All →
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orders.slice(0, 5).map((order) => (
                            <tr key={order._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{order._id.slice(-6)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.listingTitle || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                {safeFormatCurrency(order.amount || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-8 text-center">
                    <div className="text-5xl mb-4 text-gray-300">📦</div>
                    <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
                    <p className="mt-2 text-gray-500 mb-6">
                      Create listings to start receiving orders!
                    </p>
                    <button
                      onClick={() => navigate('/marketplace/create')}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
                    >
                      + Create Your First Listing
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Earnings Dashboard</h3>
                  <button
                    onClick={fetchEarningsData}
                    disabled={earningsLoading}
                    className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium rounded-lg transition duration-200 flex items-center"
                  >
                    {earningsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                        Refreshing...
                      </>
                    ) : (
                      'Refresh'
                    )}
                  </button>
                </div>

                {earningsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading earnings data...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Balance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-700">Available Balance</p>
                            <p className="text-3xl font-bold text-green-900 mt-2">
                              {safeFormatCurrency(earningsBalance?.availableBalance || 0)}
                            </p>
                            <p className="text-xs text-green-600 mt-1">Ready to withdraw</p>
                          </div>
                          <div className="bg-green-100 p-4 rounded-lg">
                            <span className="text-green-600 text-2xl">💰</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-yellow-700">Pending Balance</p>
                            <p className="text-3xl font-bold text-yellow-900 mt-2">
                              {safeFormatCurrency(earningsBalance?.pendingBalance || 0)}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">In progress orders</p>
                          </div>
                          <div className="bg-yellow-100 p-4 rounded-lg">
                            <span className="text-yellow-600 text-2xl">⏳</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700">Total Earnings</p>
                            <p className="text-3xl font-bold text-blue-900 mt-2">
                              {safeFormatCurrency(earningsBalance?.totalEarnings || 0)}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">Lifetime total</p>
                          </div>
                          <div className="bg-blue-100 p-4 rounded-lg">
                            <span className="text-blue-600 text-2xl">📈</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Withdraw Button */}
                    <div className="mb-8">
                      <button
                        onClick={() => setActiveTab('withdraw')}
                        disabled={(earningsBalance?.availableBalance || 0) <= 0}
                        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                          (earningsBalance?.availableBalance || 0) > 0
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {(earningsBalance?.availableBalance || 0) > 0
                          ? `Withdraw ${safeFormatCurrency(earningsBalance?.availableBalance || 0)}`
                          : 'No funds available to withdraw'
                        }
                      </button>
                    </div>

                    {/* Earnings Breakdown */}
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Earnings Breakdown</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Completed Orders Revenue</span>
                          <span className="font-semibold text-gray-900">
                            {safeFormatCurrency(orderStats.totalRevenue)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Platform Commission (10%)</span>
                          <span className="font-semibold text-red-600">
                            -{safeFormatCurrency(Math.round(orderStats.totalRevenue * 0.10))}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-900 font-medium">Your Earnings</span>
                            <span className="font-bold text-green-700 text-lg">
                              {safeFormatCurrency(earningsBalance?.availableBalance || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Orders Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Orders Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Orders</span>
                            <span className="font-semibold">{orderStats.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed Orders</span>
                            <span className="font-semibold text-green-600">{orderStats.completed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Active Orders</span>
                            <span className="font-semibold text-blue-600">{orderStats.activeOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cancelled Orders</span>
                            <span className="font-semibold text-red-600">{orderStats.cancelled}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Revenue Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">This Month</span>
                            <span className="font-semibold">{safeFormatCurrency(orderStats.thisMonthRevenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pending Revenue</span>
                            <span className="font-semibold text-yellow-600">{safeFormatCurrency(orderStats.pendingRevenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Withdrawn</span>
                            <span className="font-semibold text-purple-600">{safeFormatCurrency(earningsBalance?.totalWithdrawn || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Other tabs (listings, orders, offers, withdraw) remain similar to your existing code */}
            {activeTab === 'listings' && <SafeListingsTab /* props */ />}
            {activeTab === 'orders' && <SafeOrdersTab /* props */ />}
            {activeTab === 'offers' && <SafeOffersTab /* props */ />}
            {activeTab === 'withdraw' && <SafeWithdrawTab /* props */ />}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;