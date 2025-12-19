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
  FaCog
} from 'react-icons/fa';
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

  // Quick actions configuration - UPDATED WITH PROFESSIONAL STYLING
  const quickActions = [
    {
      icon: <FaShoppingCart />,
      label: 'Browse Marketplace',
      description: 'Explore new listings',
      action: () => navigate('/marketplace'),
      type: 'primary' as const,
      color: '#f59e0b',
      badge: 'New'
    },
   
    {
      icon: <FaComment />,
      label: 'Messages',
      description: 'Chat with sellers',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const,
      color: '#3b82f6',
      badge: 'Unread'
    },
    {
      icon: <FaChartLine />,
      label: 'Analytics',
      description: 'Performance insights',
      action: () => navigate('/marketplace/orders/stats/buyer'),
      type: 'secondary' as const,
      color: '#10b981'
    },
   
    
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
        navigate('/login');
        return;
      }

      const ordersResponse = await marketplaceAPI.orders.getMy(setLoading) as any;
      
      if (ordersResponse.success && ordersResponse.orders) {
        setOrders(ordersResponse.orders);
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
            await fetchBuyerData();
          }
          break;
          
        case 'request_revision':
          const revisionNotes = prompt('Please provide detailed revision notes (minimum 10 characters):');
          if (revisionNotes && revisionNotes.trim().length >= 10) {
            await marketplaceAPI.orders.requestRevision(orderId, revisionNotes.trim(), setLoading);
            await fetchBuyerData();
          } else if (revisionNotes) {
            console.log('Revision notes must be at least 10 characters');
          }
          break;
          
        case 'cancel_order':
          const cancelReason = prompt('Please provide reason for cancellation:');
          if (cancelReason && cancelReason.trim()) {
            if (window.confirm('Are you sure you want to cancel this order?')) {
              await marketplaceAPI.orders.cancelByBuyer(orderId, cancelReason.trim(), setLoading);
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
      
    } catch (error) {
      console.error('Export error:', error);
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
          <div className="stat-trend">
            <span className="trend-up">+12%</span>
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
          <div className="stat-trend">
            <span className="trend-up">+5%</span>
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
          <div className="stat-trend">
            <span className="trend-up">+8%</span>
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
          <div className="stat-trend">
            <span className="trend-up">+15%</span>
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

  // Render order card with professional styling
  const renderOrderCard = (order: Order) => {
    const seller = getSellerUsername(order);
    const title = getListingTitle(order);
    const category = getListingCategory(order);
    const statusColor = getStatusColor(order.status);

    return (
      <div 
        key={order._id}
        className="order-card"
        style={{ 
          '--status-color': statusColor
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
              <FaUserCircle className="seller-icon" />
              <span className="seller-name">Seller: {seller}</span>
              <span className="seller-rating">
              </span>
            </p>
          </div>
          
          <div className="order-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: getProgressWidth(order.status),
                  backgroundColor: statusColor
                }}
              />
            </div>
            <div className="progress-labels">
              <span className="progress-step active">Ordered</span>
              <span className={`progress-step ${['processing', 'in_progress', 'delivered', 'completed'].includes(order.status) ? 'active' : ''}`}>Processing</span>
              <span className={`progress-step ${['delivered', 'completed'].includes(order.status) ? 'active' : ''}`}>Delivered</span>
              <span className={`progress-step ${order.status === 'completed' ? 'active' : ''}`}>Completed</span>
            </div>
          </div>
          
          <div className="order-info">
            <div className="info-row">
              {(order.revisions > 0) && (
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
                backgroundColor: statusColor,
                color: getContrastColor(statusColor)
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
                <FaEye /> View Details
              </button>
              
              {order.status === 'delivered' && (
                <button
                  onClick={() => handleOrderAction(order._id, 'download_files')}
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

  const getProgressWidth = (status: Order['status']): string => {
    switch(status) {
      case 'pending_payment':
      case 'paid':
        return '25%';
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

  const getContrastColor = (hexColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
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
                    .filter(o => ['completed', 'delivered', 'paid'].includes(o.status))
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

        {/* Statistics Overview */}
        {renderStats()}

        {/* Quick Actions - PROFESSIONAL STYLING */}
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
                <div 
                  className="action-icon-container"
                  style={{ backgroundColor: `${action.color}20` }}
                >
                  <div 
                    className="action-icon"
                    style={{ color: action.color }}
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

    

        {/* Orders Section - PROFESSIONAL STYLING */}
        <div className="orders-section">
          <div className="section-header">
            <div className="section-title">
              <h2>Your Orders</h2>
              <p className="section-subtitle">{filteredOrders.length} orders found • Total value: {formatCurrency(
                filteredOrders.reduce((sum, order) => sum + order.amount, 0), 
                'USD'
              )}</p>
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
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setSortBy('newest');
                          }}
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