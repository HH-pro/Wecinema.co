// src/components/marketplae/seller/AlertMessage.tsx
import React from 'react';

interface AlertMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, message, onClose }) => {
  const config = {
    success: {
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-500',
      icon: '✅',
      text: 'text-green-800'
    },
    error: {
      bg: 'from-red-50 to-rose-50',
      border: 'border-red-500',
      icon: '❌',
      text: 'text-red-800'
    },
    warning: {
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-500',
      icon: '⚠️',
      text: 'text-yellow-800'
    },
    info: {
      bg: 'from-blue-50 to-cyan-50',
      border: 'border-blue-500',
      icon: 'ℹ️',
      text: 'text-blue-800'
    }
  }[type];

  return (
    <div className="animate-fade-in">
      <div className={`bg-gradient-to-r ${config.bg} border-l-4 ${config.border} p-4 rounded-lg shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-3">{config.icon}</span>
            <p className={`text-sm font-medium ${config.text}`}>{message}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertMessage;