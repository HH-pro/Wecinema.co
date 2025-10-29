import React from 'react';

interface StripeStatus {
  connected: boolean;
  status: string;
}

interface StripeAccountStatusProps {
  stripeStatus: StripeStatus | null;
  onSetupClick: () => void;
}

const StripeAccountStatus: React.FC<StripeAccountStatusProps> = ({ stripeStatus, onSetupClick }) => {
  if (!stripeStatus) return null;

  return (
    <div className="mb-6">
      <div className={`rounded-xl p-4 border ${
        stripeStatus.connected && stripeStatus.status === 'active'
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              stripeStatus.connected && stripeStatus.status === 'active'
                ? 'bg-green-500'
                : 'bg-yellow-500'
            }`}></div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Payment Account: {stripeStatus.connected && stripeStatus.status === 'active' ? 'Active' : 'Setup Required'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stripeStatus.connected && stripeStatus.status === 'active'
                  ? 'Your Stripe account is connected and ready to accept payments'
                  : 'Connect your Stripe account to start accepting payments from buyers'
                }
              </p>
            </div>
          </div>
          {!(stripeStatus.connected && stripeStatus.status === 'active') && (
            <button
              onClick={onSetupClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition duration-200"
            >
              Setup Payments
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StripeAccountStatus;