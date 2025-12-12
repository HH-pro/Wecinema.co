// src/components/marketplace/seller/StripeAccountStatus.tsx
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Checking payment status...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (stripeStatus.connected && stripeStatus.chargesEnabled) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">✅ Ready to Accept Orders</h3>
              <p className="text-sm text-green-700 mt-1">
                Your payment account is connected and active. You can now receive payments from buyers.
              </p>
            </div>
          </div>
          <button
            onClick={onSetupClick}
            className="text-sm text-green-700 hover:text-green-800 font-medium"
          >
            Manage Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">⚠️ Connect to Accept Orders</h3>
            <p className="text-sm text-amber-700 mt-1">
              Connect your payment account to start receiving payments from buyers.
            </p>
          </div>
        </div>
        <button
          onClick={onSetupClick}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 transition-colors shadow-sm"
        >
          Connect Account
        </button>
      </div>
    </div>
  );
};

export default StripeAccountStatus;