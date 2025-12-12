// src/components/marketplace/seller/OrderStatusTracker.tsx
import React from 'react';
import { getOrderStatusInfo } from '../../../api';

interface OrderStatusTrackerProps {
  currentStatus: string;
  orderId: string;
  createdAt: string;
  deliveredAt?: string;
  completedAt?: string;
}

const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({
  currentStatus,
  orderId,
  createdAt,
  deliveredAt,
  completedAt
}) => {
  const statuses = ['paid', 'processing', 'in_progress', 'delivered', 'completed'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  const getStatusInfo = (status: string) => {
    const info = getOrderStatusInfo(status);
    return {
      ...info,
      description: {
        paid: 'Payment received',
        processing: 'Order processing started',
        in_progress: 'Work in progress',
        delivered: 'Work delivered',
        completed: 'Order completed'
      }[status] || info.text
    };
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimelineDate = (status: string) => {
    switch (status) {
      case 'paid':
        return createdAt;
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
          {statuses.map((status, index) => {
            const statusInfo = getStatusInfo(status);
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const timelineDate = getTimelineDate(status);
            
            return (
              <div key={status} className="flex items-start gap-4">
                {/* Timeline dot */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-600 shadow-md' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300'
                  } ${isCurrent ? 'ring-4 ring-yellow-200 scale-110' : ''}`}>
                    <span className={`text-lg ${isCompleted ? 'text-white' : 'text-gray-400'}`}>
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
                <div className={`flex-1 pt-1 pb-4 ${index < statuses.length - 1 ? 'border-b border-yellow-100' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className={`font-medium ${
                        isCompleted ? 'text-gray-900' : 'text-gray-500'
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
            {Math.round((currentIndex + 1) / statuses.length * 100)}%
          </span>
        </div>
        <div className="w-full bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-amber-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / statuses.length) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-yellow-700 mt-2">
          <span>{currentIndex + 1} of {statuses.length} steps</span>
          <span>
            {currentStatus === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Status tips */}
      {currentStatus !== 'completed' && (
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
    </div>
  );
};

export default OrderStatusTracker;