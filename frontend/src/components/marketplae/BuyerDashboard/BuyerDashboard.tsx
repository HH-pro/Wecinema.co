import React, { useEffect, useState } from 'react';
import { 
  FaShoppingBag, 
  FaClock, 
  FaCheckCircle, 
  FaWallet,
  FaShoppingCart,
  FaBoxOpen,
  FaSync,
  FaTruck,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaDollarSign,
  FaUser,
  FaCalendar,
  FaEye,
  FaCreditCard,
  FaComment,
  FaReply,
  FaTimes,
  FaDownload,
  FaStar,
  FaListAlt,
  FaFileAlt,
  FaChartLine,
  FaBell,
  FaHistory,
  FaCog,
  FaQuestionCircle,
  FaArrowRight,
  FaTag,
  FaPercentage,
  FaShoppingBasket,
  FaLayerGroup,
  FaFileInvoiceDollar,
  FaSpinner
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../Layout';
import { marketplaceAPI, isAuthenticated, formatCurrency, getOrderStatusInfo } from '../../../api';
import { getCurrentUserId, calculateRemainingDays } from '../../../utilities/helperfFunction';
import OrderTimeline from './OrderTimeline';
import OrderSummary from './OrderSummary';
import PaymentDetails from './PaymentDetails';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  sellerRating?: number;
}

interface Listing {
  _id: string;
  title: string;
  mediaUrls?: string[];
  price: number;
  category: string;
  type: string;
  description?: string;
  tags?: string[];
}

interface TimelineEvent {
  _id: string;
  orderId: string;
  eventType: string;
  eventData: any;
  performedBy: User | string;
  createdAt: string;
}

interface Payment {
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  platformFee: number;
  sellerAmount: number;
  buyerId: string;
  sellerId: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  _id: string;
  buyerId: User | string;
  sellerId: User | string;
  listingId: Listing | string;
  amount: number;
  status: 'pending_payment' | 'paid' | 'processing' | 'in_progress' | 'delivered' | 'in_revision' | 'completed' | 'cancelled' | 'disputed';
  paymentReleased: boolean;
  platformFee?: number;
  sellerAmount?: number;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  revisions: number;
  maxRevisions: number;
  deliveryMessage?: string;
  deliveryFiles?: string[];
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  orderNumber?: string;
  processingAt?: string;
  startedAt?: string;
  paymentId?: string;
  shippingAddress?: any;
  notes?: string;
  timeline?: TimelineEvent[];
  payment?: Payment;
}

interface BuyerStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  monthlySpent: number;
  averageOrderValue: number;
  favoriteCategory?: string;
  pendingRevenue?: number;
  successRate?: number;
}

interface DashboardResponse {
  success: boolean;
  orders?: Order[];
  stats?: BuyerStats;
  error?: string;
  count?: number;
}

