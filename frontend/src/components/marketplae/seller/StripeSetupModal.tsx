import React, { useState, useEffect } from 'react';
import { stripeApi } from '../../../api/marketplaceApi';

interface StripeSetupModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (accountId?: string) => void;
}

const StripeSetupModal: React.FC<StripeSetupModalProps> = ({ show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [existingAccountId, setExistingAccountId] = useState<string | null>(null);

  // Check existing Stripe status when modal opens
  useEffect(() => {
    if (show) {
      checkExistingStripeStatus();
    }
  }, [show]);

  const checkExistingStripeStatus = async () => {
    try {
      setCheckingStatus(true);
      setError('');
      
      const response = await stripeApi.getStripeStatus();
      
      if (response.success) {
        setStripeStatus(response);
        if (response.accountId) {
          setExistingAccountId(response.accountId);
        }
      }
    } catch (err: any) {
      console.log('No existing Stripe account found');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      
      if (existingAccountId && stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
        // Existing account needs verification
        response = await stripeApi.completeOnboarding();
      } else if (existingAccountId) {
        // Continue existing account setup
        response = await stripeApi.onboardSeller();
      } else {
        // Create new account
        response = await stripeApi.onboardSeller();
      }
      
      if (response.success && response.url) {
        // Store account ID before redirect
        if (response.stripeAccountId) {
          localStorage.setItem('pendingStripeAccountId', response.stripeAccountId);
        }
        window.location.href = response.url;
      } else {
        setError(response.error || 'Failed to start Stripe setup - no URL returned');
      }
    } catch (err: any) {
      console.error('Stripe connect error:', err);
      
      // User-friendly error messages
      if (err.response?.status === 400) {
        setError('Unable to setup payments at the moment. Please try again later.');
      } else if (err.response?.status === 403) {
        setError('You need to complete your profile before setting up payments.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to connect Stripe account. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDashboard = () => {
    if (stripeStatus?.accountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${stripeStatus.accountId}`, '_blank');
    }
  };

  const getButtonText = () => {
    if (existingAccountId) {
      if (stripeStatus?.chargesEnabled) {
        return 'Update Account Details';
      } else if (stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
        return 'Complete Verification';
      } else {
        return 'Continue Setup';
      }
    }
    return 'Setup Payments with Stripe';
  };

  const getModalTitle = () => {
    if (stripeStatus?.chargesEnabled) {
      return 'Update Payment Account';
    } else if (stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
      return 'Complete Account Verification';
    } else if (existingAccountId) {
      return 'Continue Stripe Setup';
    }
    return 'Connect Stripe Account';
  };

  const getModalDescription = () => {
    if (stripeStatus?.chargesEnabled) {
      return 'Update your payment account details or view your Stripe dashboard';
    } else if (stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
      return 'Your account needs additional verification to accept payments';
    } else if (existingAccountId) {
      return 'Complete your Stripe account setup to start accepting payments';
    }
    return 'Required to accept payments and receive payouts';
  };

  const getStatusBadge = () => {
    if (stripeStatus?.chargesEnabled) {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-2">
          ✅ Payments Enabled
        </div>
      );
    } else if (stripeStatus?.connected && !stripeStatus?.chargesEnabled) {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
          ⚠️ Verification Required
        </div>
      );
    } else if (existingAccountId) {
      return (
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
          🔄 Setup Incomplete
        </div>
      );
    }
    return null;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              {getStatusBadge()}
              <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
              <p className="text-gray-600 mt-1">{getModalDescription()}</p>
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
          {checkingStatus ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Account Status Info */}
              {stripeStatus && (
                <div className={`mb-4 rounded-lg p-4 ${
                  stripeStatus.chargesEnabled 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start">
                    <div className={`mr-3 mt-1 ${
                      stripeStatus.chargesEnabled ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-medium ${
                        stripeStatus.chargesEnabled ? 'text-green-900' : 'text-blue-900'
                      }`}>
                        {stripeStatus.chargesEnabled ? 'Account Status: Active' : 'Account Status: Pending'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        stripeStatus.chargesEnabled ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {stripeStatus.chargesEnabled 
                          ? 'Your Stripe account is fully verified and ready to accept payments.'
                          : stripeStatus.connected && !stripeStatus.chargesEnabled
                            ? 'Additional verification required to enable payments.'
                            : 'Complete your account setup to start accepting payments.'
                        }
                      </p>
                      {stripeStatus.accountId && (
                        <p className="text-xs text-gray-500 mt-2">
                          Account ID: {stripeStatus.accountId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Benefits List */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Benefits of Stripe Connect:</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Secure payment processing with PCI compliance
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
                    Support for credit cards, Apple Pay, Google Pay
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Protected from fraud with Stripe Radar
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Automatic tax calculation and reporting
                  </div>
                </div>
              </div>

              {/* Required Information Note */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 text-sm mb-2">You'll need to provide:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Personal identification (name, email, date of birth)</li>
                  <li>• Business information (if applicable)</li>
                  <li>• Bank account details for payouts</li>
                  <li>• Tax information (SSN or EIN in the US)</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  This information is securely handled by Stripe and never stored on our servers.
                </p>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex flex-col gap-3">
            {/* Primary Action Button */}
            <button
              onClick={handleStripeConnect}
              disabled={loading || checkingStatus}
              className={`w-full py-3 px-4 rounded-lg transition duration-200 font-medium flex items-center justify-center ${
                stripeStatus?.chargesEnabled
                  ? 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {stripeStatus?.chargesEnabled ? 'Updating...' : 'Redirecting to Stripe...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {getButtonText()}
                </>
              )}
            </button>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              {stripeStatus?.chargesEnabled && (
                <button
                  onClick={handleViewDashboard}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Dashboard
                </button>
              )}
              
              <button
                onClick={onClose}
                disabled={loading || checkingStatus}
                className={`${
                  stripeStatus?.chargesEnabled ? 'flex-1' : 'w-full'
                } bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50`}
              >
                {stripeStatus?.chargesEnabled ? 'Cancel' : 'Setup Later'}
              </button>
            </div>

            {/* Legal Notice */}
            <p className="text-xs text-gray-500 text-center mt-3">
              By connecting your Stripe account, you agree to Stripe's{' '}
              <a 
                href="https://stripe.com/connect-account/legal" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Connected Account Agreement
              </a>
              {' '}and{' '}
              <a 
                href="https://stripe.com/legal" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Terms of Service
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeSetupModal;