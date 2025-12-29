// components/marketplae/seller/StripeSuccessAlert.tsx
import React, { useEffect, useState } from 'react';

interface StripeSuccessAlertProps {
  show: boolean;
  onClose: () => void;
}

const StripeSuccessAlert: React.FC<StripeSuccessAlertProps> = ({ show, onClose }) => {
  const [visible, setVisible] = useState(show);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setVisible(show);
    
    if (show) {
      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setVisible(false);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, 5000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [show, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg shadow-xl max-w-md">
        <div className="flex items-start">
          <div className="flex-shrink-0 bg-green-100 p-2 rounded-lg">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-green-900">
                🎉 Stripe Connected Successfully!
              </h3>
              <button
                onClick={() => {
                  setVisible(false);
                  onClose();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-green-800 font-medium">
                Your Stripe account is now connected and ready to accept payments!
              </p>
              <div className="mt-3 bg-white/50 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-green-700">You can now accept credit card payments</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-green-700">Funds will be transferred to your bank account</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-green-700">Your account is fully verified by Stripe</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-green-600">
                Auto-closing in {countdown}s
              </div>
              <button
                onClick={() => {
                  setVisible(false);
                  onClose();
                }}
                className="text-sm font-medium text-green-700 hover:text-green-900 px-3 py-1 rounded-md bg-green-100 hover:bg-green-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeSuccessAlert;