// src/components/marketplae/seller/OrdersTab.tsx
import React from 'react';

interface Order {
  _id: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
    email?: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
    mediaUrls?: string[];
    description?: string;
  };
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onViewOrderDetails: (orderId: string) => void;
  onPlayVideo: (videoUrl: string, title: string) => void;
  onRefresh: () => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  loading,
  onViewOrderDetails,
  onPlayVideo,
  onRefresh
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_payment':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending_payment': 'Payment Pending',
      'paid': 'Paid',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'confirmed': 'Confirmed'
    };
    return statusMap[status] || status.replace('_', ' ');
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'];
    const urlLower = url.toLowerCase();
    return videoExtensions.some(ext => urlLower.endsWith(ext));
  };

  const getFirstVideoUrl = (mediaUrls: string[] = []): string | null => {
    return mediaUrls.find(url => isVideoUrl(url)) || null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Orders Received</h2>
            <p className="text-sm text-gray-600 mt-1">View and manage all customer orders</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh Orders'}
          </button>
        </div>
      </div>
      
      <div className="p-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-gray-300">📦</div>
            <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
            <p className="mt-2 text-gray-500">When customers purchase your listings, orders will appear here.</p>
            <p className="text-sm text-gray-400 mt-2">Share your listings to get more orders!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => {
              const videoUrl = getFirstVideoUrl(order.listingId?.mediaUrls);
              
              return (
                <div 
                  key={order._id} 
                  className="border border-gray-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  onClick={() => onViewOrderDetails(order._id)}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column - Order Info */}
                    <div className="lg:w-2/3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                            {order.listingId?.title || 'Unknown Listing'}
                          </h3>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                            {order.paymentStatus && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                order.paymentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              }`}>
                                {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Payment Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(order.amount || 0)}</p>
                          <p className="text-sm text-gray-500 mt-1">Order #{order._id.slice(-8)}</p>
                        </div>
                      </div>
                      
                      {/* Buyer Info */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Buyer Information:</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Buyer Name</p>
                              <p className="font-medium text-gray-900">{order.buyerId?.username || 'Unknown'}</p>
                            </div>
                            {order.buyerId?.email && (
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium text-gray-900">{order.buyerId.email}</p>
                              </div>
                            )}
                            {order.shippingAddress && (
                              <div className="md:col-span-2">
                                <p className="text-sm text-gray-500">Shipping Address</p>
                                <p className="font-medium text-gray-900">{order.shippingAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Order Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Order Date</p>
                          <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Payment Method</p>
                          <p className="font-medium text-gray-900">{order.paymentMethod || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Order Status</p>
                          <p className="font-medium text-gray-900 capitalize">{order.status.replace('_', ' ')}</p>
                        </div>
                      </div>
                      
                      {order.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-medium">Order Notes:</p>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-gray-700">{order.notes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column - Media Preview & Actions */}
                    <div className="lg:w-1/3">
                      {/* Media Preview */}
                      {videoUrl ? (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-medium">Listing Video:</p>
                          <div 
                            className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayVideo(videoUrl, order.listingId?.title || 'Video');
                            }}
                          >
                            <video
                              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                              preload="metadata"
                            >
                              <source src={videoUrl} type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
                                <svg className="w-6 h-6 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              Click to play
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Click the video to preview the purchased listing
                          </p>
                        </div>
                      ) : order.listingId?.mediaUrls && order.listingId.mediaUrls.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2 font-medium">Listing Media:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {order.listingId.mediaUrls.slice(0, 4).map((url, index) => (
                              <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={url}
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      
                      {/* Action Button */}
                      <div className="mt-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrderDetails(order._id);
                          }}
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Order Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;