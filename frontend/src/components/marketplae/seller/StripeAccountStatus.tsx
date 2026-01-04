import React, { useState } from 'react';

interface StripeAccountStatusProps {
  stripeStatus: {
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    status: string;
    requirements?: {
      currently_due: string[];
      eventually_due: string[];
      past_due: string[];
      pending_verification: string[];
      disabled_reason?: string;
    };
    verificationNeeded?: boolean;
    missingRequirements?: string[];
    pendingVerification?: string[];
    disabledReason?: string;
  };
  onSetupClick: () => void;
  isLoading: boolean;
}

const StripeAccountStatus: React.FC<StripeAccountStatusProps> = ({
  stripeStatus,
  onSetupClick,
  isLoading
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // ✅ Check for verification requirements
  const hasVerificationRequirements = stripeStatus.verificationNeeded || 
    stripeStatus.requirements?.past_due?.includes('individual.verification.document') ||
    stripeStatus.missingRequirements?.includes('individual.verification.document');

  const hasPendingVerification = stripeStatus.requirements?.pending_verification?.length > 0 ||
    stripeStatus.pendingVerification?.length > 0;

  // ✅ Get status message based on conditions
  const getStatusMessage = () => {
    if (isLoading) {
      return 'Checking Stripe account status...';
    }

    if (!stripeStatus.connected && !stripeStatus.detailsSubmitted) {
      return 'Connect your Stripe account to accept payments';
    }

    if (stripeStatus.connected && stripeStatus.chargesEnabled) {
      return 'Stripe account is active and ready to accept payments';
    }

    if (hasPendingVerification) {
      return 'Your documents are under review. This usually takes 1-3 business days.';
    }

    if (hasVerificationRequirements) {
      return 'Additional verification required to enable payments';
    }

    if (stripeStatus.detailsSubmitted && !stripeStatus.chargesEnabled) {
      return 'Stripe account connected - pending activation';
    }

    return 'Connect your Stripe account to accept payments';
  };

  // ✅ Get status color
  const getStatusColor = () => {
    if (stripeStatus.connected && stripeStatus.chargesEnabled) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    if (hasPendingVerification) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    if (hasVerificationRequirements) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    if (stripeStatus.detailsSubmitted) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // ✅ Get button text
  const getButtonText = () => {
    if (isLoading) {
      return 'Loading...';
    }

    if (hasPendingVerification) {
      return 'Check Verification Status';
    }

    if (hasVerificationRequirements) {
      return 'Complete Verification';
    }

    if (stripeStatus.detailsSubmitted && !stripeStatus.chargesEnabled) {
      return 'Complete Setup';
    }

    return 'Connect Stripe Account';
  };

  // ✅ Get button variant
  const getButtonVariant = () => {
    if (hasPendingVerification) {
      return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    }

    if (hasVerificationRequirements) {
      return 'bg-orange-500 hover:bg-orange-600 text-white';
    }

    return 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white';
  };

  // ✅ Get icon
  const getIcon = () => {
    if (stripeStatus.connected && stripeStatus.chargesEnabled) {
      return '✅';
    }
    
    if (hasPendingVerification) {
      return '⏳';
    }
    
    if (hasVerificationRequirements) {
      return '📄';
    }
    
    if (stripeStatus.detailsSubmitted) {
      return '🔧';
    }
    
    return '💰';
  };

  // ✅ Get requirements list
  const getRequirementsList = () => {
    const requirements = [];
    
    if (stripeStatus.requirements?.currently_due?.length > 0) {
      requirements.push(...stripeStatus.requirements.currently_due);
    }
    
    if (stripeStatus.requirements?.past_due?.length > 0) {
      requirements.push(...stripeStatus.requirements.past_due);
    }
    
    if (stripeStatus.missingRequirements?.length > 0) {
      requirements.push(...stripeStatus.missingRequirements);
    }
    
    // Format requirements for display
    return requirements.map(req => {
      // Clean up requirement names
      const cleanReq = req
        .replace(/individual\.verification\./g, '')
        .replace(/company\.verification\./g, '')
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        original: req,
        display: cleanReq,
        isDocument: req.includes('document') || req.includes('verification')
      };
    });
  };

  const requirementsList = getRequirementsList();
  const hasRequirements = requirementsList.length > 0;

  return (
    <div className="mb-6">
      {/* Stripe Status Banner */}
      <div className={`bg-gradient-to-r ${hasVerificationRequirements ? 'from-orange-50 to-amber-100' : 'from-blue-50 to-indigo-100'} border ${hasVerificationRequirements ? 'border-orange-200' : 'border-blue-200'} rounded-2xl p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start">
            <div className={`p-3 rounded-xl mr-4 ${hasVerificationRequirements ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <span className="text-2xl">{getIcon()}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                {hasVerificationRequirements 
                  ? 'Verification Required' 
                  : stripeStatus.connected && stripeStatus.chargesEnabled 
                    ? 'Stripe Connected' 
                    : 'Stripe Setup Required'}
              </h3>
              <p className="text-gray-700 mb-3">
                {getStatusMessage()}
              </p>
              
              {/* Status Badge */}
              <div className="inline-flex items-center mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()} border`}>
                  <span className="w-2 h-2 rounded-full mr-2" style={{
                    backgroundColor: getStatusColor().includes('green') ? '#10B981' :
                                    getStatusColor().includes('yellow') ? '#F59E0B' :
                                    getStatusColor().includes('orange') ? '#F97316' :
                                    getStatusColor().includes('blue') ? '#3B82F6' :
                                    getStatusColor().includes('red') ? '#EF4444' : '#6B7280'
                  }}></span>
                  {stripeStatus.connected && stripeStatus.chargesEnabled 
                    ? 'Active' 
                    : hasPendingVerification 
                      ? 'Under Review' 
                      : hasVerificationRequirements 
                        ? 'Verification Needed' 
                        : stripeStatus.detailsSubmitted 
                          ? 'Setup Incomplete' 
                          : 'Not Connected'}
                </span>
                
                {hasRequirements && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="ml-3 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                    <svg className={`w-4 h-4 ml-1 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Requirements Details */}
              {showDetails && hasRequirements && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Required Documents/Information:</h4>
                  <ul className="space-y-2">
                    {requirementsList.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm text-gray-700">{req.display}</span>
                          {req.isDocument && (
                            <p className="text-xs text-gray-500 mt-1">
                              Upload a clear photo of your government-issued ID (Passport, Driver's License, etc.)
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {stripeStatus.disabledReason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        <strong>Reason:</strong> {stripeStatus.disabledReason.replace(/\./g, ' ').replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Information */}
              {hasVerificationRequirements && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex">
                    <div className="mr-3 flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-800">Verification Required</h4>
                      <p className="text-sm text-orange-700 mt-1">
                        Stripe requires identity verification to enable payments. This is a standard security measure to protect both sellers and buyers.
                      </p>
                      <ul className="mt-2 text-sm text-orange-600 space-y-1">
                        <li>• Verification usually takes 1-3 business days</li>
                        <li>• You'll need a government-issued ID</li>
                        <li>• Once verified, you can start accepting payments immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="lg:text-right">
            <button
              onClick={onSetupClick}
              disabled={isLoading}
              className={`px-6 py-3 ${getButtonVariant()} font-medium rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center lg:justify-start`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getButtonText()}
                </>
              ) : (
                <>
                  {hasVerificationRequirements ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {getButtonText()}
                    </>
                  ) : hasPendingVerification ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {getButtonText()}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {getButtonText()}
                    </>
                  )}
                </>
              )}
            </button>
            
            {/* Additional Info */}
            <div className="mt-4 text-sm">
              {stripeStatus.connected && stripeStatus.chargesEnabled ? (
                <p className="text-green-600">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ready to accept payments
                </p>
              ) : hasPendingVerification ? (
                <p className="text-yellow-600">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verification in progress
                </p>
              ) : hasVerificationRequirements ? (
                <p className="text-orange-600">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.302 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Required for payment processing
                </p>
              ) : (
                <p className="text-blue-600">
                  Required to receive payments from customers
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats (If connected) */}
      {stripeStatus.connected && stripeStatus.chargesEnabled && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-green-600 text-lg">💳</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Processing</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-blue-600 text-lg">⚡</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Payouts</p>
                <p className="text-lg font-bold text-blue-600">
                  {stripeStatus.requirements?.payouts_enabled ? 'Enabled' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-purple-600 text-lg">🛡️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Security</p>
                <p className="text-lg font-bold text-purple-600">Verified</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeAccountStatus;