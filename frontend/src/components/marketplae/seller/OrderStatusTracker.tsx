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
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-2">
      <div className="text-xs text-gray-500 mb-2">Order Progress</div>
      <div className="flex items-center justify-between">
        {statuses.map((status, index) => {
          const statusInfo = getOrderStatusInfo(status);
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={status} className="flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                isCompleted 
                  ? 'bg-blue-100 border-blue-500 text-blue-600' 
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              } ${isCurrent ? 'ring-2 ring-blue-300' : ''}`}>
                {isCompleted ? '✓' : statusInfo.icon}
              </div>
              <div className="text-xs text-center mt-1 font-medium">
                {statusInfo.text.split(' ')[0]}
              </div>
              {index < statuses.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                  index < currentIndex ? 'bg-blue-500' : 'bg-gray-300'
                }`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusTracker;