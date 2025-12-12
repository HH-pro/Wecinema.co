// src/components/marketplae/seller/OrderReceivedPage.tsx
import React, { useState } from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

interface Buyer {
  _id: string;
  username: string;
  avatar?: string;
  email?: string;
}

interface Listing {
  _id: string;
  title: string;
  price?: number;
  mediaUrls?: string[];
}

interface Order {
  _id: string;
  status: string;
  amount: number;
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
  buyerId: Buyer;
  listingId: Listing;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface OrderReceivedPageProps {
  orders: Order[];
  onOrderUpdate: (orderId: string, newStatus: string) => void;
  onViewOrderDetails: (orderId: string) => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'accepted':
    case 'active':
    case 'paid':
    case 'delivered':
      return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200';
    case 'pending':
    case 'pending_payment':
    case 'pending_acceptance':
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 border-yellow-200';
    case 'shipped':
    case 'sold':
    case 'in_progress':
    case 'in_transit':
    case 'in_revision':
      return 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-800 border-blue-200';
    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'failed':
    case 'declined':
      return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-200';
    case 'draft':
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200';
  }
};

const OrderReceivedPage: React.FC<OrderReceivedPageProps> = ({ 
  orders, 
  onOrderUpdate, 
  onViewOrderDetails 
}) => {
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order._id.toLowerCase().includes(query) ||
          order.buyerId?.username?.toLowerCase().includes(query) ||
          order.listingId?.title?.toLowerCase().includes(query) ||
          order.shippingAddress?.toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

  // Get status options for current order
  const getStatusOptions = (currentStatus: string) => {
    const options: { value: string; label: string; color: string }[] = [];
    
    switch (currentStatus) {
      case 'pending_payment':
        options.push(
          { value: 'confirmed', label: 'Confirm Order', color: 'green' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'confirmed':
      case 'paid':
        options.push(
          { value: 'in_progress', label: 'Start Processing', color: 'yellow' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'in_progress':
        options.push(
          { value: 'shipped', label: 'Mark as Shipped', color: 'purple' },
          { value: 'completed', label: 'Complete Order', color: 'green' },
          { value: 'cancelled', label: 'Cancel Order', color: 'red' }
        );
        break;
      case 'shipped':
        options.push(
          { value: 'delivered', label: 'Mark as Delivered', color: 'green' },
          { value: 'completed', label: 'Complete Order', color: 'green' }
        );
        break;
    }
    
    return options;
  };

  const handleQuickStatusUpdate = async (orderId: string, newStatus: string) => {
    if (window.confirm(`Are you sure you want to change order status to ${newStatus}?`)) {
      onOrderUpdate(orderId, newStatus);
    }
  };

  const renderListOrderCard = (order: Order) => {
    const statusOptions = getStatusOptions(order.status);
    
    return (
      <div 
        key={order._id} 
        className="bg-white border border-yellow-200 rounded-2xl p-6 hover:border-yellow-300 hover:shadow-md transition-all duration-200 cursor-pointer shadow-sm"
        onClick={() => onViewOrderDetails(order._id)}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Order Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                {order.buyerId?.avatar ? (
                  <img
                    src={order.buyerId.avatar}
                    alt={order.buyerId.username}
                    className="w-14 h-14 rounded-xl border-4 border-white shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border-4 border-white bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center font-bold text-xl text-yellow-600 shadow-md">
                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h3>
                    <PaymentStatusBadge order={order} />
                  </div>
                  <p className="text-gray-600 mt-1">
                    Buyer: <span className="font-medium text-gray-800">{order.buyerId?.username || 'Unknown Buyer'}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                  {order.status ? order.status.replace('_', ' ') : 'Unknown'}
                </span>
                <p className="font-bold text-green-600 text-xl">{formatCurrency(order.amount)}</p>
              </div>
            </div>

            {/* Product Info */}
            {order.listingId && (
              <div className="flex items-start space-x-4 mb-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
                {order.listingId.mediaUrls?.[0] ? (
                  <img
                    src={order.listingId.mediaUrls[0]}
                    alt={order.listingId.title}
                    className="w-24 h-24 object-cover rounded-xl border-2 border-yellow-300 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl border-2 border-purple-200 flex items-center justify-center shadow-sm">
                    <div className="text-center">
                      <div className="text-3xl mb-1">📦</div>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2">{order.listingId.title}</h4>
                  {order.listingId.price && (
                    <div className="flex items-center space-x-4">
                      <p className="text-sm text-gray-600">
                        Original: <span className="line-through">{formatCurrency(order.listingId.price)}</span>
                      </p>
                      <p className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        Sold for: {formatCurrency(order.amount)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Order Date</p>
                <p className="font-medium text-gray-900 text-sm">{formatDate(order.createdAt)}</p>
              </div>
              <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Payment Method</p>
                <p className="font-medium text-gray-900 text-sm capitalize">{order.paymentMethod || 'Not specified'}</p>
              </div>
              <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Shipping Address</p>
                <p className="font-medium text-gray-900 text-sm line-clamp-1">
                  {order.shippingAddress || 'Not provided'}
                </p>
              </div>
              <div className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Order ID</p>
                <p className="font-medium text-gray-900 text-sm font-mono">#{order._id.slice(-8)}</p>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Seller Notes
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm whitespace-pre-line">
                    {order.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 lg:w-72">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewOrderDetails(order._id);
              }}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Full Details
            </button>

            {/* Status Update Buttons */}
            {statusOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600 text-center">Quick Actions:</p>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickStatusUpdate(order._id, option.value);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-medium transition-all duration-200 text-sm shadow-sm hover:shadow-md ${
                      option.color === 'green'
                        ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                        : option.color === 'red'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Order Info Summary */}
            <div className="mt-2 pt-4 border-t border-yellow-200">
              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                {order.stripePaymentIntentId && (
                  <div className="flex justify-between">
                    <span>Stripe ID:</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{order.stripePaymentIntentId.slice(-8)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGridOrderCard = (order: Order) => {
    return (
      <div 
        key={order._id} 
        className="bg-white border border-yellow-200 rounded-2xl p-6 hover:border-yellow-300 hover:shadow-lg transition-all duration-200 cursor-pointer shadow-sm"
        onClick={() => onViewOrderDetails(order._id)}
      >
        {/* Order Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              #{order._id.slice(-8)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
            {order.status ? order.status.replace('_', ' ') : 'Unknown'}
          </span>
        </div>

        {/* Buyer Info */}
        <div className="flex items-center space-x-3 mb-4">
          {order.buyerId?.avatar ? (
            <img
              src={order.buyerId.avatar}
              alt={order.buyerId.username}
              className="w-12 h-12 rounded-xl border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl border-2 border-white bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center font-bold text-md text-yellow-600 shadow-sm">
              {order.buyerId?.username?.charAt(0).toUpperCase() || 'B'}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{order.buyerId?.username || 'Unknown Buyer'}</p>
            <PaymentStatusBadge order={order} />
          </div>
        </div>

        {/* Product Info */}
        {order.listingId && (
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-2">
              {order.listingId.mediaUrls?.[0] ? (
                <img
                  src={order.listingId.mediaUrls[0]}
                  alt={order.listingId.title}
                  className="w-20 h-20 object-cover rounded-xl border-2 border-yellow-300 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl border-2 border-purple-200 flex items-center justify-center shadow-sm">
                  <div className="text-3xl">📦</div>
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">
                  {order.listingId.title}
                </h4>
              </div>
            </div>
          </div>
        )}

        {/* Order Amount */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Order Amount</p>
            <p className="font-bold text-green-600 text-xl">{formatCurrency(order.amount)}</p>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Shipping to:</p>
          <p className="text-sm text-gray-800 line-clamp-2 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-yellow-200">
            {order.shippingAddress || 'Not provided'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewOrderDetails(order._id);
            }}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-lg"
          >
            View Details
          </button>
          
          {/* Quick Status Update */}
          {getStatusOptions(order.status).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {getStatusOptions(order.status).map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickStatusUpdate(order._id, option.value);
                  }}
                  className={`py-2 px-3 rounded-xl font-medium transition-all duration-200 text-xs shadow-sm hover:shadow-md ${
                    option.color === 'green'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      : option.color === 'red'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-yellow-200">
      {/* Header with Controls */}
      <div className="px-6 py-5 border-b border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Orders Received</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm w-48 shadow-sm"
              />
              <svg className="w-5 h-5 text-yellow-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-yellow-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="border border-yellow-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
            
            {/* View Toggle */}
            <div className="flex border border-yellow-300 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveView('list')}
                className={`px-3 py-2.5 text-sm font-medium ${activeView === 'list' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-yellow-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
              <button
                onClick={() => setActiveView('grid')}
                className={`px-3 py-2.5 text-sm font-medium ${activeView === 'grid' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' : 'bg-white text-gray-700 hover:bg-yellow-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Orders Content */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-7xl mb-6 text-yellow-300">📦</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No orders found</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {searchQuery || statusFilter !== 'all' 
                ? 'No orders match your search criteria. Try adjusting your filters.'
                : 'When buyers purchase your items, orders will appear here.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(searchQuery || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => window.location.href = '/create-listing'}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Create New Listing
              </button>
            </div>
          </div>
        ) : (
          <div className={activeView === 'list' 
            ? 'space-y-6' 
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          }>
            {filteredOrders.map(order => 
              activeView === 'list' ? renderListOrderCard(order) : renderGridOrderCard(order)
            )}
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      {filteredOrders.length > 0 && (
        <div className="px-6 py-5 border-t border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-2"></div>
              <span className="font-medium">Completed: {filteredOrders.filter(o => o.status === 'completed').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-2"></div>
              <span className="font-medium">In Progress: {filteredOrders.filter(o => ['in_progress', 'shipped'].includes(o.status)).length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mr-2"></div>
              <span className="font-medium">Pending: {filteredOrders.filter(o => ['pending_payment', 'pending_acceptance'].includes(o.status)).length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mr-2"></div>
              <span className="font-medium">Total Revenue: {formatCurrency(filteredOrders.reduce((sum, order) => sum + order.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderReceivedPage;