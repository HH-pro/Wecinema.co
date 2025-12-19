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
  FaArrowRight
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
}

interface Listing {
  _id: string;
  title: string;
  mediaUrls?: string[];
  price: number;
  category: string;
  type: string;
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const navigate = useNavigate();

  // Status colors with Yellow-500 theme
  const statusColors = {
    pending_payment: { color: '#f59e0b', rgb: '245, 158, 11' },
    paid: { color: '#3b82f6', rgb: '59, 130, 246' },
    processing: { color: '#8b5cf6', rgb: '139, 92, 246' },
    in_progress: { color: '#10b981', rgb: '16, 185, 129' },
    delivered: { color: '#059669', rgb: '5, 150, 105' },
    in_revision: { color: '#f97316', rgb: '249, 115, 22' },
    completed: { color: '#059669', rgb: '5, 150, 105' },
    cancelled: { color: '#6b7280', rgb: '107, 114, 128' },
    disputed: { color: '#dc2626', rgb: '220, 38, 38' }
  };

  // Quick actions
  const quickActions = [
    {
      icon: <FaShoppingCart className="text-lg" />,
      label: 'Continue Shopping',
      action: () => navigate('/marketplace'),
      type: 'primary' as const
    },
    {
      icon: <FaBoxOpen className="text-lg" />,
      label: 'My Offers',
      action: () => navigate('/marketplace/offers/my-offers'),
      type: 'secondary' as const
    },
    {
      icon: <FaComment className="text-lg" />,
      label: 'Messages',
      action: () => navigate('/marketplace/messages'),
      type: 'secondary' as const
    },
    {
      icon: <FaDownload className="text-lg" />,
      label: 'Export Orders',
      action: () => exportOrders(),
      type: 'secondary' as const
    }
  ];

  // Fetch data
  useEffect(() => {
    fetchBuyerData();
  }, []);

  // Filter orders
  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Close dropdown when clicking outside
  useEffect(() => {
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
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order => {
        const title = getListingTitle(order).toLowerCase();
        const seller = getSellerUsername(order).toLowerCase();
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        return title.includes(searchQuery.toLowerCase()) ||
               seller.includes(searchQuery.toLowerCase()) ||
               orderNumber.includes(searchQuery.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price_high': return b.amount - a.amount;
        case 'price_low': return a.amount - b.amount;
        default: return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  // Helper functions
  const getSellerUsername = (order: Order): string => {
    if (typeof order.sellerId === 'object') {
      const seller = order.sellerId as User;
      return seller.firstName ? `${seller.firstName} ${seller.lastName || ''}`.trim() : seller.username || 'Seller';
    }
    return 'Seller';
  };

  const getListingTitle = (order: Order): string => {
    if (typeof order.listingId === 'object') {
      return (order.listingId as Listing).title || 'Listing';
    }
    return 'Listing';
  };

  const getListingMedia = (order: Order): string | undefined => {
    if (typeof order.listingId === 'object') {
      const listing = order.listingId as Listing;
      if (listing.mediaUrls?.[0]) {
        const media = listing.mediaUrls[0];
        return typeof media === 'string' ? media : (media as any)?.url;
      }
    }
    return undefined;
  };

  const getStatusIcon = (status: Order['status']) => {
    const iconMap = {
      pending_payment: <FaClock />,
      paid: <FaCreditCard />,
      processing: <FaBoxOpen />,
      in_progress: <FaUser />,
      delivered: <FaTruck />,
      in_revision: <FaReply />,
      completed: <FaCheckCircle />,
      cancelled: <FaTimes />,
      disputed: <FaExclamationTriangle />
    };
    return iconMap[status];
  };

  const getStatusText = (status: Order['status']): string => {
    return getOrderStatusInfo(status).text;
  };

  const getStatusColor = (status: Order['status']): string => {
    return statusColors[status]?.color || '#f59e0b';
  };

  // Order actions
  const getOrderActions = (order: Order) => {
    const actions = [];
    
    // Always available
    actions.push({
      label: 'View Details',
      action: 'view_details',
      className: 'view-details-btn',
      icon: <FaEye />
    });

    // Status-specific actions
    switch (order.status) {
      case 'pending_payment':
        actions.push({
          label: 'Complete Payment',
          action: 'complete_payment',
          className: 'complete-payment-btn',
          icon: <FaCreditCard />
        });
        break;
      case 'delivered':
        actions.push({
          label: 'Download Files',
          action: 'download_files',
          className: 'download-btn',
          icon: <FaDownload />
        });
        actions.push({
          label: 'Complete Order',
          action: 'complete_order',
          className: 'complete-order-btn',
          icon: <FaCheckCircle />
        });
        break;
      case 'completed':
        actions.push({
          label: 'Leave Review',
          action: 'leave_review',
          className: 'review-btn',
          icon: <FaStar />
        });
        break;
    }

    // Always available
    actions.push({
      label: 'Contact Seller',
      action: 'contact_seller',
      className: 'contact-btn',
      icon: <FaComment />
    });

    return actions;
  };

  // Handle order actions
  const handleOrderAction = async (orderId: string, action: string) => {
    try {
      const order = orders.find(o => o._id === orderId);
      if (!order) return;

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
        case 'download_files':
          navigate(`/marketplace/orders/${orderId}?tab=files`);
          break;
        case 'complete_order':
          if (window.confirm('Are you sure you want to mark this order as complete?')) {
            await marketplaceAPI.orders.complete(orderId, setLoading);
            toast.success('Order completed successfully!');
            fetchBuyerData();
          }
          break;
        case 'leave_review':
          navigate(`/marketplace/reviews/create?orderId=${orderId}`);
          break;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform action');
    }
  };

  // Export orders
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
        'Created Date': new Date(order.createdAt).toLocaleDateString()
      }));

      const csv = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast.success('Orders exported successfully');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  // ========== PERFECT DROPDOWN COMPONENT ==========
  const Dropdown = ({ order }: { order: Order }) => {
    const actions = getOrderActions(order);
    const isOpen = activeDropdown === order._id;
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveDropdown(prev => prev === order._id ? null : order._id);
    }, [order._id]);

