// src/components/marketplace/seller/SellerOrderActions.tsx
import React from 'react';
import { getOrderActions, getOrderStatusInfo } from '../../../api';

interface Order {
  _id: string;
  status: string;
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
  onStartProcessing: () => void;
  onStartWork: () => void;
  onDeliver: () => void;
  onCancel: () => void;
  onCompleteRevision: () => void;
  onViewDetails: () => void;
}

const SellerOrderActions: React.FC<SellerOrderActionsProps> = ({
  order,
  loading,
  onStartProcessing,
  onStartWork,
  onDeliver,
  onCancel,
  onCompleteRevision,
  onViewDetails
}) => {
  const statusInfo = getOrderStatusInfo(order.status);
  const actions = getOrderActions(order.status, 'seller');
  
  const getActionButton = (action: string) => {
    const buttonProps = {
      className: '',
      onClick: () => {},
      children: '',
      disabled: loading
    };

    switch (action) {
      case 'start_processing':
        if (!order.permissions?.canStartProcessing) return null;
        return (
          <button
            onClick={onStartProcessing}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Start Processing'}
          </button>
        );

      case 'start_work':
        if (!order.permissions?.canStartWork) return null;
        return (
          <button
            onClick={onStartWork}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Work'}
          </button>
        );

      case 'deliver':
        if (!order.permissions?.canDeliver) return null;
        return (
          <button
            onClick={onDeliver}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Delivering...' : 'Deliver'}
          </button>
        );

      case 'complete_revision':
        if (order.status !== 'in_revision') return null;
        return (
          <button
            onClick={onCompleteRevision}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Completing...' : 'Complete Revision'}
          </button>
        );

      case 'contact_buyer':
        return (
          <button
            onClick={onViewDetails}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Message Buyer
          </button>
        );

      case 'contact_support':
        return (
          <button
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
          >
            Contact Support
          </button>
        );

      default:
        return null;
    }
  };

  if (order.permissions?.canCancelBySeller) {
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map(action => getActionButton(action))}
        <button
          onClick={onCancel}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel Order
        </button>
        <button
          onClick={onViewDetails}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          View Details
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => getActionButton(action))}
      <button
        onClick={onViewDetails}
        className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
      >
        View Details
      </button>
    </div>
  );
};

export default SellerOrderActions;