// components/marketplae/seller/StripeSuccessAlert.tsx
import React, { useEffect, useState } from 'react';

interface StripeSuccessAlertProps {
  show: boolean;
  onClose: () => void;
}

const StripeSuccessAlert: React.FC<StripeSuccessAlertProps> = ({ show, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setCountdown(5);
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      setIsVisible(false);
    }
  }, [show, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl shadow-lg p-4 max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-green-900">
                🎉 Stripe Connected Successfully!
              </h3>
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm text-green-800">
                Your Stripe account is now connected and ready to accept payments.
              </p>
              <div className="mt-3 bg-white rounded-lg p-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-700">Accept credit card payments</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-700">Direct transfers to your bank</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-700">Fully verified account</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-green-600">
                Closing in {countdown}s
              </div>
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className="text-sm font-medium text-green-700 hover:text-green-900 px-3 py-1 rounded-md bg-green-100 hover:bg-green-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeSuccessAlert;