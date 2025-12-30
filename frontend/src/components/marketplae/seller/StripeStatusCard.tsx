import React from 'react';

interface StripeStatusCardProps {
  stripeStatus: any;
}

const StripeStatusCard: React.FC<StripeStatusCardProps> = ({ stripeStatus }) => {
  const formatToDollars = (amountInCents: number) => {
    const amountInDollars = amountInCents / 100;
    return `$${amountInDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  if (!stripeStatus?.chargesEnabled) return null;
  
  return (
    <div className="mb-6 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium text-green-700">Payments Ready! 🎉</span>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Verified
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Your Stripe account is fully verified and ready to accept payments.
            </h3>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600">💳</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Charges Enabled</p>
                  <p className="text-sm font-medium text-gray-900">Yes</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600">💰</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payouts Enabled</p>
                  <p className="text-sm font-medium text-gray-900">Yes</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-purple-600">👤</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account</p>
                  <p className="text-sm font-medium text-gray-900">
                    {stripeStatus?.name || 'Test Seller'} • {stripeStatus?.country || 'US'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-l border-gray-200 pl-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatToDollars(stripeStatus?.availableBalance || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Pending: {formatToDollars(stripeStatus?.pendingBalance || 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => window.open('https://dashboard.stripe.com/', '_blank')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition duration-200 flex items-center"
          >
            <span className="mr-2">📊</span>
            Stripe Dashboard
          </button>
          <button
            onClick={() => alert('Account ID: ' + (stripeStatus?.accountId || 'acct_...'))}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition duration-200"
          >
            Show Account ID
          </button>
          <button
            onClick={() => alert('Update details feature would open here')}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition duration-200"
          >
            Update Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeStatusCard;