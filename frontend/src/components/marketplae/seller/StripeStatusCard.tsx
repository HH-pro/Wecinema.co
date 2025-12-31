// components/marketplace/seller/StripeStatusCard.tsx - UPDATED
import React, { useState } from 'react';

interface StripeStatusCardProps {
  stripeStatus: any;
  stripeApi: any;
  onRefresh: () => void;
}

const StripeStatusCard: React.FC<StripeStatusCardProps> = ({ 
  stripeStatus, 
  stripeApi,
  onRefresh 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectStripe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await stripeApi.createStripeAccountLink();
      
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError('Failed to create Stripe connection link');
      }
    } catch (err) {
      setError('Error connecting to Stripe');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckBalance = async () => {
    try {
      setLoading(true);
      const response = await stripeApi.getStripeBalance();
      
      if (response.success) {
        onRefresh(); // Refresh parent data
      }
    } catch (err) {
      console.error('Error checking balance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!stripeStatus) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stripe Status</h3>
            <p className="text-sm text-gray-500 mt-1">Loading payment information...</p>
          </div>
          <div className="animate-pulse">
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
            {isConnected ? (
              <span className="text-green-600 text-2xl">✓</span>
            ) : (
              <span className="text-yellow-600 text-2xl">⚠</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isConnected ? 'Stripe Connected' : 'Stripe Not Connected'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isConnected 
                ? 'Your account is ready to accept payments'
                : 'Connect your Stripe account to receive payments'}
            </p>
            {stripeStatus.requirements && stripeStatus.requirements.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Requirements:</p>
                <ul className="text-sm text-gray-500 mt-1 space-y-1">
                  {stripeStatus.requirements.map((req: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {isConnected ? (
            <>
              <button
                onClick={handleCheckBalance}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Check Balance'}
              </button>
              <div className="text-xs text-center text-gray-500 mt-1">
                Connected
              </div>
            </>
          ) : (
            <button
              onClick={handleConnectStripe}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
            >
              {loading ? 'Connecting...' : 'Connect Stripe'}
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default StripeStatusCard;