// src/components/marketplace/seller/OrderStatusTracker.tsx
import React from 'react';
import marketplaceApi  from '../../../api/marketplaceApi';

interface OrderStatusTrackerProps {
  currentStatus: string;
  orderId: string;
  createdAt: string;
  paidAt?: string;
  processingAt?: string;
  startedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
}

const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  currentStatus,
  orderId,
  createdAt,
  paidAt,
  processingAt,
  startedAt,
  deliveredAt,
  completedAt
}) => {
  // Define the status flow for seller perspective
  const statuses = ['pending', 'pending_payment', 'paid', 'processing', 'in_progress', 'delivered', 'completed'];
  
  // Handle cases where current status might not be in the default flow
  const currentIndex = statuses.indexOf(currentStatus);
  
  const getStatusInfo = (status: string) => {
    const info = marketplaceApi.utils.getOrderStatusInfo?.(status) || {
      icon: '❓',
      text: status.replace('_', ' ').toUpperCase(),
      color: '#95a5a6',
      bgColor: '#ecf0f1'
    };
    
    const descriptions: Record<string, string> = {
      pending: 'Awaiting action',
      pending_payment: 'Awaiting buyer payment',
      paid: 'Payment received',
      processing: 'Order processing started',
      in_progress: 'Work in progress',
      delivered: 'Work delivered to buyer',
      completed: 'Order completed and payment released',
      in_revision: 'Revision requested by buyer',
      cancelled: 'Order cancelled',
      refunded: 'Order refunded'
    };
    
    return {
      ...info,
      description: descriptions[status] || info.text
    };
  };

  const getTimelineDate = (status: string) => {
    switch (status) {
      case 'pending':
        return createdAt;
      case 'pending_payment':
        return createdAt; // Usually same as created
      case 'paid':
        return paidAt;
      case 'processing':
        return processingAt;
      case 'in_progress':
        return startedAt;
      case 'delivered':
        return deliveredAt;
      case 'completed':
        return completedAt;
      default:
        return '';
    }
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Filter statuses to only show relevant ones based on current status
  const visibleStatuses = statuses.filter(status => {
    // Always show all statuses in the flow up to current
    return statuses.indexOf(status) <= Math.max(currentIndex, 0);
  });

  if (visibleStatuses.length === 0) {
    return (
      <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Order Status</h4>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 inline-block">❓</span>
          <p className="text-gray-600">Status: {currentStatus}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">Order Timeline</h4>
        <span className="text-xs text-gray-500">
          #{orderId.slice(-6)}
        </span>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-400 via-yellow-300 to-yellow-200 z-0"></div>
        
        <div className="space-y-6 relative z-10">
          {visibleStatuses.map((status, index) => {
            const statusInfo = getStatusInfo(status);
            const isCompleted = index < visibleStatuses.length - 1;
            const isCurrent = status === currentStatus;
            const timelineDate = getTimelineDate(status);
            
            return (
              <div key={status} className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted || isCurrent
                      ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-600 shadow-md' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300'
                  } ${isCurrent ? 'ring-4 ring-yellow-200 scale-110' : ''}`}>
                    <span className={`text-lg ${isCompleted || isCurrent ? 'text-white' : 'text-gray-400'}`}>
                      {isCompleted ? '✓' : statusInfo.icon}
                    </span>
                  </div>
                  
                  {/* Time indicator */}
                  {timelineDate && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                        {formatDateShort(timelineDate)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Status info */}
                <div className={`flex-1 pt-1 pb-4 ${index < visibleStatuses.length - 1 ? 'border-b border-yellow-100' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className={`font-medium ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {statusInfo.text}
                      </h5>
                      <p className="text-sm text-gray-500 mt-1">
                        {statusInfo.description}
                      </p>
                    </div>
                    
                    {/* Status indicator */}
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      isCurrent 
                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200' 
                        : isCompleted 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-500 border border-gray-200'
                    }`}>
                      {isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                  
                  {/* Timeline details */}
                  {timelineDate && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(timelineDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(timelineDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-yellow-800">Overall Progress</span>
          <span className="text-sm font-bold text-yellow-700">
            {Math.round((visibleStatuses.length) / statuses.length * 100)}%
          </span>
        </div>
        <div className="w-full bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-amber-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${((visibleStatuses.length) / statuses.length) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-yellow-700 mt-2">
          <span>{visibleStatuses.length} of {statuses.length} steps</span>
          <span>
            {currentStatus === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Status tips */}
      {currentStatus !== 'completed' && currentIndex < statuses.length - 1 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Next: {getStatusInfo(statuses[currentIndex + 1])?.description || 'Complete the order'}
            </p>
          </div>
        </div>
      )}

      {/* Special status handling */}
      {['cancelled', 'refunded', 'disputed', 'in_revision'].includes(currentStatus) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
          <div className="flex items-start">
            <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.258 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">
                Special Status: {getStatusInfo(currentStatus).text}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {getStatusInfo(currentStatus).description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusTracker;