// src/pages/seller/SellerDashboard.tsx - COMPLETE WORKING VERSION
import React, { useState, useEffect, useCallback } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import { formatCurrency } from '../../api';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Import components
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
  status: 'active' | 'inactive' | 'draft' | 'sold';
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
    { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders > 0 ? orderStats.activeOrders : null }
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

  // ✅ FIXED: Handle Delete Listing
  const handleDeleteListing = async (listing: Listing) => {
    try {
      console.log('🗑️ Delete listing request:', listing._id);
      
      if (!window.confirm(`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`)) {
        return;
      }

      setListingActionLoading(`delete-${listing._id}`);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setListingActionLoading(null);
        return;
      }

      console.log('🔗 Calling DELETE endpoint...');

      const response = await axios.delete(
        `${API_BASE_URL}/marketplace/listing/${listing._id}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('📦 Delete response:', response.data);

      if (response.data.success) {
        const successMsg = `✅ Listing "${listing.title}" deleted successfully!`;
        console.log('✅ Success:', successMsg);
        setSuccessMessage(successMsg);
        
        // Remove listing from state
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.filter(l => l._id !== listing._id);
          
          return {
            ...prev,
            listings: updatedListings,
            pagination: {
              ...prev.pagination,
              total: (prev.pagination?.total || 1) - 1
            }
          };
        });
        
        // Refresh listings after 1 second
        setTimeout(() => {
          fetchListings();
        }, 1000);
        
      } else {
        const errorMsg = response.data.error || 'Failed to delete listing';
        console.error('❌ Delete error:', errorMsg);
        setError(`❌ ${errorMsg}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error deleting listing:', error);
      
      if (error.response) {
        const errorMsg = error.response.data?.error || 
                        error.response.data?.message || 
                        `Server error: ${error.response.status}`;
        setError(`❌ ${errorMsg}`);
      } else if (error.request) {
        setError('❌ No response from server. Please check your network connection.');
      } else {
        setError(`❌ Failed to delete listing: ${error.message}`);
      }
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ FIXED: Handle Toggle Listing Status (Activate/Deactivate)
  const handleToggleListingStatus = async (listing: Listing) => {
    try {
      console.log('🔄 Toggle listing status request:', {
        id: listing._id,
        title: listing.title,
        currentStatus: listing.status
      });

      setListingActionLoading(`toggle-${listing._id}`);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setListingActionLoading(null);
        return;
      }

      console.log('🔗 Calling POST endpoint...');

      const response = await axios.post(
        `${API_BASE_URL}/marketplace/listing/${listing._id}/toggle-status`,
        {},
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('📦 Toggle response:', response.data);

      if (response.data.success) {
        const action = response.data.newStatus === 'active' ? 'activated' : 'deactivated';
        const successMsg = `✅ Listing "${listing.title}" ${action} successfully!`;
        console.log('✅ Success:', successMsg);
        setSuccessMessage(successMsg);
        
        // Update listing in state
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.map(l => {
            if (l._id === listing._id) {
              return {
                ...l,
                status: response.data.newStatus,
                updatedAt: response.data.listing?.updatedAt || new Date().toISOString()
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
        const errorMsg = response.data.error || 'Failed to update listing status';
        console.error('❌ Toggle error:', errorMsg);
        setError(`❌ ${errorMsg}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error toggling listing status:', error);
      
      if (error.response) {
        console.error('Error details:', {
          status: error.response.status,
          data: error.response.data,
          url: error.response.config?.url
        });
        
        const errorMsg = error.response.data?.error || 
                        error.response.data?.message || 
                        `Server error: ${error.response.status}`;
        setError(`❌ ${errorMsg}`);
      } else if (error.request) {
        setError('❌ No response from server. Please check your network connection.');
      } else {
        setError(`❌ Failed to toggle listing: ${error.message}`);
      }
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ FIXED: Handle Edit Listing (Simple prompt version)
  const handleEditListing = async (listing: Listing) => {
    try {
      console.log('✏️ Edit listing request:', listing._id);
      
      // Show prompts for editing
      const newTitle = prompt('Enter new title:', listing.title);
      if (!newTitle || newTitle.trim() === '') {
        alert('Title cannot be empty');
        return;
      }

      const newDescription = prompt('Enter new description:', listing.description);
      if (!newDescription || newDescription.trim() === '') {
        alert('Description cannot be empty');
        return;
      }

      const newPrice = prompt('Enter new price:', listing.price.toString());
      if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
        alert('Please enter a valid price');
        return;
      }

      setListingActionLoading(`edit-${listing._id}`);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setListingActionLoading(null);
        return;
      }

      console.log('🔗 Calling PUT endpoint with:', {
        title: newTitle,
        description: newDescription,
        price: parseFloat(newPrice)
      });

      const response = await axios.put(
        `${API_BASE_URL}/marketplace/listing/${listing._id}`,
        {
          title: newTitle,
          description: newDescription,
          price: parseFloat(newPrice)
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log('📦 Edit response:', response.data);

      if (response.data.success) {
        const successMsg = `✅ Listing "${newTitle}" updated successfully!`;
        console.log('✅ Success:', successMsg);
        setSuccessMessage(successMsg);
        
        // Update listing in state
        setListingsData(prev => {
          if (!prev) return prev;
          
          const updatedListings = prev.listings.map(l => {
            if (l._id === listing._id) {
              return {
                ...l,
                title: newTitle,
                description: newDescription,
                price: parseFloat(newPrice),
                updatedAt: response.data.listing?.updatedAt || new Date().toISOString()
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
        const errorMsg = response.data.error || 'Failed to update listing';
        console.error('❌ Edit error:', errorMsg);
        setError(`❌ ${errorMsg}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error editing listing:', error);
      
      if (error.response) {
        const errorMsg = error.response.data?.error || 
                        error.response.data?.message || 
                        `Server error: ${error.response.status}`;
        setError(`❌ ${errorMsg}`);
      } else if (error.request) {
        setError('❌ No response from server. Please check your network connection.');
      } else {
        setError(`❌ Failed to edit listing: ${error.message}`);
      }
    } finally {
      setListingActionLoading(null);
    }
  };

  // ✅ Fetch all orders
  const fetchAllOrders = async (): Promise<Order[]> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return [];
      }

      console.log('📦 Fetching ALL orders from API...');
      
      const endpoints = [
        `${API_BASE_URL}/marketplace/my-sales`,
        `${API_BASE_URL}/marketplace/orders/my-sales`,
        `${API_BASE_URL}/marketplace/seller/orders`
      ];
      
      let ordersData: Order[] = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
            params: {
              limit: 100,
              _t: new Date().getTime()
            },
            timeout: 8000
          });
          
          if (response.data.success) {
            ordersData = response.data.sales || response.data.orders || response.data.data || [];
            console.log(`✅ Success from ${endpoint}: ${ordersData.length} orders`);
            break;
          }
        } catch (err) {
          console.log(`❌ Failed from ${endpoint}:`, err.message);
          continue;
        }
      }
      
      return ordersData;
    } catch (error) {
      console.error('❌ Error fetching all orders:', error);
      return [];
    }
  };

  // ✅ Main data fetch function
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

      console.log('🚀 Loading dashboard data...');

      // Fetch orders
      const ordersData = await fetchAllOrders();
      console.log('📊 Orders fetched:', ordersData.length);
      
      if (ordersData.length > 0) {
        const stats = calculateOrderStats(ordersData);
        console.log('💰 Stats calculated:', stats);
        
        setOrders(ordersData);
        setOrderStats(stats);
      } else {
        console.log('⚠️ No orders found');
      }

      // Fetch offers and listings in parallel
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const [offersResponse, listingsResponse] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/marketplace/offers/received-offers`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000
        }).catch(err => ({ data: { success: false, offers: [] } })),
        axios.get(`${API_BASE_URL}/marketplace/listings/my-listings`, {
          params: { 
            limit: 5,
            _t: new Date().getTime()
          },
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
          timeout: 8000
        }).catch(err => ({ data: { success: false } }))
      ]);

      // Process offers
      if (offersResponse.status === 'fulfilled' && offersResponse.value.data.success) {
        const offersData = offersResponse.value.data.offers || [];
        setOffers(offersData);
        console.log('💼 Offers fetched:', offersData.length);
      }

      // Process listings
      if (listingsResponse.status === 'fulfilled' && listingsResponse.value.data.success) {
        setListingsData(listingsResponse.value.data);
        console.log('🏠 Listings fetched:', listingsResponse.value.data.listings?.length || 0);
      }

      setInitialDataLoaded(true);
      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch orders for OrdersTab
  const fetchSellerOrders = async () => {
    try {
      setOrdersLoading(true);
      
      const ordersData = await fetchAllOrders();
      console.log('📦 OrdersTab orders:', ordersData.length);
      
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
        
        console.log('📊 OrdersTab stats updated');
      }
    } catch (error: any) {
      console.error('❌ Error fetching seller orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
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
          },
          timeout: 10000
        }
      );
      
      if (response.data.success) {
        setListingsData(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError('Failed to load listings. Please try again.');
    } finally {
      setListingsLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setOffersLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/offers/received-offers`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          timeout: 10000
        }
      );
      
      if (response.data.success) {
        setOffers(response.data.offers || []);
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error);
      setError('Failed to load offers. Please try again.');
    } finally {
      setOffersLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/status`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000
        }
      );
      
      if (response.data.success) {
        setStripeStatus(response.data);
      }
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

  // ✅ Enhanced refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      await fetchDashboardData();
      await checkStripeAccountStatus();
      setSuccessMessage('✅ Dashboard refreshed successfully!');
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Order management functions
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
        `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
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
        `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
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
        setSuccessMessage('✅ Order delivered successfully!');
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error delivering order:', error);
      setError('Failed to deliver order. Please try again.');
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        setOrderActionLoading(order._id);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const response = await axios.put(
          `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
          { status: 'cancelled' },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data.success) {
          setSuccessMessage('✅ Order cancelled successfully!');
          updateOrderInState(order._id, 'cancelled', {
            cancelledAt: new Date().toISOString()
          });
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
        `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
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

  const handleStripeSetupSuccess = () => {
    setShowStripeSetup(false);
    setSuccessMessage('Stripe account connected successfully!');
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 2000);
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setOrderActionLoading(offerId);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/offers/${offerId}/${action}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage(`✅ Offer ${action}ed successfully!`);
        setOffers(prev => prev.filter(offer => offer._id !== offerId));
      }
    } catch (error: any) {
      console.error(`Error ${action}ing offer:`, error);
      setError(`Failed to ${action} offer. Please try again.`);
    } finally {
      setOrderActionLoading(null);
    }
  };

  // ✅ Initial data loading
  useEffect(() => {
    console.log('🚀 SellerDashboard mounted - Loading initial data');
    
    const loadInitialData = async () => {
      try {
        await fetchDashboardData();
        await checkStripeAccountStatus();
        handleStripeReturn();
      } catch (error) {
        console.error('Initial data loading error:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // ✅ Fetch listings when tab changes
  useEffect(() => {
    if (activeTab === 'listings') {
      console.log('📋 Switching to Listings tab');
      fetchListings();
    }
  }, [activeTab, listingsPage, listingsStatusFilter]);

  // ✅ Fetch orders when orders tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      console.log('📦 Switching to Orders tab');
      fetchSellerOrders();
    }
  }, [activeTab, ordersPage, ordersFilter]);

  // ✅ Fetch offers when offers tab is active
  useEffect(() => {
    if (activeTab === 'offers') {
      console.log('💼 Switching to Offers tab');
      fetchOffers();
    }
  }, [activeTab]);

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

  // Determine loading state based on active tab
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
            showStripeButton={!(stripeStatus?.connected && stripeStatus?.chargesEnabled)}
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
                      You don't have any orders yet. Create listings to start receiving orders.
                    </p>
                    <button
                      onClick={() => navigate('/marketplace/create')}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-md hover:shadow"
                    >
                      + Create Your First Listing
                    </button>
                  </div>
                )}

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {actionCards.map((card, index) => (
                    <ActionCard key={index} {...card} />
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
              onUpdate={() => {
                setShowEditModal(false);
                setEditingListing(null);
                fetchListings();
              }}
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
              onConfirm={() => {
                setShowDeleteModal(false);
                setDeletingListing(null);
                fetchListings();
              }}
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

          {/* Debug Button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                onClick={async () => {
                  console.log('🧪 Testing all endpoints...');
                  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                  if (!token) {
                    console.error('No token');
                    return;
                  }
                  
                  // Test GET listings
                  try {
                    const res = await axios.get(`${API_BASE_URL}/marketplace/listings`);
                    console.log('✅ GET /listings:', res.data.success);
                  } catch (err) {
                    console.error('❌ GET /listings:', err.message);
                  }
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg shadow-lg hover:bg-purple-600"
              >
                🧪 Test API
              </button>
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;