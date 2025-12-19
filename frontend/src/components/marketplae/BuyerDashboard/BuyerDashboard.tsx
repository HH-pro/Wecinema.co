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
  FaCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './BuyerDashboard.css';
import MarketplaceLayout from '../../Layout';
import { marketplaceAPI, isAuthenticated, formatCurrency, getOrderStatusInfo } from '../../../api';

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
  orderNumber?: string;
}

const BuyerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedOrderForActions, setSelectedOrderForActions] = useState<Order | null>(null);
  
  const actionsModalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Status colors with Yellow-500 theme
  const statusColors = {
    pending_payment: { color: '#f59e0b', rgb: '245, 158, 11', icon: <FaRegClock /> },
    paid: { color: '#3b82f6', rgb: '59, 130, 246', icon: <FaCreditCardOutline /> },
    processing: { color: '#8b5cf6', rgb: '139, 92, 246', icon: <FaBoxOpen /> },
    in_progress: { color: '#10b981', rgb: '16, 185, 129', icon: <FaSync /> },
    delivered: { color: '#059669', rgb: '5, 150, 105', icon: <FaTruck /> },
    in_revision: { color: '#f97316', rgb: '249, 115, 22', icon: <FaUndo /> },
    completed: { color: '#059669', rgb: '5, 150, 105', icon: <FaRegCheckCircle /> },
    cancelled: { color: '#6b7280', rgb: '107, 114, 128', icon: <FaRegTimesCircle /> },
    disputed: { color: '#dc2626', rgb: '220, 38, 38', icon: <FaExclamationCircle /> }
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

  // Quick actions configuration
  const quickActions = [
    {
      icon: <FaShoppingCart />,
      label: 'Continue Shopping',
      description: 'Browse more listings',
      action: () => navigate('/marketplace'),
      type: 'primary' as const,
      color: '#f59e0b'
    },
    {
      icon: <FaBoxOpen />,
      label: 'My Offers',
      description: 'View your offers',
      action: () => navigate('/marketplace/offers/my-offers'),
      type: 'secondary' as const,
      color: '#8b5cf6'
    },
    {
      icon: <FaComment />,
      label: 'Messages',
      description: 'Chat with sellers',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const,
      color: '#3b82f6'
    },
    {
      icon: <FaChartLine />,
      label: 'Analytics',
      description: 'View detailed stats',
      action: () => navigate('/marketplace/orders/stats/buyer'),
      type: 'secondary' as const,
      color: '#10b981'
    }
  ];

  // Category icons mapping
  const categoryIcons: Record<string, JSX.Element> = {
    'digital_art': <FaRegFileAlt />,
    'graphic_design': <FaRegChartBar />,
    'writing': <FaRegFileAlt />,
    'programming': <FaRegChartBar />,
    'marketing': <FaRegMoneyBillAlt />,
    'video_editing': <FaRegCalendarCheck />,
    'music': <FaHeadset />,
    'consulting': <FaUserCircle />,
    'default': <FaBoxOpen />
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchBuyerData();
  }, []);

  // Filter and sort orders when dependencies change
  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, statusFilter, sortBy]);

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
        toast.error('Please login to view your dashboard');
        navigate('/login');
        return;
      }

      const ordersResponse = await marketplaceAPI.orders.getMy(setLoading) as any;
      
      if (ordersResponse.success && ordersResponse.orders) {
        setOrders(ordersResponse.orders);
        toast.success('Dashboard updated successfully');
      } else {
        throw new Error(ordersResponse.error || 'Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Error fetching buyer data:', error);
      toast.error(error.message || 'Failed to load dashboard data');
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
        return title.includes(query) || seller.includes(query) || orderNumber.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
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
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const getSellerUsername = (order: Order): string => {
    if (typeof order.sellerId === 'object' && order.sellerId !== null) {
      const seller = order.sellerId as User;
      return seller.firstName 
        ? `${seller.firstName} ${seller.lastName || ''}`.trim()
        : seller.username || 'Unknown Seller';
    }
    return 'Unknown Seller';
  };

  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).title || 'Unnamed Listing';
    }
    return 'Unnamed Listing';
  };

  const getListingCategory = (order: Order): string => {
    if (typeof order.listingId === 'object' && order.listingId !== null) {
      return (order.listingId as Listing).category || 'General';
    }
    return 'General';
  };

  const getCategoryIcon = (order: Order): JSX.Element => {
    const category = getListingCategory(order).toLowerCase();
    return categoryIcons[category] || categoryIcons.default;
  };

  // Get status color
  const getStatusColor = (status: Order['status']): string => {
    return statusColors[status]?.color || '#f59e0b';
  };

  // Get status text
  const getStatusText = (status: Order['status']): string => {
    return statusText[status] || 'Unknown Status';
  };

  // Get status icon
  const getStatusIcon = (status: Order['status']): JSX.Element => {
    return statusColors[status]?.icon || <FaClock />;
  };

  // Get order actions based on status
  const getOrderActions = (order: Order) => {
    const actions = [];
    
    // Always available actions
    actions.push({
      label: 'View Full Details',
      action: 'view_details',
      className: 'action-view-details',
      icon: <FaEye />,
      description: 'View complete order information',
      color: '#3b82f6'
    });

    // Status-specific actions
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'action-complete-payment',
          icon: <FaCreditCard />,
          description: 'Complete your payment securely',
          color: '#10b981'
        });
        actions.push({
          label: 'Cancel Order',
          action: 'cancel_order',
          className: 'action-cancel',
          icon: <FaTimes />,
          description: 'Cancel this order',
          color: '#dc2626'
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
          color: '#8b5cf6'
        });
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Message the seller directly',
          color: '#3b82f6'
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
            color: '#f97316'
          });
        }
        actions.push({
          label: 'Download All Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileDownload />,
          description: 'Download delivered files',
          color: '#059669'
        });
        actions.push({
          label: 'Mark as Complete',
          action: 'complete_order',
          className: 'action-complete',
          icon: <FaCheckCircle />,
          description: 'Approve and release payment',
          color: '#10b981'
        });
        break;
        
      case 'completed':
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaDownload />,
          description: 'Download order files',
          color: '#059669'
        });
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'action-review',
          icon: <FaStar />,
          description: 'Rate your experience',
          color: '#f59e0b'
        });
        actions.push({
          label: 'View Invoice',
          action: 'view_invoice',
          className: 'action-invoice',
          icon: <FaFileInvoiceDollar />,
          description: 'View order invoice',
          color: '#8b5cf6'
        });
        actions.push({
          label: 'Payment Details',
          action: 'view_payment',
          className: 'action-payment',
          icon: <FaReceipt />,
          description: 'View payment information',
          color: '#10b981'
        });
        break;

      case 'in_revision':
        actions.push({
          label: 'Contact Seller',
          action: 'contact_seller',
          className: 'action-contact',
          icon: <FaComment />,
          description: 'Discuss revision details',
          color: '#3b82f6'
        });
        actions.push({
          label: 'Download Latest Files',
          action: 'download_files',
          className: 'action-download',
          icon: <FaFileArchive />,
          description: 'Download revised files',
          color: '#059669'
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
      color: '#6b7280'
    });

    return actions;
  };

  // Handle order actions
  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const order = orders.find(o => o._id === orderId);
      if (!order) {
        toast.error('Order not found');
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
      toast.error(error.message || 'Failed to perform action');
    }
  };

  // Open actions modal
  const openActionsModal = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedOrderForActions(order);
    setShowActionsModal(true);
  };

  // Export orders to CSV
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

  // Calculate statistics
  const calculateStats = () => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(order => 
      ['processing', 'in_progress', 'delivered', 'in_revision'].includes(order.status)
    ).length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalSpent = orders
      .filter(order => ['completed', 'delivered', 'paid'].includes(order.status))
      .reduce((sum, order) => sum + order.amount, 0);

    return { totalOrders, activeOrders, completedOrders, totalSpent };
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
              <p className="modal-subtitle">#{order.orderNumber} • {getListingTitle(order)}</p>
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
                <div className="avatar-icon-wrapper">
                  {getCategoryIcon(order)}
                </div>
                <div className="order-status-indicator">
                  <span 
                    className="status-dot" 
                    style={{ backgroundColor: getStatusColor(order.status) }}
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
                    style={{ backgroundColor: getStatusColor(order.status) }}
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
                  style={{ '--action-color': action.color } as React.CSSProperties}
                >
                  <div className="action-card-icon">
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
          <div className="stat-icon">
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
        </div>

        <div className="stat-card">
          <div className="stat-icon">
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
        </div>

        <div className="stat-card">
          <div className="stat-icon">
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
        </div>

        <div className="stat-card">
          <div className="stat-icon">
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
            '--status-color': '#f59e0b',
            '--status-rgb': '245, 158, 11'
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

  // Render order card with avatar instead of image
  const renderOrderCard = (order: Order) => {
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
      >
        <div className="order-avatar">
          <div className="avatar-container">
            <div className="avatar-icon">
              {getCategoryIcon(order)}
            </div>
            <div className="avatar-badge">
              <span className="category-badge">
                <FaTag /> {category}
              </span>
            </div>
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
            <FaUserCircle className="seller-icon" />
            <span className="ml-2">Seller: {seller}</span>
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
                  <FaShippingFast />
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

  // Loading state
  if (loading && orders.length === 0) {
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
      <div className="buyer-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Buyer Dashboard</h1>
            <p>Track, manage, and review all your purchases in one professional dashboard</p>
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
              
              <button 
                className="clear-filters" 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSortBy('newest');
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
                aria-label={action.description}
              >
                <div className="action-icon-wrapper">
                  {action.icon}
                </div>
                <span>{action.label}</span>
                <small>{action.description}</small>
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
                <div className="no-orders-avatar">
                  <FaBoxOpen />
                </div>
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
                        setSortBy('newest');
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
          <h3>Tips for Buyers</h3>
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

        {/* Actions Modal */}
        {renderActionsModal()}
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;