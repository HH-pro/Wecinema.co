import React from 'react';

interface StripeStatusCardProps {
  stripeStatus: any;
}

const StripeStatusCard: React.FC<StripeStatusCardProps> = ({ stripeStatus }) => {
  // Format currency helper
  const formatCurrency = (amount: number) => {
    const amountInRupees = amount / 100;
    return `₹${amountInRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!stripeStatus) {
    return null;
  }

  const isConnected = stripeStatus.connected;
  const isChargesEnabled = stripeStatus.chargesEnabled;
  const isPayoutsEnabled = stripeStatus.payoutsEnabled;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Account Status</h2>
          <p className="text-gray-600 mt-1">Manage your Stripe connection and balance</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isConnected && isChargesEnabled && isPayoutsEnabled
            ? 'bg-green-100 text-green-800'
            : isConnected
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {isConnected && isChargesEnabled && isPayoutsEnabled ? 'Active' : 
           isConnected ? 'Setup Required' : 'Not Connected'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Connection Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Stripe Connection</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <p className="text-xs text-gray-500">
            {isConnected ? 'Connected to Stripe' : 'Not connected to Stripe'}
          </p>
        </div>

        {/* Charges Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Accept Payments</span>
            <div className={`w-2 h-2 rounded-full ${isChargesEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
          <p className="text-xs text-gray-500">
            {isChargesEnabled ? 'Can accept payments' : 'Cannot accept payments'}
          </p>
        </div>

        {/* Payouts Status */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Receive Payouts</span>
            <div className={`w-2 h-2 rounded-full ${isPayoutsEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
          <p className="text-xs text-gray-500">
            {isPayoutsEnabled ? 'Can receive payouts' : 'Cannot receive payouts'}
          </p>
        </div>
      </div>

      {/* Account Information */}
      {isConnected && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Account Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {stripeStatus.email && (
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{stripeStatus.email}</p>
              </div>
            )}
            {stripeStatus.country && (
              <div>
                <p className="text-xs text-gray-500">Country</p>
                <p className="text-sm font-medium text-gray-900">{stripeStatus.country}</p>
              </div>
            )}
            {stripeStatus.availableBalance !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Available Balance</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(stripeStatus.availableBalance)}</p>
              </div>
            )}
            {stripeStatus.pendingBalance !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Pending Balance</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(stripeStatus.pendingBalance)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeStatusCard;