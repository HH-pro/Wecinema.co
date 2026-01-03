// BuyerDashboard.tsx - Light Theme
import React, { useEffect, useState, useRef } from 'react';
import { 
  FaShoppingBag, 
  FaClock, 
  FaCheckCircle, 
  FaWallet,
  FaShoppingCart,
  FaBoxOpen,
  FaSync,
  FaTruck,
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
  FaReceipt,
  FaUndo,
  FaCreditCard as FaCreditCardOutline,
  FaUserCircle,
  FaRegClock,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaExclamationCircle,
  FaPlus,
  FaArrowLeft,
  FaCalendarAlt,
  FaExclamation,
  FaInfoCircle,
  FaPalette,
  FaPencilAlt,
  FaCode,
  FaBullhorn,
  FaVideo,
  FaMusic,
  FaUserTie,
  FaCamera,
  FaLanguage,
  FaTrophy,
  FaMedal,
  FaCertificate,
  FaCrown,
  FaRibbon,
  FaLayerGroup,
  FaChartPie,
  FaUsers,
  FaGlobe,
  FaLightbulb,
  FaRocket,
  FaShieldAlt,
  FaLock,
  FaBolt,
  FaFire,
  FaLeaf,
  FaCloud,
  FaSun
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

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
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

  // Light theme status colors
  const statusColors = {
    pending_payment: { 
      color: '#FFB74D', 
      bgColor: '#FFF3E0',
      icon: <FaRegClock />,
    },
    paid: { 
      color: '#64B5F6', 
      bgColor: '#E3F2FD',
      icon: <FaCreditCardOutline />,
    },
    processing: { 
      color: '#9575CD', 
      bgColor: '#F3E5F5',
      icon: <FaBoxOpen />,
    },
    in_progress: { 
      color: '#4DB6AC', 
      bgColor: '#E0F2F1',
      icon: <FaSync />,
    },
    delivered: { 
      color: '#81C784', 
      bgColor: '#E8F5E9',
      icon: <FaTruck />,
    },
    in_revision: { 
      color: '#FF8A65', 
      bgColor: '#FBE9E7',
      icon: <FaUndo />,
    },
    completed: { 
      color: '#66BB6A', 
      bgColor: '#E8F5E9',
      icon: <FaRegCheckCircle />,
    },
    cancelled: { 
      color: '#90A4AE', 
      bgColor: '#ECEFF1',
      icon: <FaRegTimesCircle />,
    },
    disputed: { 
      color: '#E57373', 
      bgColor: '#FFEBEE',
      icon: <FaExclamationCircle />,
    },
    pending: { 
      color: '#FFD54F', 
      bgColor: '#FFFDE7',
      icon: <FaRegClock />,
    },
    refunded: { 
      color: '#78909C', 
      bgColor: '#ECEFF1',
      icon: <FaRegTimesCircle />,
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

  // Quick actions configuration - Light theme colors
  const quickActions = [
    {
      icon: <FaShoppingCart />,
      label: 'Browse Marketplace',
      description: 'Explore new listings and services',
      action: () => navigate('/marketplace'),
      type: 'primary' as const,
      color: '#4F46E5',
      bgColor: '#EEF2FF'
    },
    {
      icon: <FaComment />,
      label: 'Messages',
      description: 'Chat with sellers directly',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const,
      color: '#0EA5E9',
      bgColor: '#F0F9FF'
    },
    {
      icon: <FaChartLine />,
      label: 'Analytics',
      description: 'View performance insights',
      action: () => navigate('/marketplace/orders/stats/buyer'),
      type: 'premium' as const,
      color: '#8B5CF6',
      bgColor: '#F5F3FF'
    },
    {
      icon: <FaSpinner />,
      label: 'Invoices',
      description: 'Download order invoices',
      action: () => navigate('/marketplace/orders/invoices'),
      type: 'secondary' as const,
      color: '#06B6D4',
      bgColor: '#ECFEFF'
    },
    {
      icon: <FaHeadset />,
      label: 'Support',
      description: 'Get help from our team',
      action: () => navigate('/support'),
      type: 'secondary' as const,
      color: '#EC4899',
      bgColor: '#FDF2F8'
    },
    {
      icon: <FaTrophy />,
      label: 'Rewards',
      description: 'Earn points and badges',
      action: () => navigate('/rewards'),
      type: 'premium' as const,
      color: '#F59E0B',
      bgColor: '#FFFBEB'
    }
  ];

  // Category icons mapping with light theme colors
  const categoryIcons: Record<string, { icon: JSX.Element, color: string, bgColor: string }> = {
    'digital_art': { icon: <FaPalette />, color: '#8B5CF6', bgColor: '#F5F3FF' },
    'graphic_design': { icon: <FaPencilAlt />, color: '#0EA5E9', bgColor: '#F0F9FF' },
    'writing': { icon: <FaRegFileAlt />, color: '#10B981', bgColor: '#ECFDF5' },
    'programming': { icon: <FaCode />, color: '#F59E0B', bgColor: '#FFFBEB' },
    'marketing': { icon: <FaBullhorn />, color: '#EC4899', bgColor: '#FDF2F8' },
    'video_editing': { icon: <FaVideo />, color: '#6366F1', bgColor: '#EEF2FF' },
    'music': { icon: <FaMusic />, color: '#8B5CF6', bgColor: '#F5F3FF' },
    'consulting': { icon: <FaUserTie />, color: '#06B6D4', bgColor: '#ECFEFF' },
    'photography': { icon: <FaCamera />, color: '#EF4444', bgColor: '#FEF2F2' },
    'translation': { icon: <FaLanguage />, color: '#14B8A6', bgColor: '#F0FDFA' },
    'default': { icon: <FaBoxOpen />, color: '#6B7280', bgColor: '#F9FAFB' }
  };

  // Achievement badges for the dashboard
  const achievements = [
    { icon: <FaTrophy />, label: 'First Order', unlocked: true, color: '#F59E0B' },
    { icon: <FaMedal />, label: 'Repeat Buyer', unlocked: true, color: '#0EA5E9' },
    { icon: <FaCertificate />, label: 'Premium Member', unlocked: false, color: '#8B5CF6' },
    { icon: <FaCrown />, label: 'Top Spender', unlocked: false, color: '#EC4899' },
    { icon: <FaRibbon />, label: 'Fast Responder', unlocked: true, color: '#10B981' },
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

  const getCategoryIcon = (order: BuyerOrder): { icon: JSX.Element, color: string, bgColor: string } => {
    const category = getListingCategory(order).toLowerCase();
    return categoryIcons[category] || categoryIcons.default;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    return statusColors[status as keyof typeof statusColors]?.color || '#6B7280';
  };

  // Get status background color
  const getStatusBgColor = (status: string): string => {
    return statusColors[status as keyof typeof statusColors]?.bgColor || '#F9FAFB';
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
      color: '#4F46E5',
      bgColor: '#EEF2FF'
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
          color: '#10B981',
          bgColor: '#ECFDF5'
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'action-cancel',
          icon: <FaTimes />,
          description: 'Cancel this order',
          color: '#EF4444',
          bgColor: '#FEF2F2'
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
          color: '#8B5CF6',
          bgColor: '#F5F3FF'
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Message the seller directly',
          color: '#0EA5E9',
          bgColor: '#F0F9FF'
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
            color: '#F59E0B',
            bgColor: '#FFFBEB'
          });
        }
        actions.push({
          label: 'Download All Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileDownload />,
          description: 'Download delivered files',
          color: '#10B981',
          bgColor: '#ECFDF5'
        });
        actions.push({
          label: 'Mark as Complete',
          action: 'complete_order',
          className: 'action-complete',
          icon: <FaCheckCircle />,
          description: 'Approve and release payment',
          color: '#10B981',
          bgColor: '#ECFDF5'
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaDownload />,
          description: 'Download order files',
          color: '#10B981',
          bgColor: '#ECFDF5'
        });
        
        actions.push({
          label: 'View Invoice',
          action: 'view_invoice',
          className: 'action-invoice',
          icon: <FaFileInvoiceDollar />,
          description: 'View order invoice',
          color: '#8B5CF6',
          bgColor: '#F5F3FF'
        });
        actions.push({
          label: 'Payment Details',
          action: 'view_payment',
          className: 'action-payment',
          icon: <FaReceipt />,
          description: 'View payment information',
          color: '#10B981',
          bgColor: '#ECFDF5'
        });
        break;

      case 'in_revision':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Discuss revision details',
          color: '#0EA5E9',
          bgColor: '#F0F9FF'
        });
        actions.push({
          label: 'Download Latest Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileArchive />,
          description: 'Download revised files',
          color: '#10B981',
          bgColor: '#ECFDF5'
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
      color: '#6B7280',
      bgColor: '#F9FAFB'
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
                <div 
                  className="avatar-icon-wrapper" 
                  style={{ 
                    background: getCategoryIcon(order).bgColor,
                    color: getCategoryIcon(order).color
                  }}
                >
                  {getCategoryIcon(order).icon}
                </div>
                <div className="order-status-indicator">
                  <span 
                    className="status-dot" 
                    style={{ background: getStatusColor(order.status) }}
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
                    style={{ 
                      background: getStatusBgColor(order.status),
                      color: getStatusColor(order.status),
                      border: `1px solid ${getStatusColor(order.status)}20`
                    }}
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
                >
                  <div 
                    className="action-card-icon"
                    style={{ 
                      background: action.bgColor,
                      color: action.color
                    }}
                  >
                    {action.icon}
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
          <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
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
          <div className="stat-icon" style={{ background: '#F0F9FF', color: '#0EA5E9' }}>
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
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
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
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
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
        onClick={() => navigate(`/marketplace/orders/${order._id}`)}
      >
        <div className="order-avatar">
          <div 
            className="avatar-container" 
            style={{ 
              background: categoryIcon.bgColor,
              borderColor: `${categoryIcon.color}20`
            }}
          >
            <div className="avatar-icon" style={{ color: categoryIcon.color }}>
              {categoryIcon.icon}
            </div>
            <div className="avatar-badge">
              <span 
                className="category-badge"
                style={{ background: categoryIcon.color }}
              >
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
            <div className="seller">
              <FaUserCircle className="seller-icon" style={{ color: categoryIcon.color }} />
              <span className="seller-name">Seller: {seller}</span>
              {sellerRating > 0 && (
                <span className="seller-rating">
                  <FaStar /> {sellerRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          
          <div className="order-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: getProgressWidth(order.status),
                  background: `linear-gradient(90deg, ${getStatusColor(order.status)} 0%, ${getStatusColor(order.status)}80 100%)`
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
              style={{ 
                background: getStatusBgColor(order.status),
                color: getStatusColor(order.status),
                border: `1px solid ${getStatusColor(order.status)}20`
              }}
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
              >
                <div className="action-icon-container">
                  <div 
                    className="action-icon"
                    style={{ 
                      background: action.bgColor,
                      color: action.color
                    }}
                  >
                    {action.icon}
                  </div>
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