interface OrderStatusCount {
  pending_payment: number;
  paid: number;
  processing: number;
  in_progress: number;
  delivered: number;
  in_revision: number;
  completed: number;
  cancelled: number;
  disputed: number;
}

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<BuyerStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    activeOrders: 0,
    cancelledOrders: 0,
    totalSpent: 0,
    monthlySpent: 0,
    averageOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<Payment | null>(null);
  const [orderStatusCount, setOrderStatusCount] = useState<OrderStatusCount>({
    pending_payment: 0,
    paid: 0,
    processing: 0,
    in_progress: 0,
    delivered: 0,
    in_revision: 0,
    completed: 0,
    cancelled: 0,
    disputed: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchBuyerData();
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, statusFilter, sortBy, priceRange, dateRange]);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      
      if (!isAuthenticated()) {
        toast.error('Please login to view your dashboard');
        navigate('/login');
        return;
      }

      // Fetch buyer orders
      const ordersResponse = await marketplaceAPI.orders.getMy(setLoading) as DashboardResponse;
      
      console.log('Buyer Orders Response:', ordersResponse);
      
      if (ordersResponse.success && ordersResponse.orders) {
        const fetchedOrders = ordersResponse.orders;
        setOrders(fetchedOrders);
        
        // Calculate status counts
        calculateStatusCounts(fetchedOrders);
        
        // Use stats from API or calculate them
        if (ordersResponse.stats) {
          setStats(ordersResponse.stats);
        } else {
          const calculatedStats = calculateStats(fetchedOrders);
          setStats(calculatedStats);
        }
        
        // Fetch detailed stats
        fetchBuyerStats();
        
      } else {
        throw new Error(ordersResponse.error || 'Failed to fetch orders');
      }

    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
      
      if (error.message?.includes('unauthorized') || error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error(error.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyerStats = async () => {
    try {
      setLoadingStats(true);
      const statsResponse = await marketplaceAPI.dashboard.getBuyerStats(setLoadingStats) as any;
      
      if (statsResponse.success) {
        setStats(prev => ({
          ...prev,
          monthlySpent: statsResponse.monthlySpent || 0,
          averageOrderValue: statsResponse.averageOrderValue || 0,
          favoriteCategory: statsResponse.favoriteCategory,
          successRate: statsResponse.successRate
        }));
      }
    } catch (error) {
      console.error('Error fetching buyer stats:', error);
    }
  };

  const calculateStatusCounts = (ordersData: Order[]) => {
    const counts: OrderStatusCount = {
      pending_payment: 0,
      paid: 0,
      processing: 0,
      in_progress: 0,
      delivered: 0,
      in_revision: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0
    };
    
    ordersData.forEach(order => {
      if (counts.hasOwnProperty(order.status)) {
        counts[order.status as keyof OrderStatusCount]++;
      }
    });
    
    setOrderStatusCount(counts);
  };

  const calculateStats = (ordersData: Order[]): BuyerStats => {
    const totalOrders = ordersData.length;
    const pendingOrders = ordersData.filter(order => order.status === 'pending_payment').length;
    const completedOrders = ordersData.filter(order => order.status === 'completed').length;
    const cancelledOrders = ordersData.filter(order => order.status === 'cancelled').length;
    const activeOrders = ordersData.filter(order => 
      ['paid', 'processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
    ).length;
    
    const completedAndActiveOrders = ordersData.filter(order => 
      ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(order.status)
    );
    
    const totalSpent = completedAndActiveOrders.reduce((sum, order) => sum + order.amount, 0);
    
    // Calculate monthly spent (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyOrders = ordersData.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= thirtyDaysAgo && 
             ['completed', 'delivered', 'in_progress', 'paid', 'processing'].includes(order.status);
    });
    const monthlySpent = monthlyOrders.reduce((sum, order) => sum + order.amount, 0);
    
    const averageOrderValue = completedAndActiveOrders.length > 0 
      ? totalSpent / completedAndActiveOrders.length 
      : 0;

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      activeOrders,
      cancelledOrders,
      totalSpent,
      monthlySpent,
      averageOrderValue,
      successRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    };
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(order => {
        const listingTitle = getListingTitle(order).toLowerCase();
        const sellerUsername = getSellerUsername(order).toLowerCase();
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        const searchLower = searchQuery.toLowerCase();
        
        return listingTitle.includes(searchLower) ||
               sellerUsername.includes(searchLower) ||
               orderNumber.includes(searchLower);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply price range filter
    if (priceRange.min !== null) {
      filtered = filtered.filter(order => order.amount >= priceRange.min!);
    }
    if (priceRange.max !== null) {
      filtered = filtered.filter(order => order.amount <= priceRange.max!);
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price_high':
          return b.amount - a.amount;
        case 'price_low':
          return a.amount - b.amount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const getSellerUsername = (order: Order): string => {
    if (typeof order.sellerId === 'object' && order.sellerId !== null) {
      const seller = order.sellerId as User;
      return seller.firstName ? `${seller.firstName} ${seller.lastName || ''}`.trim() : seller.username || 'Unknown Seller';
    }
    return 'Seller';
  };

  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).title || 'Unknown Listing';
    }
    return 'Listing';
  };

  const getListingMedia = (order: Order): string | undefined => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      const listing = order.listingId as Listing;
      if (listing.mediaUrls && listing.mediaUrls.length > 0) {
        const media = listing.mediaUrls[0];
        return typeof media === 'string' ? media : (media as any)?.url;
      }
    }
    return undefined;
  };

  const getListingCategory = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).category || 'General';
    }
    return 'General';
  };

  const getStatusColor = (status: Order['status']): string => {
    return getOrderStatusInfo(status).color;
  };

  const getStatusIcon = (status: Order['status']) => {
    const iconMap = {
      pending_payment: <FaClock className="status-icon" />,
      paid: <FaCreditCard className="status-icon" />,
      processing: <FaBoxOpen className="status-icon" />,
      in_progress: <FaUser className="status-icon" />,
      delivered: <FaTruck className="status-icon" />,
      in_revision: <FaReply className="status-icon" />,
      completed: <FaCheckCircle className="status-icon" />,
      cancelled: <FaTimes className="status-icon" />,
      disputed: <FaExclamationTriangle className="status-icon" />
    };
    return iconMap[status] || <FaQuestionCircle className="status-icon" />;
  };

  const getStatusText = (status: Order['status']): string => {
    return getOrderStatusInfo(status).text;
  };

  const getOrderDescription = (order: Order): string => {
    return getOrderStatusInfo(order.status).description;
  };

  const handleViewOrder = (orderId: string): void => {
    navigate(`/marketplace/orders/${orderId}`);
  };

  const handleViewOrderDetails = async (order: Order) => {
    try {
      setLoading(true);
      const orderDetails = await marketplaceAPI.orders.getDetails(order._id, setLoading) as any;
      
      if (orderDetails.success) {
        setSelectedOrder(orderDetails.order || order);
        setShowOrderDetails(true);
      }
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  const handleViewTimeline = async (orderId: string) => {
    try {
      setLoading(true);
      const timelineResponse = await marketplaceAPI.orders.getTimeline(orderId, setLoading) as any;
      
      if (timelineResponse.success) {
        setTimelineEvents(timelineResponse.timeline || []);
        setShowTimeline(true);
      }
    } catch (error) {
      toast.error('Failed to load timeline');
    }
  };

  const handleViewPaymentDetails = async (order: Order) => {
    try {
      setLoading(true);
      const paymentStatus = await marketplaceAPI.payments.getStatus(order._id, setLoading) as any;
      if (paymentStatus.success && paymentStatus.payment) {
        setPaymentDetails(paymentStatus.payment);
        setShowPaymentDetails(true);
      } else {
        toast.info('No payment details found for this order');
      }
    } catch (error) {
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueShopping = (): void => {
    navigate('/marketplace');
  };

  const handleRefresh = async () => {
    await fetchBuyerData();
    toast.success('Dashboard refreshed successfully!');
  };

  const handleOrderAction = async (orderId: string, action: string, data?: any) => {
    try {
      switch (action) {
        case 'complete_payment':
          navigate(`/marketplace/payment/${orderId}`);
          break;
          
        case 'request_revision':
          const revisionNotes = prompt('Please provide detailed revision notes (minimum 10 characters):');
          if (revisionNotes && revisionNotes.trim().length >= 10) {
            await marketplaceAPI.orders.requestRevision(orderId, revisionNotes.trim(), setLoading);
            toast.success('Revision requested successfully');
            await fetchBuyerData();
          } else if (revisionNotes) {
            toast.error('Revision notes must be at least 10 characters');
          }
          break;
          
        case 'complete_order':
          if (window.confirm('Are you sure you want to mark this order as complete? This will release payment to the seller.')) {
            await marketplaceAPI.orders.complete(orderId, setLoading);
            toast.success('Order completed successfully! Payment released to seller.');
            await fetchBuyerData();
          }
          break;
          
        case 'contact_seller':
          navigate(`/marketplace/messages?order=${orderId}`);
          break;
          
        case 'cancel_order':
          const cancelReason = prompt('Please provide reason for cancellation:');
          if (cancelReason && cancelReason.trim()) {
            if (window.confirm('Are you sure you want to cancel this order?')) {
              await marketplaceAPI.orders.cancelByBuyer(orderId, cancelReason.trim(), setLoading);
              toast.success('Order cancelled successfully');
              await fetchBuyerData();
            }
          }
          break;
          
        case 'download_files':
          navigate(`/marketplace/orders/${orderId}?tab=files`);
          break;
          
        case 'leave_review':
          navigate(`/marketplace/reviews/create?orderId=${orderId}`);
          break;
          
        case 'view_timeline':
          await handleViewTimeline(orderId);
          break;
          
        case 'view_summary':
          navigate(`/marketplace/orders/${orderId}?tab=summary`);
          break;
          
        case 'view_details':
          const order = orders.find(o => o._id === orderId);
          if (order) {
            await handleViewOrderDetails(order);
          }
          break;
          
        case 'view_payment':
          const paymentOrder = orders.find(o => o._id === orderId);
          if (paymentOrder) {
            await handleViewPaymentDetails(paymentOrder);
          }
          break;
          
        default:
          console.log('Unknown action:', action);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform action');
    }
  };

  const getOrderActions = (order: Order): Array<{label: string, action: string, className: string, icon: JSX.Element, disabled?: boolean}> => {
    const actions: Array<{label: string, action: string, className: string, icon: JSX.Element, disabled?: boolean}> = [];
    
    // Always show view details
    actions.push({
      label: 'View Details',
      action: 'view_details',
      className: 'view-details-btn',
      icon: <FaEye />
    });
    
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'complete-payment-btn',
          icon: <FaCreditCard />
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'cancel-btn',
          icon: <FaTimes />
        });
        break;
        
      case 'paid':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        actions.push({
          label: 'View Timeline',
          action: 'view_timeline',
          className: 'timeline-btn',
          icon: <FaHistory />
        });
        break;
        
      case 'delivered':
        if ((order.revisions || 0) < (order.maxRevisions || 3)) {
          actions.push({
            label: 'Request Revision',
            action: 'request_revision',
            className: 'revision-btn',
            icon: <FaReply />
          });
        }
        actions.push({
          label: 'Complete Order',
          action: 'complete_order',
          className: 'complete-order-btn',
          icon: <FaCheckCircle />
        });
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        break;
        
      case 'in_revision':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />
        });
        actions.push({
          label: 'View Timeline',
          action: 'view_timeline',
          className: 'timeline-btn',
          icon: <FaHistory />
        });
        break;
        
      case 'in_progress':
      case 'processing':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        actions.push({
          label: 'View Timeline',
          action: 'view_timeline',
          className: 'timeline-btn',
          icon: <FaHistory />
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'review-btn',
          icon: <FaStar />
        });
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />
        });
        actions.push({
          label: 'View Summary',
          action: 'view_summary',
          className: 'summary-btn',
          icon: <FaListAlt />
        });
        actions.push({
          label: 'Payment Details',
          action: 'view_payment',
          className: 'payment-btn',
          icon: <FaFileInvoiceDollar />
        });
        break;
        
      case 'cancelled':
        actions.push({
          label: 'View Timeline',
          action: 'view_timeline',
          className: 'timeline-btn',
          icon: <FaHistory />
        });
        break;
        
      case 'disputed':
        actions.push({
          label: 'Contact Support',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />
        });
        break;
    }
    
    return actions;
  };

  const formatPrice = (price: number): string => {
    return formatCurrency(price, 'USD');
  };

  const formatDate = (date: string): string => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date: string): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateTimeSince = (date: string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const exportOrders = () => {
    try {
      const exportData = filteredOrders.map(order => ({
        'Order Number': order.orderNumber || 'N/A',
        'Listing': getListingTitle(order),
        'Seller': getSellerUsername(order),
        'Amount': order.amount,
        'Status': getStatusText(order.status),
        'Created Date': formatDate(order.createdAt),
        'Expected Delivery': order.expectedDelivery ? formatDate(order.expectedDelivery) : 'N/A',
        'Delivered At': order.deliveredAt ? formatDate(order.deliveredAt) : 'N/A',
        'Completed At': order.completedAt ? formatDate(order.completedAt) : 'N/A',
        'Revisions': `${order.revisions || 0}/${order.maxRevisions || 0}`
      }));

      const csvHeaders = Object.keys(exportData[0]).join(',');
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => 
          `"${String(value).replace(/"/g, '""')}"`
        ).join(',')
      );
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      link.href = URL.createObjectURL(blob);
      link.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Orders exported successfully!');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  const renderStatusFilters = () => (
    <div className="status-filters">
      {Object.entries(orderStatusCount).map(([status, count]) => (
        count > 0 && (
          <button
            key={status}
            className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            style={{ borderLeftColor: getStatusColor(status as any) }}
          >
            {getStatusIcon(status as any)}
            <span>{getStatusText(status as any)}</span>
            <span className="filter-count">{count}</span>
          </button>
        )
      ))}
    </div>
  );

  const renderOrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Order Details</h3>
            <button className="close-btn" onClick={() => setShowOrderDetails(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="order-detail-section">
              <h4>Order Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Order Number:</span>
                  <span className="detail-value">{selectedOrder.orderNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Listing:</span>
                  <span className="detail-value">{getListingTitle(selectedOrder)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Seller:</span>
                  <span className="detail-value">{getSellerUsername(selectedOrder)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">{formatPrice(selectedOrder.amount)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-badge" style={{ backgroundColor: getStatusColor(selectedOrder.status) }}>
                    {getStatusIcon(selectedOrder.status)}
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                {selectedOrder.expectedDelivery && (
                  <div className="detail-item">
                    <span className="detail-label">Expected Delivery:</span>
                    <span className="detail-value">{formatDate(selectedOrder.expectedDelivery)}</span>
                  </div>
                )}
                {selectedOrder.deliveredAt && (
                  <div className="detail-item">
                    <span className="detail-label">Delivered:</span>
                    <span className="detail-value">{formatDate(selectedOrder.deliveredAt)}</span>
                  </div>
                )}
                {selectedOrder.completedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Completed:</span>
                    <span className="detail-value">{formatDate(selectedOrder.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="order-detail-section">
              <h4>Payment Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Payment Status:</span>
                  <span className="detail-value">
                    {selectedOrder.status === 'completed' ? 'Released to Seller' : 
                     selectedOrder.paidAt ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {selectedOrder.platformFee && (
                  <div className="detail-item">
                    <span className="detail-label">Platform Fee:</span>
                    <span className="detail-value">{formatPrice(selectedOrder.platformFee)}</span>
                  </div>
                )}
                {selectedOrder.sellerAmount && (
                  <div className="detail-item">
                    <span className="detail-label">Seller Amount:</span>
                    <span className="detail-value">{formatPrice(selectedOrder.sellerAmount)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {selectedOrder.deliveryMessage && (
              <div className="order-detail-section">
                <h4>Delivery Message</h4>
                <p className="delivery-message">{selectedOrder.deliveryMessage}</p>
              </div>
            )}
            
            <div className="modal-actions">
              <button 
                className="btn secondary" 
                onClick={() => handleOrderAction(selectedOrder._id, 'view_timeline')}
              >
                <FaHistory /> View Timeline
              </button>
              <button 
                className="btn primary" 
                onClick={() => handleViewOrder(selectedOrder._id)}
              >
                <FaArrowRight /> Go to Order Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimelineModal = () => {
    return (
      <div className="modal-overlay" onClick={() => setShowTimeline(false)}>
        <div className="modal-content timeline-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Order Timeline</h3>
            <button className="close-btn" onClick={() => setShowTimeline(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="timeline-container">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, index) => (
                  <div key={event._id} className="timeline-event">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="event-header">
                        <h4 className="event-type">{event.eventType.replace(/_/g, ' ').toUpperCase()}</h4>
                        <span className="event-time">{calculateTimeSince(event.createdAt)}</span>
                      </div>
                      <p className="event-time-full">{formatDate(event.createdAt)}</p>
                      {event.eventData && Object.keys(event.eventData).length > 0 && (
                        <div className="event-data">
                          {Object.entries(event.eventData).map(([key, value]) => (
                            <div key={key} className="event-data-item">
                              <strong>{key}:</strong> <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-timeline">
                  <p>No timeline events found for this order.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentDetailsModal = () => {
    if (!paymentDetails) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowPaymentDetails(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Payment Details</h3>
            <button className="close-btn" onClick={() => setShowPaymentDetails(false)}>
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <PaymentDetails payment={paymentDetails} />
          </div>
        </div>
      </div>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="buyer-dashboard-loading">
          <FaSpinner className="loading-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="buyer-dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Buyer Dashboard</h1>
            <p>Manage and track your purchases</p>
            <div className="header-stats">
              <span className="stat-badge">
                <FaShoppingBag /> {stats.totalOrders} Total Orders
              </span>
              <span className="stat-badge">
                <FaCheckCircle /> {stats.completedOrders} Completed
              </span>
              <span className="stat-badge">
                <FaSync /> {stats.activeOrders} Active
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            {/* <button className="settings-btn" onClick={() => navigate('/marketplace/settings')}>
              <FaCog /> Settings
            </button> */}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card total-orders">
            <div className="stat-icon">
              <FaShoppingBag />
            </div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
              <small>{orderStatusCount.completed} completed • {orderStatusCount.cancelled} cancelled</small>
            </div>
          </div>

          <div className="stat-card active-orders">
            <div className="stat-icon">
              <FaSync />
            </div>
            <div className="stat-info">
              <h3>{stats.activeOrders}</h3>
              <p>Active Orders</p>
              <small>In progress and pending delivery</small>
            </div>
          </div>

          <div className="stat-card financial-summary">
            <div className="stat-icon">
              <FaWallet />
            </div>
            <div className="stat-info">
              <h3>{formatPrice(stats.totalSpent)}</h3>
              <p>Total Spent</p>
              <small>{formatPrice(stats.monthlySpent)} this month</small>
            </div>
          </div>

          <div className="stat-card performance">
            <div className="stat-icon">
              <FaChartLine />
            </div>
            <div className="stat-info">
              <h3>{stats.averageOrderValue ? formatPrice(stats.averageOrderValue) : 'N/A'}</h3>
              <p>Avg. Order Value</p>
              <small>{stats.successRate ? `${stats.successRate.toFixed(1)}% success rate` : 'N/A'}</small>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="status-distribution">
          <h3>Order Status Distribution</h3>
          {renderStatusFilters()}
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search orders by title, seller, or order number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button 
              className="filter-toggle" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <FaFilter /> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="advanced-filters">
              <div className="filter-group">
                <label>Sort By:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="status">Status</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Price Range:</label>
                <div className="price-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min || ''}
                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value ? parseFloat(e.target.value) : null})}
                    className="price-input"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max || ''}
                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value ? parseFloat(e.target.value) : null})}
                    className="price-input"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <label>Date Range:</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="date-input"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="date-input"
                  />
                </div>
              </div>
              
              <button 
                className="clear-filters" 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriceRange({ min: null, max: null });
                  setDateRange({ 
                    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0], 
                    end: new Date().toISOString().split('T')[0] 
                  });
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn primary" onClick={handleContinueShopping}>
              <FaShoppingCart />
              <span>Continue Shopping</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/marketplace/offers/my-offers')}
            >
              <FaBoxOpen />
              <span>My Offers</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/marketplace/messages')}
            >
              <FaComment />
              <span>Messages</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/marketplace/orders/stats/buyer')}
            >
              <FaListAlt />
              <span>Detailed Stats</span>
            </button>
            <button 
              className="action-btn"
              onClick={exportOrders}
              disabled={filteredOrders.length === 0}
            >
              <FaDownload />
              <span>Export Orders</span>
            </button>
          </div>
        </div>

        {/* Orders Section */}
        <div className="orders-section">
          <div className="section-header">
            <h2>Your Orders ({filteredOrders.length})</h2>
            <div className="header-actions">
              <div className="order-summary">
                <span className="summary-item">
                  <FaShoppingBag /> Total: {filteredOrders.length}
                </span>
                <span className="summary-item">
                  <FaDollarSign /> Value: {formatPrice(filteredOrders.reduce((sum, order) => sum + order.amount, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => {
                const actions = getOrderActions(order);
                const sellerUsername = getSellerUsername(order);
                const listingTitle = getListingTitle(order);
                const mediaUrl = getListingMedia(order);
                const category = getListingCategory(order);
                
                return (
                  <div key={order._id} className="order-card" style={{ borderLeftColor: getStatusColor(order.status) }}>
                    <div className="order-image">
                      <div className="image-container">
                        {mediaUrl ? (
                          <img 
                            src={mediaUrl} 
                            alt={listingTitle}
                            className="listing-image"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100x100?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="image-placeholder">
                            <FaBoxOpen />
                          </div>
                        )}
                        {category && (
                          <span className="category-badge">
                            <FaTag /> {category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="order-header">
                        <h3 className="product-name">{listingTitle}</h3>
                        <div className="order-meta">
                          {order.orderNumber && (
                            <span className="order-number">#{order.orderNumber}</span>
                          )}
                          <span className="order-date">
                            <FaCalendar />
                            {formatShortDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="seller">
                        <FaUser className="seller-icon" />
                        Seller: {sellerUsername}
                      </p>
                      <div className="order-info">
                        <div className="info-row">
                          <span className="price">{formatPrice(order.amount)}</span>
                          {(order.revisions > 0) && (
                            <span className="revisions-count">
                              <FaReply />
                              Revisions: {order.revisions}/{order.maxRevisions}
                            </span>
                          )}
                        </div>
                        <div className="info-row">
                          {order.expectedDelivery && (
                            <span className="expected-delivery">
                              <FaClock />
                              Expected: {formatShortDate(order.expectedDelivery)}
                            </span>
                          )}
                          {order.deliveredAt && (
                            <span className="delivered-date">
                              <FaTruck />
                              Delivered: {formatShortDate(order.deliveredAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="order-description">
                        <p>{getOrderDescription(order)}</p>
                      </div>
                    </div>

                    <div className="order-status-section">
                      <div className="status-section">
                        <div className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                          {getStatusIcon(order.status)}
                          <span>{getStatusText(order.status)}</span>
                        </div>
                        <div className="payment-status">
                          {order.paymentReleased ? (
                            <span className="payment-released">
                              <FaCheckCircle /> Payment Released
                            </span>
                          ) : order.paidAt ? (
                            <span className="payment-paid">
                              <FaCreditCard /> Paid
                            </span>
                          ) : (
                            <span className="payment-pending">
                              <FaClock /> Payment Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="order-actions">
                        <div className="quick-actions-row">
                          <button
                            onClick={() => handleViewOrder(order._id)}
                            className="view-order-btn"
                          >
                            <FaEye /> View Order
                          </button>
                          {order.status === 'delivered' && (
                            <button
                              onClick={() => handleOrderAction(order._id, 'download_files')}
                              className="download-files-btn"
                            >
                              <FaDownload /> Files
                            </button>
                          )}
                        </div>
                        
                        <div className="dropdown-actions">
                          <div className="dropdown">
                            <button className="dropdown-toggle">
                              More Actions
                            </button>
                            <div className="dropdown-menu">
                              {actions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleOrderAction(order._id, action.action)}
                                  className={`dropdown-item ${action.className}`}
                                  disabled={action.disabled}
                                >
                                  {action.icon}
                                  <span>{action.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-orders">
                <FaBoxOpen className="no-orders-icon" />
                <h3>No orders found</h3>
                <p>
                  {orders.length === 0 
                    ? "Start shopping to see your orders here" 
                    : "No orders match your search criteria"}
                </p>
                <div className="no-orders-actions">
                  {orders.length === 0 && (
                    <button className="cta-button" onClick={handleContinueShopping}>
                      <FaShoppingCart />
                      Start Shopping
                    </button>
                  )}
                  {orders.length > 0 && (
                    <button 
                      className="cta-button secondary" 
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setPriceRange({ min: null, max: null });
                        setDateRange({ 
                          start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0], 
                          end: new Date().toISOString().split('T')[0] 
                        });
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Tips */}
        <div className="dashboard-tips">
          <h3>Tips for Buyers</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <FaClock />
              <h4>Check Delivery Times</h4>
              <p>Always check expected delivery times before placing orders.</p>
            </div>
            <div className="tip-card">
              <FaComment />
              <h4>Communicate Clearly</h4>
              <p>Use the messaging system to communicate requirements clearly.</p>
            </div>
            <div className="tip-card">
              <FaDownload />
              <h4>Download Files</h4>
              <p>Download delivered files promptly and check them thoroughly.</p>
            </div>
            <div className="tip-card">
              <FaStar />
              <h4>Leave Reviews</h4>
              <p>Leave honest reviews to help other buyers and improve the marketplace.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showOrderDetails && renderOrderDetailsModal()}
      {showTimeline && renderTimelineModal()}
      {showPaymentDetails && renderPaymentDetailsModal()}
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;