// components/marketplae/seller/StripeAccountStatus.tsx
import React from 'react';

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
}

const StripeAccountStatus: React.FC<StripeAccountStatusProps> = ({ 
  stripeStatus, 
  onSetupClick 
}) => {
  if (!stripeStatus) {
    return (
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-3"></div>
            <span className="text-gray-600">Checking payment status...</span>
          </div>
        </div>
      </div>
    );
  }

  // Account connected but charges not enabled (needs verification)
  if (stripeStatus.connected && !stripeStatus.chargesEnabled) {
    return (
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-5 h-5 text-yellow-600 mr-3">
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
                {stripeStatus.detailsSubmitted ? ' Verification is under review.' : ' Please complete your account setup.'}
              </p>
              {stripeStatus.stripeAccountId && (
                <p className="text-xs text-yellow-600 mt-1">
                  Account ID: {stripeStatus.stripeAccountId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onSetupClick}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
          >
            Complete Verification
          </button>
        </div>
      </div>
    );
  }

  // Account fully connected and active
  if (stripeStatus.connected && stripeStatus.chargesEnabled) {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-5 h-5 text-green-600 mr-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">
                Payments Ready!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your Stripe account is fully verified and ready to accept payments.
                {stripeStatus.payoutsEnabled ? ' Payouts are enabled.' : ' Payouts setup in progress.'}
              </p>
              {stripeStatus.stripeAccountId && (
                <p className="text-xs text-green-600 mt-1">
                  Account ID: {stripeStatus.stripeAccountId}
                </p>
              )}
            </div>
          </div>
          <a
            href={`https://dashboard.stripe.com/connect/accounts/${stripeStatus.stripeAccountId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
          >
            View Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Not connected
  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-5 h-5 text-blue-600 mr-3">
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
          </div>
        </div>
        <button
          onClick={onSetupClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
        >
          Setup Payments
        </button>
      </div>
    </div>
  );
};

export default StripeAccountStatus;