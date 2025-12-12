// src/components/marketplae/seller/StatusUpdateModal.tsx
import React, { useState } from 'react';
import { getOrderStatusInfo, formatOrderStatus } from '../../../api';
import { Order } from '../../../pages/seller/SellerDashboard';

interface StatusUpdateModalProps {
  order: Order;
  availableStatuses: string[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order, newStatus: string, options?: any) => void;
  loading: boolean;
}

const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  order,
  availableStatuses,
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const options: any = {};
    if (notes.trim()) options.notes = notes;
    if (selectedStatus === 'cancelled') options.cancelReason = notes;
    
    onSubmit(order, selectedStatus, options);
  };

  const currentStatusInfo = getOrderStatusInfo(order.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Update Order Status</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">Order: <span className="font-medium">{order.listingId?.title || 'N/A'}</span></p>
            <p className="text-sm text-gray-600 mb-4">Current Status: 
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                    style={{ backgroundColor: `${currentStatusInfo.color}15`, color: currentStatusInfo.color }}>
                {currentStatusInfo.icon} {currentStatusInfo.text}
              </span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select new status</option>
                {availableStatuses.map(status => {
                  const statusInfo = getOrderStatusInfo(status);
                  return (
                    <option key={status} value={status}>
                      {statusInfo.icon} {statusInfo.text}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
                {selectedStatus === 'cancelled' && <span className="text-gray-500 text-xs ml-1">- Will be used as cancellation reason</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add any notes about this status change..."
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStatus || loading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Status'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusUpdateModal;