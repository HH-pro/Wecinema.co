// components/marketplae/seller/StripeSetupModal.tsx
import React, { useState } from 'react';

interface StripeSetupModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stripeConnected?: boolean;
}

const StripeSetupModal: React.FC<StripeSetupModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  stripeConnected = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      setError('');

      // If Stripe is already connected, don't proceed
      if (stripeConnected) {
        setError('Stripe is already connected to your account.');
        setLoading(false);
        onClose();
        return;
      }

      const response = await fetch('/api/marketplace/stripe/onboard-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Store account ID before redirect
        if (data.stripeAccountId) {
          localStorage.setItem('pendingStripeAccountId', data.stripeAccountId);
        }
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start Stripe setup');
      }
    } catch (err: any) {
      console.error('Stripe connect error:', err);
      
      if (err.message.includes('401') || err.message.includes('403')) {
        setError('Please login again to setup payments.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to connect Stripe account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show modal if Stripe is already connected
  if (!show || stripeConnected) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Connect Stripe Account</h2>
              <p className="text-gray-600 mt-1">Required to accept payments</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Why Stripe?</h4>
                <p className="text-blue-700 text-sm mt-1">
                  Stripe is required to securely process payments and transfer funds to your bank account.
                  It takes only 2 minutes to set up.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600 mb-6">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Secure payment processing (PCI compliant)
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Direct bank transfers to your account
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept credit cards, Apple Pay, Google Pay
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Automatic tax calculation and reporting
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 text-sm mb-2">You'll need to provide:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Personal identification (name, email)</li>
              <li>• Bank account details for payouts</li>
              <li>• Business information (if applicable)</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Your information is securely handled by Stripe and never stored on our servers.
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStripeConnect}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Stripe Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeSetupModal;