import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  FaSpinner,
  FaChevronDown,
  FaEllipsisV,
  FaRegClock,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaRegCalendarAlt,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaChartBar,
  FaRegChartBar,
  FaShippingFast
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../Layout';
import { marketplaceAPI, isAuthenticated, formatCurrency, getOrderStatusInfo } from '../../../api';
import { getCurrentUserId } from '../../../utilities/helperfFunction';
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
  
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const navigate = useNavigate();

  // Status colors configuration with yellow theme
  const statusColors = {
    pending_payment: { color: '#f59e0b', rgb: '245, 158, 11', bg: 'rgba(245, 158, 11, 0.1)' },
    paid: { color: '#10b981', rgb: '16, 185, 129', bg: 'rgba(16, 185, 129, 0.1)' },
    processing: { color: '#8b5cf6', rgb: '139, 92, 246', bg: 'rgba(139, 92, 246, 0.1)' },
    in_progress: { color: '#3b82f6', rgb: '59, 130, 246', bg: 'rgba(59, 130, 246, 0.1)' },
    delivered: { color: '#059669', rgb: '5, 150, 105', bg: 'rgba(5, 150, 105, 0.1)' },
    in_revision: { color: '#f97316', rgb: '249, 115, 22', bg: 'rgba(249, 115, 22, 0.1)' },
    completed: { color: '#059669', rgb: '5, 150, 105', bg: 'rgba(5, 150, 105, 0.1)' },
    cancelled: { color: '#6b7280', rgb: '107, 114, 128', bg: 'rgba(107, 114, 128, 0.1)' },
    disputed: { color: '#dc2626', rgb: '220, 38, 38', bg: 'rgba(220, 38, 38, 0.1)' }
  };

  // Status icons
  const statusIcons = {
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

  // Status text mapping
  const statusText = {
    pending_payment: 'Payment Pending',
    paid: 'Paid',
    processing: 'Processing',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    in_revision: 'In Revision',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed'
  };

  // Stats cards configuration with yellow theme
  const statCardsConfig = [
    {
      key: 'total-orders',
      icon: <FaShoppingBag />,
      title: 'Total Orders',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)'
    },
    {
      key: 'active-orders',
      icon: <FaSync />,
      title: 'Active Orders',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)'
    },
    {
      key: 'completed-orders',
      icon: <FaCheckCircle />,
      title: 'Completed',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)'
    },
    {
      key: 'total-spent',
      icon: <FaWallet />,
      title: 'Total Spent',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)'
    }
  ];

  // Quick actions configuration
  const quickActions = [
    {
      icon: <FaShoppingCart />,
      label: 'Browse Marketplace',
      action: () => navigate('/marketplace'),
      type: 'primary' as const,
      color: '#f59e0b'
    },
    {
      icon: <FaBoxOpen />,
      label: 'My Offers',
      action: () => navigate('/marketplace/offers/my-offers'),
      type: 'secondary' as const,
      color: '#8b5cf6'
    },
    {
      icon: <FaComment />,
      label: 'Messages',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const,
      color: '#3b82f6'
    },
    {
      icon: <FaChartLine />,
      label: 'Analytics',
      action: () => navigate('/marketplace/orders/stats/buyer'),
      type: 'secondary' as const,
      color: '#10b981'
    }
  ];

  useEffect(() => {
    fetchBuyerData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (!activeDropdown) return;
      
      const target = event.target as HTMLElement;
      const isClickInside = Object.values(dropdownRefs.current).some(ref => 
        ref && ref.contains(target)
      );
      
      if (!isClickInside) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

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

      const ordersResponse = await marketplaceAPI.orders.getMy(setLoading) as DashboardResponse;
      
      if (ordersResponse.success && ordersResponse.orders) {
        const fetchedOrders = ordersResponse.orders;
        setOrders(fetchedOrders);
        
        calculateStatusCounts(fetchedOrders);
        
        if (ordersResponse.stats) {
          setStats(ordersResponse.stats);
        } else {
          const calculatedStats = calculateStats(fetchedOrders);
          setStats(calculatedStats);
        }
        
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
    return 'Unknown Seller';
  };

  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).title || 'Unnamed Listing';
    }
    return 'Unnamed Listing';
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
    return statusColors[status]?.color || '#f59e0b';
  };

  const getStatusText = (status: Order['status']): string => {
    return statusText[status] || 'Unknown Status';
  };

  const getStatusIcon = (status: Order['status']): JSX.Element => {
    return statusIcons[status] || <FaClock className="status-icon" />;
  };

  const getOrderActions = (order: Order) => {
    const actions = [];
    
    // Always available actions
    actions.push({
      label: 'View Details',
      action: 'view_details',
      className: 'view-details-btn',
      icon: <FaEye />,
      description: 'View order information'
    });

    // Status-specific actions
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'complete-payment-btn',
          icon: <FaCreditCard />,
          description: 'Complete your payment'
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'cancel-btn',
          icon: <FaTimes />,
          description: 'Cancel this order'
        });
        break;
        
      case 'paid':
      case 'processing':
      case 'in_progress':
        actions.push({
          label: 'View Timeline',
          action: 'view_timeline',
          className: 'timeline-btn',
          icon: <FaHistory />,
          description: 'View order progress'
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />,
          description: 'Message the seller'
        });
        break;
        
      case 'delivered':
        if ((order.revisions || 0) < (order.maxRevisions || 3)) {
          actions.push({
            label: 'Request Revision',
            action: 'request_revision',
            className: 'revision-btn',
            icon: <FaReply />,
            description: 'Request changes'
          });
        }
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />,
          description: 'Download delivered files'
        });
        actions.push({
          label: 'Complete Order',
          action: 'complete_order',
          className: 'complete-order-btn',
          icon: <FaCheckCircle />,
          description: 'Mark as complete'
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />,
          description: 'Download files'
        });
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'review-btn',
          icon: <FaStar />,
          description: 'Rate the seller'
        });
        actions.push({
          label: 'View Summary',
          action: 'view_summary',
          className: 'summary-btn',
          icon: <FaFileInvoiceDollar />,
          description: 'View order summary'
        });
        actions.push({
          label: 'Payment Details',
          action: 'view_payment',
          className: 'payment-btn',
          icon: <FaCreditCard />,
          description: 'View payment information'
        });
        break;
        
      case 'in_revision':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'contact-btn',
          icon: <FaComment />,
          description: 'Discuss revisions'
        });
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />,
          description: 'Download latest files'
        });
        break;
    }

    // Always available
    if (order.status !== 'pending_payment') {
      actions.push({
        label: 'Contact Seller',
        action: 'contact_seller',
        className: 'contact-btn',
        icon: <FaComment />,
        description: 'Message the seller'
      });
    }

    return actions;
  };

  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const order = orders.find(o => o._id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }

      switch (action) {
        case 'view_details':
          setSelectedOrder(order);
          setShowOrderDetails(true);
          break;
          
        case 'complete_payment':
          navigate(`/marketplace/payment/${orderId}`);
          break;
          
        case 'contact_seller':
          navigate(`/marketplace/messages?order=${orderId}`);
          break;
          
        case 'view_timeline':
          try {
            setLoading(true);
            const timelineResponse = await marketplaceAPI.orders.getTimeline(orderId, setLoading) as any;
            if (timelineResponse.success) {
              setTimelineEvents(timelineResponse.timeline || []);
              setShowTimeline(true);
            }
          } catch (error) {
            toast.error('Failed to load timeline');
          } finally {
            setLoading(false);
          }
          break;
          
        case 'download_files':
          navigate(`/marketplace/orders/${orderId}?tab=files`);
          break;
          
        case 'complete_order':
          if (window.confirm('Are you sure you want to mark this order as complete? This will release payment to the seller.')) {
            await marketplaceAPI.orders.complete(orderId, setLoading);
            toast.success('Order completed successfully! Payment released to seller.');
            await fetchBuyerData();
          }
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
          
        case 'leave_review':
          navigate(`/marketplace/reviews/create?orderId=${orderId}`);
          break;
          
        case 'view_summary':
          navigate(`/marketplace/orders/${orderId}?tab=summary`);
          break;
          
        case 'view_payment':
          try {
            setLoading(true);
            const paymentStatus = await marketplaceAPI.payments.getStatus(orderId, setLoading) as any;
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
          break;
          
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error: any) {
      console.error('Order action error:', error);
      toast.error(error.message || 'Failed to perform action');
    }
  };

  const toggleDropdown = useCallback((orderId: string) => {
    setActiveDropdown(prev => prev === orderId ? null : orderId);
  }, []);

  const Dropdown = React.memo(({ order }: { order: Order }) => {
    const actions = getOrderActions(order);
    const isOpen = activeDropdown === order._id;

    if (actions.length <= 1) return null;

    return (
      <div 
        ref={el => {
          if (el) dropdownRefs.current[order._id] = el;
        }}
        className="dropdown-actions"
      >
        <div className="dropdown">
          <button
            className={`dropdown-toggle ${isOpen ? 'active' : ''}`}
            onClick={() => toggleDropdown(order._id)}
            type="button"
            aria-expanded={isOpen}
            aria-label="More actions"
          >
            <span>More</span>
            <FaChevronDown className={`dropdown-arrow ${isOpen ? 'rotate' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="dropdown-menu show">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`dropdown-item ${action.className}`}
                  onClick={() => {
                    handleOrderAction(order._id, action.action);
                    setActiveDropdown(null);
                  }}
                  type="button"
                  aria-label={action.description}
                  title={action.description}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  });

  const exportOrders = () => {
    if (filteredOrders.length === 0) {
      toast.info('No orders to export');
      return;
    }

    try {
      const exportData = filteredOrders.map(order => ({
        'Order Number': order.orderNumber || 'N/A',
        'Listing': getListingTitle(order),
        'Seller': getSellerUsername(order),
        'Amount': formatCurrency(order.amount, 'USD'),
        'Status': getStatusText(order.status),
        'Created Date': new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        'Expected Delivery': order.expectedDelivery 
          ? new Date(order.expectedDelivery).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'N/A',
        'Revisions': `${order.revisions || 0}/${order.maxRevisions || 0}`
      }));

      const csvHeaders = Object.keys(exportData[0]).join(',');
      const csvRows = exportData.map(row => 
        Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
      );
      
      const csvContent = [csvHeaders, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const filename = `buyer_orders_${new Date().toISOString().split('T')[0]}.csv`;
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      
      toast.success(`Orders exported to ${filename}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    }
  };

  const renderStats = () => {
    const statValues = {
      'total-orders': stats.totalOrders,
      'active-orders': stats.activeOrders,
      'completed-orders': stats.completedOrders,
      'total-spent': formatCurrency(stats.totalSpent, 'USD')
    };

    return (
      <div className="stats-grid">
        {statCardsConfig.map((card) => {
          const value = statValues[card.key as keyof typeof statValues];
          let description = '';
          
          switch(card.key) {
            case 'total-orders':
              description = `${orderStatusCount.completed} completed • ${stats.pendingOrders} pending`;
              break;
            case 'active-orders':
              description = `${orderStatusCount.in_progress} in progress • ${orderStatusCount.delivered} delivered`;
              break;
            case 'completed-orders':
              description = `${stats.successRate?.toFixed(1) || '0'}% success rate`;
              break;
            case 'total-spent':
              description = `${formatCurrency(stats.monthlySpent, 'USD')} this month`;
              break;
          }
          
          return (
            <div 
              key={card.key}
              className="stat-card"
              style={{ 
                '--card-color': card.color,
                '--card-bg': card.bg
              } as React.CSSProperties}
            >
              <div className="stat-icon">
                {card.icon}
              </div>
              <div className="stat-info">
                <h3>{value}</h3>
                <p>{card.title}</p>
                <small>{description}</small>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatusFilters = () => {
    return (
      <div className="status-filters">
        <button
          className={`status-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{ 
            '--status-color': '#f59e0b',
            '--status-rgb': '245, 158, 11'
          } as React.CSSProperties}
        >
          <FaListAlt />
          <span>All Orders</span>
          <span className="filter-count">{orders.length}</span>
        </button>
        
        {Object.entries(orderStatusCount).map(([status, count]) => (
          count > 0 && (
            <button
              key={status}
              className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              style={{ 
                '--status-color': statusColors[status as keyof typeof statusColors]?.color,
                '--status-rgb': statusColors[status as keyof typeof statusColors]?.rgb
              } as React.CSSProperties}
            >
              {getStatusIcon(status as Order['status'])}
              <span>{getStatusText(status as Order['status'])}</span>
              <span className="filter-count">{count}</span>
            </button>
          )
        ))}
      </div>
    );
  };

  const renderOrderCard = (order: Order) => {
    const mediaUrl = getListingMedia(order);
    const seller = getSellerUsername(order);
    const title = getListingTitle(order);
    const category = getListingCategory(order);

    return (
      <div 
        key={order._id}
        className="order-card"
        style={{ 
          '--status-color': getStatusColor(order.status)
        } as React.CSSProperties}
        onClick={() => {
          if (activeDropdown === order._id) {
            setActiveDropdown(null);
          }
        }}
      >
        <div className="order-image">
          <div className="image-container">
            {mediaUrl ? (
              <img 
                src={mediaUrl} 
                alt={title}
                className="listing-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
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
            <h3 className="product-name">{title}</h3>
            <div className="order-meta">
              {order.orderNumber && (
                <span className="order-number">#{order.orderNumber}</span>
              )}
              <span className="order-date">
                <FaCalendar />
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          <p className="seller">
            <FaUser className="seller-icon" />
            <span>Seller: {seller}</span>
          </p>
          
          <div className="order-info">
            <div className="info-row">
              <span className="price">{formatCurrency(order.amount, 'USD')}</span>
              {(order.revisions > 0) && (
                <span className="revisions-count">
                  <FaReply />
                  Revisions: {order.revisions}/{order.maxRevisions || 3}
                </span>
              )}
            </div>
            
            <div className="info-row">
              {order.expectedDelivery && (
                <span className="expected-delivery">
                  <FaClock />
                  Expected: {new Date(order.expectedDelivery).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
              {order.deliveredAt && (
                <span className="delivered-date">
                  <FaTruck />
                  Delivered: {new Date(order.deliveredAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
          
          <div className="order-description">
            <p>
              {order.status === 'completed' 
                ? 'Order successfully completed and payment released to seller.'
                : order.status === 'delivered'
                ? 'Files delivered. Please review and mark as complete.'
                : order.status === 'in_progress'
                ? 'Seller is working on your order.'
                : order.status === 'pending_payment'
                ? 'Awaiting payment confirmation.'
                : 'Order is being processed.'}
            </p>
          </div>
        </div>

        <div className="order-status-section">
          <div className="status-section">
            <div 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
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
                  <FaCreditCard /> Payment Received
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
                onClick={() => navigate(`/marketplace/orders/${order._id}`)}
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
            
            <Dropdown order={order} />
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
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Buyer Dashboard</h1>
            <p>Track, manage, and review all your purchases in one professional dashboard</p>
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
            <button 
              className="refresh-btn" 
              onClick={fetchBuyerData} 
              disabled={loading}
              aria-label="Refresh dashboard"
            >
              <FaSync className={loading ? 'spinning' : ''} /> 
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Statistics Overview */}
        {renderStats()}

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
                aria-label="Search orders"
              />
            </div>
            
            <button 
              className="filter-toggle" 
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
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
                  aria-label="Sort orders by"
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
                aria-label="Clear all filters"
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
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`action-btn ${action.type}`}
                onClick={action.action}
                style={{ '--action-color': action.color } as React.CSSProperties}
                aria-label={action.label}
              >
                <div className="action-icon-wrapper">
                  {action.icon}
                </div>
                <span>{action.label}</span>
              </button>
            ))}
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
                  <FaDollarSign /> Value: {formatCurrency(
                    filteredOrders.reduce((sum, order) => sum + order.amount, 0), 
                    'USD'
                  )}
                </span>
              </div>
              
              <button 
                className="export-btn" 
                onClick={exportOrders} 
                disabled={filteredOrders.length === 0}
                aria-label="Export orders to CSV"
              >
                <FaDownload /> Export CSV
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => renderOrderCard(order))
            ) : (
              <div className="no-orders">
                <FaBoxOpen className="no-orders-icon" />
                <h3>No orders found</h3>
                <p>
                  {orders.length === 0 
                    ? "You haven't placed any orders yet. Start shopping to see your orders here!" 
                    : "No orders match your search criteria. Try adjusting your filters."}
                </p>
                <div className="no-orders-actions">
                  {orders.length === 0 && (
                    <button 
                      className="cta-button" 
                      onClick={() => navigate('/marketplace')}
                      aria-label="Start shopping"
                    >
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
                      aria-label="Clear filters"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buyer Tips Section */}
        <div className="buyer-tips">
          <h3>Tips for Successful Purchases</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <FaComment />
              <h4>Clear Communication</h4>
              <p>Communicate your requirements clearly with sellers for better results.</p>
            </div>
            <div className="tip-card">
              <FaClock />
              <h4>Check Delivery Times</h4>
              <p>Always verify expected delivery times before confirming orders.</p>
            </div>
            <div className="tip-card">
              <FaStar />
              <h4>Leave Reviews</h4>
              <p>Share your experience to help other buyers and improve the marketplace.</p>
            </div>
            <div className="tip-card">
              <FaCheckCircle />
              <h4>Review Deliverables</h4>
              <p>Carefully review delivered work before marking orders as complete.</p>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showOrderDetails && selectedOrder && (
          <div 
            className="modal-overlay" 
            onClick={() => setShowOrderDetails(false)}
            aria-label="Close order details"
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Order Details</h3>
                <button className="close-btn" onClick={() => setShowOrderDetails(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="modal-order-info">
                  <div className="modal-order-image">
                    <img 
                      src={getListingMedia(selectedOrder) || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop'} 
                      alt={getListingTitle(selectedOrder)}
                    />
                  </div>
                  <div className="modal-order-details">
                    <h4>{getListingTitle(selectedOrder)}</h4>
                    <p><strong>Seller:</strong> {getSellerUsername(selectedOrder)}</p>
                    <p><strong>Order #:</strong> {selectedOrder.orderNumber || 'N/A'}</p>
                    <p><strong>Amount:</strong> {formatCurrency(selectedOrder.amount, 'USD')}</p>
                    <p><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedOrder.status) }}>
                      {getStatusText(selectedOrder.status)}
                    </span></p>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="btn secondary" 
                    onClick={() => handleOrderAction(selectedOrder._id, 'view_timeline')}
                  >
                    <FaHistory /> Timeline
                  </button>
                  <button 
                    className="btn primary" 
                    onClick={() => navigate(`/marketplace/orders/${selectedOrder._id}`)}
                  >
                    <FaArrowRight /> Full Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTimeline && (
          <div className="modal-overlay" onClick={() => setShowTimeline(false)}>
            <div className="modal-content timeline-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Order Timeline</h3>
                <button className="close-btn" onClick={() => setShowTimeline(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="modal-body">
                {timelineEvents.length > 0 ? (
                  <div className="timeline">
                    {timelineEvents.map((event, index) => (
                      <div key={index} className="timeline-event">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="event-header">
                            <h4>{event.eventType.replace(/_/g, ' ').toUpperCase()}</h4>
                            <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                          </div>
                          {event.eventData && (
                            <p>{JSON.stringify(event.eventData)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No timeline events available.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {showPaymentDetails && paymentDetails && (
          <PaymentDetails
            payment={paymentDetails}
            onClose={() => setShowPaymentDetails(false)}
          />
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;