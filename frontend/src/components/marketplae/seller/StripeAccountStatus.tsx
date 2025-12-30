// components/marketplace/seller/StripeAccountStatus.tsx
import React, { useState, useEffect } from 'react';

interface StripeStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  accountId?: string;
  email?: string;
  country?: string;
  status?: string;
  name?: string;
  balance?: number;
  availableBalance?: number;
  pendingBalance?: number;
  message?: string;
}

interface StripeAccountStatusProps {
  stripeStatus: StripeStatus | null;
  onSetupClick: () => void;
  compact?: boolean;
  showDetails?: boolean;
  isLoading?: boolean;
  className?: string;
}

const StripeAccountStatus: React.FC<StripeAccountStatusProps> = ({ 
  stripeStatus, 
  onSetupClick,
  compact = false,
  showDetails = true,
  isLoading = false,
  className = ''
}) => {
  const [showFullId, setShowFullId] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(stripeStatus);
  const [copied, setCopied] = useState(false);

  // Update display status when props change
  useEffect(() => {
    if (stripeStatus) {
      setDisplayStatus(stripeStatus);
      setLocalLoading(false);
    }
  }, [stripeStatus]);

  // Handle loading state
  useEffect(() => {
    if (isLoading) {
      setLocalLoading(true);
      const timer = setTimeout(() => {
        setLocalLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setLocalLoading(false);
    }
  }, [isLoading]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Copy account ID to clipboard
  const handleCopyAccountId = () => {
    if (displayStatus?.accountId) {
      navigator.clipboard.writeText(displayStatus.accountId);
      setCopied(true);
    }
  };

  // Show loading state
  if (localLoading) {
    return (
      <div className={`mb-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500 mr-3"></div>
            <div>
              <h3 className="text-base font-medium text-gray-800">Checking payment status...</h3>
              <p className="text-sm text-gray-600 mt-0.5">Please wait while we verify your account</p>
            </div>
          </div>
          <div className="w-32 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  // If no status after loading, show not connected
  if (!displayStatus) {
    return (
      <div className={`mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm ${className}`}>
        <div className={`flex ${compact ? 'flex-col gap-4' : 'items-center justify-between'} transition-all duration-200`}>
          <div className={`flex items-center ${compact ? 'justify-center text-center' : ''}`}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl mr-4 shadow-sm">
              <span className="text-xl text-white">💰</span>
            </div>
            <div className={compact ? 'text-center' : ''}>
              <h3 className="text-lg font-semibold text-gray-900">
                Setup Payments to Get Started
              </h3>
              <p className="text-gray-600 mt-1">
                Connect your Stripe account to start accepting payments and receiving payouts.
              </p>
              {!compact && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Secure & encrypted
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Fast payouts
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Global support
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onSetupClick}
            className={`${compact ? 'w-full' : 'shrink-0'} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Connect Stripe Account
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Account connected but charges not enabled (needs verification)
  if (displayStatus.connected && !displayStatus.chargesEnabled) {
    const verificationStatus = displayStatus.detailsSubmitted ? 'submitted' : 'pending';
    
    return (
      <div className={`mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-5 shadow-sm ${className}`}>
        <div className={`flex ${compact ? 'flex-col gap-4' : 'items-center justify-between'} transition-all duration-200`}>
          <div className={`flex items-center ${compact ? 'justify-center text-center' : ''}`}>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-xl mr-4 shadow-sm">
              <span className="text-xl text-white">⏳</span>
            </div>
            <div className={compact ? 'text-center' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Verification In Progress
                </h3>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  {verificationStatus}
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                {displayStatus.detailsSubmitted 
                  ? 'Your information has been submitted and is being reviewed by Stripe.'
                  : 'Please complete your account setup with additional verification details.'
                }
              </p>
              {displayStatus.message && (
                <p className="text-sm text-yellow-700 mt-2 bg-yellow-100/50 p-2 rounded-lg">
                  {displayStatus.message}
                </p>
              )}
              {showDetails && displayStatus.accountId && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowFullId(!showFullId)}
                      className="text-sm text-yellow-600 hover:text-yellow-800 font-medium flex items-center gap-1"
                    >
                      {showFullId ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Hide Account ID
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                          Show Account ID
                        </>
                      )}
                    </button>
                    {showFullId && (
                      <button 
                        onClick={handleCopyAccountId}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  {showFullId && (
                    <div className="mt-2 p-3 bg-yellow-100/30 rounded-lg border border-yellow-200">
                      <p className="text-xs text-gray-700 font-mono break-all">
                        {displayStatus.accountId}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`flex gap-3 ${compact ? 'w-full' : 'shrink-0'}`}>
            <button
              onClick={onSetupClick}
              className={`${compact ? 'flex-1' : ''} bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap`}
            >
              <div className="flex items-center justify-center gap-2">
                {displayStatus.detailsSubmitted ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Check Status
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Complete Verification
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Account fully connected and active
  if (displayStatus.connected && displayStatus.chargesEnabled) {
    return (
      <div className={`mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm ${className}`}>
        <div className={`flex ${compact ? 'flex-col gap-4' : 'items-center justify-between'} transition-all duration-200`}>
          <div className={`flex items-center ${compact ? 'justify-center text-center' : ''}`}>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl mr-4 shadow-sm">
              <span className="text-xl text-white">✅</span>
            </div>
            <div className={compact ? 'text-center' : ''}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Payments Ready! 🎉
                </h3>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Verified
                </span>
              </div>
              <p className="text-gray-600 mt-1">
                Your Stripe account is fully verified and ready to accept payments.
              </p>
              
              {/* Account Details */}
              {showDetails && (
                <div className="mt-3 space-y-2">
                  {/* Status Indicators */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Charges Enabled</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${displayStatus.payoutsEnabled ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs text-gray-700">
                        Payouts {displayStatus.payoutsEnabled ? 'Enabled' : 'Setup'}
                      </span>
                    </div>
                    {displayStatus.name && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-gray-700">{displayStatus.name}</span>
                      </div>
                    )}
                    {displayStatus.country && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM4 10a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-gray-700">{displayStatus.country}</span>
                      </div>
                    )}
                  </div>

                  {/* Balance Info */}
                  {(displayStatus.balance !== undefined || displayStatus.availableBalance !== undefined) && (
                    <div className="mt-2 p-3 bg-green-100/30 rounded-lg border border-green-200">
                      <div className="grid grid-cols-2 gap-4">
                        {displayStatus.availableBalance !== undefined && (
                          <div>
                            <p className="text-xs text-gray-500">Available Balance</p>
                            <p className="text-lg font-semibold text-gray-900">
                              ${(displayStatus.availableBalance / 100).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {displayStatus.pendingBalance !== undefined && displayStatus.pendingBalance > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Pending</p>
                            <p className="text-lg font-semibold text-yellow-600">
                              ${(displayStatus.pendingBalance / 100).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Account ID */}
                  {displayStatus.accountId && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowFullId(!showFullId)}
                          className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                        >
                          {showFullId ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Hide Account ID
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              Show Account ID
                            </>
                          )}
                        </button>
                        {showFullId && (
                          <button 
                            onClick={handleCopyAccountId}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      {showFullId && (
                        <div className="mt-2 p-3 bg-green-100/30 rounded-lg border border-green-200">
                          <p className="text-xs text-gray-700 font-mono break-all">
                            {displayStatus.accountId}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className={`flex gap-3 ${compact ? 'w-full' : 'shrink-0'}`}>
            {displayStatus.accountId && (
              <a
                href={`https://dashboard.stripe.com/connect/accounts/${displayStatus.accountId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${compact ? 'flex-1 text-center' : ''} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Stripe Dashboard
                </div>
              </a>
            )}
            <button
              onClick={onSetupClick}
              className={`${compact ? 'flex-1' : ''} bg-white hover:bg-gray-50 text-green-600 border border-green-300 font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow whitespace-nowrap`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Update Details
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not connected - Show setup message (fallback)
  return (
    <div className={`mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm ${className}`}>
      <div className={`flex ${compact ? 'flex-col gap-4' : 'items-center justify-between'} transition-all duration-200`}>
        <div className={`flex items-center ${compact ? 'justify-center text-center' : ''}`}>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl mr-4 shadow-sm">
            <span className="text-xl text-white">💰</span>
          </div>
          <div className={compact ? 'text-center' : ''}>
            <h3 className="text-lg font-semibold text-gray-900">
              {/* Ready to Start Earning? */}
            </h3>
            <p className="text-gray-600 mt-1">
              Connect your Stripe account to accept payments and withdraw your earnings.
            </p>
            {displayStatus?.message && (
              <p className="text-sm text-blue-700 mt-2 bg-blue-100/50 p-2 rounded-lg">
                {displayStatus.message}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onSetupClick}
          className={`${compact ? 'w-full' : 'shrink-0'} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 whitespace-nowrap`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Stripe Account
          </div>
        </button>
      </div>
    </div>
  );
};

// Helper function to format currency
export const formatStripeAmount = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return '$0.00';
  return `$${(amount / 100).toFixed(2)}`;
};

export default StripeAccountStatus;