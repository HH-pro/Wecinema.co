// src/components/marketplace/seller/SellerOrderActions.tsx
import React, { useState } from 'react';
import { getOrderActions, getOrderStatusInfo, formatOrderStatus } from '../../../api';
import axios from 'axios';

interface Order {
  _id: string;
  status: string;
  orderNumber?: string;
  buyerId?: {
    username: string;
  };
  listingId?: {
    title: string;
  };
  permissions?: {
    canStartProcessing: boolean;
    canStartWork: boolean;
    canDeliver: boolean;
    canCancelBySeller: boolean;
  };
  revisions?: number;
  maxRevisions?: number;
  revisionNotes?: any[];
}

interface SellerOrderActionsProps {
  order: Order;
  loading?: boolean;
  onStartProcessing: (orderId: string) => Promise<void>;
  onStartWork: (orderId: string) => Promise<void>;
  onDeliver: (order: Order) => void;
  onCancel: (order: Order) => void;
  onCompleteRevision: (order: Order) => void;
  onViewDetails: () => void;
  onManualStatusUpdate?: (order: Order) => void;
  onOrderUpdate?: (orderId: string, newStatus: string) => void;
}

const API_BASE_URL = 'http://localhost:3000';

const SellerOrderActions: React.FC<SellerOrderActionsProps> = ({
  order,
  loading: parentLoading,
  onStartProcessing,
  onStartWork,
  onDeliver,
  onCancel,
  onCompleteRevision,
  onViewDetails,
  onManualStatusUpdate,
  onOrderUpdate
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const statusInfo = getOrderStatusInfo(order.status);
  const actions = getOrderActions(order.status, 'seller');
  
  const loading = parentLoading || localLoading;

  // Clear error after 5 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle starting order processing (paid → processing)
  const handleStartProcessing = async () => {
    try {
      setLocalLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      console.log('🔄 Starting order processing:', order._id);
      
      // Try specific endpoint first
      try {
        const response = await axios.put(
          `${API_BASE_URL}/marketplace/orders/${order._id}/start-processing`,
          {},
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data.success) {
          console.log('✅ Order processing started successfully');
          if (onOrderUpdate) {
            onOrderUpdate(order._id, 'processing');
          }
          // Call parent callback
          await onStartProcessing(order._id);
        } else {
          throw new Error(response.data.error || 'Failed to start processing');
        }
      } catch (axiosError: any) {
        // If specific endpoint fails, try generic status update endpoint
        if (axiosError.response?.status === 404 || axiosError.response?.status === 500) {
          console.log('⚠️ Specific endpoint failed, trying generic status update...');
          await updateOrderStatusGeneric('processing');
        } else {
          throw axiosError;
        }
      }
    } catch (error: any) {
      console.error('❌ Error starting order processing:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to start order processing';
      setError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle starting work on order (processing → in_progress)
  const handleStartWork = async () => {
    try {
      setLocalLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      console.log('👨‍💻 Starting work on order:', order._id);
      
      // Try specific endpoint first
      try {
        const response = await axios.put(
          `${API_BASE_URL}/marketplace/orders/${order._id}/start-work`,
          {},
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (response.data.success) {
          console.log('✅ Work started successfully');
          if (onOrderUpdate) {
            onOrderUpdate(order._id, 'in_progress');
          }
          // Call parent callback
          await onStartWork(order._id);
        } else {
          throw new Error(response.data.error || 'Failed to start work');
        }
      } catch (axiosError: any) {
        // If specific endpoint fails, try generic status update endpoint
        if (axiosError.response?.status === 404 || axiosError.response?.status === 500) {
          console.log('⚠️ Specific endpoint failed, trying generic status update...');
          await updateOrderStatusGeneric('in_progress');
        } else {
          throw axiosError;
        }
      }
    } catch (error: any) {
      console.error('❌ Error starting work:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to start work';
      setError(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  // Generic status update method (using the new /status endpoint)
  const updateOrderStatusGeneric = async (newStatus: string, options?: any) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      console.log(`🔄 Updating order ${order._id} status to ${newStatus}`);
      
      const response = await axios.put(
        `${API_BASE_URL}/api/marketplace/orders/${order._id}/status`,
        { status: newStatus, ...options },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        console.log(`✅ Status updated to ${newStatus}`);
        if (onOrderUpdate) {
          onOrderUpdate(order._id, newStatus);
        }
        return true;
      } else {
        setError(response.data.error || `Failed to update status to ${newStatus}`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      
      // Show detailed error message
      let errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Failed to update order status';
      
      // Add allowed transitions if available
      if (error.response?.data?.allowedTransitions) {
        errorMessage += `. Allowed transitions: ${error.response.data.allowedTransitions.join(', ')}`;
      }
      
      setError(errorMessage);
      return false;
    }
  };

  // Quick cancel function
  const handleQuickCancel = async () => {
    if (window.confirm(`Are you sure you want to cancel order ${order.orderNumber || order._id}? This action cannot be undone.`)) {
      try {
        setLocalLoading(true);
        setError(null);
        
        const result = await updateOrderStatusGeneric('cancelled', {
          cancelReason: 'Seller cancelled via quick action'
        });
        
        if (result) {
          // Call parent cancel callback
          onCancel(order);
        }
      } catch (error) {
        console.error('Error in quick cancel:', error);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const getActionButton = (action: string) => {
    const baseButtonClass = "inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow disabled:hover:shadow-sm";
    
    switch (action) {
      case 'start_processing':
        // Check if seller can start processing
        const canStartProcessing = order.permissions?.canStartProcessing || 
                                  (order.status === 'paid' && 
                                   (!order.permissions || order.permissions.canStartProcessing !== false));
        
        if (!canStartProcessing) return null;
        
        return (
          <div key="start-processing" className="relative group">
            <button
              onClick={handleStartProcessing}
              disabled={loading}
              className={`${baseButtonClass} bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700`}
              title="Start processing this order"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Processing
                </>
              )}
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Mark order as being prepared
            </div>
          </div>
        );

      case 'start_work':
        // Check if seller can start work
        const canStartWork = order.permissions?.canStartWork || 
                            (['processing', 'paid'].includes(order.status) && 
                             (!order.permissions || order.permissions.canStartWork !== false));
        
        if (!canStartWork) return null;
        
        return (
          <div key="start-work" className="relative group">
            <button
              onClick={handleStartWork}
              disabled={loading}
              className={`${baseButtonClass} bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700`}
              title="Start working on this order"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Start Work
                </>
              )}
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Begin working on the order deliverables
            </div>
          </div>
        );

      case 'deliver':
        // Check if seller can deliver
        const canDeliver = order.permissions?.canDeliver || 
                          (order.status === 'in_progress' && 
                           (!order.permissions || order.permissions.canDeliver !== false));
        
        if (!canDeliver) return null;
        
        return (
          <div key="deliver" className="relative group">
            <button
              onClick={() => onDeliver(order)}
              disabled={loading}
              className={`${baseButtonClass} bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700`}
              title="Deliver completed work to buyer"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deliver
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Send completed work to buyer for review
            </div>
          </div>
        );

      case 'complete_revision':
        if (order.status !== 'in_revision') return null;
        return (
          <div key="complete-revision" className="relative group">
            <button
              onClick={() => onCompleteRevision(order)}
              disabled={loading}
              className={`${baseButtonClass} bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700`}
              title="Complete revision and send back to buyer"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Complete Revision
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Send revised work back to buyer
            </div>
          </div>
        );

      case 'contact_buyer':
        return (
          <div key="contact-buyer" className="relative group">
            <button
              onClick={onViewDetails}
              className={`${baseButtonClass} bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300`}
              title="Open order details to message buyer"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message Buyer
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Send a message to the buyer
            </div>
          </div>
        );

      case 'contact_support':
        return (
          <div key="contact-support" className="relative group">
            <button
              onClick={() => window.open('/help/support', '_blank')}
              className={`${baseButtonClass} bg-red-100 text-red-700 hover:bg-red-200 border border-red-300`}
              title="Contact customer support"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Contact Support
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Get help from customer support
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get cancel permission
  const canCancel = order.permissions?.canCancelBySeller || 
                   ['paid', 'processing'].includes(order.status);

  // Show error message if any
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {actions.map(action => getActionButton(action))}
          
          {canCancel && (
            <div className="relative group">
              <button
                onClick={handleQuickCancel}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Order
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Cancel this order
              </div>
            </div>
          )}
          
          {onManualStatusUpdate && (
            <div className="relative group">
              <button
                onClick={() => onManualStatusUpdate(order)}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manual Update
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Manually update order status
              </div>
            </div>
          )}
          
          <div className="relative group">
            <button
              onClick={onViewDetails}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Details
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              View order details and timeline
            </div>
          </div>
        </div>
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
          ⚠️ {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map(action => getActionButton(action))}
        
        {/* Cancel Order Button (if allowed) */}
        {canCancel && (
          <div className="relative group">
            <button
              onClick={handleQuickCancel}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Order
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Cancel this order (refunds may apply)
            </div>
          </div>
        )}
        
        {/* Manual Status Update Button */}
        {onManualStatusUpdate && (
          <div className="relative group">
            <button
              onClick={() => onManualStatusUpdate(order)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Update
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Advanced: Manually update order status
            </div>
          </div>
        )}
        
        {/* View Details Button */}
        <div className="relative group">
          <button
            onClick={onViewDetails}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            View complete order details
          </div>
        </div>
      </div>
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <div className="font-medium mb-1">Debug Info:</div>
          <div className="grid grid-cols-2 gap-1">
            <div>Status: <span className="font-semibold">{order.status}</span></div>
            <div>Can Process: <span className={order.permissions?.canStartProcessing ? "text-green-600 font-semibold" : "text-red-600"}>{order.permissions?.canStartProcessing ? 'Yes' : 'No'}</span></div>
            <div>Can Work: <span className={order.permissions?.canStartWork ? "text-green-600 font-semibold" : "text-red-600"}>{order.permissions?.canStartWork ? 'Yes' : 'No'}</span></div>
            <div>Can Deliver: <span className={order.permissions?.canDeliver ? "text-green-600 font-semibold" : "text-red-600"}>{order.permissions?.canDeliver ? 'Yes' : 'No'}</span></div>
            <div>Can Cancel: <span className={canCancel ? "text-green-600 font-semibold" : "text-red-600"}>{canCancel ? 'Yes' : 'No'}</span></div>
            <div>Order #: <span className="font-mono">{order.orderNumber || order._id.slice(-6)}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerOrderActions;