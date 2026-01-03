// components/marketplace/seller/StripeSetupModal.tsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';

const ordersApi = marketplaceApi.orders;

interface StripeSetupModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stripeConnected?: boolean;
  onDisconnectSuccess?: () => void;
}

const StripeSetupModal: React.FC<StripeSetupModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  stripeConnected = false,
  onDisconnectSuccess
}) => {
  const [step, setStep] = useState<'welcome' | 'verification' | 'complete' | 'disconnect'>('welcome');
  const [loading, setLoading] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [pendingRequirements, setPendingRequirements] = useState<string[]>([]);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  // Check existing account status when modal opens
  useEffect(() => {
    if (show) {
      checkExistingAccount();
    }
  }, [show]);

  const checkExistingAccount = async () => {
    try {
      const response = await ordersApi.getSellerAccountStatus();
      
      if (response.success && response.data?.account) {
        const account = response.data.account;
        setAccountStatus(account);
        
        if (account.id) {
          setStripeAccountId(account.id);
          setIsExistingAccount(true);
        }
        
        // Check account status
        if (account.charges_enabled && stripeConnected) {
          // Account is fully active and already connected - show disconnect view
          setStep('disconnect');
        } else if (account.charges_enabled) {
          // Account is fully active
          setStep('complete');
          onSuccess();
        } else if (account.requirements?.pending_verification?.length > 0) {
          // Verification needed
          setPendingRequirements(account.requirements.pending_verification);
          setStep('verification');
        } else if (account.details_submitted) {
          // Details submitted but might need verification
          setStep('verification');
        } else {
          // New setup needed
          setStep('welcome');
        }
      } else {
        // No existing account
        setStep('welcome');
      }
    } catch (err) {
      console.error('Error checking account:', err);
      setStep('welcome');
    }
  };

  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      setError('');

      // If already connected, don't proceed
      if (stripeConnected) {
        setStep('disconnect');
        return;
      }

      const response = await ordersApi.startStripeOnboarding();
      
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.error || 'Failed to start Stripe setup');
      }
    } catch (err: any) {
      console.error('Stripe connect error:', err);
      setError(err.message || 'Failed to connect Stripe account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Continue existing onboarding
  const handleContinueVerification = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await ordersApi.continueStripeOnboarding();
      
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.error || 'Failed to continue verification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to continue verification');
    } finally {
      setLoading(false);
    }
  };

  // Handle Stripe disconnect
  const handleDisconnectStripe = async () => {
    try {
      setDisconnectLoading(true);
      setError('');

      const response = await ordersApi.disconnectStripeAccount();
      
      if (response.success) {
        // Successfully disconnected
        if (onDisconnectSuccess) {
          onDisconnectSuccess();
        }
        onSuccess();
        onClose();
      } else {
        setError(response.error || 'Failed to disconnect Stripe account');
      }
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError(err.message || 'Failed to disconnect Stripe account. Please try again.');
    } finally {
      setDisconnectLoading(false);
    }
  };

  // Open Stripe dashboard
  const handleOpenStripeDashboard = () => {
    if (stripeAccountId) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`, '_blank');
    }
  };

  // Format requirement text for display
  const formatRequirement = (item: string): string => {
    const mapping: Record<string, string> = {
      'individual.address.city': 'City',
      'individual.address.line1': 'Street Address',
      'individual.address.postal_code': 'Postal Code (ZIP)',
      'individual.address.state': 'State',
      'individual.id_number': 'Social Security Number (last 4 digits)',
      'individual.verification.document': 'Government ID Document',
      'individual.first_name': 'First Name',
      'individual.last_name': 'Last Name',
      'individual.email': 'Email Address',
      'individual.phone': 'Phone Number',
      'individual.dob.day': 'Date of Birth - Day',
      'individual.dob.month': 'Date of Birth - Month',
      'individual.dob.year': 'Date of Birth - Year',
      'individual.ssn_last_4': 'Social Security Number (last 4)',
      'business_profile.url': 'Website URL',
      'business_profile.mcc': 'Business Category',
      'tos_acceptance.date': 'Terms of Service Acceptance',
      'tos_acceptance.ip': 'IP Address',
      'external_account': 'Bank Account',
      'company.address.city': 'Business City',
      'company.address.line1': 'Business Street Address',
      'company.address.postal_code': 'Business Postal Code',
      'company.address.state': 'Business State',
      'company.tax_id': 'Business Tax ID',
      'company.name': 'Business Name'
    };
    
    return mapping[item] || item
      .replace('individual.', '')
      .replace('company.', 'Business ')
      .replace('business_profile.', '')
      .replace('tos_acceptance.', '')
      .replace(/_/g, ' ')
      .replace(/\./g, ' - ');
  };

  // Don't show modal if not open
  if (!show) return null;

  // ============================================
  // DISCONNECT VIEW (when already connected)
  // ============================================
  if (step === 'disconnect') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stripe Account Connected</h2>
                <p className="text-gray-600 mt-1">Your Stripe account is already linked</p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Connected Status */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <span className="text-green-600 text-lg">✅</span>
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Stripe Connected</h3>
                  <p className="text-green-700 text-sm mt-1">
                    Your Stripe account is verified and ready to accept payments!
                  </p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Account Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                  {stripeAccountId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Account ID:</span>
                      <div className="flex items-center gap-1">
                        <code className="font-mono text-xs text-gray-800">
                          {stripeAccountId.substring(0, 8)}...
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(stripeAccountId)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Copy Account ID"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {accountStatus?.account?.balance && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available Balance:</span>
                      <span className="font-medium text-gray-800">
                        ${(accountStatus.account.balance.available / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    Disconnecting your Stripe account will prevent you from receiving payments for new orders.
                    Existing payouts will continue to process.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="space-y-3">
              {/* Open Stripe Dashboard Button */}
              <button
                onClick={handleOpenStripeDashboard}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Stripe Dashboard
              </button>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnectStripe}
                disabled={disconnectLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {disconnectLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Disconnect Stripe Account
                  </>
                )}
              </button>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                disabled={disconnectLoading}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Welcome/New Setup Screen (unchanged, only shows when not connected)
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Connect Stripe Account</h2>
                <p className="text-gray-600 mt-1">Required to accept payments</p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <span className="text-blue-600 text-lg">💰</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Why Stripe?</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    Stripe is required to securely process payments and transfer funds to your bank account.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Secure & encrypted payments</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Direct bank transfers</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Industry-leading security</span>
              </div>
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Takes only 2 minutes to set up</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="space-y-3">
              <button
                onClick={handleStripeConnect}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Starting Setup...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Connect Stripe Account
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification and Complete screens remain the same as before...
  // (Keep your existing verification and complete screen code here)

  return null;
};

export default StripeSetupModal;