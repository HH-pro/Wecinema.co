// components/marketplae/seller/StripeAccountStatus.tsx
import React, { useState } from 'react';

interface StripeStatus {
  connected: boolean;
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string;
}

interface StripeAccountStatusProps {
  stripeStatus: StripeStatus | null;
  onSetupClick: () => void;
  compact?: boolean; // New prop for compact view
  showDetails?: boolean; // New prop to show/hide details
}

const StripeAccountStatus: React.FC<StripeAccountStatusProps> = ({ 
  stripeStatus, 
  onSetupClick,
  compact = false,
  showDetails = true
}) => {
  const [showFullId, setShowFullId] = useState(false);

  if (!stripeStatus) {
    return (
      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-3"></div>
            <span className="text-gray-600 text-sm">Checking payment status...</span>
          </div>
        </div>
      </div>
    );
  }

  // Account connected but charges not enabled (needs verification)
  if (stripeStatus.connected && !stripeStatus.chargesEnabled) {
    return (
      <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between'} ${compact ? '' : 'flex-row'}`}>
          <div className={`flex items-start ${compact ? '' : 'flex-1'}`}>
            <div className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Payment Verification Required
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your Stripe account is connected but needs additional verification to accept payments.
              </p>
              {stripeStatus.detailsSubmitted ? (
                <p className="text-xs text-yellow-600 mt-1">
                  ✅ Your information has been submitted and is under review by Stripe.
                  This usually takes 1-2 business days.
                </p>
              ) : (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ Please complete your account setup with additional details.
                </p>
              )}
              {showDetails && stripeStatus.stripeAccountId && (
                <div className="mt-2">
                  <button 
                    onClick={() => setShowFullId(!showFullId)}
                    className="text-xs text-yellow-600 hover:text-yellow-800"
                  >
                    {showFullId ? 'Hide Account ID' : 'Show Account ID'}
                  </button>
                  {showFullId && (
                    <p className="text-xs text-yellow-600 mt-1 font-mono break-all">
                      {stripeStatus.stripeAccountId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onSetupClick}
            className={`${compact ? 'w-full' : 'ml-4'} bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm whitespace-nowrap`}
          >
            {stripeStatus.detailsSubmitted ? 'Check Status' : 'Complete Verification'}
          </button>
        </div>
      </div>
    );
  }

  // Account fully connected and active
  if (stripeStatus.connected && stripeStatus.chargesEnabled) {
    return (
      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between'} ${compact ? '' : 'flex-row'}`}>
          <div className={`flex items-start ${compact ? '' : 'flex-1'}`}>
            <div className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">
                ✅ Payments Ready!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your Stripe account is fully verified and ready to accept payments.
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>Charges: {stripeStatus.chargesEnabled ? 'Enabled ✓' : 'Disabled'}</span>
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>Payouts: {stripeStatus.payoutsEnabled ? 'Enabled ✓' : 'Setup in progress'}</span>
                </div>
              </div>
              {showDetails && stripeStatus.stripeAccountId && (
                <div className="mt-2">
                  <button 
                    onClick={() => setShowFullId(!showFullId)}
                    className="text-xs text-green-600 hover:text-green-800"
                  >
                    {showFullId ? 'Hide Account ID' : 'Show Account ID'}
                  </button>
                  {showFullId && (
                    <p className="text-xs text-green-600 mt-1 font-mono break-all">
                      {stripeStatus.stripeAccountId}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`flex gap-2 ${compact ? 'w-full' : ''}`}>
            <a
              href={`https://dashboard.stripe.com/connect/accounts/${stripeStatus.stripeAccountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${compact ? 'flex-1 text-center' : ''} bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm whitespace-nowrap`}
            >
              View Dashboard
            </a>
            <button
              onClick={onSetupClick}
              className={`${compact ? 'flex-1' : ''} bg-white hover:bg-gray-50 text-green-600 border border-green-300 font-medium py-2 px-4 rounded-lg transition duration-200 text-sm whitespace-nowrap`}
            >
              Update Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - Show setup message
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className={`flex ${compact ? 'flex-col gap-3' : 'items-center justify-between'} ${compact ? '' : 'flex-row'}`}>
        <div className={`flex items-start ${compact ? '' : 'flex-1'}`}>
          <div className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Setup Payments to Accept Orders
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Connect your Stripe account to start receiving payments from buyers.
            </p>
            <div className="mt-2 text-xs text-blue-600 space-y-1">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span>Accept credit card payments</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span>Get paid directly to your bank account</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                <span>Secure and PCI compliant</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onSetupClick}
          className={`${compact ? 'w-full' : 'ml-4'} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 text-sm shadow-md hover:shadow-lg whitespace-nowrap`}
        >
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Setup Payments with Stripe
          </div>
        </button>
      </div>
    </div>
  );
};

export default StripeAccountStatus;