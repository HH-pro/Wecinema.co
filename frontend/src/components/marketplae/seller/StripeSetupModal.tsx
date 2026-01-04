// StripeSetupModal.tsx - UPDATED WITH DISCONNECT IMPROVEMENTS
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../../api/marketplaceApi';
import { toast } from 'react-toastify';

interface StripeSetupModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDisconnectSuccess?: () => void;
  stripeConnected: boolean;
  showDisconnectInModal?: boolean; // ✅ NEW: Control disconnect button in modal
}

const StripeSetupModal: React.FC<StripeSetupModalProps> = ({
  show,
  onClose,
  onSuccess,
  onDisconnectSuccess,
  stripeConnected,
  showDisconnectInModal = true // ✅ Default true to show disconnect in modal
}) => {
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Disconnect states
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState('');
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [canDisconnect, setCanDisconnect] = useState(true);
  const [disconnectRequirements, setDisconnectRequirements] = useState({
    hasPendingBalance: false,
    hasActiveListings: false,
    hasPendingOrders: false,
    message: ''
  });

  // ✅ Check if can disconnect
  const checkDisconnectRequirements = async () => {
    try {
      const newRequirements = {
        hasPendingBalance: false,
        hasActiveListings: false,
        hasPendingOrders: false,
        message: ''
      };
      
      let allRequirements = [];
      
      // Check for pending balance
      const stripeStatus = await marketplaceApi.stripe.getStripeAccountStatus();
      if (stripeStatus.success && stripeStatus.data?.account?.balance) {
        const balance = stripeStatus.data.account.balance;
        if ((balance.available > 0) || (balance.pending > 0)) {
          newRequirements.hasPendingBalance = true;
          allRequirements.push('pending balance to withdraw');
        }
      }

      // Check for active listings
      const listingsResponse = await marketplaceApi.listings.getMyListings({ status: 'active' });
      if (listingsResponse.success) {
        const activeListings = listingsResponse.data?.listings || [];
        if (activeListings.length > 0) {
          newRequirements.hasActiveListings = true;
          allRequirements.push('active listings');
        }
      }

      // Check for pending orders
      const ordersResponse = await marketplaceApi.orders.getMySales();
      if (ordersResponse.success) {
        const orders = ordersResponse.data?.sales || [];
        const pendingOrders = orders.filter((order: any) => 
          ['pending_payment', 'paid', 'processing', 'in_progress', 'in_revision'].includes(order.status)
        );
        if (pendingOrders.length > 0) {
          newRequirements.hasPendingOrders = true;
          allRequirements.push('pending orders');
        }
      }

      // Create message with all requirements
      if (allRequirements.length > 0) {
        newRequirements.message = `You have ${allRequirements.join(', ')}`;
      }

      setDisconnectRequirements(newRequirements);
      const canDisconnectNow = !newRequirements.hasPendingBalance && 
                               !newRequirements.hasActiveListings && 
                               !newRequirements.hasPendingOrders;
      setCanDisconnect(canDisconnectNow);

    } catch (error) {
      console.error('Error checking disconnect requirements:', error);
    }
  };

  // Check Stripe verification status
  const checkVerificationStatus = async () => {
    if (!stripeConnected) return;
    
    try {
      setCheckingStatus(true);
      const response = await marketplaceApi.stripe.getStripeAccountStatus();
      
      if (response.success && response.data) {
        setVerificationStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (show) {
      if (stripeConnected) {
        checkVerificationStatus();
        checkDisconnectRequirements();
      }
    } else {
      // Reset states when modal closes
      setShowDisconnectConfirm(false);
      setDisconnectReason('');
    }
  }, [show, stripeConnected]);

  const startStripeSetup = async () => {
    try {
      setStripeLoading(true);
      
      // Check current status first
      const statusResponse = await marketplaceApi.stripe.getStripeAccountStatus();
      
      let response;
      if (statusResponse.success && statusResponse.data?.account?.id) {
        // Account exists, continue onboarding
        console.log('Account exists, continuing onboarding...');
        response = await marketplaceApi.stripe.continueStripeOnboarding();
      } else {
        // New account, start fresh onboarding
        console.log('Starting new onboarding...');
        response = await marketplaceApi.stripe.startStripeOnboarding();
      }
      
      if (response.success && response.data?.url) {
        // Redirect to Stripe
        window.location.href = response.data.url;
      } else {
        toast.error(response.error || 'Failed to start Stripe setup');
      }
    } catch (error: any) {
      console.error('Error starting Stripe setup:', error);
      toast.error(error.message || 'Failed to connect with Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  // ✅ Handle disconnect
  const handleDisconnect = async () => {
    if (!disconnectReason.trim() && canDisconnect) {
      toast.error('Please provide a reason for disconnecting');
      return;
    }

    setDisconnectLoading(true);
    try {
      const response = await marketplaceApi.stripe.disconnectStripeAccount();
      
      if (response.success) {
        toast.success(response.message || 'Disconnect request submitted successfully');
        setShowDisconnectConfirm(false);
        setDisconnectReason('');
        
        if (onDisconnectSuccess) {
          onDisconnectSuccess();
        }
        
        // Close modal after successful disconnect request
        setTimeout(() => {
          onClose();
        }, 1500);
        
      } else {
        toast.error(response.error || 'Failed to disconnect Stripe account');
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error(error.message || 'Failed to disconnect Stripe account');
    } finally {
      setDisconnectLoading(false);
    }
  };

  // ✅ Get simplified requirements list
  const getSimplifiedRequirements = () => {
    if (!verificationStatus?.account?.requirements) return [];
    
    const requirements = [
      ...(verificationStatus.account.requirements.currently_due || []),
      ...(verificationStatus.account.requirements.past_due || []),
      ...(verificationStatus.account.requirements.pending_verification || [])
    ];
    
    return Array.from(new Set(requirements)).map(req => {
      return req
        .replace(/individual\.verification\.|company\.verification\./g, '')
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    });
  };

  // ✅ Quick Disconnect Button Component (for main modal)
  const QuickDisconnectButton = () => (
    <button
      onClick={() => setShowDisconnectConfirm(true)}
      className="mt-4 w-full px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-300 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center"
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Disconnect Stripe Account
    </button>
  );

  // ✅ Main Modal Content
  const MainModalContent = () => (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
          <span className="text-xl text-white">💰</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {stripeConnected ? 'Manage Stripe Account' : 'Connect Stripe Account'}
          </h3>
          <p className="text-gray-600 mt-1">
            {stripeConnected 
              ? 'Manage your payment settings and account information' 
              : 'Connect your account to start accepting payments'}
          </p>
        </div>
      </div>

      {/* Status Overview */}
      {stripeConnected && verificationStatus && (
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600">✅</span>
              </div>
              <div>
                <h4 className="font-semibold text-green-800">Account Status</h4>
                <p className="text-sm text-green-700">
                  {verificationStatus.account?.charges_enabled 
                    ? 'Ready to accept payments' 
                    : 'Setup required'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              verificationStatus.account?.charges_enabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {verificationStatus.account?.charges_enabled ? 'Active' : 'Action Required'}
            </span>
          </div>
        </div>
      )}

      {/* Quick Disconnect Button (Below Status) */}
      {stripeConnected && showDisconnectInModal && (
        <div className="mb-6">
          <QuickDisconnectButton />
        </div>
      )}

      {/* Verification Requirements */}
      {stripeConnected && verificationStatus && getSimplifiedRequirements().length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Verification Required</h4>
          <div className="space-y-3">
            {getSimplifiedRequirements().map((req: string, index: number) => (
              <div key={index} className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.302 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-800">{req}</p>
                  {req.toLowerCase().includes('document') && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Upload a clear photo of your government-issued ID
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
        {!stripeConnected ? (
          <>
            <button
              onClick={startStripeSetup}
              disabled={stripeLoading || checkingStatus}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {stripeLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting to Stripe...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Stripe Account
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Manage Account Buttons */}
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              {/* Complete Verification Button */}
              {(getSimplifiedRequirements().length > 0 || !verificationStatus?.account?.charges_enabled) && (
                <button
                  onClick={startStripeSetup}
                  disabled={stripeLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center"
                >
                  {stripeLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {verificationStatus?.account?.charges_enabled ? 'Update Account' : 'Complete Setup'}
                    </>
                  )}
                </button>
              )}

              {/* View Dashboard Button */}
              {verificationStatus?.account?.id && (
                <a
                  href={`https://dashboard.stripe.com/connect/accounts/${verificationStatus.account.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Stripe Dashboard
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ✅ Disconnect Confirmation Modal Content
  const DisconnectConfirmContent = () => (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.302 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Disconnect Stripe Account</h3>
          <p className="text-gray-600 mt-1">This action requires manual review</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="mb-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
          <h4 className="font-medium text-red-800 mb-2">⚠️ Important Notice</h4>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• You will not be able to receive payments</li>
            <li>• Pending orders must be completed first</li>
            <li>• Active listings will be deactivated</li>
            <li>• Re-connecting requires full verification</li>
          </ul>
        </div>

        {/* Disconnect Requirements Check */}
        {!canDisconnect && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">Cannot Disconnect</h4>
            <div className="space-y-2">
              {disconnectRequirements.hasPendingBalance && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-yellow-700">You have pending balance to withdraw</span>
                </div>
              )}
              {disconnectRequirements.hasActiveListings && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm text-yellow-700">You have active listings</span>
                </div>
              )}
              {disconnectRequirements.hasPendingOrders && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm text-yellow-700">You have pending orders</span>
                </div>
              )}
            </div>
            <p className="text-sm text-yellow-600 mt-3">
              Please resolve these issues before disconnecting your Stripe account.
            </p>
          </div>
        )}

        {/* Reason Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for disconnecting
          </label>
          <textarea
            value={disconnectReason}
            onChange={(e) => setDisconnectReason(e.target.value)}
            placeholder="Please tell us why you want to disconnect..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={4}
            disabled={!canDisconnect}
          />
          <p className="text-xs text-gray-500 mt-2">
            Our team will review your request within 24-48 hours.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            setShowDisconnectConfirm(false);
            setDisconnectReason('');
          }}
          className="px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          disabled={disconnectLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleDisconnect}
          disabled={!canDisconnect || !disconnectReason.trim() || disconnectLoading}
          className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
        >
          {disconnectLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Request Disconnect'
          )}
        </button>
      </div>
    </div>
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {showDisconnectConfirm ? 'Disconnect Account' : 'Stripe Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {showDisconnectConfirm ? <DisconnectConfirmContent /> : <MainModalContent />}
      </div>
    </div>
  );
};

// ✅ Export a standalone DisconnectButton component for use outside the modal
export const StripeDisconnectButton: React.FC<{
  onDisconnectClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ onDisconnectClick, disabled = false, loading = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      onClick={onDisconnectClick}
      disabled={disabled || loading}
      className={`${sizeClasses[size]} bg-white hover:bg-red-50 text-red-600 border border-red-300 font-medium rounded-xl transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Disconnecting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Disconnect Stripe
        </>
      )}
    </button>
  );
};

export default StripeSetupModal;