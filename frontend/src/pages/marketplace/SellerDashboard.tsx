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
import OrderWorkflowGuide from '../../components/marketplae/seller/OrderWorkflowGuide';
import QuickActionCard from '../../components/marketplae/seller/QuickActionCard';
import OrderStatusTracker from '../../components/marketplace/seller/OrderStatusTracker';

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
  
  // New: Current order being processed
  const [processingOrder, setProcessingOrder] = useState<Order | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  
  // New: Delivery modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
  // New: Cancellation modal state
  const [showCancellationModal, setShowCancellationModal] = useState(false);

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

  // SIMPLIFIED ORDER MANAGEMENT FUNCTIONS
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

      console.log('🔄 Starting processing for order:', order._id);
      
      // Show processing modal with steps
      setProcessingOrder(order);
      setShowProcessingModal(true);
      
      // First, try to update status to "processing"
      try {
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
          setSuccessMessage('✅ Order processing started! You can now begin working on this order.');
          
          // Update order in state
          updateOrderInState(order._id, 'processing', {
            processingAt: new Date().toISOString()
          });
          
          // Auto-close modal after 2 seconds
          setTimeout(() => {
            setShowProcessingModal(false);
            setProcessingOrder(null);
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error starting processing:', error);
        setError('Failed to start processing. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error in start processing:', error);
      setError(error.response?.data?.error || 'Failed to start processing. Please try again.');
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

      console.log('👨‍💻 Starting work on order:', order._id);
      
      try {
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
          setSuccessMessage('✅ Work started! You are now working on this order.');
          updateOrderInState(order._id, 'in_progress', {
            startedAt: new Date().toISOString()
          });
        }
      } catch (error: any) {
        console.error('Error starting work:', error);
        setError('Failed to start work. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error starting work:', error);
      setError(error.response?.data?.error || 'Failed to start work. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleDeliver = async (order: Order, deliveryData?: any) => {
    try {
      setOrderActionLoading(order._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      console.log('📤 Delivering order:', order._id);
      
      // Show delivery modal
      setSelectedOrder(order);
      setShowDeliveryModal(true);
    } catch (error: any) {
      console.error('❌ Error in deliver:', error);
      setError('Failed to deliver. Please try again.');
    }
  };

  const handleSubmitDelivery = async (deliveryData: any) => {
    if (!selectedOrder) return;
    
    try {
      setOrderActionLoading(selectedOrder._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      const requestData = {
        status: 'delivered',
        deliveryMessage: deliveryData.deliveryMessage,
        deliveryFiles: deliveryData.deliveryFiles
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${selectedOrder._id}/status`,
        requestData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Order delivered successfully! The buyer will review your work.');
        updateOrderInState(selectedOrder._id, 'delivered', {
          deliveredAt: new Date().toISOString(),
          deliveryMessage: deliveryData.deliveryMessage,
          deliveryFiles: deliveryData.deliveryFiles
        });
        setShowDeliveryModal(false);
        setSelectedOrder(null);
      } else {
        setError(response.data.error || 'Failed to deliver order');
      }
    } catch (error: any) {
      console.error('❌ Error delivering order:', error);
      setError(error.response?.data?.error || 'Failed to deliver. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  const handleSimpleCancel = async (order: Order) => {
    try {
      // Show cancellation modal
      setSelectedOrder(order);
      setShowCancellationModal(true);
    } catch (error: any) {
      console.error('❌ Error in cancel:', error);
      setError('Failed to cancel. Please try again.');
    }
  };

  const handleSubmitCancellation = async (cancelReason: string) => {
    if (!selectedOrder) return;
    
    try {
      setOrderActionLoading(selectedOrder._id);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        setOrderActionLoading(null);
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${selectedOrder._id}/status`,
        { 
          status: 'cancelled',
          cancelReason: cancelReason || 'Seller cancelled the order'
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        setSuccessMessage('✅ Order cancelled successfully. Refund has been initiated.');
        updateOrderInState(selectedOrder._id, 'cancelled', {
          cancelledAt: new Date().toISOString()
        });
        setShowCancellationModal(false);
        setSelectedOrder(null);
      } else {
        setError(response.data.error || 'Failed to cancel order');
      }
    } catch (error: any) {
      console.error('❌ Error cancelling order:', error);
      setError(error.response?.data?.error || 'Failed to cancel. Please try again.');
    } finally {
      setOrderActionLoading(null);
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

      console.log('🔄 Completing revision for order:', order._id);
      
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
        setSuccessMessage('✅ Revision completed! Work sent back to buyer for review.');
        updateOrderInState(order._id, 'delivered', {
          deliveredAt: new Date().toISOString()
        });
      } else {
        setError(response.data.error || 'Failed to complete revision');
      }
    } catch (error: any) {
      console.error('❌ Error completing revision:', error);
      setError(error.response?.data?.error || 'Failed to complete revision. Please try again.');
    } finally {
      setOrderActionLoading(null);
    }
  };

  // Update order in state
  const updateOrderInState = (orderId: string, newStatus: string, updates?: any) => {
    setOrders(prev => prev.map(order => {
      if (order._id === orderId) {
        const updatedOrder = { 
          ...order, 
          status: newStatus,
          ...updates
        };
        
        // Update permissions based on new status
        updatedOrder.permissions = {
          canStartProcessing: newStatus === 'paid',
          canStartWork: ['processing', 'paid'].includes(newStatus),
          canDeliver: newStatus === 'in_progress',
          canCancelBySeller: ['paid', 'processing'].includes(newStatus)
        };
        
        return updatedOrder;
      }
      return order;
    }));
    
    // Update stats
    const updatedStats = calculateOrderStats(
      orders.map(order => order._id === orderId ? { ...order, status: newStatus } : order)
    );
    setOrderStats(updatedStats);
  };

  // Order update handler from modal
  const handleOrderUpdateFromModal = (orderId: string, newStatus: string) => {
    updateOrderInState(orderId, newStatus);
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
            setSuccessMessage('✅ Offer accepted! Buyer will now complete payment.');
            
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
                  Welcome back! Manage your orders, listings, and grow your business easily.
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
                  { id: 'orders', label: 'My Orders', icon: '📦', badge: orderStats.activeOrders }
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

          {/* Processing Modal */}
          {showProcessingModal && processingOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Start Processing Order</h3>
                    <button
                      onClick={() => {
                        setShowProcessingModal(false);
                        setProcessingOrder(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
                      <ol className="text-sm text-blue-700 space-y-2">
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs mr-2">1</span>
                          <span>Order status changes to "Processing"</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs mr-2">2</span>
                          <span>You can begin preparing the order</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs mr-2">3</span>
                          <span>When ready, click "Start Work"</span>
                        </li>
                      </ol>
                    </div>
                    
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-semibold">{processingOrder.orderNumber?.slice(-3) || '#'}</span>
                      </div>
                      <div>
                        <p className="font-medium">{processingOrder.listingId?.title || 'Order'}</p>
                        <p className="text-sm text-gray-500">From: {processingOrder.buyerId?.username || 'Buyer'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowProcessingModal(false);
                        setProcessingOrder(null);
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleSimpleStartProcessing(processingOrder);
                      }}
                      disabled={orderActionLoading === processingOrder._id}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {orderActionLoading === processingOrder._id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Starting...
                        </span>
                      ) : (
                        'Start Processing'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Modal */}
          {showDeliveryModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Deliver Order</h3>
                    <button
                      onClick={() => {
                        setShowDeliveryModal(false);
                        setSelectedOrder(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-green-800 mb-2">Ready to deliver?</h4>
                      <p className="text-sm text-green-700">
                        Once delivered, the buyer will have time to review your work and mark it as complete.
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Message (Optional)
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        rows={3}
                        placeholder="Add any notes for the buyer..."
                        id="deliveryMessage"
                        defaultValue="Your order is ready! Please review and let me know if you need any changes."
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Files (Optional)
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="https://example.com/file1.zip, https://example.com/file2.pdf"
                        id="deliveryFiles"
                      />
                      <p className="text-xs text-gray-500 mt-1">Add comma-separated URLs of your delivered files</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowDeliveryModal(false);
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const messageEl = document.getElementById('deliveryMessage') as HTMLTextAreaElement;
                        const filesEl = document.getElementById('deliveryFiles') as HTMLInputElement;
                        const deliveryData = {
                          deliveryMessage: messageEl?.value || '',
                          deliveryFiles: filesEl?.value ? filesEl.value.split(',').map(f => f.trim()) : []
                        };
                        handleSubmitDelivery(deliveryData);
                      }}
                      disabled={orderActionLoading === selectedOrder._id}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {orderActionLoading === selectedOrder._id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Delivering...
                        </span>
                      ) : (
                        'Deliver Order'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Modal */}
          {showCancellationModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
                    <button
                      onClick={() => {
                        setShowCancellationModal(false);
                        setSelectedOrder(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <div className="bg-red-50 p-4 rounded-lg mb-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-red-800">Important</h4>
                          <p className="text-sm text-red-700 mt-1">
                            Cancelling an order will initiate a refund to the buyer. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Cancellation (Optional)
                      </label>
                      <textarea
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        rows={3}
                        placeholder="Why are you cancelling this order?"
                        id="cancelReason"
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be shared with the buyer</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowCancellationModal(false);
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={() => {
                        const reasonEl = document.getElementById('cancelReason') as HTMLTextAreaElement;
                        handleSubmitCancellation(reasonEl?.value || '');
                      }}
                      disabled={orderActionLoading === selectedOrder._id}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {orderActionLoading === selectedOrder._id ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cancelling...
                        </span>
                      ) : (
                        'Cancel Order'
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
              {/* Welcome Card with Quick Actions */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Ready to grow your business?</h2>
                    <p className="opacity-90">Manage orders, track earnings, and connect with buyers easily.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => window.open('/create-listing', '_blank')}
                      className="px-4 py-2.5 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      + New Listing
                    </button>
                    {!(stripeStatus?.connected && stripeStatus?.chargesEnabled) && (
                      <button
                        onClick={() => setShowStripeSetup(true)}
                        className="px-4 py-2.5 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors"
                      >
                        💰 Setup Payments
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Earnings"
                  value={formatCurrency(orderStats.totalRevenue)}
                  icon="💰"
                  color="green"
                  description="All-time completed orders"
                />
                <StatCard
                  title="Active Orders"
                  value={orderStats.activeOrders}
                  icon="📦"
                  color="blue"
                  description="Orders in progress"
                  onClick={() => setActiveTab('orders')}
                />
                <StatCard
                  title="Pending Offers"
                  value={pendingOffers}
                  icon="💼"
                  color="yellow"
                  description="Offers waiting review"
                  onClick={() => setActiveTab('offers')}
                />
                <StatCard
                  title="Active Listings"
                  value={activeListings}
                  icon="✅"
                  color="purple"
                  description="Items for sale"
                  onClick={() => setActiveTab('listings')}
                />
              </div>

              {/* Order Workflow Guide */}
              <OrderWorkflowGuide />

              {/* Recent Orders with Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                      <p className="text-sm text-gray-600 mt-1">Quick actions for your latest orders</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-5xl mb-4 text-gray-300">📦</div>
                      <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                      <p className="mt-2 text-gray-500">When you receive orders, they'll appear here.</p>
                      <button
                        onClick={() => setActiveTab('listings')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Your First Listing
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map(order => {
                        const statusInfo = getOrderStatusInfo(order.status);
                        return (
                          <div 
                            key={order._id} 
                            className="p-4 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center border border-blue-200">
                                  <span className="text-lg font-semibold text-blue-600">
                                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{order.listingId?.title || 'Order'}</p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username || 'Buyer'}</p>
                                  <div className="flex items-center mt-1">
                                    <span 
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
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
                              
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div className="text-right">
                                  <p className="font-semibold text-green-600 text-lg">{formatCurrency(order.amount || 0)}</p>
                                  <p className="text-xs text-gray-500">Order #{order.orderNumber || order._id.slice(-6)}</p>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {/* Quick Action Buttons Based on Status */}
                                  {order.status === 'paid' && (
                                    <button
                                      onClick={() => handleSimpleStartProcessing(order)}
                                      disabled={orderActionLoading === order._id}
                                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                      {orderActionLoading === order._id ? '...' : 'Start Processing'}
                                    </button>
                                  )}
                                  
                                  {order.status === 'processing' && (
                                    <button
                                      onClick={() => handleSimpleStartWork(order)}
                                      disabled={orderActionLoading === order._id}
                                      className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                      {orderActionLoading === order._id ? '...' : 'Start Work'}
                                    </button>
                                  )}
                                  
                                  {order.status === 'in_progress' && (
                                    <button
                                      onClick={() => handleSimpleDeliver(order)}
                                      disabled={orderActionLoading === order._id}
                                      className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                      Deliver
                                    </button>
                                  )}
                                  
                                  {order.status === 'in_revision' && (
                                    <button
                                      onClick={() => handleSimpleCompleteRevision(order)}
                                      disabled={orderActionLoading === order._id}
                                      className="px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                                    >
                                      Complete Revision
                                    </button>
                                  )}
                                  
                                  {/* Cancel Button for Paid/Processing orders */}
                                  {['paid', 'processing'].includes(order.status) && (
                                    <button
                                      onClick={() => handleSimpleCancel(order)}
                                      disabled={orderActionLoading === order._id}
                                      className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => handleViewOrderDetails(order._id)}
                                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    Details
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status Tracker */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <OrderStatusTracker 
                                currentStatus={order.status}
                                orderId={order._id}
                                createdAt={order.createdAt}
                                deliveredAt={order.deliveredAt}
                                completedAt={order.completedAt}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QuickActionCard
                  title="Need Help with an Order?"
                  description="Learn how to manage orders step by step"
                  icon="❓"
                  color="blue"
                  actions={[
                    { label: 'View Tutorial', onClick: () => window.open('/help/orders', '_blank') },
                    { label: 'Contact Support', onClick: () => window.open('/help/support', '_blank') }
                  ]}
                />
                
                <QuickActionCard
                  title="Boost Your Sales"
                  description="Tips to get more orders"
                  icon="🚀"
                  color="green"
                  actions={[
                    { label: 'Optimize Listings', onClick: () => window.open('/help/optimize', '_blank') },
                    { label: 'View Analytics', onClick: () => setActiveTab('listings') }
                  ]}
                />
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
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;