    return (
      <div 
        ref={el => {
          if (el) dropdownRefs.current[order._id] = el;
          dropdownRef.current = el;
        }}
        className="dropdown-actions"
      >
        <div className="dropdown">
          <button
            className={`dropdown-toggle ${isOpen ? 'active' : ''}`}
            onClick={toggleDropdown}
            type="button"
            aria-expanded={isOpen}
          >
            <span>More Actions</span>
            <FaChevronDown className={`dropdown-arrow ${isOpen ? 'rotate' : ''}`} />
          </button>
          
          {isOpen && (
            <>
              <div className="dropdown-menu show">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    className={`dropdown-item ${action.className}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderAction(order._id, action.action);
                      setActiveDropdown(null);
                    }}
                    type="button"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
              <div 
                className="dropdown-backdrop"
                onClick={() => setActiveDropdown(null)}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  // ========== RENDER FUNCTIONS ==========
  const renderStats = () => {
    const stats = {
      total: orders.length,
      active: orders.filter(o => ['processing', 'in_progress', 'delivered'].includes(o.status)).length,
      completed: orders.filter(o => o.status === 'completed').length,
      totalSpent: orders
        .filter(o => ['completed', 'delivered', 'paid'].includes(o.status))
        .reduce((sum, o) => sum + o.amount, 0)
    };

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FaShoppingBag />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Orders</p>
            <small>All time purchases</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaSync />
          </div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active Orders</p>
            <small>Currently in progress</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaCheckCircle />
          </div>
          <div className="stat-info">
            <h3>{stats.completed}</h3>
            <p>Completed</p>
            <small>Successfully delivered</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <FaWallet />
          </div>
          <div className="stat-info">
            <h3>{formatCurrency(stats.totalSpent, 'USD')}</h3>
            <p>Total Spent</p>
            <small>All purchases</small>
          </div>
        </div>
      </div>
    );
  };

  const renderStatusFilters = () => (
    <div className="status-filters">
      <button
        className={`status-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
        onClick={() => setStatusFilter('all')}
        style={{ '--status-color': '#f59e0b', '--status-rgb': '245, 158, 11' } as React.CSSProperties}
      >
        <FaListAlt />
        <span>All Orders</span>
        <span className="filter-count">{orders.length}</span>
      </button>
      
      {Object.entries(statusColors).map(([status, color]) => {
        const count = orders.filter(o => o.status === status).length;
        if (count === 0) return null;
        
        return (
          <button
            key={status}
            className={`status-filter-btn ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            style={{ '--status-color': color.color, '--status-rgb': color.rgb } as React.CSSProperties}
          >
            {getStatusIcon(status as Order['status'])}
            <span>{getStatusText(status as Order['status'])}</span>
            <span className="filter-count">{count}</span>
          </button>
        );
      })}
    </div>
  );

  const renderOrderCard = (order: Order) => {
    const mediaUrl = getListingMedia(order);
    const seller = getSellerUsername(order);
    const title = getListingTitle(order);

    return (
      <div 
        key={order._id}
        className="order-card"
        style={{ '--status-color': getStatusColor(order.status) } as React.CSSProperties}
      >
        <div className="image-container">
          {mediaUrl ? (
            <img 
              src={mediaUrl} 
              alt={title}
              className="listing-image"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=400&h=300&fit=crop';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
              <FaBoxOpen className="text-4xl text-yellow-400" />
            </div>
          )}
        </div>

        <div className="order-details">
          <div className="flex justify-between items-start mb-3">
            <h3 className="product-name">{title}</h3>
            {order.orderNumber && (
              <span className="px-3 py-1 bg-yellow-50 text-yellow-800 rounded-lg text-sm font-medium">
                #{order.orderNumber}
              </span>
            )}
          </div>
          
          <p className="seller">
            <FaUser className="text-yellow-500" />
            <span className="ml-2">Seller: {seller}</span>
          </p>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="price">{formatCurrency(order.amount, 'USD')}</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                <FaCalendar className="inline mr-2" />
                {new Date(order.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                <FaTag className="inline mr-2" />
                {order.revisions || 0}/{order.maxRevisions || 3} Revisions
              </span>
              
              {order.expectedDelivery && (
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                  <FaClock className="inline mr-2" />
                  Due: {new Date(order.expectedDelivery).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="order-status-section">
          <div className="mb-4">
            <div className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
              {getStatusIcon(order.status)}
              <span>{getStatusText(order.status)}</span>
            </div>
            
            <div className="mt-3">
              {order.paymentReleased ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  <FaCheckCircle className="inline mr-2" />
                  Payment Released
                </span>
              ) : order.paidAt ? (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  <FaCreditCard className="inline mr-2" />
                  Paid
                </span>
              ) : (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                  <FaClock className="inline mr-2" />
                  Payment Pending
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
                <FaEye />
                View Order
              </button>
              {order.status === 'delivered' && (
                <button
                  onClick={() => handleOrderAction(order._id, 'download_files')}
                  className="download-files-btn"
                >
                  <FaDownload />
                  Files
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
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Buyer Dashboard</h1>
            <p>Track and manage all your purchases in one place</p>
            <div className="header-stats">
              <span className="stat-badge">
                <FaShoppingBag /> {orders.length} Total Orders
              </span>
              <span className="stat-badge">
                <FaCheckCircle /> {orders.filter(o => o.status === 'completed').length} Completed
              </span>
              <span className="stat-badge">
                <FaSync /> {orders.filter(o => ['processing', 'in_progress', 'delivered'].includes(o.status)).length} Active
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={fetchBuyerData} disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {renderStats()}

        {/* Status Filters */}
        <div className="status-distribution">
          <h3>Filter by Status</h3>
          {renderStatusFilters()}
        </div>

        {/* Search */}
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
              <FaFilter /> {showFilters ? 'Hide Filters' : 'Filters'}
            </button>
          </div>
          
          {showFilters && (
            <div className="advanced-filters mt-4 p-6 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="price_low">Price: Low to High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition-colors"
                    >
                      Reset Filters
                    </button>
                    <button 
                      onClick={exportOrders}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      Export Orders
                    </button>
                  </div>
                </div>
              </div>
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
                disabled={action.type === 'secondary' && filteredOrders.length === 0}
              >
                {action.icon}
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
              <button className="export-btn" onClick={exportOrders} disabled={filteredOrders.length === 0}>
                <FaDownload /> Export CSV
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="orders-list">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => renderOrderCard(order))
            ) : (
              <div className="text-center py-16">
                <FaBoxOpen className="text-6xl text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-700 mb-3">No orders found</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  {orders.length === 0 
                    ? "Start shopping to see your orders here" 
                    : "No orders match your search criteria"}
                </p>
                {orders.length === 0 && (
                  <button 
                    onClick={() => navigate('/marketplace')}
                    className="px-8 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors inline-flex items-center gap-3"
                  >
                    <FaShoppingCart />
                    Start Shopping
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowOrderDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Order Details</h3>
                <button className="close-btn" onClick={() => setShowOrderDetails(false)}>
                  <FaTimes />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="font-medium">{selectedOrder.orderNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Listing</p>
                        <p className="font-medium">{getListingTitle(selectedOrder)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Seller</p>
                        <p className="font-medium">{getSellerUsername(selectedOrder)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.amount, 'USD')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span 
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white font-medium"
                          style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                        >
                          {getStatusIcon(selectedOrder.status)}
                          {getStatusText(selectedOrder.status)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 pt-6 border-t">
                    <button 
                      className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-3"
                      onClick={() => navigate(`/marketplace/orders/${selectedOrder._id}`)}
                    >
                      <FaArrowRight />
                      View Full Details
                    </button>
                    <button 
                      className="flex-1 px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-3"
                      onClick={() => {
                        handleOrderAction(selectedOrder._id, 'contact_seller');
                        setShowOrderDetails(false);
                      }}
                    >
                      <FaComment />
                      Contact Seller
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerDashboard;