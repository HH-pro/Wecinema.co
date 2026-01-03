// BuyerDashboard.tsx
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
  FaChartLine,
  FaHistory,
  FaChevronDown,
  FaSpinner,
  FaTag,
  FaFileInvoiceDollar,
  FaArrowRight,
  FaEllipsisV,
  FaRegUserCircle,
  FaRegFileAlt,
  FaRegMoneyBillAlt,
  FaRegChartBar,
  FaRegCalendarCheck,
  FaShippingFast,
  FaFileDownload,
  FaFileArchive,
  FaHeadset,
  FaClipboardCheck,
  FaReceipt,
  FaUndo,
  FaPaperPlane,
  FaCreditCard as FaCreditCardOutline,
  FaUserCircle,
  FaRegClock,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaExclamationCircle,
  FaPlus,
  FaShoppingBasket,
  FaChartBar,
  FaBell,
  FaCog,
  FaQuestionCircle,
  FaFileAlt,
  FaMoneyBillAlt,
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaCalendarAlt,
  FaExclamation,
  FaInfoCircle,
  FaLock,
  FaShieldAlt,
  FaRocket,
  FaLightbulb,
  FaHandshake,
  FaAward,
  FaCrown,
  FaGem,
  FaMedal,
  FaTrophy,
  FaCertificate,
  FaRibbon,
  FaLeaf,
  FaFire,
  FaBolt,
  FaWind,
  FaWater,
  FaMountain,
  FaSun,
  FaMoon,
  FaCloud,
  FaSnowflake,
   FaPalette,
  FaPenAlt,
  FaCode,
  FaBullhorn,
  FaVideo,
  FaMusic,
  FaUserTie,
  FaCamera,
  FaLanguage
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../Layout';
import marketplaceAPI, { formatCurrency } from '../../../api/marketplaceApi';
import { Order, OrderStats } from '../../../api/marketplaceApi';
import { isAuthenticated } from "../../../utilities/helperfFunction";

// Extend Order interface for buyer dashboard specific needs
interface BuyerOrder extends Order {
  orderNumber?: string;
}

// User interface
interface User {
  _id: string;
  username: string;
  avatar?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  sellerRating?: number;
}

// Listing interface
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

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedOrderForActions, setSelectedOrderForActions] = useState<BuyerOrder | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [minAmount, setMinAmount] = useState<number | ''>('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [sellerFilter, setSellerFilter] = useState<string>('');
  
  const actionsModalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Status colors with professional theme
  const statusColors = {
    pending_payment: { 
      color: '#FFA500', 
      rgb: '255, 165, 0', 
      icon: <FaRegClock />,
      gradient: 'linear-gradient(135deg, #FFA500, #FFD700)'
    },
    paid: { 
      color: '#3498db', 
      rgb: '52, 152, 219', 
      icon: <FaCreditCardOutline />,
      gradient: 'linear-gradient(135deg, #3498db, #2980b9)'
    },
    processing: { 
      color: '#9b59b6', 
      rgb: '155, 89, 182', 
      icon: <FaBoxOpen />,
      gradient: 'linear-gradient(135deg, #9b59b6, #8e44ad)'
    },
    in_progress: { 
      color: '#2ecc71', 
      rgb: '46, 204, 113', 
      icon: <FaSync />,
      gradient: 'linear-gradient(135deg, #2ecc71, #27ae60)'
    },
    delivered: { 
      color: '#1abc9c', 
      rgb: '26, 188, 156', 
      icon: <FaTruck />,
      gradient: 'linear-gradient(135deg, #1abc9c, #16a085)'
    },
    in_revision: { 
      color: '#e67e22', 
      rgb: '230, 126, 34', 
      icon: <FaUndo />,
      gradient: 'linear-gradient(135deg, #e67e22, #d35400)'
    },
    completed: { 
      color: '#27ae60', 
      rgb: '39, 174, 96', 
      icon: <FaRegCheckCircle />,
      gradient: 'linear-gradient(135deg, #27ae60, #229954)'
    },
    cancelled: { 
      color: '#95a5a6', 
      rgb: '149, 165, 166', 
      icon: <FaRegTimesCircle />,
      gradient: 'linear-gradient(135deg, #95a5a6, #7f8c8d)'
    },
    disputed: { 
      color: '#e74c3c', 
      rgb: '231, 76, 60', 
      icon: <FaExclamationCircle />,
      gradient: 'linear-gradient(135deg, #e74c3c, #c0392b)'
    },
    pending: { 
      color: '#f1c40f', 
      rgb: '241, 196, 15', 
      icon: <FaRegClock />,
      gradient: 'linear-gradient(135deg, #f1c40f, #f39c12)'
    },
    refunded: { 
      color: '#34495e', 
      rgb: '52, 73, 94', 
      icon: <FaRegTimesCircle />,
      gradient: 'linear-gradient(135deg, #34495e, #2c3e50)'
    }
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
    disputed: 'Disputed',
    pending: 'Pending',
    refunded: 'Refunded'
  };

  // Quick actions configuration
  const quickActions = [
    {
      icon: <FaShoppingCart />,
      label: 'Browse Marketplace',
      description: 'Explore new listings and services',
      action: () => navigate('/marketplace'),
      type: 'primary' as const,
      color: '#FF6B35',
      gradient: 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
      badge: 'Hot'
    },
    {
      icon: <FaComment />,
      label: 'Messages',
      description: 'Chat with sellers directly',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const,
      color: '#4361EE',
      gradient: 'linear-gradient(135deg, #4361EE, #3A0CA3)',
      badge: '3 New'
    },
    {
      icon: <FaChartLine />,
      label: 'Analytics',
      description: 'View performance insights',
      action: () => navigate('/marketplace/orders/stats/buyer'),
      type: 'premium' as const,
      color: '#7209B7',
      gradient: 'linear-gradient(135deg, #7209B7, #560BAD)'
    },
    {
      icon: <FaFileAlt />,
      label: 'Invoices',
      description: 'Download order invoices',
      action: () => navigate('/marketplace/orders/invoices'),
      type: 'secondary' as const,
      color: '#4CC9F0',
      gradient: 'linear-gradient(135deg, #4CC9F0, #4895EF)'
    },
    {
      icon: <FaHeadset />,
      label: 'Support',
      description: 'Get help from our team',
      action: () => navigate('/support'),
      type: 'secondary' as const,
      color: '#F72585',
      gradient: 'linear-gradient(135deg, #F72585, #B5179E)'
    },
    {
      icon: <FaAward />,
      label: 'Rewards',
      description: 'Earn points and badges',
      action: () => navigate('/rewards'),
      type: 'premium' as const,
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
      badge: 'New'
    }
  ];

  // Category icons mapping with modern icons
  const categoryIcons: Record<string, { icon: JSX.Element, color: string }> = {
    'digital_art': { icon: <FaGem />, color: '#9C27B0' },
    'graphic_design': { icon: <FaPalette />, color: '#2196F3' },
    'writing': { icon: <FaPenAlt />, color: '#4CAF50' },
    'programming': { icon: <FaCode />, color: '#FF9800' },
    'marketing': { icon: <FaBullhorn />, color: '#E91E63' },
    'video_editing': { icon: <FaVideo />, color: '#009688' },
    'music': { icon: <FaMusic />, color: '#673AB7' },
    'consulting': { icon: <FaUserTie />, color: '#3F51B5' },
    'photography': { icon: <FaCamera />, color: '#795548' },
    'translation': { icon: <FaLanguage />, color: '#00BCD4' },
    'default': { icon: <FaBoxOpen />, color: '#607D8B' }
  };

  // Achievement badges for the dashboard
  const achievements = [
    { icon: <FaTrophy />, label: 'First Order', unlocked: true },
    { icon: <FaMedal />, label: 'Repeat Buyer', unlocked: true },
    { icon: <FaCertificate />, label: 'Premium Member', unlocked: false },
    { icon: <FaCrown />, label: 'Top Spender', unlocked: false },
    { icon: <FaRibbon />, label: 'Fast Responder', unlocked: true },
  ];

  // Fetch data on component mount
  useEffect(() => {
    fetchBuyerData();
  }, []);

  // Filter and sort orders when dependencies change
  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, statusFilter, sortBy, categoryFilter, dateRange, minAmount, maxAmount, sellerFilter]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsModalRef.current && !actionsModalRef.current.contains(event.target as Node)) {
        setShowActionsModal(false);
      }
    };

    if (showActionsModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsModal]);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      // Fetch orders
      const ordersResponse = await marketplaceAPI.orders.getMyOrders();
      
      if (ordersResponse.success && ordersResponse.data?.orders) {
        setOrders(ordersResponse.data.orders);
        if (ordersResponse.data.stats) {
          setStats(ordersResponse.data.stats);
        }
      } else {
        console.error('Failed to fetch orders:', ordersResponse.error);
      }
    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const title = getListingTitle(order).toLowerCase();
        const seller = getSellerUsername(order).toLowerCase();
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        const orderId = order._id.toLowerCase();
        return title.includes(query) || seller.includes(query) || orderNumber.includes(query) || orderId.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(order => getListingCategory(order) === categoryFilter);
    }

    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(order => new Date(order.createdAt) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      filtered = filtered.filter(order => new Date(order.createdAt) <= endDate);
    }

    // Apply amount filters
    if (minAmount !== '') {
      filtered = filtered.filter(order => order.amount >= minAmount);
    }
    if (maxAmount !== '') {
      filtered = filtered.filter(order => order.amount <= maxAmount);
    }

    // Apply seller filter
    if (sellerFilter.trim()) {
      const query = sellerFilter.toLowerCase();
      filtered = filtered.filter(order => 
        getSellerUsername(order).toLowerCase().includes(query)
      );
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
        case 'title_asc':
          return getListingTitle(a).localeCompare(getListingTitle(b));
        case 'title_desc':
          return getListingTitle(b).localeCompare(getListingTitle(a));
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const getSellerUsername = (order: BuyerOrder): string => {
    if (typeof order.sellerId === 'object' && order.sellerId !== null) {
      const seller = order.sellerId as any;
      return seller.firstName 
        ? `${seller.firstName} ${seller.lastName || ''}`.trim()
        : seller.username || 'Unknown Seller';
    }
    return 'Unknown Seller';
  };

  const getListingTitle = (order: BuyerOrder): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as any).title || 'Unnamed Listing';
    }
    return 'Unnamed Listing';
  };

  const getListingCategory = (order: BuyerOrder): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as any).category || 'General';
    }
    return 'General';
  };

  const getCategoryIcon = (order: BuyerOrder): { icon: JSX.Element, color: string } => {
    const category = getListingCategory(order).toLowerCase();
    return categoryIcons[category] || categoryIcons.default;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    return statusColors[status as keyof typeof statusColors]?.color || '#FF6B35';
  };

  // Get status gradient
  const getStatusGradient = (status: string): string => {
    return statusColors[status as keyof typeof statusColors]?.gradient || 'linear-gradient(135deg, #FF6B35, #FF9F1C)';
  };

  // Get status text
  const getStatusText = (status: string): string => {
    return statusText[status as keyof typeof statusText] || 'Unknown Status';
  };

  // Get status icon
  const getStatusIcon = (status: string): JSX.Element => {
    return statusColors[status as keyof typeof statusColors]?.icon || <FaClock />;
  };

  // Get order actions based on status
  const getOrderActions = (order: BuyerOrder) => {
    const actions = [];
    
    // Always available actions
    actions.push({
      label: 'View Full Details',
      action: 'view_details',
      className: 'action-view-details',
      icon: <FaEye />,
      description: 'View complete order information',
      color: '#4361EE',
      gradient: 'linear-gradient(135deg, #4361EE, #3A0CA3)'
    });

    // Status-specific actions
    switch (order.status) {
      case 'pending_payment':
      case 'pending':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'action-complete-payment',
          icon: <FaCreditCard />,
          description: 'Complete your payment securely',
          color: '#2ECC71',
          gradient: 'linear-gradient(135deg, #2ECC71, #27AE60)'
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'action-cancel',
          icon: <FaTimes />,
          description: 'Cancel this order',
          color: '#E74C3C',
          gradient: 'linear-gradient(135deg, #E74C3C, #C0392B)'
        });
        break;
        
      case 'paid':
      case 'processing':
      case 'in_progress':
        actions.push({
          label: 'View Progress Timeline',
          action: 'view_timeline',
          className: 'action-timeline',
          icon: <FaHistory />,
          description: 'Track order progress',
          color: '#9B59B6',
          gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)'
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Message the seller directly',
          color: '#3498DB',
          gradient: 'linear-gradient(135deg, #3498DB, #2980B9)'
        });
        break;
        
      case 'delivered':
        if ((order.revisions || 0) < (order.maxRevisions || 3)) {
          actions.push({
            label: 'Request Revision',
            action: 'request_revision',
            className: 'action-revision',
            icon: <FaReply />,
            description: 'Request changes to delivered work',
            color: '#E67E22',
            gradient: 'linear-gradient(135deg, #E67E22, #D35400)'
          });
        }
        actions.push({
          label: 'Download All Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileDownload />,
          description: 'Download delivered files',
          color: '#1ABC9C',
          gradient: 'linear-gradient(135deg, #1ABC9C, #16A085)'
        });
        actions.push({
          label: 'Mark as Complete',
          action: 'complete_order',
          className: 'action-complete',
          icon: <FaCheckCircle />,
          description: 'Approve and release payment',
          color: '#2ECC71',
          gradient: 'linear-gradient(135deg, #2ECC71, #27AE60)'
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaDownload />,
          description: 'Download order files',
          color: '#1ABC9C',
          gradient: 'linear-gradient(135deg, #1ABC9C, #16A085)'
        });
        
        actions.push({
          label: 'View Invoice',
          action: 'view_invoice',
          className: 'action-invoice',
          icon: <FaFileInvoiceDollar />,
          description: 'View order invoice',
          color: '#9B59B6',
          gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)'
        });
        actions.push({
          label: 'Payment Details',
          action: 'view_payment',
          className: 'action-payment',
          icon: <FaReceipt />,
          description: 'View payment information',
          color: '#2ECC71',
          gradient: 'linear-gradient(135deg, #2ECC71, #27AE60)'
        });
        break;

      case 'in_revision':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Discuss revision details',
          color: '#3498DB',
          gradient: 'linear-gradient(135deg, #3498DB, #2980B9)'
        });
        actions.push({
          label: 'Download Latest Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileArchive />,
          description: 'Download revised files',
          color: '#1ABC9C',
          gradient: 'linear-gradient(135deg, #1ABC9C, #16A085)'
        });
        break;
    }

    // Always available
    actions.push({
      label: 'Contact Support',
      action: 'contact_support',
      className: 'action-support',
      icon: <FaHeadset />,
      description: 'Get help from support team',
      color: '#95A5A6',
      gradient: 'linear-gradient(135deg, #95A5A6, #7F8C8D)'
    });

    return actions;
  };

  // Handle order actions
  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const order = orders.find(o => o._id === orderId);
      if (!order) {
        return;
      }

      switch (action) {
        case 'view_details':
          navigate(`/marketplace/orders/${orderId}`);
          break;
          
        case 'complete_payment':
          navigate(`/marketplace/payment/${orderId}`);
          break;
          
        case 'contact_seller':
          navigate(`/marketplace/messages?order=${orderId}`);
          break;
          
        case 'view_timeline':
          navigate(`/marketplace/orders/${orderId}?tab=timeline`);
          break;
          
        case 'download_files':
          navigate(`/marketplace/orders/${orderId}?tab=files`);
          break;
          
        case 'complete_order':
          if (window.confirm('Are you sure you want to mark this order as complete? This will release payment to the seller.')) {
            await marketplaceAPI.orders.completeOrder(orderId);
            await fetchBuyerData();
          }
          break;
          
        case 'request_revision':
          const revisionNotes = prompt('Please provide detailed revision notes (minimum 10 characters):');
          if (revisionNotes && revisionNotes.trim().length >= 10) {
            await marketplaceAPI.orders.requestRevision(orderId, revisionNotes.trim());
            await fetchBuyerData();
          } else if (revisionNotes) {
            alert('Revision notes must be at least 10 characters');
          }
          break;
          
        case 'cancel_order':
          const cancelReason = prompt('Please provide reason for cancellation:');
          if (cancelReason && cancelReason.trim()) {
            if (window.confirm('Are you sure you want to cancel this order?')) {
              await marketplaceAPI.orders.cancelOrderByBuyer(orderId, cancelReason.trim());
              await fetchBuyerData();
            }
          }
          break;
          
        case 'view_invoice':
          navigate(`/marketplace/orders/${orderId}/invoice`);
          break;
          
        case 'view_payment':
          navigate(`/marketplace/orders/${orderId}?tab=payment`);
          break;
          
        case 'contact_support':
          window.open('mailto:support@marketplace.com');
          break;
          
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error: any) {
      console.error('Order action error:', error);
      alert(`Error: ${error.message || 'Failed to perform action'}`);
    }
  };

  // Open actions modal
  const openActionsModal = (order: BuyerOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedOrderForActions(order);
    setShowActionsModal(true);
  };

  // Export orders to CSV
  const exportOrders = () => {
    if (filteredOrders.length === 0) {
      alert('No orders to export');
      return;
    }

    try {
      const exportData = filteredOrders.map(order => ({
        'Order Number': order.orderNumber || 'N/A',
        'Listing': getListingTitle(order),
        'Seller': getSellerUsername(order),
        'Amount': formatCurrency(order.amount, 'USD'),
        'Status': getStatusText(order.status),
        'Payment Status': order.paymentStatus || 'N/A',
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
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export orders');
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(order => 
      ['processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
    ).length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalSpent = orders
      .filter(order => ['completed', 'delivered', 'paid', 'in_progress'].includes(order.status))
      .reduce((sum, order) => sum + order.amount, 0);

    return { totalOrders, activeOrders, completedOrders, totalSpent };
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateRange({ start: '', end: '' });
    setMinAmount('');
    setMaxAmount('');
    setSellerFilter('');
    setSortBy('newest');
    setShowAdvancedFilters(false);
  };

  // Render actions modal
  const renderActionsModal = () => {
    if (!selectedOrderForActions || !showActionsModal) return null;

    const actions = getOrderActions(selectedOrderForActions);
    const order = selectedOrderForActions;

    return (
      <div className="modal-overlay">
        <div className="modal-content actions-modal" ref={actionsModalRef}>
          <div className="modal-header">
            <div className="modal-title-section">
              <h3>Order Actions</h3>
              <p className="modal-subtitle">#{order.orderNumber || order._id.slice(-8)} • {getListingTitle(order)}</p>
            </div>
            <button 
              className="close-btn" 
              onClick={() => setShowActionsModal(false)}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            <div className="order-summary-card">
              <div className="order-avatar-large">
                <div className="avatar-icon-wrapper" style={{ 
                  background: getCategoryIcon(order).color + '20',
                  borderColor: getCategoryIcon(order).color
                }}>
                  <div style={{ color: getCategoryIcon(order).color }}>
                    {getCategoryIcon(order).icon}
                  </div>
                </div>
                <div className="order-status-indicator">
                  <span 
                    className="status-dot" 
                    style={{ background: getStatusGradient(order.status) }}
                  />
                </div>
              </div>
              <div className="order-info-summary">
                <h4>{getListingTitle(order)}</h4>
                <div className="order-meta-summary">
                  <span className="seller-info">
                    <FaUserCircle /> {getSellerUsername(order)}
                  </span>
                  <span className="amount-info">
                    <FaDollarSign /> {formatCurrency(order.amount, 'USD')}
                  </span>
                </div>
                <div className="order-status-summary">
                  <span 
                    className="status-badge-large"
                    style={{ background: getStatusGradient(order.status) }}
                  >
                    {getStatusIcon(order.status)}
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="actions-grid-modal">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`action-card ${action.className}`}
                  onClick={() => {
                    handleOrderAction(order._id, action.action);
                    setShowActionsModal(false);
                  }}
                  style={{ '--action-gradient': action.gradient } as React.CSSProperties}
                >
                  <div className="action-card-icon" style={{ background: action.color + '20' }}>
                    <div style={{ color: action.color }}>
                      {action.icon}
                    </div>
                  </div>
                  <div className="action-card-content">
                    <h5>{action.label}</h5>
                    <p>{action.description}</p>
                  </div>
                  <div className="action-card-arrow">
                    <FaArrowRight />
                  </div>
                </button>
              ))}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setShowActionsModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={() => {
                  navigate(`/marketplace/orders/${order._id}`);
                  setShowActionsModal(false);
                }}
              >
                <FaEye /> View Full Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render stats cards
  const renderStats = () => {
    const { totalOrders, activeOrders, completedOrders, totalSpent } = calculateStats();

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4361EE, #3A0CA3)' }}>
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3>{totalOrders}</h3>
            <p>Total Orders</p>
            <small>
              <FaClock className="inline mr-1" />
              All time purchases
            </small>
          </div>
          <div className="stat-trend">
            <span className="trend-up">+12.5%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4CC9F0, #4895EF)' }}>
            <FaSync />
          </div>
          <div className="stat-info">
            <h3>{activeOrders}</h3>
            <p>Active Orders</p>
            <small>
              <FaBoxOpen className="inline mr-1" />
              Currently in progress
            </small>
          </div>
          <div className="stat-trend">
            <span className="trend-up">+8.3%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #2ECC71, #27AE60)' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{completedOrders}</h3>
            <p>Completed</p>
            <small>
              <FaStar className="inline mr-1" />
              Successfully delivered
            </small>
          </div>
          <div className="stat-trend">
            <span className="trend-up">+15.7%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)' }}>
            <FaWallet />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(totalSpent, 'USD')}</h3>
            <p>Total Spent</p>
            <small>
              <FaDollarSign className="inline mr-1" />
              All purchases combined
            </small>
          </div>
          <div className="stat-trend">
            <span className="trend-up">+18.2%</span>
          </div>
        </div>
      </div>
    );
  };

  // Render status filters
  const renderStatusFilters = () => {
    const statusCounts = Object.keys(statusColors).reduce((acc, status) => {
      acc[status] = orders.filter(order => order.status === status).length;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="status-filters">
        <button
          className={`status-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{ 
            '--status-gradient': 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
            '--status-color': '#FF6B35'
          } as React.CSSProperties}
        >
          <FaListAlt />
          <span>All Orders</span>
          <span className="filter-count">{orders.length}</span>
        </button>
        
        {Object.entries(statusCounts).map(([status, count]) => (
          count > 0 && (
            <button
              key={status}
              className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              style={{ 
                '--status-gradient': statusColors[status as keyof typeof statusColors]?.gradient,
                '--status-color': statusColors[status as keyof typeof statusColors]?.color
              } as React.CSSProperties}
            >
              {getStatusIcon(status)}
              <span>{getStatusText(status)}</span>
              <span className="filter-count">{count}</span>
            </button>
          )
        ))}
      </div>
    );
  };

  // Render order card with professional styling
  const renderOrderCard = (order: BuyerOrder) => {
    const seller = getSellerUsername(order);
    const title = getListingTitle(order);
    const category = getListingCategory(order);
    const categoryIcon = getCategoryIcon(order);
    const sellerRating = order.sellerId && typeof order.sellerId === 'object' 
      ? (order.sellerId as any).sellerRating || 0 
      : 0;

    return (
      <div 
        key={order._id}
        className="order-card"
        style={{ 
          '--status-gradient': getStatusGradient(order.status),
          '--status-color': getStatusColor(order.status)
        } as React.CSSProperties}
        onClick={() => navigate(`/marketplace/orders/${order._id}`)}
      >
        <div className="order-avatar">
          <div className="avatar-container" style={{ 
            background: `${categoryIcon.color}15`,
            borderColor: `${categoryIcon.color}40`
          }}>
            <div className="avatar-icon" style={{ color: categoryIcon.color }}>
              {categoryIcon.icon}
            </div>
            <div className="avatar-badge">
              <span className="category-badge" style={{ background: categoryIcon.color }}>
                <FaTag /> {category}
              </span>
            </div>
            <div className="order-priority">
              {order.expectedDelivery && (
                <span className="priority-badge">
                  <FaCalendar /> 
                  {new Date(order.expectedDelivery) < new Date() ? 'Overdue' : 'On Track'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="order-details">
          <div className="order-header">
            <div className="order-title-section">
              <h3 className="product-name">{title}</h3>
              <div className="order-meta">
                {order.orderNumber && (
                  <span className="order-number">#{order.orderNumber}</span>
                )}
                <span className="order-date">
                  <FaCalendar />
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="order-price-section">
              <span className="price">{formatCurrency(order.amount, 'USD')}</span>
              <span className="order-id">ID: {order._id.slice(-8)}</span>
            </div>
          </div>
          
          <div className="order-seller-info">
            <p className="seller">
              <FaUserCircle className="seller-icon" style={{ color: categoryIcon.color }} />
              <span className="seller-name">Seller: {seller}</span>
              {sellerRating > 0 && (
                <span className="seller-rating">
                  <FaStar /> {sellerRating.toFixed(1)}
                </span>
              )}
            </p>
          </div>
          
          <div className="order-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: getProgressWidth(order.status),
                  background: getStatusGradient(order.status)
                }}
              />
            </div>
            <div className="progress-labels">
              <span className="progress-step active">Ordered</span>
              <span className={`progress-step ${['processing', 'in_progress', 'delivered', 'completed'].includes(order.status) ? 'active' : ''}`}>
                Processing
              </span>
              <span className={`progress-step ${['delivered', 'completed'].includes(order.status) ? 'active' : ''}`}>
                Delivered
              </span>
              <span className={`progress-step ${order.status === 'completed' ? 'active' : ''}`}>
                Completed
              </span>
            </div>
          </div>
          
          <div className="order-info">
            <div className="info-row">
              {(order.revisions || 0) > 0 && (
                <span className="revisions-count">
                  <FaReply />
                  Revisions: {order.revisions}/{order.maxRevisions || 3}
                </span>
              )}
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
                  <FaShippingFast />
                  Delivered: {new Date(order.deliveredAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="order-status-section">
          <div className="status-section">
            <div 
              className="status-badge"
              style={{ background: getStatusGradient(order.status) }}
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
                  <FaCreditCard /> Paid
                </span>
              ) : (
                <span className="payment-pending">
                  <FaClock /> {order.paymentStatus === 'failed' ? 'Payment Failed' : 'Payment Pending'}
                </span>
              )}
            </div>
          </div>
          
          <div className="order-actions">
            <div className="quick-actions-row">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/marketplace/orders/${order._id}`);
                }}
                className="view-order-btn"
              >
                <FaEye /> View Details
              </button>
              
              {order.status === 'delivered' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrderAction(order._id, 'download_files');
                  }}
                  className="download-files-btn"
                >
                  <FaDownload /> Download
                </button>
              )}
            </div>
            
            <button
              className="more-actions-btn"
              onClick={(e) => openActionsModal(order, e)}
            >
              <FaEllipsisV />
              <span>More Actions</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getProgressWidth = (status: string): string => {
    switch(status) {
      case 'pending_payment':
      case 'pending':
        return '25%';
      case 'paid':
        return '30%';
      case 'processing':
        return '50%';
      case 'in_progress':
        return '75%';
      case 'delivered':
      case 'in_revision':
        return '90%';
      case 'completed':
        return '100%';
      default:
        return '0%';
    }
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="buyer-dashboard loading-state">
          <div className="loading-content">
            <div className="loader-container">
              <div className="loader-spinner"></div>
              <div className="loader-text">Loading your dashboard...</div>
              <div className="loader-subtext">Preparing your personalized experience</div>
            </div>
          </div>
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
            <p className="header-subtitle">Track, manage, and review all your purchases in one professional dashboard</p>
            <div className="header-stats">
              <span className="stat-badge">
                <FaShoppingBag /> {orders.length} Total Orders
              </span>
              <span className="stat-badge">
                <FaCheckCircle /> {orders.filter(o => o.status === 'completed').length} Completed
              </span>
              <span className="stat-badge">
                <FaSync /> {orders.filter(o => ['processing', 'in_progress', 'delivered', 'in_revision'].includes(o.status)).length} Active
              </span>
              <span className="stat-badge">
                <FaDollarSign /> {formatCurrency(
                  orders
                    .filter(o => ['completed', 'delivered', 'paid', 'in_progress'].includes(o.status))
                    .reduce((sum, order) => sum + order.amount, 0), 
                  'USD'
                )}
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
            <button 
              className="new-order-btn"
              onClick={() => navigate('/marketplace')}
            >
              <FaPlus /> New Order
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="search-filter-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search orders by title, seller, or order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <FaTimes />
              </button>
            )}
          </div>
          
          <div className="filter-controls">
            <div className="sort-dropdown">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_high">Price: High to Low</option>
                <option value="price_low">Price: Low to High</option>
                <option value="title_asc">Title: A-Z</option>
                <option value="title_desc">Title: Z-A</option>
                <option value="status">Status</option>
              </select>
              <FaChevronDown className="dropdown-arrow" />
            </div>
            
            <button 
              className={`filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              aria-expanded={showAdvancedFilters}
            >
              <FaFilter /> Advanced Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="advanced-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label>Category</label>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  <option value="digital_art">Digital Art</option>
                  <option value="graphic_design">Graphic Design</option>
                  <option value="writing">Writing</option>
                  <option value="programming">Programming</option>
                  <option value="marketing">Marketing</option>
                  <option value="video_editing">Video Editing</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Date Range</label>
                <div className="date-range-inputs">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="date-input"
                    placeholder="Start Date"
                  />
                  <span className="date-range-separator">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="date-input"
                    placeholder="End Date"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <label>Amount Range</label>
                <div className="amount-range-inputs">
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : '')}
                    className="amount-input"
                    placeholder="Min"
                    min="0"
                  />
                  <span className="amount-range-separator">-</span>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : '')}
                    className="amount-input"
                    placeholder="Max"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="filter-row">
              <div className="filter-group">
                <label>Seller</label>
                <div className="seller-search">
                  <FaUser className="seller-search-icon" />
                  <input
                    type="text"
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    className="seller-input"
                    placeholder="Search by seller name..."
                  />
                </div>
              </div>
              
              <div className="filter-actions">
                <button className="clear-filters" onClick={clearFilters}>
                  <FaTimes /> Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Overview */}
        {renderStats()}

        {/* Achievements Section */}
        <div className="achievements-section">
          <div className="section-header">
            <div className="section-title">
              <h2><FaTrophy /> Your Achievements</h2>
              <p className="section-subtitle">Unlock badges and rewards</p>
            </div>
            <div className="section-controls">
              <button className="view-all-btn">
                View All <FaArrowRight />
              </button>
            </div>
          </div>
          
          <div className="achievements-grid">
            {achievements.map((achievement, index) => (
              <div 
                key={index}
                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon">
                  {achievement.icon}
                </div>
                <div className="achievement-content">
                  <h4>{achievement.label}</h4>
                  <p>{achievement.unlocked ? 'Unlocked' : 'Locked'}</p>
                </div>
                {achievement.unlocked && (
                  <span className="achievement-badge">
                    <FaCheckCircle />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Quick Actions</h2>
              <p className="section-subtitle">Common tasks and shortcuts</p>
            </div>
            <div className="section-controls">
              <button className="view-all-btn">
                View All <FaArrowRight />
              </button>
            </div>
          </div>
          
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <div 
                key={index} 
                className={`quick-action-card ${action.type}`}
                onClick={action.action}
                style={{ '--action-gradient': action.gradient } as React.CSSProperties}
              >
                <div className="action-icon-container">
                  <div 
                    className="action-icon"
                    style={{ background: action.gradient }}
                  >
                    {action.icon}
                  </div>
                  {action.badge && (
                    <span className="action-badge">{action.badge}</span>
                  )}
                </div>
                <div className="action-content">
                  <h3 className="action-title">{action.label}</h3>
                  <p className="action-description">{action.description}</p>
                </div>
                <div className="action-arrow">
                  <FaArrowRight />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="status-distribution">
          <div className="section-header">
            <div className="section-title">
              <h3>Order Status Distribution</h3>
              <p className="section-subtitle">Filter orders by status</p>
            </div>
          </div>
          {renderStatusFilters()}
        </div>

        {/* Orders Section */}
        <div className="orders-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Your Orders</h2>
              <p className="section-subtitle">
                {filteredOrders.length} orders found • Total value: {formatCurrency(
                  filteredOrders.reduce((sum, order) => sum + order.amount, 0), 
                  'USD'
                )}
              </p>
            </div>
            <div className="section-controls">
              <div className="order-metrics">
                <div className="metric-item">
                  <FaShoppingBag />
                  <span>Total: {filteredOrders.length}</span>
                </div>
                <div className="metric-item">
                  <FaDollarSign />
                  <span>Value: {formatCurrency(
                    filteredOrders.reduce((sum, order) => sum + order.amount, 0), 
                    'USD'
                  )}</span>
                </div>
                <div className="metric-item">
                  <FaCheckCircle />
                  <span>Completed: {filteredOrders.filter(o => o.status === 'completed').length}</span>
                </div>
              </div>
              
              <div className="action-buttons">
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
          </div>

          {/* Orders List */}
          <div className="orders-list-container">
            {filteredOrders.length > 0 ? (
              <div className="orders-list">
                {filteredOrders.map(order => renderOrderCard(order))}
              </div>
            ) : (
              <div className="no-orders">
                <div className="no-orders-illustration">
                  <FaBoxOpen className="illustration-icon" />
                  <div className="illustration-background"></div>
                </div>
                <div className="no-orders-content">
                  <h3>No orders found</h3>
                  <p>
                    {orders.length === 0 
                      ? "You haven't placed any orders yet. Start exploring our marketplace to find amazing products and services!" 
                      : "No orders match your search criteria. Try adjusting your filters or search term."}
                  </p>
                  <div className="no-orders-actions">
                    {orders.length === 0 && (
                      <button 
                        className="primary-action" 
                        onClick={() => navigate('/marketplace')}
                        aria-label="Start shopping"
                      >
                        <FaShoppingCart />
                        Start Shopping
                      </button>
                    )}
                    {orders.length > 0 && (
                      <>
                        <button 
                          className="secondary-action" 
                          onClick={clearFilters}
                          aria-label="Clear filters"
                        >
                          Clear Filters
                        </button>
                        <button 
                          className="tertiary-action" 
                          onClick={() => navigate('/marketplace')}
                        >
                          Browse Marketplace
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Modal */}
        {renderActionsModal()}
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;