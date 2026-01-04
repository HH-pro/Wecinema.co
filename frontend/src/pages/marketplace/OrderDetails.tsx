import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import marketplaceApi from '../../api/marketplaceApi';
import MarketplaceLayout from '../../components/Layout';

interface OrderDetailsState {
  order: any;
  loading: boolean;
  activeTab: 'details' | 'messages' | 'delivery';
  deliveryMessage: string;
}

const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { updateOrderStatus, deliverOrder, getOrderDetails } = useMarketplace();
  
  const [state, setState] = useState<OrderDetailsState>({
    order: null,
    loading: true,
    activeTab: 'details',
    deliveryMessage: ''
  });

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Try using context first, then fall back to direct API call
      try {
        const orderData = await getOrderDetails(orderId!);
        setState(prev => ({ ...prev, order: orderData.order || orderData, loading: false }));
      } catch (contextError) {
        console.log('Falling back to direct API call:', contextError);
        const response = await marketplaceApi.orders.getOrderDetails(orderId!);
        
        if (response.success && response.data) {
          setState(prev => ({ ...prev, order: response.data.order || response.data, loading: false }));
        } else {
          throw new Error(response.error || 'Failed to fetch order details');
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleStartWork = async () => {
    try {
      await updateOrderStatus(orderId!, 'in_progress');
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error starting work:', error);
    }
  };

  const handleStartProcessing = async () => {
    try {
      const response = await marketplaceApi.orders.startProcessing(orderId!);
      if (response.success) {
        await fetchOrderDetails();
      } else {
        throw new Error(response.error || 'Failed to start processing');
      }
    } catch (error) {
      console.error('Error starting processing:', error);
    }
  };

  const handleDeliverOrder = async () => {
    try {
      await deliverOrder(orderId!, {
        deliveryMessage: state.deliveryMessage,
        deliveryFiles: []
      });
      setState(prev => ({ ...prev, deliveryMessage: '' }));
      await fetchOrderDetails();
    } catch (error) {
      console.error('Error delivering order:', error);
    }
  };

  const handleCompleteOrder = async () => {
    try {
      const response = await marketplaceApi.orders.completeOrder(orderId!);
      if (response.success) {
        await fetchOrderDetails();
      } else {
        throw new Error(response.error || 'Failed to complete order');
      }
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const handleAcceptDelivery = async () => {
    try {
      // Use completeOrder instead of capture payment
      await handleCompleteOrder();
    } catch (error) {
      console.error('Error accepting delivery:', error);
    }
  };

  const handleRequestRevision = async () => {
    try {
      const revisionNotes = prompt('Please provide revision notes:');
      if (revisionNotes) {
        const response = await marketplaceApi.orders.requestRevision(orderId!, revisionNotes);
        if (response.success) {
          await fetchOrderDetails();
        } else {
          throw new Error(response.error || 'Failed to request revision');
        }
      }
    } catch (error) {
      console.error('Error requesting revision:', error);
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const cancelReason = prompt('Please provide a reason for cancellation (optional):');
        const response = await marketplaceApi.orders.cancelOrderByBuyer(orderId!, cancelReason);
        if (response.success) {
          await fetchOrderDetails();
        } else {
          throw new Error(response.error || 'Failed to cancel order');
        }
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      in_revision: 'bg-orange-100 text-orange-800 border-orange-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
      disputed: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return marketplaceApi.utils.formatCurrencyshow(amount || 0);
  };

  const getCurrentUserRole = () => {
    // This should come from your auth context
    // For now, we'll check if there's a user context
    const currentUser = marketplaceApi.utils.getCurrentUser();
    if (!currentUser) return 'guest';
    
    if (state.order) {
      if (state.order.buyerId?._id === currentUser.userId) return 'buyer';
      if (state.order.sellerId?._id === currentUser.userId) return 'seller';
    }
    
    return 'guest';
  };

  if (state.loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading order details...</p>
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!state.order) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
                <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
                <button 
                  onClick={() => navigate('/marketplace/buyer-dashboard')} 
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  const { order } = state;
  const userRole = getCurrentUserRole();
  const isSeller = userRole === 'seller';
  const isBuyer = userRole === 'buyer';

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Order #{order.orderNumber || order._id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-gray-600 mt-1">Placed on {formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <span 
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}
                >
                  {order.status.replace('_', ' ').toUpperCase()}
                </span>
                <span 
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.paymentStatus)}`}
                >
                  {order.paymentStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-semibold text-gray-900">{formatAmount(order.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee (10%)</span>
                      <span className="text-gray-900">
                        {formatAmount(order.platformFee || order.amount * 0.1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seller Payout</span>
                      <span className="font-semibold text-green-600">
                        {formatAmount(order.sellerAmount || order.amount * 0.9)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Type</span>
                      <span className="text-gray-900">{order.orderType?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created</span>
                      <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                    </div>
                    {order.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid On</span>
                        <span className="text-gray-900">{formatDate(order.paidAt)}</span>
                      </div>
                    )}
                    {order.deliveredAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivered On</span>
                        <span className="text-gray-900">{formatDate(order.deliveredAt)}</span>
                      </div>
                    )}
                    {order.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed On</span>
                        <span className="text-gray-900">{formatDate(order.completedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Tab Headers */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex">
                    <button 
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        state.activeTab === 'details' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setState(prev => ({ ...prev, activeTab: 'details' }))}
                    >
                      Order Details
                    </button>
                    <button 
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        state.activeTab === 'messages' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setState(prev => ({ ...prev, activeTab: 'messages' }))}
                    >
                      Messages
                    </button>
                    <button 
                      className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                        state.activeTab === 'delivery' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setState(prev => ({ ...prev, activeTab: 'delivery' }))}
                    >
                      Delivery
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Details Tab */}
                  {state.activeTab === 'details' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
                        <div className="space-y-4">
                          {order.requirements && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
                              <p className="text-gray-900 bg-gray-50 rounded-md p-4 border border-gray-200">{order.requirements}</p>
                            </div>
                          )}
                          {order.buyerNotes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Notes</label>
                              <p className="text-gray-900 bg-gray-50 rounded-md p-4 border border-gray-200">{order.buyerNotes}</p>
                            </div>
                          )}
                          {order.sellerNotes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Seller Notes</label>
                              <p className="text-gray-900 bg-gray-50 rounded-md p-4 border border-gray-200">{order.sellerNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Parties</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buyer</label>
                            <span className="text-gray-900 font-medium">{order.buyerId?.username || 'Unknown'}</span>
                            {order.buyerId?.firstName && (
                              <p className="text-gray-600 text-sm mt-1">
                                {order.buyerId.firstName} {order.buyerId.lastName || ''}
                              </p>
                            )}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Seller</label>
                            <span className="text-gray-900 font-medium">{order.sellerId?.username || 'Unknown'}</span>
                            {order.sellerId?.firstName && (
                              <p className="text-gray-600 text-sm mt-1">
                                {order.sellerId.firstName} {order.sellerId.lastName || ''}
                              </p>
                            )}
                            {order.sellerId?.sellerRating && (
                              <p className="text-yellow-600 text-sm mt-1">
                                ⭐ {order.sellerId.sellerRating}/5
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {order.listingId && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Listing Details</h3>
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">
                              {typeof order.listingId === 'object' ? order.listingId.title : 'Listing'}
                            </h4>
                            {typeof order.listingId === 'object' && order.listingId.description && (
                              <p className="text-gray-700">{order.listingId.description}</p>
                            )}
                            {typeof order.listingId === 'object' && order.listingId.category && (
                              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-2">
                                {order.listingId.category}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Messages Tab */}
                  {state.activeTab === 'messages' && (
                    <div className="text-center py-8">
                      <div className="max-w-md mx-auto">
                        <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Order Messages</h3>
                        <p className="text-gray-600 mb-4">Direct messaging system will be implemented here.</p>
                        <p className="text-gray-500 text-sm mb-6">
                          You'll be able to communicate with the {isSeller ? 'buyer' : 'seller'} about this order.
                        </p>
                        <button 
                          onClick={() => navigate(`/marketplace/messages?order=${orderId}`)}
                          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Open Messages
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delivery Tab */}
                  {state.activeTab === 'delivery' && (
                    <div className="space-y-6">
                      {/* Seller Actions */}
                      {isSeller && (
                        <>
                          {order.status === 'paid' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-blue-900 mb-2">Start Processing</h3>
                              <p className="text-blue-700 mb-4">Begin processing the order before starting work.</p>
                              <button 
                                onClick={handleStartProcessing} 
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Start Processing
                              </button>
                            </div>
                          )}

                          {order.status === 'processing' && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-purple-900 mb-2">Start Working</h3>
                              <p className="text-purple-700 mb-4">Begin working on the order.</p>
                              <button 
                                onClick={handleStartWork} 
                                className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
                              >
                                Start Work
                              </button>
                            </div>
                          )}

                          {order.status === 'in_progress' && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-gray-900 mb-4">Deliver Work</h3>
                              <textarea
                                value={state.deliveryMessage}
                                onChange={(e) => setState(prev => ({ ...prev, deliveryMessage: e.target.value }))}
                                placeholder="Add delivery message and instructions..."
                                rows={4}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <button 
                                onClick={handleDeliverOrder}
                                disabled={!state.deliveryMessage.trim()}
                                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-4"
                              >
                                Deliver Order
                              </button>
                            </div>
                          )}

                          {order.status === 'in_revision' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-orange-900 mb-2">Revision Requested</h3>
                              <p className="text-orange-700 mb-4">The buyer has requested revisions. Please complete them and deliver again.</p>
                              <button 
                                onClick={() => navigate(`/marketplace/orders/${orderId}/complete-revision`)}
                                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
                              >
                                Complete Revision
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* Buyer Actions */}
                      {isBuyer && (
                        <>
                          {order.status === 'pending_payment' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-yellow-900 mb-2">Payment Required</h3>
                              <p className="text-yellow-700 mb-4">Complete payment to start the order.</p>
                              <button 
                                onClick={() => navigate(`/marketplace/payment/${orderId}`)}
                                className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                              >
                                Complete Payment
                              </button>
                            </div>
                          )}

                          {order.status === 'delivered' && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Delivery</h3>
                              {order.deliveryMessage && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                                  <strong className="text-gray-700 block mb-2">Seller's Message:</strong>
                                  <p className="text-gray-900">{order.deliveryMessage}</p>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button 
                                  onClick={handleAcceptDelivery} 
                                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors flex-1"
                                >
                                  Accept Delivery
                                </button>
                                {order.revisions !== undefined && order.maxRevisions !== undefined && 
                                 order.revisions < order.maxRevisions && (
                                  <button 
                                    onClick={handleRequestRevision} 
                                    className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 transition-colors flex-1"
                                  >
                                    Request Revision
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {['pending', 'pending_payment', 'paid', 'processing'].includes(order.status) && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                              <h3 className="text-lg font-medium text-red-900 mb-2">Cancel Order</h3>
                              <p className="text-red-700 mb-4">You can cancel this order before work begins.</p>
                              <button 
                                onClick={handleCancelOrder}
                                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                              >
                                Cancel Order
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {order.status === 'completed' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                          <h3 className="text-lg font-medium text-green-900 mb-2">✅ Order Completed</h3>
                          <p className="text-green-700">This order has been successfully completed.</p>
                          {order.completedAt && (
                            <p className="text-green-600 text-sm mt-2">Completed on: {formatDate(order.completedAt)}</p>
                          )}
                          {order.paymentReleased && (
                            <p className="text-green-600 text-sm mt-1">Payment has been released to seller</p>
                          )}
                        </div>
                      )}

                      {order.status === 'cancelled' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                          <h3 className="text-lg font-medium text-red-900 mb-2">❌ Order Cancelled</h3>
                          <p className="text-red-700">This order has been cancelled.</p>
                          {order.cancelReason && (
                            <p className="text-red-600 text-sm mt-2">Reason: {order.cancelReason}</p>
                          )}
                          {order.cancelledAt && (
                            <p className="text-red-600 text-sm mt-1">Cancelled on: {formatDate(order.cancelledAt)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Order Created</p>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  
                  {order.paidAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Payment Received</p>
                        <p className="text-sm text-gray-500">{formatDate(order.paidAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.processingAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-1.5"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Processing Started</p>
                        <p className="text-sm text-gray-500">{formatDate(order.processingAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.startedAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Work Started</p>
                        <p className="text-sm text-gray-500">{formatDate(order.startedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.deliveredAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Work Delivered</p>
                        <p className="text-sm text-gray-500">{formatDate(order.deliveredAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.completedAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Order Completed</p>
                        <p className="text-sm text-gray-500">{formatDate(order.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate(`/marketplace/messages?order=${orderId}`)}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Contact {isSeller ? 'Buyer' : 'Seller'}
                  </button>
                  <button 
                    onClick={() => navigate('/marketplace/help')}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Get Help
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Print Order Details
                  </button>
                  <button 
                    onClick={fetchOrderDetails}
                    className="w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    Refresh Order
                  </button>
                </div>
              </div>

              {/* Order Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="space-y-3">
                  {order.orderNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order #</span>
                      <span className="font-mono text-gray-900">{order.orderNumber}</span>
                    </div>
                  )}
                  {order.revisions !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revisions Used</span>
                      <span className="text-gray-900">
                        {order.revisions}/{order.maxRevisions || '∞'}
                      </span>
                    </div>
                  )}
                  {order.expectedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Delivery</span>
                      <span className="text-gray-900">{formatDate(order.expectedDelivery)}</span>
                    </div>
                  )}
                  {order.stripePaymentIntentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Intent</span>
                      <span className="font-mono text-xs text-gray-500 truncate">
                        {order.stripePaymentIntentId.slice(-8)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default OrderDetails;