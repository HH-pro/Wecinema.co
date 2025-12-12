// src/components/marketplace/seller/SellerOrderActions.tsx
import React, { useState } from 'react';
import { getOrderActions, getOrderStatusInfo } from '../../../api';
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
  onOrderUpdate
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const statusInfo = getOrderStatusInfo(order.status);
  const actions = getOrderActions(order.status, 'seller');
  
  const loading = parentLoading || localLoading;

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
        // Call parent callback if provided
        await onStartProcessing(order._id);
      } else {
        setError(response.data.error || 'Failed to start processing');
      }
    } catch (error: any) {
      console.error('❌ Error starting order processing:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to start order processing';
      setError(errorMessage);
      
      // Check if it's a 404 error (endpoint not found)
      if (error.response?.status === 404) {
        setError('Start processing endpoint not found. Please check backend configuration.');
      }
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
        // Call parent callback if provided
        await onStartWork(order._id);
      } else {
        setError(response.data.error || 'Failed to start work');
      }
    } catch (error: any) {
      console.error('❌ Error starting work:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to start work';
      setError(errorMessage);
      
      // If endpoint not found, try generic status update
      if (error.response?.status === 404) {
        console.log('🔄 Trying generic status update endpoint...');
        await updateOrderStatus('in_progress');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  // Generic status update method (fallback)
  const updateOrderStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      console.log(`🔄 Updating order ${order._id} status to ${newStatus}`);
      
      // Try the generic status update endpoint
      const response = await axios.put(
        `${API_BASE_URL}/marketplace/orders/${order._id}/status`,
        { status: newStatus },
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
      } else {
        setError(response.data.error || `Failed to update status to ${newStatus}`);
      }
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to update order status';
      setError(errorMessage);
    }
  };

  const getActionButton = (action: string) => {
    switch (action) {
      case 'start_processing':
        if (!order.permissions?.canStartProcessing && order.status !== 'paid') return null;
        return (
          <div key="start-processing" className="relative">
            <button
              onClick={handleStartProcessing}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-700" fill="none" viewBox="0 0 24 24">
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
          </div>
        );

      case 'start_work':
        if (!order.permissions?.canStartWork && !['processing', 'paid'].includes(order.status)) return null;
        return (
          <div key="start-work" className="relative">
            <button
              onClick={handleStartWork}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-green-700" fill="none" viewBox="0 0 24 24">
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
          </div>
        );

      case 'deliver':
        if (!order.permissions?.canDeliver && order.status !== 'in_progress') return null;
        return (
          <div key="deliver" className="relative">
            <button
              onClick={() => onDeliver(order)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deliver
            </button>
          </div>
        );

      case 'complete_revision':
        if (order.status !== 'in_revision') return null;
        return (
          <div key="complete-revision" className="relative">
            <button
              onClick={() => onCompleteRevision(order)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Complete Revision
            </button>
          </div>
        );

      case 'contact_buyer':
        return (
          <div key="contact-buyer" className="relative">
            <button
              onClick={onViewDetails}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Message Buyer
            </button>
          </div>
        );

      case 'contact_support':
        return (
          <div key="contact-support" className="relative">
            <button
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Contact Support
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Show error message if any
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {actions.map(action => getActionButton(action))}
          {(order.permissions?.canCancelBySeller || ['paid', 'processing'].includes(order.status)) && (
            <button
              onClick={() => onCancel(order)}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Order
            </button>
          )}
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
        </div>
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => getActionButton(action))}
      
      {/* Cancel Order Button (if allowed) */}
      {(order.permissions?.canCancelBySeller || ['paid', 'processing'].includes(order.status)) && (
        <button
          onClick={() => onCancel(order)}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel Order
        </button>
      )}
      
      {/* View Details Button */}
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
      
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-1">
          Status: {order.status} | 
          Can Process: {order.permissions?.canStartProcessing ? 'Yes' : 'No'} | 
          Can Work: {order.permissions?.canStartWork ? 'Yes' : 'No'} | 
          Can Deliver: {order.permissions?.canDeliver ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
};

export default SellerOrderActions;