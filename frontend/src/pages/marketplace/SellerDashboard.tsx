// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  getSellerOrders, 
  getReceivedOffers, 
  checkStripeStatus,
  marketplaceAPI,
  getOrderStatusInfo,
  getOrderActions,
  formatCurrency,
  formatOrderStatus,
  getStatusColor
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
import SellerOrderActions from '../../components/marketplae/seller/SellerOrderActions';

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
  expectedDelivery?: string;
  shippingAddress?: any;
  paymentMethod?: string;
  notes?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
  paymentReleased?: boolean;
  platformFee?: number;
  sellerAmount?: number;
  revisions?: number;
  maxRevisions?: number;
  revisionNotes?: any[];
  deliveryMessage?: string;
  deliveryFiles?: string[];
  workFiles?: any[];
  userRole?: 'buyer' | 'seller';
  permissions?: {
    canStartProcessing: boolean;
    canStartWork: boolean;
    canDeliver: boolean;
    canCancelBySeller: boolean;
  };
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
  const [showOrderActionModal, setShowOrderActionModal] = useState(false);
  const [orderActionType, setOrderActionType] = useState<string>('');

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats from orders
  const calculateOrderStats = (orders: Order[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const thisMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === thisMonth && 
             orderDate.getFullYear() === thisYear;
    });

    const stats: OrderStats = {
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
    
    return stats;
  };
  
  // Listings stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing) => listing.status === 'sold').length || 0;
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;

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
      console.log('👤 Current User ID:', currentUserId);

      if (!currentUserId) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const [ordersResponse, offersResponse, listingsResponse] = await Promise.allSettled([
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

        (async () => {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/marketplace/listings/my-listings`,
              {
                params: { limit: 5 },
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            return response.data;
          } catch (err) {
            console.error('Error fetching recent listings:', err);
            return { listings: [] };
          }
        })()
      ]);

      // Process orders response
      let ordersData = [];
      if (ordersResponse.status === 'fulfilled') {
        const result = ordersResponse.value;
        ordersData = Array.isArray(result) ? result : [];
        console.log('📊 Processed Orders Data:', {
          count: ordersData.length,
        });
        
        // Calculate and set order stats
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
      } else {
        console.error('Orders promise rejected:', ordersResponse.reason);
      }

      // Process offers response
      let offersData = [];
      if (offersResponse.status === 'fulfilled') {
        const result = offersResponse.value;
        offersData = Array.isArray(result) ? result : [];
      }

      // Process listings response
      if (listingsResponse.status === 'fulfilled') {
        const result = listingsResponse.value;
        setListingsData(result);
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
        
        // Update stats
        const stats = calculateOrderStats(ordersData);
        setOrderStats(stats);
      } else {
        setError(response.data.error || 'Failed to fetch orders');
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
            'Cache-Control': 'no-cache, no-store, must-revalidate'
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
      await fetchListings();
    } else if (activeTab === 'orders') {
      await fetchSellerOrders();
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

  // ORDER MANAGEMENT FUNCTIONS
  const handleStartProcessing = async (orderId: string) => {
    try {
      setOrderActionLoading(orderId);
      setError('');
      
      const response = await marketplaceAPI.orders.startProcessing(
        orderId,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Order marked as processing!');
        
        // Update order in state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { 
            ...order, 
            status: 'processing',
            processingAt: new Date().toISOString(),
            permissions: {
              ...order.permissions,
              canStartProcessing: false,
              canStartWork: true
            }
          } : order
        ));
        
        // Update stats
        const updatedStats = calculateOrderStats(
          orders.map(order => order._id === orderId ? { 
            ...order, 
            status: 'processing' 
          } : order)
        );
        setOrderStats(updatedStats);
      } else {
        setError(response.error || 'Failed to start processing order');
      }
    } catch (error: any) {
      console.error('Error starting order processing:', error);
      setError('Failed to start processing order. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

// In the handleStartWork function, change it to:
const handleStartWork = async (orderId: string) => {
  try {
    setOrderActionLoading(orderId);
    setError('');
    
    // Use the correct API method
    const response = await marketplaceAPI.orders.startWork(
      orderId,
      () => {} // loading callback
    );
    
    // OR use axios directly if API method not working
    // const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // const response = await axios.put(
    //   `${API_BASE_URL}/marketplace/orders/${orderId}/start-work`,
    //   {},
    //   {
    //     headers: { Authorization: `Bearer ${token}` }
    //   }
    // );
    
    if (response.success) {
      setSuccessMessage('Work started on order!');
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order._id === orderId ? { 
          ...order, 
          status: 'in_progress',
          startedAt: new Date().toISOString()
        } : order
      ));
    } else {
      setError(response.error || 'Failed to start work on order');
    }
  } catch (error: any) {
    console.error('Error starting work on order:', error);
    
    // Check the specific error
    if (error.response?.status === 404) {
      setError('Order not found or invalid status. Please refresh and try again.');
    } else {
      setError(error.response?.data?.error || 'Failed to start work. Please try again.');
    }
  } finally {
    setOrderActionLoading(null);
  }
};
  const handleDeliverOrder = async (orderId: string, deliveryData: { deliveryMessage?: string; deliveryFiles?: string[] }) => {
    try {
      setOrderActionLoading(orderId);
      setError('');
      
      const response = await marketplaceAPI.orders.deliver(
        orderId,
        deliveryData,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Order delivered successfully!');
        
        // Update order in state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { 
            ...order, 
            status: 'delivered',
            deliveredAt: new Date().toISOString(),
            deliveryMessage: deliveryData.deliveryMessage,
            deliveryFiles: deliveryData.deliveryFiles,
            permissions: {
              ...order.permissions,
              canDeliver: false
            }
          } : order
        ));
        
        // Update stats
        const updatedStats = calculateOrderStats(
          orders.map(order => order._id === orderId ? { 
            ...order, 
            status: 'delivered' 
          } : order)
        );
        setOrderStats(updatedStats);
      } else {
        setError(response.error || 'Failed to deliver order');
      }
    } catch (error: any) {
      console.error('Error delivering order:', error);
      setError('Failed to deliver order. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleCancelOrderBySeller = async (orderId: string, cancelReason?: string) => {
    try {
      setOrderActionLoading(orderId);
      setError('');
      
      const response = await marketplaceAPI.orders.cancelBySeller(
        orderId,
        cancelReason,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Order cancelled successfully!');
        
        // Update order in state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { 
            ...order, 
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
          } : order
        ));
        
        // Update stats
        const updatedStats = calculateOrderStats(
          orders.map(order => order._id === orderId ? { 
            ...order, 
            status: 'cancelled' 
          } : order)
        );
        setOrderStats(updatedStats);
      } else {
        setError(response.error || 'Failed to cancel order');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      setError('Failed to cancel order. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleCompleteRevision = async (orderId: string, revisionId: string, files?: string[]) => {
    try {
      setOrderActionLoading(orderId);
      setError('');
      
      const response = await marketplaceAPI.orders.completeRevision(
        orderId,
        revisionId,
        files,
        () => {}
      );
      
      if (response.success) {
        setSuccessMessage('Revision completed and sent back to buyer!');
        
        // Update order in state
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { 
            ...order, 
            status: 'delivered',
            permissions: {
              ...order.permissions,
              canDeliver: false
            }
          } : order
        ));
        
        // Update stats
        const updatedStats = calculateOrderStats(
          orders.map(order => order._id === orderId ? { 
            ...order, 
            status: 'delivered' 
          } : order)
        );
        setOrderStats(updatedStats);
      } else {
        setError(response.error || 'Failed to complete revision');
      }
    } catch (error: any) {
      console.error('Error completing revision:', error);
      setError('Failed to complete revision. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  // Open order action modal
  const handleOpenOrderAction = (order: Order, action: string) => {
    setSelectedOrder(order);
    setOrderActionType(action);
    setShowOrderActionModal(true);
  };

  // Handle order action submission
  const handleOrderActionSubmit = async (data: any) => {
    if (!selectedOrder) return;
    
    switch (orderActionType) {
      case 'deliver':
        await handleDeliverOrder(selectedOrder._id, data);
        break;
      case 'cancel':
        await handleCancelOrderBySeller(selectedOrder._id, data.cancelReason);
        break;
      case 'complete_revision':
        if (selectedOrder.revisionNotes?.[0]?._id) {
          await handleCompleteRevision(
            selectedOrder._id, 
            selectedOrder.revisionNotes[0]._id, 
            data.files
          );
        }
        break;
      default:
        break;
    }
    
    setShowOrderActionModal(false);
    setSelectedOrder(null);
    setOrderActionType('');
  };

  // Order update handler from modal
  const handleOrderUpdateFromModal = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(order => 
      order._id === orderId ? { ...order, status: newStatus } : order
    ));
    
    // Update stats
    const updatedStats = calculateOrderStats(
      orders.map(order => order._id === orderId ? { 
        ...order, 
        status: newStatus 
      } : order)
    );
    setOrderStats(updatedStats);
  };

  // Listing Management Functions (existing)
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
        await fetchListings();
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
        await fetchListings();
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
        await fetchListings();
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

  // Offer Functions (existing)
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

  if (loading && activeTab !== 'listings' && activeTab !== 'orders') {
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
                  { id: 'orders', label: 'Orders', icon: '📦', badge: orderStats.activeOrders }
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

          {/* Order Action Modal */}
          {showOrderActionModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {orderActionType === 'deliver' && 'Deliver Order'}
                      {orderActionType === 'cancel' && 'Cancel Order'}
                      {orderActionType === 'complete_revision' && 'Complete Revision'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowOrderActionModal(false);
                        setSelectedOrder(null);
                        setOrderActionType('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {orderActionType === 'deliver' && (
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Message (Optional)
                        </label>
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={4}
                          placeholder="Add any notes for the buyer..."
                          id="deliveryMessage"
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Files (Optional)
                        </label>
                        <input
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter file URLs separated by commas"
                          id="deliveryFiles"
                        />
                        <p className="text-xs text-gray-500 mt-1">Add comma-separated URLs of delivered files</p>
                      </div>
                    </div>
                  )}
                  
                  {orderActionType === 'cancel' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Cancellation (Optional)
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Why are you cancelling this order?"
                        id="cancelReason"
                      />
                    </div>
                  )}
                  
                  {orderActionType === 'complete_revision' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Updated Files (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter updated file URLs separated by commas"
                        id="revisionFiles"
                      />
                      <p className="text-xs text-gray-500 mt-1">Add comma-separated URLs of revised files</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowOrderActionModal(false);
                        setSelectedOrder(null);
                        setOrderActionType('');
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const formData: any = {};
                        
                        if (orderActionType === 'deliver') {
                          const messageEl = document.getElementById('deliveryMessage') as HTMLTextAreaElement;
                          const filesEl = document.getElementById('deliveryFiles') as HTMLInputElement;
                          formData.deliveryMessage = messageEl?.value || '';
                          formData.deliveryFiles = filesEl?.value ? filesEl.value.split(',').map(f => f.trim()) : [];
                        } else if (orderActionType === 'cancel') {
                          const reasonEl = document.getElementById('cancelReason') as HTMLTextAreaElement;
                          formData.cancelReason = reasonEl?.value || '';
                        } else if (orderActionType === 'complete_revision') {
                          const filesEl = document.getElementById('revisionFiles') as HTMLInputElement;
                          formData.files = filesEl?.value ? filesEl.value.split(',').map(f => f.trim()) : [];
                        }
                        
                        handleOrderActionSubmit(formData);
                      }}
                      disabled={orderActionLoading === selectedOrder._id}
                      className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                        orderActionType === 'cancel' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } disabled:opacity-50`}
                    >
                      {orderActionLoading === selectedOrder._id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <>
                          {orderActionType === 'deliver' && 'Deliver Order'}
                          {orderActionType === 'cancel' && 'Cancel Order'}
                          {orderActionType === 'complete_revision' && 'Complete Revision'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                    value={formatCurrency(orderStats.totalRevenue)}
                    icon="💰"
                    color="green"
                    description="Total earnings from completed orders"
                  />
                  <StatCard
                    title="Active Orders"
                    value={orderStats.activeOrders}
                    icon="📦"
                    color="blue"
                    description="Orders currently in progress"
                    onClick={() => setActiveTab('orders')}
                  />
                  <StatCard
                    title="Pending Payment"
                    value={orderStats.pendingPayment}
                    icon="⏳"
                    color="yellow"
                    description="Orders awaiting payment"
                    onClick={() => setActiveTab('orders')}
                  />
                  <StatCard
                    title="Active Listings"
                    value={activeListings}
                    icon="✅"
                    color="purple"
                    description="Listings currently available"
                    onClick={() => setActiveTab('listings')}
                  />
                </div>
                
                {/* Second Row Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                  <StatCard
                    title="Processing"
                    value={orderStats.processing}
                    icon="⚙️"
                    color="indigo"
                    description="Orders being prepared"
                    size="sm"
                  />
                  <StatCard
                    title="In Progress"
                    value={orderStats.inProgress}
                    icon="👨‍💻"
                    color="teal"
                    description="Orders being worked on"
                    size="sm"
                  />
                  <StatCard
                    title="Delivered"
                    value={orderStats.delivered}
                    icon="🚚"
                    color="cyan"
                    description="Orders delivered to buyers"
                    size="sm"
                  />
                  <StatCard
                    title="Completed"
                    value={orderStats.completed}
                    icon="✅"
                    color="green"
                    description="Successfully completed orders"
                    size="sm"
                  />
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                          <p className="text-sm text-gray-600 mt-1">Latest orders and updates</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('orders')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-10">
                          <div className="text-5xl mb-4 text-gray-300">📦</div>
                          <h3 className="text-lg font-medium text-gray-900">No recent orders</h3>
                          <p className="mt-2 text-gray-500">When you receive orders, they'll appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => {
                            const statusInfo = getOrderStatusInfo(order.status);
                            return (
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
                                    <div className="flex items-center mt-1">
                                      <span 
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}
                                      >
                                        <span className="mr-1">{statusInfo.icon}</span>
                                        {statusInfo.text}
                                      </span>
                                      <span className="text-xs text-gray-400 ml-2">
                                        {formatDate(order.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-green-600 text-lg">{formatCurrency(order.amount || 0)}</p>
                                  <div className="mt-1">
                                    <SellerOrderActions
                                      order={order}
                                      loading={orderActionLoading === order._id}
                                      onStartProcessing={() => handleStartProcessing(order._id)}
                                      onStartWork={() => handleStartWork(order._id)}
                                      onDeliver={() => handleOpenOrderAction(order, 'deliver')}
                                      onCancel={() => handleOpenOrderAction(order, 'cancel')}
                                      onCompleteRevision={() => handleOpenOrderAction(order, 'complete_revision')}
                                      onViewDetails={() => handleViewOrderDetails(order._id)}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
                        onClick={() => setActiveTab('orders')}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center hover:shadow-sm"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Manage Orders
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Order Management Tips
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Start processing orders within 24 hours of payment</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Keep buyers updated on order progress</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Deliver work before the expected delivery date</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs mr-2 mt-0.5">✓</span>
                        <span>Communicate clearly during revision requests</span>
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
              onStartProcessing={handleStartProcessing}
              onStartWork={handleStartWork}
              onDeliver={handleOpenOrderAction}
              onCancel={handleOpenOrderAction}
              onCompleteRevision={handleOpenOrderAction}
              actionLoading={orderActionLoading}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;